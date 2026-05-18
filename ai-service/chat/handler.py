import asyncio
import json
from datetime import date
from typing import AsyncGenerator
from llm.factory import get_llm_provider, get_fallback_provider
from rag.embedder import embed
from rag.vectorstore import query
from tools.definitions import OWNER_TOOLS, STAFF_TOOLS, MECHANIC_TOOLS, CUSTOMER_TOOLS
from tools.executor import execute_tool
from chat.history import get_history, append_message
from chat.token_budget import maybe_trim

MAX_TOOL_ITERATIONS = 8

# ─── DATABASE SCHEMA (embedded so the AI knows every entity/field) ──────────
_DB_SCHEMA = """
## Database Schema

### customers
  customer_id, full_name, email, phone, address
  Filters: name (search), email

### service_jobs
  job_id, motorcycle_model, job_date, completion_date, notes
  Status (string filter): pending | in_progress | completed | cancelled | booked | work_done
  Filters: status, from_date, to_date, motorcycle_model, customer_name

### parts
  part_id, part_name, brand, category, stock_quantity, reorder_level, unit_price
  Filters: name (search), brand, category, low_stock (true = below reorder level)

### mechanics
  mechanic_id, full_name, specialization
  Filters: name (search)

### sales
  sale_id, sale_type, total_amount, net_amount, sale_date, payment_method
  Filters: from_date, to_date, sale_type (parts_sale | service_payment)

### service_types
  service_type_id, service_name, description, labor_cost, estimated_duration

### shop
  shop_name, address, phone, email, business_hours

### user_profile
  Returns the currently logged-in user's name, email, role.

### payments  (customer role only)
  Returns the customer's own payment/sales records.
"""

# ─── ROLE PERMISSIONS ────────────────────────────────────────────────────────
_ROLE_PERMISSIONS = """
## Your Data Access by Role

**Owner**  — full access
  Read:  customers, service_jobs, parts, mechanics, sales, service_types, shop, user_profile
  Write: customers, service_jobs, parts, service_types, shop

**Staff**  — operational access (no financial data)
  Read:  customers, service_jobs, parts, mechanics, service_types, shop, user_profile
  Write: customers, service_jobs
  Cannot access: sales revenue, financial reports

**Mechanic**  — own jobs only
  Read:  service_jobs (only assigned to you), user_profile
  Write: service_jobs (update notes/status on your own jobs)

**Customer**  — own data only
  Read:  service_jobs (own), payments (own), service_types, shop, user_profile
  Write: service_jobs (book new service), vehicles (register motorcycle)
"""

# ─── TOOL USAGE GUIDE ────────────────────────────────────────────────────────
_TOOL_GUIDE = """
## How to Use execute_db_operation

Call this tool for EVERY data question — never guess or invent data.

**Actions:**
- list   → returns array of matching records
- count  → returns {"count": N}
- get    → returns one record by record_id
- create → inserts and returns new record
- update → modifies record by record_id, returns updated record

**Example calls:**
- "What is my name?"            → action=list, entity=user_profile
- "How many customers?"         → action=count, entity=customers
- "List all customers"          → action=list, entity=customers
- "Find customer named Frienzal"→ action=list, entity=customers, filters={"name":"Frienzal"}
- "Completed jobs this month"   → action=list, entity=service_jobs, filters={"status":"completed","from_date":"2025-05-01"}
- "How many pending jobs?"      → action=count, entity=service_jobs, filters={"status":"pending"}
- "Show low-stock parts"        → action=list, entity=parts, filters={"low_stock":true}
- "Revenue for May"             → action=list, entity=sales, filters={"from_date":"2025-05-01","to_date":"2025-05-31"}
- "Who are my mechanics?"       → action=list, entity=mechanics
- "Update notes on job 45"      → action=update, entity=service_jobs, record_id=45, data={"notes":"..."}
- "Book service for motorcycle" → action=create, entity=service_jobs, data={...}
- "Add a new customer"          → action=create, entity=customers, data={...}

**Rules:**
1. ALWAYS call the tool for any shop data question. Never invent names, numbers, or records.
2. Delete is not permitted — you cannot delete anything.
3. If the user asks for something outside your role permissions, explain politely.
4. After receiving a tool result, EXTRACT and PRESENT the actual data values naturally.
   - WRONG: "The output is a JSON that includes your name and email."
   - RIGHT: "Your name is Lonie Labisig and your email is lonie@example.com."
   - WRONG: "The result shows a count of 16."
   - RIGHT: "You have 16 customers."
   Never describe the JSON structure — always speak as if you know the answer directly.
5. Use ₱ (Philippine Peso) for currency. Format: ₱12,500.
6. For general questions (greetings, advice, motorcycle tips), answer naturally without the tool.
"""


def _tools_for_role(role: str) -> list:
    if role == "owner":
        return OWNER_TOOLS
    if role == "staff":
        return STAFF_TOOLS
    if role == "mechanic":
        return MECHANIC_TOOLS
    return CUSTOMER_TOOLS


def _system_prompt(role: str, shop_id: int, rag_context: list[str]) -> str:
    ctx   = "\n\n".join(rag_context) if rag_context else "No uploaded documents."
    today = date.today().isoformat()

    if role == "owner":
        persona = (
            f"You are **MoSPAMS Assistant**, the AI shop assistant for this motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n\n"
            "You serve the **Owner**. You have FULL access to all shop data — inventory, revenue, jobs, "
            "mechanics, customers, and sales. Be a knowledgeable business advisor. Proactively offer insights "
            "(e.g., flag critically low stock, highlight revenue trends, suggest follow-ups).\n"
        )
    elif role == "staff":
        persona = (
            f"You are **MoSPAMS Assistant**, the AI shop assistant for this motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n\n"
            "You serve a **Staff** member. You can access customers, jobs, parts, and mechanics. "
            "Financial/revenue data is restricted to the Owner — if asked, explain this politely.\n"
        )
    elif role == "mechanic":
        persona = (
            f"You are **MoSPAMS Assistant**, the AI helper for mechanics at shop ID {shop_id}.\n"
            f"Today is {today}.\n\n"
            "You serve a **Mechanic**. You can only see jobs assigned to you. "
            "Keep answers short and practical — mechanics are busy. "
            "You can also answer general motorcycle repair and troubleshooting questions.\n"
        )
    else:
        persona = (
            f"You are **MoSPAMS Assistant**, the customer service AI for this motorcycle shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n\n"
            "You serve a **Customer**. You can help with your own service history, payments, bookings, "
            "vehicle registration, shop information, and available services. "
            "Be warm and guide customers step by step.\n"
        )

    sections = [
        persona,
        _DB_SCHEMA,
        _ROLE_PERMISSIONS,
        _TOOL_GUIDE,
        f"## Shop Knowledge Base (uploaded documents)\n{ctx}",
    ]
    return "\n\n".join(sections)


def _build_messages(session_id: str, system: str, message: str, provider) -> list[dict]:
    history  = get_history(session_id)
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    return maybe_trim(messages, provider, system)


async def handle_chat(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> str:
    embedding  = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    system   = _system_prompt(role, shop_id, rag_chunks)
    provider = get_llm_provider()
    if not provider.is_available():
        provider = get_fallback_provider()

    tools    = _tools_for_role(role) if provider.is_available() else []
    messages = _build_messages(session_id, system, message, provider)
    append_message(session_id, "user", message)

    for _ in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)

        if not response.tool_calls:
            answer = response.content or "I'm sorry, I couldn't generate a response."
            append_message(session_id, "assistant", answer)
            return answer

        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {"id": tc["id"], "type": "function", "function": tc["function"]}
                for tc in response.tool_calls
            ],
        })

        for tc in response.tool_calls:
            args   = json.loads(tc["function"]["arguments"])
            result = execute_tool(
                name=tc["function"]["name"],
                arguments=args,
                shop_id=shop_id,
                user_id=user_id,
                role=role,
            )
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    response = provider.chat(messages, tools=None)
    answer   = response.content or "I'm sorry, I couldn't generate a response."
    append_message(session_id, "assistant", answer)
    return answer


async def handle_chat_stream(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> AsyncGenerator[str, None]:
    embedding  = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    system   = _system_prompt(role, shop_id, rag_chunks)
    provider = get_llm_provider()
    if not provider.is_available():
        provider = get_fallback_provider()

    tools    = _tools_for_role(role) if provider.is_available() else []
    messages = _build_messages(session_id, system, message, provider)
    append_message(session_id, "user", message)

    final_answer = None

    for _ in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)

        if not response.tool_calls:
            final_answer = response.content or ""
            break

        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {"id": tc["id"], "type": "function", "function": tc["function"]}
                for tc in response.tool_calls
            ],
        })

        for tc in response.tool_calls:
            args   = json.loads(tc["function"]["arguments"])
            result = execute_tool(
                name=tc["function"]["name"],
                arguments=args,
                shop_id=shop_id,
                user_id=user_id,
                role=role,
            )
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    if final_answer is not None:
        words = final_answer.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield chunk
            await asyncio.sleep(0.015)
        append_message(session_id, "assistant", final_answer)
    else:
        accumulated = ""
        for token in provider.chat_stream(messages):
            accumulated += token
            yield token
        if accumulated:
            append_message(session_id, "assistant", accumulated)
