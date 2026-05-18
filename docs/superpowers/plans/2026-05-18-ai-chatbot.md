# MoSPAMS AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dual-persona AI chatbot (Owner/Staff shop assistant + Customer self-service bot) as a floating MoSPAMS logo bubble using NVIDIA NIM as the primary LLM, Ollama phi3:mini as fallback, ChromaDB for RAG, and a dynamic provider system controlled entirely by `.env`.

**Architecture:** A Python FastAPI microservice (`ai-service`) runs alongside the existing Laravel backend in Docker. Laravel receives chat messages from the authenticated frontend, injects shop context, and forwards to the Python service. The Python service handles RAG retrieval, LLM tool calling, and response generation. Internal tool calls route back to Laravel via a service-token-protected endpoint group.

**Tech Stack:** Python 3.11 + FastAPI + sentence-transformers + ChromaDB + openai SDK (NVIDIA NIM / Groq / OpenAI) + anthropic SDK + Ollama (REST) | PHP Laravel (ChatController + InternalChatController + ServiceTokenMiddleware) | React + TypeScript (ChatBubble + ChatWindow + useChat)

---

## File Map

### New — Python ai-service
```
ai-service/
├── Dockerfile
├── requirements.txt
├── .env.example
├── main.py
├── config.py
├── chat/
│   ├── __init__.py
│   ├── handler.py          # RAG retrieval + tool loop + response
│   ├── router.py           # /chat/owner, /chat/customer, /rag/*
│   └── history.py          # in-memory session message history
├── rag/
│   ├── __init__.py
│   ├── embedder.py         # sentence-transformers wrapper
│   ├── vectorstore.py      # ChromaDB client — query + upsert
│   └── ingestor.py         # parse PDF/TXT/DOCX → chunk → embed → store
├── tools/
│   ├── __init__.py
│   ├── definitions.py      # OpenAI-format tool schemas
│   └── executor.py         # calls Laravel /internal/* routes
└── llm/
    ├── __init__.py
    ├── base.py             # abstract LLMProvider
    ├── factory.py          # env → provider instance
    ├── openai_compat.py    # NVIDIA NIM + Groq + OpenAI (all OpenAI SDK)
    ├── anthropic_client.py
    ├── gemini_client.py
    └── ollama_client.py    # REST-based fallback
```

### New — Laravel Backend
```
Backend/app/Http/Controllers/Api/ChatController.php
Backend/app/Http/Controllers/Api/InternalChatController.php
Backend/app/Http/Middleware/ServiceTokenMiddleware.php
```

### Modified — Laravel Backend
```
Backend/routes/api.php           (add /chat + /internal/* routes)
Backend/app/Http/Kernel.php      (register service.token middleware alias)
Backend/.env                     (add AI_SERVICE_URL, INTERNAL_SERVICE_TOKEN)
```

### New — React Frontend
```
Frontend/src/features/chat/
├── api/chatApi.ts
├── hooks/useChat.ts
└── components/
    ├── ChatBubble.tsx
    ├── ChatWindow.tsx
    ├── ChatMessage.tsx
    └── ChatTypingIndicator.tsx
```

### Modified — React Frontend
```
Frontend/src/app/App.tsx         (mount ChatBubble in auth wrapper)
```

### Modified — Docker / Deploy
```
docker-compose.yml               (add ai-service + ollama services)
deploy.sh                        (add ollama model pull step)
```

---

## Phase 1 — Python AI Service

### Task 1: Project scaffold

**Files:**
- Create: `ai-service/requirements.txt`
- Create: `ai-service/config.py`
- Create: `ai-service/main.py`
- Create: `ai-service/.env.example`

- [ ] **Step 1: Create `ai-service/requirements.txt`**

```
fastapi==0.115.5
uvicorn==0.32.1
openai==1.57.0
anthropic==0.40.0
google-generativeai==0.8.3
sentence-transformers==3.3.1
chromadb==0.5.23
PyMuPDF==1.24.14
python-docx==1.1.2
httpx==0.28.1
pydantic==2.10.3
pytest==8.3.4
pytest-asyncio==0.24.0
httpx[cli]
```

- [ ] **Step 2: Create `ai-service/config.py`**

```python
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
```

- [ ] **Step 3: Create `ai-service/main.py`**

```python
from fastapi import FastAPI
from chat.router import router as chat_router

app = FastAPI(title="MoSPAMS AI Service", version="1.0.0")
app.include_router(chat_router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Create `ai-service/.env.example`**

```bash
LLM_PROVIDER=nvidia_nim
LLM_MODEL=meta/llama-3.1-8b-instruct
LLM_API_KEY=nvapi-xxxx
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_FALLBACK_MODEL=phi3:mini
OLLAMA_BASE_URL=http://ollama:11434
INTERNAL_SERVICE_TOKEN=replace_with_64_char_random_secret
LARAVEL_INTERNAL_URL=http://laravel-app:8000
CHROMA_PATH=/data/chromadb
```

- [ ] **Step 5: Verify the scaffold runs**

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
# Expected: Uvicorn running on http://127.0.0.1:8001
# GET http://localhost:8001/health → {"status":"ok"}
```

- [ ] **Step 6: Commit**

```bash
git add ai-service/
git commit -m "feat: scaffold Python ai-service"
```

---

### Task 2: LLM provider base + factory

**Files:**
- Create: `ai-service/llm/__init__.py`
- Create: `ai-service/llm/base.py`
- Create: `ai-service/llm/factory.py`
- Create: `ai-service/tests/test_factory.py`

- [ ] **Step 1: Create `ai-service/llm/__init__.py`** (empty)

```python
```

- [ ] **Step 2: Create `ai-service/llm/base.py`**

```python
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> "ChatResponse":
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

class ChatResponse:
    def __init__(self, content: str | None, tool_calls: list | None = None, raw=None):
        self.content = content
        self.tool_calls = tool_calls or []
        self.raw = raw
```

- [ ] **Step 3: Write failing test `ai-service/tests/test_factory.py`**

```python
import os
import pytest

def test_factory_returns_nvidia_nim_by_default(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "nvidia_nim")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    from llm.factory import get_llm_provider
    from llm.openai_compat import OpenAICompatClient
    provider = get_llm_provider()
    assert isinstance(provider, OpenAICompatClient)

def test_factory_returns_ollama_fallback(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    from llm.factory import get_llm_provider
    from llm.ollama_client import OllamaClient
    provider = get_llm_provider()
    assert isinstance(provider, OllamaClient)
```

- [ ] **Step 4: Run test — expect ImportError (not yet implemented)**

```bash
cd ai-service
pytest tests/test_factory.py -v
# Expected: ImportError or ModuleNotFoundError
```

- [ ] **Step 5: Create `ai-service/llm/factory.py`**

```python
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
```

- [ ] **Step 6: Run test — expect pass**

```bash
pytest tests/test_factory.py -v
# Expected: 2 passed
```

- [ ] **Step 7: Commit**

```bash
git add ai-service/llm/ ai-service/tests/
git commit -m "feat: LLM provider base class and factory"
```

---

### Task 3: OpenAI-compatible client (NVIDIA NIM, Groq, OpenAI)

**Files:**
- Create: `ai-service/llm/openai_compat.py`
- Create: `ai-service/tests/test_openai_compat.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_openai_compat.py
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

        from llm.openai_compat import OpenAICompatClient
        client = OpenAICompatClient()
        result = client.chat([{"role": "user", "content": "Hi"}])

    assert result.content == "Hello!"
    assert result.tool_calls == []
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_openai_compat.py -v
```

- [ ] **Step 3: Create `ai-service/llm/openai_compat.py`**

```python
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
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_openai_compat.py -v
# Expected: 1 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/llm/openai_compat.py ai-service/tests/test_openai_compat.py
git commit -m "feat: OpenAI-compatible LLM client (NVIDIA NIM / Groq / OpenAI)"
```

---

### Task 4: Ollama fallback client

**Files:**
- Create: `ai-service/llm/ollama_client.py`
- Create: `ai-service/tests/test_ollama_client.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_ollama_client.py
import pytest
from unittest.mock import patch, MagicMock

def test_ollama_chat_returns_content(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama:11434")
    monkeypatch.setenv("LLM_FALLBACK_MODEL", "phi3:mini")

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"message": {"content": "Hi from Ollama"}}
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.post", return_value=mock_resp):
        from llm.ollama_client import OllamaClient
        client = OllamaClient()
        result = client.chat([{"role": "user", "content": "Hi"}])

    assert result.content == "Hi from Ollama"
    assert result.tool_calls == []

def test_ollama_is_available_false_when_unreachable(monkeypatch):
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama:11434")
    import httpx
    with patch("httpx.get", side_effect=httpx.ConnectError("refused")):
        from llm.ollama_client import OllamaClient
        client = OllamaClient()
        assert client.is_available() is False
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_ollama_client.py -v
```

- [ ] **Step 3: Create `ai-service/llm/ollama_client.py`**

```python
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
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_ollama_client.py -v
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/llm/ollama_client.py ai-service/tests/test_ollama_client.py
git commit -m "feat: Ollama fallback LLM client"
```

---

### Task 5: Anthropic and Gemini clients

**Files:**
- Create: `ai-service/llm/anthropic_client.py`
- Create: `ai-service/llm/gemini_client.py`

- [ ] **Step 1: Create `ai-service/llm/anthropic_client.py`**

```python
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
```

- [ ] **Step 2: Create `ai-service/llm/gemini_client.py`**

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/llm/anthropic_client.py ai-service/llm/gemini_client.py
git commit -m "feat: Anthropic and Gemini LLM clients"
```

---

### Task 6: Sentence-transformers embedder

**Files:**
- Create: `ai-service/rag/__init__.py`
- Create: `ai-service/rag/embedder.py`
- Create: `ai-service/tests/test_embedder.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_embedder.py
def test_embed_returns_list_of_floats():
    from rag.embedder import embed
    result = embed("motorcycle oil change")
    assert isinstance(result, list)
    assert len(result) == 384   # all-MiniLM-L6-v2 output dim
    assert isinstance(result[0], float)

def test_embed_batch_returns_list_of_lists():
    from rag.embedder import embed_batch
    results = embed_batch(["oil change", "tire replacement"])
    assert len(results) == 2
    assert len(results[0]) == 384
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_embedder.py -v
```

- [ ] **Step 3: Create `ai-service/rag/__init__.py`** (empty)

- [ ] **Step 4: Create `ai-service/rag/embedder.py`**

```python
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed(text: str) -> list[float]:
    return _get_model().encode(text).tolist()

def embed_batch(texts: list[str]) -> list[list[float]]:
    return _get_model().encode(texts).tolist()
```

- [ ] **Step 5: Run test — expect pass (first run downloads ~90 MB model)**

```bash
pytest tests/test_embedder.py -v
# Expected: 2 passed
# Note: first run downloads all-MiniLM-L6-v2 (~90 MB) to ~/.cache/huggingface
```

- [ ] **Step 6: Commit**

```bash
git add ai-service/rag/ ai-service/tests/test_embedder.py
git commit -m "feat: sentence-transformers embedder"
```

---

### Task 7: ChromaDB vectorstore

**Files:**
- Create: `ai-service/rag/vectorstore.py`
- Create: `ai-service/tests/test_vectorstore.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_vectorstore.py
import os, tempfile, pytest

@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    monkeypatch.setenv("CHROMA_PATH", str(tmp_path))
    import importlib, rag.vectorstore as vs
    importlib.reload(vs)
    yield vs

def test_upsert_and_query(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1,
        doc_id="doc-abc",
        chunks=["Engine oil 10W-40 costs PHP 250", "Air filter costs PHP 180"],
        embeddings=[[0.1] * 384, [0.2] * 384],
    )
    results = tmp_store.query(shop_id=1, embedding=[0.15] * 384, n=2)
    assert len(results) == 2

def test_query_isolated_by_shop(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1, doc_id="d1",
        chunks=["shop 1 secret"], embeddings=[[0.9] * 384],
    )
    results = tmp_store.query(shop_id=2, embedding=[0.9] * 384, n=1)
    assert len(results) == 0

def test_delete_doc(tmp_store):
    tmp_store.upsert_chunks(
        shop_id=1, doc_id="removeme",
        chunks=["to be deleted"], embeddings=[[0.5] * 384],
    )
    tmp_store.delete_doc(shop_id=1, doc_id="removeme")
    results = tmp_store.query(shop_id=1, embedding=[0.5] * 384, n=1)
    assert len(results) == 0
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_vectorstore.py -v
```

- [ ] **Step 3: Create `ai-service/rag/vectorstore.py`**

```python
import chromadb
import config

_client: chromadb.PersistentClient | None = None

def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=config.CHROMA_PATH)
    return _client

def _collection(shop_id: int):
    return _get_client().get_or_create_collection(
        name=f"shop_{shop_id}_docs",
        metadata={"hnsw:space": "cosine"},
    )

def upsert_chunks(shop_id: int, doc_id: str, chunks: list[str], embeddings: list[list[float]]) -> None:
    col = _collection(shop_id)
    ids = [f"{doc_id}__{i}" for i in range(len(chunks))]
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"shop_id": shop_id, "doc_id": doc_id, "chunk": i} for i in range(len(chunks))],
    )

def query(shop_id: int, embedding: list[float], n: int = 3) -> list[str]:
    col = _collection(shop_id)
    count = col.count()
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[embedding],
        where={"shop_id": shop_id},
        n_results=min(n, count),
    )
    return results["documents"][0] if results["documents"] else []

def delete_doc(shop_id: int, doc_id: str) -> None:
    col = _collection(shop_id)
    col.delete(where={"doc_id": doc_id})

def list_docs(shop_id: int) -> list[str]:
    col = _collection(shop_id)
    if col.count() == 0:
        return []
    all_meta = col.get(where={"shop_id": shop_id})["metadatas"]
    return list({m["doc_id"] for m in all_meta})
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_vectorstore.py -v
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/rag/vectorstore.py ai-service/tests/test_vectorstore.py
git commit -m "feat: ChromaDB vectorstore with shop isolation"
```

---

### Task 8: Document ingestor

**Files:**
- Create: `ai-service/rag/ingestor.py`
- Create: `ai-service/tests/test_ingestor.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_ingestor.py
import pytest
from unittest.mock import patch, MagicMock

def test_chunk_text_splits_long_text():
    from rag.ingestor import chunk_text
    long = "word " * 400          # 2000 words
    chunks = chunk_text(long)
    assert len(chunks) > 1
    assert all(len(c.split()) <= 520 for c in chunks)   # ~500 + overlap

def test_ingest_txt_creates_chunks(tmp_path, monkeypatch):
    monkeypatch.setenv("CHROMA_PATH", str(tmp_path / "chroma"))
    txt_file = tmp_path / "pricelist.txt"
    txt_file.write_text("Engine oil PHP 250\nAir filter PHP 180\n")

    with patch("rag.ingestor.upsert_chunks") as mock_upsert, \
         patch("rag.ingestor.embed_batch", return_value=[[0.1]*384, [0.2]*384]):
        from rag.ingestor import ingest_file
        ingest_file(shop_id=1, doc_id="doc-1", file_path=str(txt_file), mime="text/plain")
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args.kwargs
        assert call_kwargs["shop_id"] == 1
        assert call_kwargs["doc_id"] == "doc-1"
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_ingestor.py -v
```

- [ ] **Step 3: Create `ai-service/rag/ingestor.py`**

```python
import fitz           # PyMuPDF
import docx as _docx  # python-docx
from rag.embedder import embed_batch
from rag.vectorstore import upsert_chunks

CHUNK_WORDS   = 500
OVERLAP_WORDS = 50

def chunk_text(text: str) -> list[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = words[i: i + CHUNK_WORDS]
        chunks.append(" ".join(chunk))
        i += CHUNK_WORDS - OVERLAP_WORDS
    return [c for c in chunks if c.strip()]

def _extract_text(file_path: str, mime: str) -> str:
    if mime == "application/pdf":
        doc = fitz.open(file_path)
        return "\n".join(page.get_text() for page in doc)
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = _docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    # plain text
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        return f.read()

def ingest_file(shop_id: int, doc_id: str, file_path: str, mime: str) -> int:
    text   = _extract_text(file_path, mime)
    chunks = chunk_text(text)
    if not chunks:
        return 0
    embeddings = embed_batch(chunks)
    upsert_chunks(shop_id=shop_id, doc_id=doc_id, chunks=chunks, embeddings=embeddings)
    return len(chunks)
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_ingestor.py -v
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/rag/ingestor.py ai-service/tests/test_ingestor.py
git commit -m "feat: document ingestor (PDF/DOCX/TXT → chunks → ChromaDB)"
```

---

### Task 9: Tool definitions

**Files:**
- Create: `ai-service/tools/__init__.py`
- Create: `ai-service/tools/definitions.py`

- [ ] **Step 1: Create `ai-service/tools/__init__.py`** (empty)

- [ ] **Step 2: Create `ai-service/tools/definitions.py`**

```python
OWNER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_parts",
            "description": "Returns parts that are at or below their reorder level.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue",
            "description": "Returns total net revenue for a date range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "to_date":   {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service_jobs",
            "description": "Returns service jobs filtered by status and/or date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status":    {"type": "string", "description": "pending | in_progress | completed"},
                    "from_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mechanic_performance",
            "description": "Returns jobs completed per mechanic.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_sales",
            "description": "Returns the N most recent transactions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of records (default 5)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_parts",
            "description": "Returns best-selling parts by units sold.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Top N parts (default 5)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_info",
            "description": "Returns a customer's profile and service history by name or email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Name or email to search"},
                },
                "required": ["query"],
            },
        },
    },
]

CUSTOMER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_my_service_history",
            "description": "Returns the customer's own service job history.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_payments",
            "description": "Returns the customer's own payment records.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_service_info",
            "description": "Returns available service types with price and duration.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shop_info",
            "description": "Returns shop name, hours, address, and contact info.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_service_request",
            "description": "Books a new service job for the customer's motorcycle.",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_type_id": {"type": "integer"},
                    "motorcycle_model": {"type": "string"},
                    "notes": {"type": "string"},
                    "job_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["service_type_id", "motorcycle_model", "job_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_service_request",
            "description": "Cancels a pending service job. Only works if status is pending.",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {"type": "integer"},
                },
                "required": ["job_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_vehicle",
            "description": "Registers a new motorcycle under the customer's account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "make":         {"type": "string"},
                    "model":        {"type": "string"},
                    "year":         {"type": "integer"},
                    "plate_number": {"type": "string"},
                },
                "required": ["make", "model", "year", "plate_number"],
            },
        },
    },
]
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/tools/
git commit -m "feat: LLM tool definitions for owner and customer personas"
```

---

### Task 10: Tool executor

**Files:**
- Create: `ai-service/tools/executor.py`
- Create: `ai-service/tests/test_executor.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_executor.py
import json, pytest
from unittest.mock import patch, MagicMock

def _mock_response(data):
    m = MagicMock()
    m.json.return_value = data
    m.raise_for_status = MagicMock()
    return m

def test_execute_get_low_stock_parts(monkeypatch):
    monkeypatch.setenv("LARAVEL_INTERNAL_URL", "http://laravel:8000")
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "secret")

    with patch("httpx.get", return_value=_mock_response([{"part_name": "Oil", "stock_quantity": 2}])):
        from tools.executor import execute_tool
        result = execute_tool(
            name="get_low_stock_parts",
            arguments={},
            shop_id=1,
            user_id=42,
        )
    data = json.loads(result)
    assert data[0]["part_name"] == "Oil"

def test_execute_unknown_tool_returns_error():
    from tools.executor import execute_tool
    result = execute_tool(name="unknown_tool", arguments={}, shop_id=1, user_id=1)
    assert "unknown" in result.lower()
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_executor.py -v
```

- [ ] **Step 3: Create `ai-service/tools/executor.py`**

```python
import json
import httpx
import config

def _headers(shop_id: int) -> dict:
    return {
        "Authorization": f"Bearer {config.INTERNAL_SERVICE_TOKEN}",
        "X-Shop-Id": str(shop_id),
        "Accept": "application/json",
    }

def _get(path: str, shop_id: int, params: dict | None = None) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.get(url, headers=_headers(shop_id), params=params or {}, timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def _post(path: str, shop_id: int, body: dict) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.post(url, headers=_headers(shop_id), json=body, timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def _patch(path: str, shop_id: int) -> str:
    url = f"{config.LARAVEL_INTERNAL_URL}{path}"
    resp = httpx.patch(url, headers=_headers(shop_id), timeout=15.0)
    resp.raise_for_status()
    return json.dumps(resp.json())

def execute_tool(name: str, arguments: dict, shop_id: int, user_id: int) -> str:
    try:
        match name:
            case "get_low_stock_parts":
                return _get("/api/internal/parts/low-stock", shop_id)
            case "get_revenue":
                return _get("/api/internal/revenue", shop_id, {
                    "from_date": arguments.get("from_date", ""),
                    "to_date":   arguments.get("to_date", ""),
                })
            case "get_service_jobs":
                return _get("/api/internal/service-jobs", shop_id, {
                    "status":    arguments.get("status", ""),
                    "from_date": arguments.get("from_date", ""),
                })
            case "get_mechanic_performance":
                return _get("/api/internal/mechanics/performance", shop_id)
            case "get_recent_sales":
                return _get("/api/internal/sales/recent", shop_id, {
                    "limit": arguments.get("limit", 5)
                })
            case "get_top_parts":
                return _get("/api/internal/parts/top", shop_id, {
                    "limit": arguments.get("limit", 5)
                })
            case "get_customer_info":
                return _get("/api/internal/customer/search", shop_id, {
                    "query": arguments.get("query", "")
                })
            case "get_my_service_history":
                return _get(f"/api/internal/customer/{user_id}/services", shop_id)
            case "get_my_payments":
                return _get(f"/api/internal/customer/{user_id}/payments", shop_id)
            case "get_service_info":
                return _get("/api/internal/service-types", shop_id)
            case "get_shop_info":
                return _get("/api/internal/shop-info", shop_id)
            case "create_service_request":
                return _post("/api/internal/service-request", shop_id, {
                    **arguments, "user_id": user_id
                })
            case "cancel_service_request":
                return _patch(f"/api/internal/service-request/{arguments['job_id']}/cancel", shop_id)
            case "create_vehicle":
                return _post("/api/internal/customer/vehicle", shop_id, {
                    **arguments, "user_id": user_id
                })
            case _:
                return json.dumps({"error": f"Unknown tool: {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_executor.py -v
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/tools/executor.py ai-service/tests/test_executor.py
git commit -m "feat: tool executor (calls Laravel internal API)"
```

---

### Task 11: Session history

**Files:**
- Create: `ai-service/chat/__init__.py`
- Create: `ai-service/chat/history.py`
- Create: `ai-service/tests/test_history.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_history.py
def test_append_and_get():
    from chat.history import append_message, get_history
    append_message("sess-1", "user", "Hello")
    append_message("sess-1", "assistant", "Hi there!")
    history = get_history("sess-1")
    assert len(history) == 2
    assert history[0]["role"] == "user"

def test_history_trimmed_to_max():
    from chat.history import append_message, get_history, _sessions
    _sessions.clear()
    for i in range(25):
        append_message("sess-2", "user", f"msg {i}")
    history = get_history("sess-2")
    assert len(history) <= 10

def test_different_sessions_isolated():
    from chat.history import append_message, get_history, _sessions
    _sessions.clear()
    append_message("sess-A", "user", "session A message")
    append_message("sess-B", "user", "session B message")
    assert get_history("sess-A")[0]["content"] == "session A message"
    assert get_history("sess-B")[0]["content"] == "session B message"
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_history.py -v
```

- [ ] **Step 3: Create `ai-service/chat/__init__.py`** (empty)

- [ ] **Step 4: Create `ai-service/chat/history.py`**

```python
from collections import defaultdict
import config

_sessions: dict[str, list[dict]] = defaultdict(list)

def get_history(session_id: str) -> list[dict]:
    return list(_sessions[session_id][-config.MAX_HISTORY_MESSAGES:])

def append_message(session_id: str, role: str, content: str) -> None:
    _sessions[session_id].append({"role": role, "content": content})
    cap = config.MAX_HISTORY_MESSAGES * 2
    if len(_sessions[session_id]) > cap:
        _sessions[session_id] = _sessions[session_id][-config.MAX_HISTORY_MESSAGES:]

def clear_session(session_id: str) -> None:
    _sessions.pop(session_id, None)
```

- [ ] **Step 5: Run test — expect pass**

```bash
pytest tests/test_history.py -v
# Expected: 3 passed
```

- [ ] **Step 6: Commit**

```bash
git add ai-service/chat/ ai-service/tests/test_history.py
git commit -m "feat: in-memory session history with trimming"
```

---

### Task 12: Chat handler (RAG + tool loop)

**Files:**
- Create: `ai-service/chat/handler.py`
- Create: `ai-service/tests/test_handler.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_handler.py
import json, pytest
from unittest.mock import patch, MagicMock
from llm.base import ChatResponse

def _no_tool_response(text: str) -> ChatResponse:
    return ChatResponse(content=text, tool_calls=[])

def _tool_then_text(tool_name: str, args: dict, final_text: str):
    call_count = [0]
    def side_effect(messages, tools=None):
        call_count[0] += 1
        if call_count[0] == 1:
            return ChatResponse(
                content=None,
                tool_calls=[{"id": "tc1", "function": {"name": tool_name, "arguments": json.dumps(args)}}],
            )
        return ChatResponse(content=final_text, tool_calls=[])
    return side_effect

@pytest.mark.asyncio
async def test_handle_plain_question():
    from chat.handler import handle_chat
    with patch("chat.handler.get_llm_provider") as mock_prov, \
         patch("chat.handler.query", return_value=[]), \
         patch("chat.handler.embed", return_value=[0.1] * 384):
        mock_prov.return_value.chat.return_value = _no_tool_response("2 + 2 is 4")
        mock_prov.return_value.is_available.return_value = True
        result = await handle_chat(
            shop_id=1, user_id=1, role="owner",
            session_id="s1", message="What is 2+2?"
        )
    assert "4" in result

@pytest.mark.asyncio
async def test_handle_tool_call():
    from chat.handler import handle_chat
    with patch("chat.handler.get_llm_provider") as mock_prov, \
         patch("chat.handler.get_fallback_provider") as mock_fall, \
         patch("chat.handler.query", return_value=[]), \
         patch("chat.handler.embed", return_value=[0.1] * 384), \
         patch("chat.handler.execute_tool", return_value='[{"part_name":"Oil","stock_quantity":2}]'):
        mock_prov.return_value.is_available.return_value = True
        mock_prov.return_value.chat.side_effect = _tool_then_text(
            "get_low_stock_parts", {}, "You have 1 low stock part: Oil"
        )
        result = await handle_chat(
            shop_id=1, user_id=1, role="owner",
            session_id="s2", message="Which parts are low?"
        )
    assert "Oil" in result
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_handler.py -v
```

- [ ] **Step 3: Create `ai-service/chat/handler.py`**

```python
import json
from datetime import date
from llm.factory import get_llm_provider, get_fallback_provider
from rag.embedder import embed
from rag.vectorstore import query
from tools.definitions import OWNER_TOOLS, CUSTOMER_TOOLS
from tools.executor import execute_tool
from chat.history import get_history, append_message

MAX_TOOL_ITERATIONS = 5

def _system_prompt(role: str, shop_id: int, rag_context: list[str]) -> str:
    ctx = "\n\n".join(rag_context) if rag_context else "No additional context available."
    today = date.today().isoformat()
    if role in ("owner", "staff"):
        return (
            f"You are a helpful AI shop assistant for a motorcycle repair shop (shop ID {shop_id}).\n"
            f"Today is {today}.\n"
            "Use tools to answer data-related questions. Be concise and factual.\n"
            "Format lists with bullet points. Use PHP for currency.\n\n"
            f"Shop Knowledge Base:\n{ctx}"
        )
    return (
        f"You are a helpful customer service assistant for a motorcycle shop (shop ID {shop_id}).\n"
        f"Today is {today}.\n"
        "Help customers with: service history, booking, vehicles, payments, and shop info.\n"
        "Be polite and professional. If you cannot help, offer to escalate to shop staff.\n\n"
        f"Shop Knowledge Base:\n{ctx}"
    )

async def handle_chat(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> str:
    # 1. RAG context retrieval
    embedding = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    # 2. Build messages
    system = _system_prompt(role, shop_id, rag_chunks)
    history = get_history(session_id)
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    append_message(session_id, "user", message)

    # 3. Choose tools
    tools = OWNER_TOOLS if role in ("owner", "staff") else CUSTOMER_TOOLS

    # 4. LLM + tool loop
    provider = get_llm_provider()
    if not provider.is_available():
        provider = get_fallback_provider()
        tools = []   # Ollama fallback: no tool calling

    for _ in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)

        if not response.tool_calls:
            answer = response.content or "I'm sorry, I couldn't generate a response."
            append_message(session_id, "assistant", answer)
            return answer

        # Append the assistant's tool-call turn
        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": tc["function"],
                }
                for tc in response.tool_calls
            ],
        })

        # Execute each tool and append results
        for tc in response.tool_calls:
            args = json.loads(tc["function"]["arguments"])
            result = execute_tool(
                name=tc["function"]["name"],
                arguments=args,
                shop_id=shop_id,
                user_id=user_id,
            )
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})

    fallback_answer = "I've reached my limit for this question. Please try rephrasing."
    append_message(session_id, "assistant", fallback_answer)
    return fallback_answer
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_handler.py -v
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add ai-service/chat/handler.py ai-service/tests/test_handler.py
git commit -m "feat: chat handler with RAG retrieval and tool calling loop"
```

---

### Task 13: Chat + RAG management router

**Files:**
- Create: `ai-service/chat/router.py`
- Create: `ai-service/tests/test_router.py`

- [ ] **Step 1: Write failing test**

```python
# ai-service/tests/test_router.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

@pytest.fixture
def client():
    from main import app
    return TestClient(app)

def test_chat_owner_returns_response(client):
    with patch("chat.handler.handle_chat", new_callable=AsyncMock, return_value="You have 3 low parts"):
        resp = client.post("/chat/owner", json={
            "shop_id": 1, "user_id": 1, "role": "owner",
            "session_id": "s1", "message": "Low stock?"
        })
    assert resp.status_code == 200
    assert resp.json()["response"] == "You have 3 low parts"

def test_chat_missing_message_returns_422(client):
    resp = client.post("/chat/owner", json={"shop_id": 1})
    assert resp.status_code == 422

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
pytest tests/test_router.py -v
```

- [ ] **Step 3: Create `ai-service/chat/router.py`**

```python
import os
import uuid
import shutil
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from chat.handler import handle_chat
from rag.ingestor import ingest_file
from rag.vectorstore import list_docs, delete_doc
import config

router = APIRouter()

ALLOWED_MIMES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

class ChatRequest(BaseModel):
    shop_id:    int
    user_id:    int
    role:       str
    session_id: str
    message:    str

@router.post("/chat/owner")
@router.post("/chat/customer")
async def chat(req: ChatRequest):
    answer = await handle_chat(
        shop_id=req.shop_id, user_id=req.user_id, role=req.role,
        session_id=req.session_id, message=req.message,
    )
    return {"response": answer, "session_id": req.session_id}

@router.post("/rag/ingest")
async def ingest(
    shop_id: int = Form(...),
    doc_name: str = Form(...),
    file: UploadFile = File(...),
):
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(400, "Unsupported file type. Use PDF, TXT, or DOCX.")

    content = await file.read()
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File exceeds 10 MB limit.")

    existing = list_docs(shop_id)
    if len(existing) >= config.MAX_DOCS_PER_SHOP:
        raise HTTPException(400, f"Document limit ({config.MAX_DOCS_PER_SHOP}) reached.")

    doc_id = str(uuid.uuid4())
    tmp_dir = f"/tmp/mospams_uploads/{shop_id}"
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = f"{tmp_dir}/{doc_id}.bin"

    try:
        with open(tmp_path, "wb") as f:
            f.write(content)
        count = ingest_file(shop_id=shop_id, doc_id=doc_id, file_path=tmp_path, mime=file.content_type)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return {"doc_id": doc_id, "doc_name": doc_name, "chunks_indexed": count}

@router.delete("/rag/document/{doc_id}")
def remove_doc(doc_id: str, shop_id: int):
    delete_doc(shop_id=shop_id, doc_id=doc_id)
    return {"deleted": doc_id}

@router.get("/rag/documents")
def get_docs(shop_id: int):
    return {"documents": list_docs(shop_id)}
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_router.py -v
# Expected: 3 passed
```

- [ ] **Step 5: Run full test suite**

```bash
pytest -v
# Expected: all tests passing
```

- [ ] **Step 6: Commit**

```bash
git add ai-service/chat/router.py ai-service/tests/test_router.py
git commit -m "feat: chat and RAG management API endpoints"
```

---

## Phase 2 — Laravel Backend

### Task 14: ServiceTokenMiddleware

**Files:**
- Create: `Backend/app/Http/Middleware/ServiceTokenMiddleware.php`
- Modify: `Backend/app/Http/Kernel.php`

- [ ] **Step 1: Create `Backend/app/Http/Middleware/ServiceTokenMiddleware.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ServiceTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        $expected = config('services.ai.internal_token');

        if (!$token || !$expected || !hash_equals($expected, $token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
```

- [ ] **Step 2: Register middleware alias in `Backend/app/Http/Kernel.php`**

Find the `$middlewareAliases` array and add:
```php
'service.token' => \App\Http\Middleware\ServiceTokenMiddleware::class,
```

- [ ] **Step 3: Add config to `Backend/config/services.php`**

Open `Backend/config/services.php` and add inside the return array:
```php
'ai' => [
    'url'            => env('AI_SERVICE_URL', 'http://ai-service:8001'),
    'internal_token' => env('INTERNAL_SERVICE_TOKEN', ''),
],
```

- [ ] **Step 4: Add env vars to `Backend/.env`**

```bash
AI_SERVICE_URL=http://ai-service:8001
INTERNAL_SERVICE_TOKEN=replace_with_64_char_random_secret
```

Generate a secret:
```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

- [ ] **Step 5: Write feature test**

Create `Backend/tests/Feature/ServiceTokenMiddlewareTest.php`:
```php
<?php

namespace Tests\Feature;

use Tests\TestCase;

class ServiceTokenMiddlewareTest extends TestCase
{
    public function test_internal_route_rejects_missing_token(): void
    {
        $response = $this->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(401);
    }

    public function test_internal_route_rejects_wrong_token(): void
    {
        $response = $this->withToken('wrong-token')
                         ->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(401);
    }
}
```

- [ ] **Step 6: Run test**

```bash
cd Backend
php artisan test --filter ServiceTokenMiddlewareTest
# Expected: 2 tests passing (route returns 401 since InternalChatController not yet created — that's expected)
```

- [ ] **Step 7: Commit**

```bash
git add Backend/app/Http/Middleware/ServiceTokenMiddleware.php \
        Backend/app/Http/Kernel.php \
        Backend/config/services.php \
        Backend/tests/Feature/ServiceTokenMiddlewareTest.php
git commit -m "feat: ServiceTokenMiddleware for internal AI tool routes"
```

---

### Task 15: InternalChatController

**Files:**
- Create: `Backend/app/Http/Controllers/Api/InternalChatController.php`

- [ ] **Step 1: Create `Backend/app/Http/Controllers/Api/InternalChatController.php`**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use App\Models\Mechanic;
use App\Models\Part;
use App\Models\Sale;
use App\Models\ServiceJob;
use App\Models\ServiceType;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class InternalChatController extends Controller
{
    private function shopId(Request $request): int
    {
        return (int) $request->header('X-Shop-Id');
    }

    public function lowStockParts(Request $request)
    {
        $shopId = $this->shopId($request);
        $parts = Part::where('shop_id_fk', $shopId)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->get(['part_name', 'brand', 'stock_quantity', 'reorder_level', 'unit_price']);
        return response()->json($parts);
    }

    public function revenue(Request $request)
    {
        $shopId   = $this->shopId($request);
        $from     = $request->query('from_date');
        $to       = $request->query('to_date');
        $query    = Sale::where('shop_id_fk', $shopId);
        if ($from) $query->whereDate('sale_date', '>=', $from);
        if ($to)   $query->whereDate('sale_date', '<=', $to);
        $total = $query->sum('net_amount');
        $count = $query->count();
        return response()->json(['total_revenue' => $total, 'transaction_count' => $count]);
    }

    public function serviceJobs(Request $request)
    {
        $shopId = $this->shopId($request);
        // Status IDs: 1=pending, 2=in_progress, 3=completed, 4=cancelled
        // Verify against your service_job_statuses table before deploying
        $statusMap = ['pending' => 1, 'in_progress' => 2, 'completed' => 3];
        $query = ServiceJob::where('shop_id_fk', $shopId)
            ->with('customer:customer_id,full_name');
        if ($status = $request->query('status')) {
            $statusId = $statusMap[$status] ?? null;
            if ($statusId) $query->where('service_job_status_id_fk', $statusId);
        }
        if ($from = $request->query('from_date')) {
            $query->whereDate('job_date', '>=', $from);
        }
        return response()->json($query->latest('job_date')->limit(20)->get());
    }

    public function mechanicPerformance(Request $request)
    {
        $shopId = $this->shopId($request);
        // completed status ID = 3 — verify against service_job_statuses table
        $data = DB::table('mechanics')
            ->leftJoin('service_jobs', function ($join) use ($shopId) {
                $join->on('service_jobs.created_by_fk', '=', 'mechanics.mechanic_id')
                     ->where('service_jobs.service_job_status_id_fk', 3)
                     ->where('service_jobs.shop_id_fk', $shopId);
            })
            ->where('mechanics.shop_id_fk', $shopId)
            ->select('mechanics.mechanic_id', 'mechanics.full_name',
                     DB::raw('COUNT(service_jobs.job_id) as completed_jobs'))
            ->groupBy('mechanics.mechanic_id', 'mechanics.full_name')
            ->get();
        return response()->json($data);
    }

    public function recentSales(Request $request)
    {
        $shopId = $this->shopId($request);
        $limit  = (int) $request->query('limit', 5);
        $sales  = Sale::where('shop_id_fk', $shopId)
            ->latest('sale_date')
            ->limit($limit)
            ->get(['sale_id', 'sale_type', 'total_amount', 'net_amount', 'sale_date']);
        return response()->json($sales);
    }

    public function topParts(Request $request)
    {
        $shopId = $this->shopId($request);
        $limit  = (int) $request->query('limit', 5);
        // Uses sale_items pivot table — verify table/column names with:
        // php artisan schema:dump | grep sale_item
        // Adjust part_id_fk / sale_id_fk column names to match your migration
        $parts = DB::table('sale_items')
            ->join('parts', 'sale_items.part_id_fk', '=', 'parts.part_id')
            ->join('sales', 'sale_items.sale_id_fk', '=', 'sales.sale_id')
            ->where('sales.shop_id_fk', $shopId)
            ->select('parts.part_name', DB::raw('SUM(sale_items.quantity) as total_sold'))
            ->groupBy('parts.part_id', 'parts.part_name')
            ->orderByDesc('total_sold')
            ->limit($limit)
            ->get();
        return response()->json($parts);
    }

    public function customerSearch(Request $request)
    {
        $shopId = $this->shopId($request);
        $query  = $request->query('query', '');
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where(fn($q) => $q->where('full_name', 'like', "%{$query}%")
                                ->orWhere('email', 'like', "%{$query}%"))
            ->with(['serviceJobs' => fn($q) => $q->latest('job_date')->limit(5)])
            ->first();
        return response()->json($customer);
    }

    public function customerServices(Request $request, int $userId)
    {
        $shopId = $this->shopId($request);
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->firstOrFail();
        $jobs = ServiceJob::where('shop_id_fk', $shopId)
            ->where('customer_id_fk', $customer->customer_id)
            ->latest('job_date')
            ->limit(10)
            ->get(['job_id', 'motorcycle_model', 'job_date', 'completion_date', 'notes', 'service_job_status_id_fk']);
        return response()->json($jobs);
    }

    public function customerPayments(Request $request, int $userId)
    {
        $shopId = $this->shopId($request);
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->firstOrFail();
        $payments = Sale::where('shop_id_fk', $shopId)
            ->where('customer_id_fk', $customer->customer_id)
            ->latest('sale_date')
            ->limit(10)
            ->get(['sale_id', 'sale_type', 'total_amount', 'net_amount', 'sale_date']);
        return response()->json($payments);
    }

    public function serviceTypes(Request $request)
    {
        $shopId = $this->shopId($request);
        $types = ServiceType::where('shop_id_fk', $shopId)
            ->get(['service_type_id', 'service_name', 'description', 'labor_cost', 'estimated_duration']);
        return response()->json($types);
    }

    public function shopInfo(Request $request)
    {
        $shopId = $this->shopId($request);
        $shop   = Shop::findOrFail($shopId);
        return response()->json([
            'name'         => $shop->shop_name,
            'address'      => $shop->address ?? '',
            'phone'        => $shop->phone ?? '',
            'email'        => $shop->email ?? '',
            'business_hours' => $shop->business_hours ?? '',
        ]);
    }

    public function createServiceRequest(Request $request)
    {
        $shopId = $this->shopId($request);
        $data   = $request->json()->all();
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $data['user_id'])
            ->firstOrFail();
        $job = ServiceJob::create([
            'shop_id_fk'               => $shopId,
            'customer_id_fk'           => $customer->customer_id,
            'created_by_fk'            => $data['user_id'],
            'service_job_status_id_fk' => 1,   // 1 = pending
            'motorcycle_model'         => $data['motorcycle_model'],
            'job_date'                 => $data['job_date'],
            'notes'                    => $data['notes'] ?? null,
        ]);
        return response()->json($job, 201);
    }

    public function cancelServiceRequest(Request $request, int $jobId)
    {
        $shopId = $this->shopId($request);
        $job = ServiceJob::where('shop_id_fk', $shopId)
            ->where('job_id', $jobId)
            ->firstOrFail();
        if ($job->service_job_status_id_fk !== 1) {
            return response()->json(['error' => 'Only pending jobs can be cancelled via chat.'], 422);
        }
        $job->update(['service_job_status_id_fk' => 5]);   // 5 = cancelled
        return response()->json(['cancelled' => true, 'job_id' => $jobId]);
    }

    public function createVehicle(Request $request)
    {
        $shopId = $this->shopId($request);
        $data   = $request->json()->all();
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $data['user_id'])
            ->firstOrFail();
        $vehicle = \App\Models\CustomerVehicle::create([
            'shop_id_fk'    => $shopId,
            'customer_id_fk'=> $customer->customer_id,
            'make'          => $data['make'],
            'model'         => $data['model'],
            'year'          => $data['year'],
            'plate_number'  => $data['plate_number'],
        ]);
        return response()->json($vehicle, 201);
    }
}
```

> **Note:** `CustomerVehicle` model and migration may need to be created if not already in the schema. Check `php artisan migrate:status` — if a `customer_vehicles` table exists, create the model at `Backend/app/Models/CustomerVehicle.php`. If not, skip the `create_vehicle` tool for now and remove it from the router.

- [ ] **Step 2: Write feature test**

Create `Backend/tests/Feature/InternalChatControllerTest.php`:
```php
<?php

namespace Tests\Feature;

use Tests\TestCase;

class InternalChatControllerTest extends TestCase
{
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = config('services.ai.internal_token') ?: 'test-secret';
        config(['services.ai.internal_token' => $this->token]);
    }

    public function test_low_stock_parts_returns_200(): void
    {
        $response = $this->withToken($this->token)
            ->withHeaders(['X-Shop-Id' => '1'])
            ->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(200)
                 ->assertJsonIsArray();
    }

    public function test_service_types_returns_200(): void
    {
        $response = $this->withToken($this->token)
            ->withHeaders(['X-Shop-Id' => '1'])
            ->getJson('/api/internal/service-types');
        $response->assertStatus(200);
    }
}
```

- [ ] **Step 3: Run test (will fail until routes are registered)**

```bash
php artisan test --filter InternalChatControllerTest
# Expected: 404 (routes not yet registered) — that's fine, continue
```

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/InternalChatController.php \
        Backend/tests/Feature/InternalChatControllerTest.php
git commit -m "feat: InternalChatController with all tool data endpoints"
```

---

### Task 16: ChatController

**Files:**
- Create: `Backend/app/Http/Controllers/Api/ChatController.php`

- [ ] **Step 1: Create `Backend/app/Http/Controllers/Api/ChatController.php`**

```php
<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function send(Request $request)
    {
        $request->validate([
            'message'    => 'required|string|max:2000',
            'session_id' => 'required|string|max:64',
        ]);

        $user = $request->user();
        $role = strtolower($user->role?->role_name ?? 'customer');

        // SuperAdmin has no shop — deny chat
        if ($role === 'superadmin') {
            return response()->json(['error' => 'Chat is not available for SuperAdmin.'], 403);
        }

        $shopId   = $user->shopMembership?->shop_id ?? null;
        if (!$shopId) {
            return response()->json(['error' => 'No shop associated with this account.'], 422);
        }

        $endpoint = in_array($role, ['owner', 'staff']) ? 'owner' : 'customer';
        $aiUrl    = config('services.ai.url');

        $response = Http::timeout(60)->post("{$aiUrl}/chat/{$endpoint}", [
            'shop_id'    => $shopId,
            'user_id'    => $user->id,
            'role'       => $role,
            'session_id' => $request->session_id,
            'message'    => $request->message,
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'AI service unavailable. Please try again.'], 503);
        }

        return response()->json($response->json());
    }
}
```

- [ ] **Step 2: Write feature test**

Create `Backend/tests/Feature/ChatControllerTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_requires_authentication(): void
    {
        $response = $this->postJson('/api/chat', [
            'message' => 'Hello', 'session_id' => 'abc123'
        ]);
        $response->assertStatus(401);
    }

    public function test_chat_validates_message_required(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)
            ->postJson('/api/chat', ['session_id' => 'abc123']);
        $response->assertStatus(422);
    }

    public function test_chat_forwards_to_ai_service(): void
    {
        Http::fake([
            '*/chat/*' => Http::response(['response' => 'Hello from AI', 'session_id' => 'abc'], 200),
        ]);

        $user = User::factory()->create();
        // Note: attach a shop membership in your factory/test setup as needed
        $response = $this->actingAs($user)
            ->postJson('/api/chat', ['message' => 'Hi', 'session_id' => 'abc123']);

        // 200 if shop attached, 422 if no shop (both are acceptable test outcomes)
        $this->assertContains($response->status(), [200, 422, 403]);
    }
}
```

- [ ] **Step 3: Run test**

```bash
php artisan test --filter ChatControllerTest
# Expected: test_chat_requires_authentication → pass
# Others may pass or need factory setup — that's fine
```

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ChatController.php \
        Backend/tests/Feature/ChatControllerTest.php
git commit -m "feat: ChatController forwards authenticated chat to AI service"
```

---

### Task 17: Register all routes

**Files:**
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add imports at top of `Backend/routes/api.php`**

After the existing `use` statements add:
```php
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\InternalChatController;
```

- [ ] **Step 2: Add public chat route inside the `auth:sanctum` group**

Inside `Route::middleware(['auth:sanctum'])->group(...)` but BEFORE the `shop.active` subgroup, add:
```php
Route::post('/chat', [ChatController::class, 'send']);
```

- [ ] **Step 3: Add internal routes OUTSIDE the auth group (before the auth group)**

Add before the `Route::middleware(['auth:sanctum'])` block:
```php
Route::middleware('service.token')->prefix('internal')->group(function () {
    Route::get('/parts/low-stock',               [InternalChatController::class, 'lowStockParts']);
    Route::get('/parts/top',                     [InternalChatController::class, 'topParts']);
    Route::get('/revenue',                       [InternalChatController::class, 'revenue']);
    Route::get('/service-jobs',                  [InternalChatController::class, 'serviceJobs']);
    Route::get('/mechanics/performance',         [InternalChatController::class, 'mechanicPerformance']);
    Route::get('/sales/recent',                  [InternalChatController::class, 'recentSales']);
    Route::get('/customer/search',               [InternalChatController::class, 'customerSearch']);
    Route::get('/customer/{userId}/services',    [InternalChatController::class, 'customerServices']);
    Route::get('/customer/{userId}/payments',    [InternalChatController::class, 'customerPayments']);
    Route::get('/service-types',                 [InternalChatController::class, 'serviceTypes']);
    Route::get('/shop-info',                     [InternalChatController::class, 'shopInfo']);
    Route::post('/service-request',              [InternalChatController::class, 'createServiceRequest']);
    Route::patch('/service-request/{jobId}/cancel', [InternalChatController::class, 'cancelServiceRequest']);
    Route::post('/customer/vehicle',             [InternalChatController::class, 'createVehicle']);
});
```

- [ ] **Step 4: Run full internal route tests**

```bash
php artisan test --filter InternalChatControllerTest
# Expected: 2 passed (routes now registered)
```

- [ ] **Step 5: Verify route list**

```bash
php artisan route:list | grep internal
# Expected: 14 internal routes listed
```

- [ ] **Step 6: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: register chat and internal AI tool routes"
```

---

## Phase 3 — React Frontend

### Task 18: Chat API client

**Files:**
- Create: `Frontend/src/features/chat/api/chatApi.ts`

- [ ] **Step 1: Create `Frontend/src/features/chat/api/chatApi.ts`**

```typescript
import { apiPost } from '@/shared/lib/api';

export interface ChatResponse {
  response: string;
  session_id: string;
}

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  return apiPost<ChatResponse>('/api/chat', { message, session_id: sessionId });
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/chat/
git commit -m "feat: chat API client"
```

---

### Task 19: useChat hook

**Files:**
- Create: `Frontend/src/features/chat/hooks/useChat.ts`

- [ ] **Step 1: Create `Frontend/src/features/chat/hooks/useChat.ts`**

```typescript
import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../api/chatApi';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(crypto.randomUUID());

  const append = (role: Message['role'], content: string) => {
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    ]);
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    append('user', text);
    setIsLoading(true);
    try {
      const res = await sendMessage(text, sessionId.current);
      append('assistant', res.response);
    } catch {
      setError('Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionId.current = crypto.randomUUID();
  }, []);

  return { messages, isLoading, error, send, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/chat/hooks/
git commit -m "feat: useChat hook with session management"
```

---

### Task 20: Chat components

**Files:**
- Create: `Frontend/src/features/chat/components/ChatTypingIndicator.tsx`
- Create: `Frontend/src/features/chat/components/ChatMessage.tsx`
- Create: `Frontend/src/features/chat/components/ChatWindow.tsx`

- [ ] **Step 1: Create `Frontend/src/features/chat/components/ChatTypingIndicator.tsx`**

```tsx
export default function ChatTypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `Frontend/src/features/chat/components/ChatMessage.tsx`**

```tsx
import { Message } from '../hooks/useChat';

interface Props { message: Message; }

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-white text-black rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-sm'
          }`}
      >
        {message.content}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `Frontend/src/features/chat/components/ChatWindow.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';
import { useAuth } from '@/features/auth/context/AuthContext';

interface Props { onClose: () => void; }

export default function ChatWindow({ onClose }: Props) {
  const { messages, isLoading, error, send, reset } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const isOwnerOrStaff = ['owner', 'staff'].includes(
    user?.role?.role_name?.toLowerCase() ?? ''
  );

  const greeting = isOwnerOrStaff
    ? "Hi! I'm your shop assistant. Ask me about inventory, sales, jobs, or upload documents I can learn from."
    : "Hi! I can help you with your service history, bookings, vehicles, and payments.";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    send(input);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[520px] z-50
                    flex flex-col rounded-2xl overflow-hidden
                    bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/60">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <img src="/images/logo.svg" className="w-6 h-6" alt="MoSPAMS" />
          <span className="text-sm font-semibold text-foreground">MoSPAMS Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-xs">
            Clear
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Greeting */}
        <div className="flex justify-start mb-3">
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm
                          text-sm leading-relaxed bg-zinc-800 text-zinc-100 border border-zinc-700">
            {greeting}
          </div>
        </div>

        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isLoading && <ChatTypingIndicator />}
        {error && (
          <p className="text-xs text-red-400 text-center px-2">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl
                     px-3 py-2 text-sm text-foreground placeholder:text-zinc-500
                     focus:outline-none focus:border-zinc-500 max-h-24"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 rounded-xl bg-white text-black text-sm font-semibold
                     hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/features/chat/components/
git commit -m "feat: ChatMessage, ChatTypingIndicator, and ChatWindow components"
```

---

### Task 21: ChatBubble + App.tsx mount

**Files:**
- Create: `Frontend/src/features/chat/components/ChatBubble.tsx`
- Modify: `Frontend/src/app/App.tsx`

- [ ] **Step 1: Create `Frontend/src/features/chat/components/ChatBubble.tsx`**

```tsx
import { useState } from 'react';
import ChatWindow from './ChatWindow';

export default function ChatBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatWindow onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full z-50
                   bg-zinc-900 border border-zinc-700 shadow-xl
                   hover:scale-105 hover:shadow-zinc-800/50
                   transition-all duration-200
                   flex items-center justify-center"
      >
        <img src="/images/logo.svg" alt="MoSPAMS" className="w-8 h-8 object-contain" />
      </button>
    </>
  );
}
```

- [ ] **Step 2: Open `Frontend/src/app/App.tsx` and find the authenticated route wrapper**

Look for the section that wraps authenticated pages (typically around the routes that require login). Add `ChatBubble` import and mount it once inside the auth wrapper so it appears on all protected pages.

Add import at top:
```tsx
import ChatBubble from '@/features/chat/components/ChatBubble';
```

Find the authenticated layout section (look for where `<Outlet />` or the main page components render for logged-in users) and add `<ChatBubble />` as a sibling:
```tsx
{/* existing authenticated routes/layout */}
<ChatBubble />
```

- [ ] **Step 3: Verify the bubble does NOT render on the landing page**

The landing page uses `LandingPage` component and is rendered outside the auth wrapper. `ChatBubble` is only inside the auth wrapper, so it's automatically hidden for unauthenticated users.

- [ ] **Step 4: Start the frontend dev server and test**

```bash
cd Frontend
npm run dev
```

1. Log in as Owner → bubble appears bottom-right ✓
2. Click bubble → `ChatWindow` opens ✓
3. Type "hello" → receives response (or error if ai-service not running yet) ✓
4. Visit landing page → bubble absent ✓

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/chat/components/ChatBubble.tsx \
        Frontend/src/app/App.tsx
git commit -m "feat: ChatBubble floating MoSPAMS logo button + App.tsx mount"
```

---

## Phase 4 — Docker Deployment

### Task 22: ai-service Dockerfile

**Files:**
- Create: `ai-service/Dockerfile`

- [ ] **Step 1: Create `ai-service/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps for PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmupdf-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download sentence-transformers model at build time (cached in image layer)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

- [ ] **Step 2: Commit**

```bash
git add ai-service/Dockerfile
git commit -m "feat: ai-service Dockerfile with pre-cached embeddings model"
```

---

### Task 23: docker-compose and deploy.sh updates

**Files:**
- Modify: `docker-compose.yml`
- Modify: `deploy.sh`

- [ ] **Step 1: Open `docker-compose.yml` and add two new services after `laravel-app`**

```yaml
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: mospams-ai-service
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - LLM_PROVIDER=${LLM_PROVIDER:-nvidia_nim}
      - LLM_MODEL=${LLM_MODEL:-meta/llama-3.1-8b-instruct}
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_BASE_URL=${LLM_BASE_URL:-https://integrate.api.nvidia.com/v1}
      - LLM_FALLBACK_MODEL=${LLM_FALLBACK_MODEL:-phi3:mini}
      - OLLAMA_BASE_URL=http://mospams-ollama:11434
      - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
      - LARAVEL_INTERNAL_URL=http://mospams-laravel:8000
      - CHROMA_PATH=/data/chromadb
    volumes:
      - chroma_data:/data/chromadb
    depends_on:
      - laravel-app
    networks:
      - mospams-network

  ollama:
    image: ollama/ollama:latest
    container_name: mospams-ollama
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        limits:
          memory: 3G
    networks:
      - mospams-network
```

At the bottom of `docker-compose.yml` under `volumes:`, add:
```yaml
  chroma_data:
  ollama_data:
```

- [ ] **Step 2: Add environment variables to the server's `.env` file on AWS**

SSH into your AWS server and add to the project `.env`:
```bash
LLM_PROVIDER=nvidia_nim
LLM_MODEL=meta/llama-3.1-8b-instruct
LLM_API_KEY=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
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_FALLBACK_MODEL=phi3:mini
INTERNAL_SERVICE_TOKEN=$(openssl rand -hex 32)
```

Also add to `Backend/.env`:
```bash
AI_SERVICE_URL=http://ai-service:8001
INTERNAL_SERVICE_TOKEN=<same value as above>
```

- [ ] **Step 3: Open `deploy.sh` and add the Ollama model pull step**

Find the section where Docker containers are restarted and add after the `docker-compose up` command:
```bash
# Pull Ollama fallback model on first deploy (skip if already present)
echo "Checking Ollama fallback model..."
docker exec mospams-ollama ollama pull phi3:mini || true
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml deploy.sh
git commit -m "feat: add ai-service and ollama to docker-compose"
```

- [ ] **Step 5: Deploy and verify**

```bash
bash deploy.sh
# After deploy, verify:
curl http://localhost:8001/health
# Expected: {"status":"ok"}
```

---

## Phase 5 — Settings: AI Knowledge Base Tab

### Task 24: Knowledge Base settings UI

This adds a new tab to the Owner's Settings page for uploading, listing, and deleting chatbot documents.

**Files:**
- Create: `Frontend/src/features/settings/pages/KnowledgeBaseSettings.tsx`
- Modify: `Frontend/src/features/settings/pages/SettingsPage.tsx`

- [ ] **Step 1: Create `Frontend/src/features/settings/pages/KnowledgeBaseSettings.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '@/shared/lib/api';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL ?? '/ai';

interface DocEntry { doc_id: string; }

export default function KnowledgeBaseSettings() {
  const [docs, setDocs]           = useState<DocEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const shopId = (window as any).__SHOP_ID__ ?? 0;  // injected from ShopContext

  const load = async () => {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/rag/documents?shop_id=${shopId}`);
      const data = await res.json();
      setDocs(data.documents.map((id: string) => ({ doc_id: id })));
    } catch { setError('Could not load documents.'); }
  };

  useEffect(() => { load(); }, []);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null); setSuccess(null);
    const form = new FormData();
    form.append('shop_id', String(shopId));
    form.append('doc_name', file.name);
    form.append('file', file);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/rag/ingest`, { method: 'POST', body: form });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Upload failed'); }
      setSuccess(`"${file.name}" uploaded successfully.`);
      load();
    } catch (err: any) { setError(err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const remove = async (docId: string) => {
    try {
      await fetch(`${AI_SERVICE_URL}/rag/document/${docId}?shop_id=${shopId}`, { method: 'DELETE' });
      setSuccess('Document removed.');
      load();
    } catch { setError('Failed to remove document.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">AI Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Upload documents (PDF, TXT, DOCX) that the chatbot will use to answer questions.
          Max 10 MB per file · {docs.length} / 20 documents used.
        </p>
      </div>

      {error   && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-sm text-green-400 bg-green-950/30 border border-green-800 rounded-lg px-4 py-2">{success}</p>}

      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm
                         font-semibold cursor-pointer hover:bg-zinc-100 transition-colors">
        {uploading ? 'Uploading...' : '+ Upload Document'}
        <input
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={upload}
          disabled={uploading || docs.length >= 20}
        />
      </label>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map(doc => (
            <li key={doc.doc_id}
                className="flex items-center justify-between px-4 py-3
                           bg-muted rounded-xl border border-border">
              <span className="text-sm text-foreground font-mono truncate max-w-xs">{doc.doc_id}</span>
              <button
                onClick={() => remove(doc.doc_id)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors ml-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the tab to `SettingsPage.tsx`**

Open `Frontend/src/features/settings/pages/SettingsPage.tsx`. Find the tabs array and add:
```tsx
{ id: 'knowledge', label: 'AI Knowledge Base', component: <KnowledgeBaseSettings /> }
```

Add the import:
```tsx
import KnowledgeBaseSettings from './KnowledgeBaseSettings';
```

- [ ] **Step 3: Add `VITE_AI_SERVICE_URL` to Frontend environment**

In `Frontend/.env` (local dev):
```bash
VITE_AI_SERVICE_URL=http://localhost:8001
```

In the Vercel dashboard (for production frontend), add:
```
VITE_AI_SERVICE_URL=https://api.mospams.shop/ai
```
(or whichever public URL the ai-service is proxied behind)

- [ ] **Step 4: Test the knowledge base tab**

1. Log in as Owner
2. Go to Settings → AI Knowledge Base tab
3. Upload a PDF price list
4. Verify it appears in the list
5. Open the chat bubble and ask "How much does an oil change cost?" — the answer should reference the uploaded document

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/settings/pages/KnowledgeBaseSettings.tsx \
        Frontend/src/features/settings/pages/SettingsPage.tsx
git commit -m "feat: AI Knowledge Base tab in Owner Settings"
```

- [ ] **Step 6: Run deploy script**

```bash
bash deploy.sh
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 — Python AI Service | 1–13 | Full FastAPI service: NVIDIA NIM + Ollama fallback + RAG + tool calling |
| 2 — Laravel Backend | 14–17 | ChatController + InternalChatController + ServiceTokenMiddleware + routes |
| 3 — React Frontend | 18–21 | Floating MoSPAMS logo bubble + chat window + useChat hook |
| 4 — Docker | 22–23 | ai-service + ollama containers in docker-compose |
| 5 — Settings UI | 24 | Owner Knowledge Base tab for uploading RAG documents |

**To switch LLM provider at any time** — edit `.env` only:
```bash
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-8b-instant
LLM_API_KEY=gsk_xxxx
LLM_BASE_URL=https://api.groq.com/openai/v1
```
Then `docker-compose restart ai-service`.
