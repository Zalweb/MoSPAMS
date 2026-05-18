from abc import ABC, abstractmethod
from typing import Generator


class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> "ChatResponse":
        pass

    def chat_stream(self, messages: list[dict]) -> Generator[str, None, None]:
        """Yield text tokens as they arrive. No tool use during streaming."""
        raise NotImplementedError

    @abstractmethod
    def is_available(self) -> bool:
        pass


class ChatResponse:
    def __init__(self, content: str | None, tool_calls: list[dict] | None = None, raw=None):
        self.content    = content
        self.tool_calls = tool_calls or []
        self.raw        = raw
