import json
from datetime import date
from llm.factory import get_llm_provider, get_fallback_provider
from rag.embedder import embed
from rag.vectorstore import query
from tools.definitions import OWNER_TOOLS, CUSTOMER_TOOLS
from tools.executor import execute_tool
from chat.history import get_history, append_message

MAX_TOOL_ITERATIONS = 5

def _system_prompt(role: str, shop_id: int, rag_context: list[str]) -> str:
    ctx = "\n\n".join(rag_context) if rag_context else "No additional context available."
    today = date.today().isoformat()
    if role in ("owner", "staff"):
        return (
            f"You are a helpful AI shop assistant for a motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n"
            "Use tools to fetch data, then immediately answer the user in plain text. "
            "Call at most ONE tool per question. Once you have the tool result, write your answer — do NOT call more tools.\n"
            "Format lists with bullet points. Use PHP for currency.\n\n"
            f"Shop Knowledge Base:\n{ctx}"
        )
    return (
        f"You are a helpful customer service assistant for a motorcycle shop (shop ID {shop_id}).\n"
        f"Today is {today}.\n"
        "Help customers with: service history, booking, vehicles, payments, and shop info.\n"
        "Call at most ONE tool per question. Once you have the result, write your answer — do NOT call more tools.\n"
        "Be polite and professional. If you cannot help, offer to escalate to shop staff.\n\n"
        f"Shop Knowledge Base:\n{ctx}"
    )

async def handle_chat(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> str:
    embedding = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    system = _system_prompt(role, shop_id, rag_chunks)
    history = get_history(session_id)
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    append_message(session_id, "user", message)

    tools = OWNER_TOOLS if role in ("owner", "staff") else CUSTOMER_TOOLS

    provider = get_llm_provider()
    if not provider.is_available():
        provider = get_fallback_provider()
        tools = []

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
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": tc["function"],
                }
                for tc in response.tool_calls
            ],
        })

        for tc in response.tool_calls:
            args = json.loads(tc["function"]["arguments"])
            result = execute_tool(
                name=tc["function"]["name"],
                arguments=args,
                shop_id=shop_id,
                user_id=user_id,
            )
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    # Loop exhausted — force a final text answer from accumulated tool results
    response = provider.chat(messages, tools=None)
    answer = response.content or "I'm sorry, I couldn't generate a response."
    append_message(session_id, "assistant", answer)
    return answer
