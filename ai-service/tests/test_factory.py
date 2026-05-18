import os
import pytest

def test_factory_returns_nvidia_nim_by_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "nvidia_nim")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    import importlib
    import config
    importlib.reload(config)
    from llm.factory import get_llm_provider
    from llm.openai_compat import OpenAICompatClient
    provider = get_llm_provider()
    assert isinstance(provider, OpenAICompatClient)

def test_factory_returns_ollama_fallback(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    import importlib
    import config
    importlib.reload(config)
    from llm.factory import get_llm_provider
    from llm.ollama_client import OllamaClient
    provider = get_llm_provider()
    assert isinstance(provider, OllamaClient)
