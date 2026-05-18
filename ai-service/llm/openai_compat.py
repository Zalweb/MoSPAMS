from openai import OpenAI
import config
from llm.base import LLMProvider, ChatResponse


class OpenAICompatClient(LLMProvider):
    def __init__(self):
        self._client = OpenAI(
            base_url=config.LLM_BASE_URL,
            api_key=config.LLM_API_KEY,
        )
        self._model = config.LLM_MODEL

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> ChatResponse:
        kwargs: dict = dict(
            model=self._model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        raw = self._client.chat.completions.create(**kwargs)
        choice = raw.choices[0].message
        tool_calls = []
        if choice.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in choice.tool_calls
            ]
        return ChatResponse(content=choice.content, tool_calls=tool_calls, raw=raw)

    def is_available(self) -> bool:
        return bool(config.LLM_API_KEY)
