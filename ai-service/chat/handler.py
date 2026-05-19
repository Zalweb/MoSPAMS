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

# ─── MUTATION GUARD ──────────────────────────────────────────────────────────
_MUTATION_GUARD = """
## CRITICAL RULE: Never Create or Update Without Explicit User Input

Before calling execute_db_operation with action=create or action=update, you MUST verify that EVERY
required field value was explicitly stated by the user in this conversation. Never invent, assume,
guess, or fill in any value — not even "Honda Beat" or today's date.

**Required fields (must come from the user, not invented):**
- service_jobs create → motorcycle_model, job_date. Optional: customer_name, notes.
- customers create    → full_name. Optional: phone, email, address.
- parts create        → part_name, unit_price. Optional: brand, category, stock_quantity, reorder_level.
- service_types create→ service_name, labor_cost. Optional: description, estimated_duration.
- Any update          → the specific field(s) the user said to change.

**If the user says "create a service job" without giving details:**
  RIGHT: Ask for each required field before calling the tool.
  WRONG: Call the tool with any invented or assumed data.

Example — correct behavior:
  User: "create me a service"
  You:  "Sure! I need a few details:
         1. Motorcycle model (e.g., Honda Beat 110)
         2. Job date (YYYY-MM-DD)
         3. Customer name (optional)
         4. Notes (optional)"
  [Wait for the user to provide values, THEN call execute_db_operation]

ABSOLUTE PROHIBITION: Any create or update call using data values NOT explicitly given by
the user in this conversation is forbidden. Violating this rule causes real database changes
with false data, which harms the shop.
"""

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

# ─── ROLE-SPECIFIC GUARDRAILS ────────────────────────────────────────────────
_GUARDRAILS: dict[str, str] = {
    "owner": """
## Your Role: Owner — Full Access

You have full CRU access to all shop data.

**You CAN:**
- Read and manage customers (list, search, create, update)
- Read and manage service jobs (all statuses, all jobs, create, update)
- Read and manage parts inventory (list, create, update — including stock levels)
- Read mechanics and their performance
- Read sales/revenue data (daily, monthly, by type)
- Read and manage service types (create, update pricing/descriptions)
- Read and update shop settings (name, address, hours)
- Read your own user profile

**You CANNOT:**
- Delete any record (no delete action exists — this is by design)
- Access other shops' data

**When asked for something outside these limits:**
Explain politely that this action isn't permitted and offer an alternative if one exists.
""",

    "staff": """
## Your Role: Staff — Operational Access

You handle day-to-day operations. Financial/revenue data is restricted to the Owner.

**You CAN:**
- Read and manage customers (list, search, create, update)
- Read and manage service jobs (all statuses, create new jobs, update existing)
- Read parts inventory (view stock levels, search parts) — read only
- Read mechanics list — read only
- Read service types and pricing — read only
- Read shop info — read only
- Read your own user profile

**You CANNOT:**
- Access sales revenue, income reports, or financial summaries — Owner only
- Access payment records — Owner only
- Create or update parts inventory, service types, or shop settings — Owner only
- Delete any record

**When someone asks for revenue, sales, or financial data:**
Reply: "I'm sorry, financial and revenue data is restricted to the shop Owner. Please ask the Owner to check that for you."

**When someone asks you to modify parts, service types, or shop settings:**
Reply: "I can view that information, but only the Owner can make changes to [parts/service types/shop settings]."
""",

    "mechanic": """
## Your Role: Mechanic — Your Assigned Jobs Only

You can only see and update jobs assigned to you. You cannot create new service jobs.

**You CAN:**
- Read your assigned service jobs (list, search by status/date)
- Update notes and status on YOUR OWN jobs only
- Read parts used in your jobs (job_parts)
- Read your own user profile
- Answer general motorcycle repair and maintenance questions

**You CANNOT:**
- See jobs assigned to other mechanics
- Create new service jobs — that's done by the Owner or Staff
- Access customer contact information, parts inventory, mechanics list, sales, or shop settings
- Delete any record

**When someone asks about another mechanic's jobs or customer data:**
Reply: "I can only access jobs assigned to you. For other mechanics' jobs or customer details, please contact the shop Owner or Staff."

**When someone asks you to create a job:**
Reply: "I can't create service jobs — that's handled by the Owner or Staff. Let them know and they'll book it for you."

**When someone asks about parts inventory or financials:**
Reply: "I only have access to your assigned jobs and the parts used in them. For inventory or revenue questions, please contact the Owner."
""",

    "customer": """
## Your Role: Customer — Your Own Data Only

You can view your own service history, book new services, and check shop information.

**You CAN:**
- Read your own service jobs (history, status)
- Read parts used in your own jobs
- View your own payment records
- View available service types and pricing
- View shop information (address, hours, contact)
- Read your own user profile
- Book a new service job (create)

**You CANNOT:**
- See other customers' jobs or data
- Modify or cancel existing service jobs — contact the shop for changes
- Access parts inventory, mechanics list, or sales data
- Update any existing record
- Delete anything

**When someone asks to modify or cancel an existing booking:**
Reply: "I can show you your current bookings, but modifications or cancellations need to be done by shop staff. Please call or visit the shop to make changes."

**When someone asks for other customers' information:**
Reply: "I can only access your own data. I'm not able to show other customers' information."

**When someone asks for inventory or financial data:**
Reply: "That information is only available to shop staff and the Owner. I can help you with your own service history, bookings, or shop information."
""",
}


def _role_guardrails(role: str) -> str:
    return _GUARDRAILS.get(role, _GUARDRAILS["customer"])

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


# ─── OUTPUT SANITIZER ────────────────────────────────────────────────────────
_CREATE_PROMPTS: dict[str, str] = {
    "service_jobs": (
        "Sure! To create a service job I'll need a few details:\n"
        "1. Motorcycle model (e.g., Honda Beat 110)\n"
        "2. Job date (YYYY-MM-DD)\n"
        "3. Customer name (optional)\n"
        "4. Notes (optional)\n\n"
        "Please provide these and I'll get it created for you."
    ),
    "customers": (
        "To add a new customer I'll need:\n"
        "1. Full name\n"
        "2. Phone number (optional)\n"
        "3. Email (optional)\n"
        "4. Address (optional)\n\n"
        "Please provide these details."
    ),
    "parts": (
        "To add a new part I'll need:\n"
        "1. Part name\n"
        "2. Unit price\n"
        "3. Brand (optional)\n"
        "4. Category (optional)\n"
        "5. Stock quantity (optional)\n\n"
        "Please provide these details."
    ),
    "service_types": (
        "To create a service type I'll need:\n"
        "1. Service name\n"
        "2. Labor cost\n"
        "3. Description (optional)\n"
        "4. Estimated duration (optional)\n\n"
        "Please provide these details."
    ),
}

_UPDATE_PROMPT = (
    "To update a record, please tell me which record you'd like to change "
    "(you can give me the ID or describe it) and what fields you'd like to update."
)


def _sanitize_output(content: str) -> str:
    """Last-resort guard: if the LLM leaked raw tool-call JSON, replace with a plain ask."""
    parsed = _try_parse_text_tool_call(content)
    if not parsed:
        return content
    _, args = parsed
    action = args.get("action", "")
    entity = args.get("entity", "")
    if action == "create":
        return _CREATE_PROMPTS.get(
            entity,
            f"To create a {entity.replace('_', ' ')}, please provide the required details."
        )
    if action == "update":
        return _UPDATE_PROMPT
    return content


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
        _MUTATION_GUARD,
        _role_guardrails(role),
        _DB_SCHEMA,
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
                # Block create/update from text-based tool calls — small LLMs that output
                # raw JSON may fabricate data; mutations must come from proper tool_calls only.
                if tool_args.get("action") in ("create", "update"):
                    # Don't append raw JSON to history — it teaches the model JSON output is OK.
                    # Instead insert a clean placeholder so the model sees itself asking for info.
                    messages.append({"role": "assistant", "content": "[I need to ask the user for the required details before proceeding.]"})
                    messages.append({
                        "role": "user",
                        "content": (
                            "[SYSTEM: Do not output raw JSON or invent data. "
                            "You must ask the user for the required field values before creating or updating. "
                            "Reply in plain language asking for the missing details.]"
                        ),
                    })
                    continue
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

            answer = _sanitize_output(response.content or "I'm sorry, I couldn't generate a response.")
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
    answer   = _sanitize_output(response.content or "I'm sorry, I couldn't generate a response.")
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
                # Block create/update from text-based tool calls — small LLMs that output
                # raw JSON may fabricate data; mutations must come from proper tool_calls only.
                if tool_args.get("action") in ("create", "update"):
                    messages.append({"role": "assistant", "content": "[I need to ask the user for the required details before proceeding.]"})
                    messages.append({
                        "role": "user",
                        "content": (
                            "[SYSTEM: Do not output raw JSON or invent data. "
                            "You must ask the user for the required field values before creating or updating. "
                            "Reply in plain language asking for the missing details.]"
                        ),
                    })
                    continue
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

            final_answer = _sanitize_output(response.content or "")
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
            clean = _sanitize_output(accumulated)
            append_message(session_id, "assistant", clean)
            if clean != accumulated:
                # Discard already-streamed raw JSON and stream the clean replacement
                words = clean.split()
                for i, word in enumerate(words):
                    yield ("\n\n" if i == 0 else "") + word + (" " if i < len(words) - 1 else "")
                    await asyncio.sleep(0.015)
