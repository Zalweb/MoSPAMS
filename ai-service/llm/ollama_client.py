import httpx
import config
from llm.base import LLMProvider, ChatResponse


class OllamaClient(LLMProvider):
    def __init__(self):
        self._base = config.OLLAMA_BASE_URL
        self._model = config.LLM_FALLBACK_MODEL

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> ChatResponse:
        # Ollama does not support tool calling — plain generation only
        resp = httpx.post(
            f"{self._base}/api/chat",
            json={"model": self._model, "messages": messages, "stream": False},
            timeout=120.0,
        )
        resp.raise_for_status()
        return ChatResponse(content=resp.json()["message"]["content"])

    def is_available(self) -> bool:
        try:
            httpx.get(f"{self._base}/api/tags", timeout=3.0)
            return True
        except Exception:
            return False
