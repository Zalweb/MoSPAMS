import anthropic as sdk
import config
from llm.base import LLMProvider, ChatResponse

class AnthropicClient(LLMProvider):
    def __init__(self):
        self._client = sdk.Anthropic(api_key=config.LLM_API_KEY)
        self._model = config.LLM_MODEL  # e.g. claude-haiku-4-5-20251001

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> ChatResponse:
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs = [m for m in messages if m["role"] != "system"]
        kwargs: dict = dict(model=self._model, max_tokens=1024, system=system, messages=user_msgs)
        if tools:
            # Convert OpenAI tool format → Anthropic format
            kwargs["tools"] = [
                {"name": t["function"]["name"],
                 "description": t["function"].get("description", ""),
                 "input_schema": t["function"]["parameters"]}
                for t in tools
            ]
        raw = self._client.messages.create(**kwargs)
        content = next((b.text for b in raw.content if hasattr(b, "text")), "")
        return ChatResponse(content=content, raw=raw)

    def is_available(self) -> bool:
        return bool(config.LLM_API_KEY)
