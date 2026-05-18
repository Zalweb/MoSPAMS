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

MAX_TOOL_ITERATIONS = 5

_GROUNDING_RULE = (
    "CRITICAL — NEVER HALLUCINATE DATA: "
    "You must NEVER invent, guess, or make up names, numbers, IDs, or any database records. "
    "For any question about shop data (customers, mechanics, jobs, parts, sales, revenue, payments), "
    "you MUST call the appropriate tool first and base your answer solely on the tool result. "
    "If you are about to list customer names, mechanic names, job details, or any records "
    "without having called a tool, STOP and call the tool first. "
    "If a required tool is not available, say so honestly — never invent the data. "
    "For greetings, general conversation, and non-data questions, respond naturally."
)

def _tools_for_role(role: str) -> list:
    if role == "owner":
        return OWNER_TOOLS
    if role == "staff":
        return STAFF_TOOLS
    if role == "mechanic":
        return MECHANIC_TOOLS
    return CUSTOMER_TOOLS

def _system_prompt(role: str, shop_id: int, rag_context: list[str]) -> str:
    ctx   = "\n\n".join(rag_context) if rag_context else "No additional context available."
    today = date.today().isoformat()

    if role == "owner":
        persona = (
            f"You are a helpful AI shop assistant for a motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n"
            "You have full access to shop data: inventory, revenue, jobs, mechanics, sales, and customers.\n"
        )
    elif role == "staff":
        persona = (
            f"You are a helpful AI shop assistant for a motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n"
            "You have access to: inventory, service jobs, mechanics, and customer records. "
            "You do NOT have access to revenue or financial data.\n"
        )
    elif role == "mechanic":
        persona = (
            f"You are a helpful AI assistant for a mechanic at shop ID {shop_id}.\n"
            f"Today is {today}.\n"
            "You can only view your own assigned service jobs.\n"
        )
    else:
        persona = (
            f"You are a helpful customer service assistant for a motorcycle shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n"
            "You can help with: your service history, bookings, vehicles, payments, and shop info.\n"
        )

    rules = (
        "RULES:\n"
        "1. For shop data questions (inventory, jobs, sales, customers, etc.), invoke the correct tool — do NOT guess the data.\n"
        "2. After receiving a tool result, write a clear concise answer in plain text. Do NOT call more tools.\n"
        "3. Format lists with bullet points. Use PHP (₱) for currency.\n"
        f"4. {_GROUNDING_RULE}\n"
    )

    return f"{persona}\n{rules}\nShop Knowledge Base:\n{ctx}"


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
            result = execute_tool(name=tc["function"]["name"], arguments=args, shop_id=shop_id, user_id=user_id)
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    # Loop exhausted — force a final text answer from accumulated tool results
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
            result = execute_tool(name=tc["function"]["name"], arguments=args, shop_id=shop_id, user_id=user_id)
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    if final_answer is not None:
        # Yield word-by-word for typewriter effect (no second LLM call needed)
        words = final_answer.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield chunk
            await asyncio.sleep(0.015)
        append_message(session_id, "assistant", final_answer)
    else:
        # Loop exhausted without a text response — synthesize via real streaming
        accumulated = ""
        for token in provider.chat_stream(messages):
            accumulated += token
            yield token
        if accumulated:
            append_message(session_id, "assistant", accumulated)
