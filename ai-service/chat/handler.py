import json
from datetime import date
from llm.factory import get_llm_provider, get_fallback_provider
from rag.embedder import embed
from rag.vectorstore import query
from tools.definitions import OWNER_TOOLS, STAFF_TOOLS, MECHANIC_TOOLS, CUSTOMER_TOOLS
from tools.executor import execute_tool
from chat.history import get_history, append_message

MAX_TOOL_ITERATIONS = 5

_GROUNDING_RULE = (
    "IMPORTANT: Only answer using tool results or the Shop Knowledge Base above. "
    "If the information is not available through tools or documents, say "
    "'I don't have access to that information.' Never guess or make up answers."
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
    ctx = "\n\n".join(rag_context) if rag_context else "No additional context available."
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
        "1. For any data question, you MUST invoke the correct tool function — do NOT write text instead of calling the tool.\n"
        "2. After receiving a tool result, write a clear concise answer in plain text. Do NOT call more tools.\n"
        "3. Format lists with bullet points. Use PHP (₱) for currency.\n"
        f"4. {_GROUNDING_RULE}\n"
    )

    return f"{persona}\n{rules}\nShop Knowledge Base:\n{ctx}"

async def handle_chat(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> str:
    embedding = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    system = _system_prompt(role, shop_id, rag_chunks)
    history = get_history(session_id)
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    append_message(session_id, "user", message)

    tools = _tools_for_role(role)

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
