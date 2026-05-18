import pytest
from unittest.mock import patch, MagicMock


def test_ollama_chat_returns_content(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama:11434")
    monkeypatch.setenv("LLM_FALLBACK_MODEL", "phi3:mini")

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"message": {"content": "Hi from Ollama"}}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.post", return_value=mock_resp):
        from llm.ollama_client import OllamaClient
        client = OllamaClient()
        result = client.chat([{"role": "user", "content": "Hi"}])

    assert result.content == "Hi from Ollama"
    assert result.tool_calls == []


def test_ollama_is_available_false_when_unreachable(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama:11434")
    import httpx
    with patch("httpx.get", side_effect=httpx.ConnectError("refused")):
        from llm.ollama_client import OllamaClient
        client = OllamaClient()
        assert client.is_available() is False
