# ai-service/tests/test_handler.py
import json, pytest
from unittest.mock import patch, MagicMock
from llm.base import ChatResponse

def _no_tool_response(text: str) -> ChatResponse:
    return ChatResponse(content=text, tool_calls=[])

def _tool_then_text(tool_name: str, args: dict, final_text: str):
    call_count = [0]
    def side_effect(messages, tools=None):
        call_count[0] += 1
        if call_count[0] == 1:
            return ChatResponse(
                content=None,
                tool_calls=[{"id": "tc1", "function": {"name": tool_name, "arguments": json.dumps(args)}}],
            )
        return ChatResponse(content=final_text, tool_calls=[])
    return side_effect

@pytest.mark.asyncio
async def test_handle_plain_question():
    from chat.handler import handle_chat
    with patch("chat.handler.get_llm_provider") as mock_prov, \
         patch("chat.handler.query", return_value=[]), \
         patch("chat.handler.embed", return_value=[0.1] * 384):
        mock_prov.return_value.chat.return_value = _no_tool_response("2 + 2 is 4")
        mock_prov.return_value.is_available.return_value = True
        result = await handle_chat(
            shop_id=1, user_id=1, role="owner",
            session_id="s1", message="What is 2+2?"
        )
    assert "4" in result

@pytest.mark.asyncio
async def test_handle_tool_call():
    from chat.handler import handle_chat
    with patch("chat.handler.get_llm_provider") as mock_prov, \
         patch("chat.handler.get_fallback_provider") as mock_fall, \
         patch("chat.handler.query", return_value=[]), \
         patch("chat.handler.embed", return_value=[0.1] * 384), \
         patch("chat.handler.execute_tool", return_value='[{"part_name":"Oil","stock_quantity":2}]'):
        mock_prov.return_value.is_available.return_value = True
        mock_prov.return_value.chat.side_effect = _tool_then_text(
            "get_low_stock_parts", {}, "You have 1 low stock part: Oil"
        )
        result = await handle_chat(
            shop_id=1, user_id=1, role="owner",
            session_id="s2", message="Which parts are low?"
        )
    assert "Oil" in result
