import importlib
import sys


def _reload_factory():
    """Reload config + factory so monkeypatched env vars take effect."""
    for mod in ("config", "llm.factory"):
        if mod in sys.modules:
            importlib.reload(sys.modules[mod])


def test_factory_returns_nvidia_nim_by_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "nvidia_nim")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    _reload_factory()
    from llm.factory import get_llm_provider
    from llm.openai_compat import OpenAICompatClient
    provider = get_llm_provider()
    assert isinstance(provider, OpenAICompatClient)


def test_factory_returns_ollama_fallback(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    _reload_factory()
    from llm.factory import get_llm_provider
    from llm.ollama_client import OllamaClient
    provider = get_llm_provider()
    assert isinstance(provider, OllamaClient)


def test_get_fallback_provider_always_returns_ollama(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "nvidia_nim")
    _reload_factory()
    from llm.factory import get_fallback_provider
    from llm.ollama_client import OllamaClient
    fallback = get_fallback_provider()
    assert isinstance(fallback, OllamaClient)
