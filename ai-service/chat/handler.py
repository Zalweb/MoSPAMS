import asyncio
import json
import re
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

### job_parts
  Parts used in a specific service job.
  Fields: job_part_id, part_name, brand, quantity, unit_price, subtotal
  Required filter: job_id (the numeric ID of the service job)
  Example: action=list, entity=job_parts, filters={"job_id": 69}
"""

# ─── ROLE PERMISSIONS ────────────────────────────────────────────────────────
_ROLE_PERMISSIONS = """
## Your Data Access by Role

**Owner**  — full access
  Read:  customers, service_jobs, job_parts, parts, mechanics, sales, service_types, shop, user_profile
  Write: customers, service_jobs, parts, service_types, shop

**Staff**  — operational access (no financial data)
  Read:  customers, service_jobs, job_parts, parts, mechanics, service_types, shop, user_profile
  Write: customers, service_jobs
  Cannot access: sales revenue, financial reports

**Mechanic**  — own jobs only
  Read:  service_jobs (only assigned to you), job_parts, user_profile
  Write: service_jobs (update notes/status on your own jobs)

**Customer**  — own data only
  Read:  service_jobs (own), job_parts (own jobs only), payments (own), service_types, shop, user_profile
  Write: service_jobs (book new service), vehicles (register motorcycle)
"""

# ─── TOOL USAGE GUIDE ────────────────────────────────────────────────────────
_TOOL_GUIDE = """
## How to Use execute_db_operation

Call this tool for EVERY data question — never guess or invent data.

**Actions:**
- list   → returns array of matching records
- count  → returns {"count": N}
- get    → returns one record by record_id (integer ID only, NOT a name)
- create → inserts and returns new record
- update → modifies record by record_id, returns updated record

**Example calls:**
- "What is my name?"              → action=list, entity=user_profile
- "How many customers?"           → action=count, entity=customers
- "List all customers"            → action=list, entity=customers
- "Is Lance Bayot a customer?"    → action=list, entity=customers, filters={"name":"Lance Bayot"}
- "Find customer named Frienzal"  → action=list, entity=customers, filters={"name":"Frienzal"}
- "Latest service job"            → action=list, entity=service_jobs, limit=1, order_by="job_id desc"
- "Most recent job"               → action=list, entity=service_jobs, limit=1, order_by="job_date desc"
- "Completed jobs this month"     → action=list, entity=service_jobs, filters={"status":"completed","from_date":"2025-05-01"}
- "How many pending jobs?"        → action=count, entity=service_jobs, filters={"status":"pending"}
- "Show low-stock parts"          → action=list, entity=parts, filters={"low_stock":true}
- "Revenue for May"               → action=list, entity=sales, filters={"from_date":"2025-05-01","to_date":"2025-05-31"}
- "Who are my mechanics?"         → action=list, entity=mechanics
- "Parts used in job 69?"         → action=list, entity=job_parts, filters={"job_id":69}
- "What parts were used in the latest job?" → first get the latest job_id, then action=list, entity=job_parts, filters={"job_id":<id>}
- "Update notes on job 45"        → action=update, entity=service_jobs, record_id=45, data={"notes":"..."}
- "Book/create a service job"     → action=create, entity=service_jobs, data={"motorcycle_model":"Honda Beat","job_date":"2026-05-19","customer_name":"Ana Mendoza","notes":"Oil change"}
- "Add a new customer"            → action=create, entity=customers, data={"full_name":"...","phone":"...","email":"..."}

**For create operations — collect required info first:**
- service_jobs create requires: motorcycle_model, job_date. Optional: customer_name, notes.
  If the user hasn't provided these, ASK before calling the tool.
  WRONG data types: data="{\"key\":\"val\"}" (string) → RIGHT: data={"key":"val"} (object)
  WRONG: record_id="null" → RIGHT: omit it or pass null
  WRONG: service_type_id="Oil Change" (service_type_id is a number, not a service name)

**Correct create service_jobs example:**
  action=create, entity=service_jobs, data={"motorcycle_model":"Honda Beat 110","job_date":"2026-05-19","customer_name":"Ana Mendoza","notes":"Oil change requested"}

**Critical Rules:**
1. ALWAYS call the tool for any shop data question. Never invent names, numbers, or records.
2. NEVER use record_id with a person's name. Names go in filters={"name":"..."}, NOT record_id.
   - WRONG: action=get, entity=customers, record_id=lance bayot
   - RIGHT:  action=list, entity=customers, filters={"name":"lance bayot"}
3. For "latest", "most recent", or "newest" — ALWAYS use limit=1 with order_by="job_id desc" or "job_date desc".
   NEVER return a list when the user says "latest one" or "just one".
4. For "parts used in a job" — use entity=job_parts, filters={"job_id":<id>}.
   If you don't know the job_id yet, call service_jobs first to get it.
5. Delete is not permitted — you cannot delete anything.
6. If the user asks for something outside your role permissions, explain politely.
7. **NEVER fabricate data.** If a tool call returns an error, say:
   "I had trouble retrieving that data — please try again."
   Do NOT guess, invent, or hallucinate part names, customer names, amounts, or any values.
   A wrong answer is far worse than admitting you couldn't fetch the data.
8. After receiving a tool result, EXTRACT and PRESENT the actual data values naturally.
   - WRONG: "The output is a JSON that includes your name and email."
   - RIGHT: "Your name is Lonie Labisig and your email is lonie@example.com."
   - WRONG: "The result shows a count of 16."
   - RIGHT: "You have 16 customers."
   Never describe the JSON structure — always speak as if you know the answer directly.
9. Use ₱ (Philippine Peso) for currency. Format: ₱12,500.
"""

# ─── CONVERSATIONAL HANDLING ─────────────────────────────────────────────────
_CONVERSATIONAL_GUIDE = """
## Handling Casual & Personal Questions

Many messages are NOT shop data queries. For these, respond naturally WITHOUT calling execute_db_operation:

**Respond naturally to:**
- Questions about yourself: "Are you dumb?", "Are you smart?", "Who are you?", "What can you do?"
- Greetings and small talk: "Hi", "Hello", "How are you?", "Good morning"
- Jokes or light insults: "You're dumb", "You suck", "lol"
- General advice: motorcycle tips, service recommendations, maintenance questions

**Examples:**
- "Are you dumb?" → "Not at all! I'm MoSPAMS Assistant, your AI helper for this shop. Ask me anything about jobs, parts, customers, or revenue!"
- "You dumb?" → "Nope! Sharp and ready. What do you need help with?"
- "Hi!" → "Hi there! How can I help you today?"

**NEVER say "I cannot answer that" for casual conversation.** Always be friendly and offer to help with something.

Only call execute_db_operation when the user is asking about actual shop data (customers, jobs, parts, sales, etc.).

**ABSOLUTE RULE — Never output raw JSON in your text responses.**
Tool calls happen silently through the system. Your response must ALWAYS be plain, natural language.
- WRONG: 'Here is the JSON: {"name": "execute_db_operation", ...}'
- WRONG: Showing any JSON, code blocks, or technical structures to the user
- RIGHT: Just answer in plain language. The tool call happens invisibly.
If a message is vague (like "In my garage"), ask a clarifying question in plain language. Never guess and generate a tool call for ambiguous input.
"""


def _fix_tool_args(args: dict) -> dict:
    """Fix common type mistakes small LLMs make: string 'null' → None, stringified JSON → object."""
    result = {}
    for key, val in args.items():
        if isinstance(val, str):
            stripped = val.strip()
            if stripped in ('null', 'None', 'undefined', ''):
                result[key] = None
            elif stripped.startswith(('{', '[')):
                try:
                    result[key] = json.loads(stripped)
                except json.JSONDecodeError:
                    result[key] = val
            else:
                result[key] = val
        else:
            result[key] = val
    return result


def _try_parse_text_tool_call(content: str | None) -> tuple[str, dict] | None:
    """
    Some small LLMs output tool call JSON as plain text instead of tool_calls.
    Handles JSON embedded anywhere in prose, not just when the whole response is JSON.
    Returns (tool_name, arguments_dict) or None.
    """
    if not content or "execute_db_operation" not in content:
        return None

    # Walk the text looking for {"name" and extract the balanced JSON object
    text = content
    start = 0
    while True:
        idx = text.find('"execute_db_operation"', start)
        if idx == -1:
            break
        # Find the opening { before this position
        open_idx = text.rfind('{', 0, idx)
        if open_idx == -1:
            start = idx + 1
            continue
        # Extract balanced JSON starting at open_idx
        depth = 0
        in_string = False
        escape = False
        end = open_idx
        for i, ch in enumerate(text[open_idx:], open_idx):
            if escape:
                escape = False
                continue
            if ch == '\\' and in_string:
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
            if not in_string:
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
        if end > open_idx:
            candidate = text[open_idx:end]
            # Try direct parse, then try fixing missing closing braces
            for attempt in (candidate, candidate + '}' * max(0, candidate.count('{') - candidate.count('}'))):
                try:
                    data = json.loads(attempt)
                    if isinstance(data, dict):
                        name = data.get("name")
                        args = data.get("parameters") or data.get("arguments")
                        if name == "execute_db_operation" and isinstance(args, dict):
                            return name, _fix_tool_args(args)
                    break
                except json.JSONDecodeError:
                    continue
        start = idx + 1
    return None


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
        _CONVERSATIONAL_GUIDE,
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

    for iteration in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)

        if not response.tool_calls:
            # Detect text-based tool calls from small LLMs that don't use the tool_calls API
            parsed = _try_parse_text_tool_call(response.content)
            if parsed:
                tool_name, tool_args = parsed
                fake_id = f"text_tc_{iteration}"
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{"id": fake_id, "type": "function", "function": {
                        "name": tool_name, "arguments": json.dumps(tool_args)
                    }}],
                })
                result = execute_tool(name=tool_name, arguments=tool_args, shop_id=shop_id, user_id=user_id, role=role)
                messages.append({"role": "tool", "tool_call_id": fake_id, "content": result})
                continue

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

    for iteration in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)

        if not response.tool_calls:
            # Detect text-based tool calls from small LLMs that don't use the tool_calls API
            parsed = _try_parse_text_tool_call(response.content)
            if parsed:
                tool_name, tool_args = parsed
                fake_id = f"text_tc_{iteration}"
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [{"id": fake_id, "type": "function", "function": {
                        "name": tool_name, "arguments": json.dumps(tool_args)
                    }}],
                })
                result = execute_tool(name=tool_name, arguments=tool_args, shop_id=shop_id, user_id=user_id, role=role)
                messages.append({"role": "tool", "tool_call_id": fake_id, "content": result})
                continue

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
