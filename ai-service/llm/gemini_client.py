import google.generativeai as genai
import config
from llm.base import LLMProvider, ChatResponse

class GeminiClient(LLMProvider):
    def __init__(self):
        genai.configure(api_key=config.LLM_API_KEY)
        self._model = genai.GenerativeModel(config.LLM_MODEL)

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> ChatResponse:
        history = [
            {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
            for m in messages if m["role"] in ("user", "assistant")
        ]
        chat = self._model.start_chat(history=history[:-1])
        response = chat.send_message(history[-1]["parts"][0])
        return ChatResponse(content=response.text)

    def is_available(self) -> bool:
        return bool(config.LLM_API_KEY)
