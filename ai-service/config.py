import os

LLM_PROVIDER         = os.getenv("LLM_PROVIDER", "nvidia_nim")
LLM_MODEL            = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")
LLM_API_KEY          = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL         = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
LLM_FALLBACK_MODEL   = os.getenv("LLM_FALLBACK_MODEL", "phi3:mini")
OLLAMA_BASE_URL      = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
LARAVEL_INTERNAL_URL = os.getenv("LARAVEL_INTERNAL_URL", "http://laravel-app:8000")
CHROMA_PATH          = os.getenv("CHROMA_PATH", "/data/chromadb")
MAX_UPLOAD_BYTES     = 10 * 1024 * 1024   # 10 MB
MAX_DOCS_PER_SHOP    = 20
MAX_HISTORY_MESSAGES = 10
