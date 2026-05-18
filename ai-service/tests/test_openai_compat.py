import sys
import importlib
import pytest
from unittest.mock import MagicMock, patch


def test_chat_returns_content(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
    monkeypatch.setenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")

    mock_choice = MagicMock()
    mock_choice.message.content = "Hello!"
    mock_choice.message.tool_calls = None
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("openai.OpenAI") as MockOpenAI:
        instance = MockOpenAI.return_value
        instance.chat.completions.create.return_value = mock_response

        # Reload config so monkeypatched env vars take effect
        for mod in ("config", "llm.openai_compat"):
            if mod in sys.modules:
                importlib.reload(sys.modules[mod])

        from llm.openai_compat import OpenAICompatClient
        client = OpenAICompatClient()
        result = client.chat([{"role": "user", "content": "Hi"}])

    assert result.content == "Hello!"
    assert result.tool_calls == []
