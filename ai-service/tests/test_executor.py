# ai-service/tests/test_executor.py
import json
from unittest.mock import patch, MagicMock

def _mock_response(data):
    m = MagicMock()
    m.json.return_value = data
    m.raise_for_status = MagicMock()
    return m

def test_execute_get_low_stock_parts(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_URL", "http://laravel:8000")
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "secret")

    with patch("httpx.get", return_value=_mock_response([{"part_name": "Oil", "stock_quantity": 2}])):
        from tools.executor import execute_tool
        result = execute_tool(
            name="get_low_stock_parts",
            arguments={},
            shop_id=1,
            user_id=42,
        )
    data = json.loads(result)
    assert data[0]["part_name"] == "Oil"

def test_execute_unknown_tool_returns_error():
    from tools.executor import execute_tool
    result = execute_tool(name="unknown_tool", arguments={}, shop_id=1, user_id=1)
    assert "unknown" in result.lower()
