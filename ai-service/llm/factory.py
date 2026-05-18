import config
from llm.base import LLMProvider

def get_llm_provider() -> LLMProvider:
    provider = config.LLM_PROVIDER
    if provider in ("nvidia_nim", "groq", "openai"):
        from llm.openai_compat import OpenAICompatClient
        return OpenAICompatClient()
    if provider == "anthropic":
        from llm.anthropic_client import AnthropicClient
        return AnthropicClient()
    if provider == "gemini":
        from llm.gemini_client import GeminiClient
        return GeminiClient()
    # default + explicit ollama
    from llm.ollama_client import OllamaClient
    return OllamaClient()

def get_fallback_provider() -> LLMProvider:
    from llm.ollama_client import OllamaClient
    return OllamaClient()
