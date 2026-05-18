# MoSPAMS AI Chatbot — Design Spec
**Date:** 2026-05-18
**Status:** Approved

---

## Overview

A dual-persona AI chatbot embedded in MoSPAMS as a fixed floating bubble (bottom-right, MoSPAMS logo icon). Two personas share one Python AI service:

- **Shop Assistant** — for Owner and Staff; answers live business questions and searches owner-uploaded documents
- **Customer Bot** — for Customers; full self-service portal (service history, bookings, vehicles, payments, escalation)

---

## Architecture

```
Browser (React)
    │  chat message
    ▼
Laravel API  ──── Sanctum auth + shop_id injection
    │
    ▼
Python FastAPI (ai-service, port 8001)
    ├── sentence-transformers  (free local embeddings)
    ├── ChromaDB               (embedded vector DB, no extra container)
    ├── LLM Provider Factory   (dynamic, env-driven)
    │       primary:  NVIDIA NIM / Groq / OpenAI / Anthropic / Gemini
    │       fallback: Ollama (phi3:mini, local)
    └── Tool Executor          (calls Laravel internal API for live data)

AWS Docker containers:
  laravel-app   (existing)
  ai-service    (new)
  ollama        (new, fallback only)

Volumes:
  chroma_data   (persists RAG documents across deploys)
  ollama_data   (persists downloaded model)
```

---

## Section 1 — Python FastAPI Service Structure

```
ai-service/
├── main.py
├── chat/
│   ├── handler.py          # prompt building, context assembly
│   ├── router.py           # /chat/owner, /chat/customer endpoints
│   └── history.py          # per-session in-memory message history
├── rag/
│   ├── embedder.py         # sentence-transformers embeddings
│   ├── vectorstore.py      # ChromaDB client (query + insert)
│   └── ingestor.py         # chunk + embed uploaded documents
├── tools/
│   ├── definitions.py      # tool schemas exposed to the LLM
│   └── executor.py         # calls Laravel internal API
├── llm/
│   ├── base.py             # abstract LLMProvider
│   ├── factory.py          # reads env, returns correct provider
│   ├── nvidia_nim_client.py
│   ├── groq_client.py
│   ├── ollama_client.py
│   ├── openai_client.py
│   ├── anthropic_client.py
│   └── gemini_client.py
├── config.py
└── Dockerfile
```

**Endpoints:**
- `POST /chat/owner` — Owner/Staff persona (full tools + RAG)
- `POST /chat/customer` — Customer persona (scoped tools + shop FAQ RAG)
- `POST /rag/ingest` — Owner uploads a document
- `DELETE /rag/document/{id}` — Owner deletes a document
- `GET /rag/documents` — Owner lists uploaded documents

**Request payload (sent by Laravel, never by frontend directly):**
```json
{
  "shop_id": 3,
  "user_id": 42,
  "role": "owner",
  "session_id": "abc123",
  "message": "Which parts are low on stock?"
}
```

---

## Section 2 — Dynamic LLM Provider

Provider and model are fully configurable via `.env` — no code changes needed to switch.

### Provider abstraction

```python
# base.py
class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list, tools: list = None) -> str: pass

    @abstractmethod
    def is_available(self) -> bool: pass
```

### factory.py

```python
def get_llm_provider() -> LLMProvider:
    provider = os.getenv("LLM_PROVIDER", "nvidia_nim")
    match provider:
        case "nvidia_nim": return NvidiaNimClient()
        case "groq":       return GroqClient()
        case "ollama":     return OllamaClient()
        case "openai":     return OpenAIClient()
        case "anthropic":  return AnthropicClient()
        case "gemini":     return GeminiClient()

def get_fallback_provider() -> LLMProvider:
    return OllamaClient()  # always local, always available
```

### nvidia_nim_client.py (primary / recommended)

NVIDIA NIM uses an OpenAI-compatible API:
```python
self.client = OpenAI(
    base_url=os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1"),
    api_key=os.getenv("LLM_API_KEY")
)
```

### Fallback logic

```python
try:
    return primary_provider.chat(messages, tools)
except (RateLimitError, ProviderUnavailableError, Exception):
    return fallback_provider.chat(messages, tools)
```

### .env configuration

```bash
# Primary provider (edit these 3 lines to switch)
LLM_PROVIDER=nvidia_nim
LLM_MODEL=meta/llama-3.1-8b-instruct
LLM_API_KEY=nvapi-xxxx
LLM_BASE_URL=https://integrate.api.nvidia.com/v1

# Fallback (always Ollama, local)
LLM_FALLBACK_PROVIDER=ollama
LLM_FALLBACK_MODEL=phi3:mini

# Other provider examples (swap into LLM_PROVIDER above):
# groq      → llama-3.1-8b-instant        → gsk_xxxx
# openai    → gpt-4o-mini                 → sk-xxxx
# anthropic → claude-haiku-4-5-20251001   → sk-ant-xxxx
# gemini    → gemini-1.5-flash            → AIzaxxxx
# ollama    → phi3:mini                   → (no key)
```

---

## Section 3 — RAG Pipeline

### Document ingestion (Owner uploads a file)

```
Owner uploads PDF/TXT/DOCX via Settings page
    │
    ▼
Laravel validates auth (Owner only) + forwards to POST /rag/ingest
    │
    ├── Validate: type ∈ {PDF, TXT, DOCX}, size ≤ 10 MB, count ≤ 20 per shop
    ├── Save to disk: storage/shops/{shop_id}/{uuid}.bin  (hashed, not web-accessible)
    ├── Parse text (PyMuPDF for PDF, python-docx for DOCX)
    ├── Split into chunks (~500 tokens, 50 token overlap)
    ├── Embed each chunk via sentence-transformers/all-MiniLM-L6-v2
    ├── Store in ChromaDB with metadata: { shop_id, doc_id, chunk_index }
    └── Delete raw file from disk immediately after embedding
```

### At query time

```
User question → embed → ChromaDB similarity search (where shop_id = X) → top-3 chunks
→ inject as context into LLM prompt → LLM answers grounded in shop documents
```

### ChromaDB collections

```
shop_{shop_id}_docs   ← owner-uploaded documents
shop_{shop_id}_faq    ← auto-generated from shop profile on registration
```

### Document management UI (Settings page)

A new **"AI Knowledge Base"** tab in the Owner's Settings page with:
- Upload button (accepts PDF, TXT, DOCX)
- List of uploaded documents (name, upload date, status)
- Delete button per document
- Document count badge (e.g., "3 / 20 documents")

### Auto-generated FAQ

On shop approval, the system auto-creates FAQ chunks from the shop's existing profile:
name, business hours, address, service types offered, contact details.
This ensures the customer bot works with zero owner uploads.

---

## Section 4 — Live Data Tools

### Owner/Staff tools

| Tool | Description |
|------|-------------|
| `get_revenue` | Total sales for a date range |
| `get_low_stock_parts` | Parts below reorder threshold |
| `get_service_jobs` | Jobs filtered by status/date/mechanic |
| `get_top_parts` | Best-selling parts |
| `get_mechanic_performance` | Jobs completed per mechanic |
| `get_recent_sales` | Latest N transactions |
| `get_customer_info` | A customer's full history |

### Customer-scoped tools

| Tool | Description |
|------|-------------|
| `get_my_service_history` | Customer's own service jobs |
| `get_my_payments` | Customer's own payment records |
| `get_service_info` | Details about a service (price, duration, inclusions) |
| `get_shop_info` | Shop hours, location, contact |
| `create_service_request` | Books a new service job |
| `cancel_service_request` | Cancels a pending booking (pending status only) |
| `create_vehicle` | Registers a new vehicle (collects make/model/year/plate conversationally) |

**Cancellation rule:** `cancel_service_request` only works on `pending` status jobs.
If the job is `in_progress` or `completed`, the bot instructs the customer to contact
the shop and offers to escalate.

### Tool execution flow

```
LLM decides to call get_low_stock_parts(shop_id=3)
    │
    ▼
executor.py calls:
    GET http://laravel-app:8000/internal/parts/low-stock
    Authorization: Bearer {INTERNAL_SERVICE_TOKEN}
    X-Shop-Id: 3
    │
    ▼
Laravel InternalChatController returns JSON
    │
    ▼
Result injected back into conversation → LLM generates final answer
```

---

## Section 5 — Frontend Chat Bubble

### Component structure

```
Frontend/src/features/chat/
├── components/
│   ├── ChatBubble.tsx          # floating MoSPAMS logo button (bottom-right)
│   ├── ChatWindow.tsx          # chat panel UI
│   ├── ChatMessage.tsx         # individual message bubble
│   └── ChatTypingIndicator.tsx # "..." while bot is responding
├── hooks/
│   └── useChat.ts              # message state, send handler, history
└── api/
    └── chatApi.ts              # POST /api/chat
```

### Bubble button

```tsx
// Fixed bottom-right, uses /images/logo.svg
<button className="fixed bottom-6 right-6 w-14 h-14 rounded-full
                   bg-zinc-900 border border-zinc-700 shadow-xl
                   hover:scale-105 transition-transform
                   flex items-center justify-center z-50">
  <img src="/images/logo.svg" className="w-8 h-8" />
</button>
```

- Size: 56×56px rounded-full
- Background: zinc-900, border: zinc-700
- Hover: scale-105 + shadow glow
- Placement: `fixed bottom-6 right-6 z-50`

### Chat window

- Dark zinc theme matching landing page (zinc-900 header, zinc-800 messages)
- Markdown rendering for bot responses (lists, bold, code)
- Typing indicator (`...`) while awaiting response
- Chat history in React state (cleared on page refresh)
- Hidden on landing page (unauthenticated)

### Persona routing

- Owner / Staff → `POST /api/chat` → forwarded to `/chat/owner`
- Customer → `POST /api/chat` → forwarded to `/chat/customer`
- Role determined server-side from Sanctum token (frontend sends nothing about role)

### session_id generation

Generated by the frontend as a `crypto.randomUUID()` on `ChatBubble` mount.
Sent with every message so the Python service can maintain per-session history.
Cleared when the chat window is closed and reopened.

### Response mode

Non-streaming (full response returned at once) for v1. Streaming can be added in v2
by switching to Server-Sent Events if response latency becomes a UX issue.

### Placement in App.tsx

Added once inside the authenticated route wrapper — appears on all protected pages automatically.

---

## Section 6 — Laravel Integration

### New files

```
Backend/app/Http/Controllers/Api/ChatController.php
Backend/app/Http/Controllers/Api/InternalChatController.php
Backend/app/Http/Middleware/ServiceTokenMiddleware.php
```

### Public chat route (Sanctum-protected)

```php
Route::middleware('auth:sanctum')->post('/chat', [ChatController::class, 'send']);
```

**ChatController** authenticates, injects `shop_id` + `user_id` + `role` from the token,
then forwards to the Python ai-service. The frontend never sends `shop_id` — it is always
attached server-side.

### Internal tool routes (service-token-protected)

```php
Route::middleware('service.token')->group(function () {
    Route::get('/internal/parts/low-stock',               [InternalChatController::class, 'lowStockParts']);
    Route::get('/internal/revenue',                        [InternalChatController::class, 'revenue']);
    Route::get('/internal/service-jobs',                   [InternalChatController::class, 'serviceJobs']);
    Route::get('/internal/mechanics/performance',          [InternalChatController::class, 'mechanicPerformance']);
    Route::get('/internal/sales/recent',                   [InternalChatController::class, 'recentSales']);
    Route::get('/internal/customer/{id}/history',          [InternalChatController::class, 'customerHistory']);
    Route::get('/internal/services',                       [InternalChatController::class, 'serviceInfo']);
    Route::post('/internal/customer/vehicle',              [InternalChatController::class, 'createVehicle']);
    Route::post('/internal/service-request',               [InternalChatController::class, 'createServiceRequest']);
    Route::patch('/internal/service-request/{id}/cancel',  [InternalChatController::class, 'cancelServiceRequest']);
});
```

### ServiceTokenMiddleware

Validates `Authorization: Bearer {INTERNAL_SERVICE_TOKEN}` on all `/internal/*` routes.
Token is a 64-character random secret shared only between Laravel and the Python service via `.env`.
These routes are not reachable from the public internet (Docker internal network only).

---

## Section 7 — Security

### File upload security

- Allowed types: PDF, TXT, DOCX only (MIME-type validated, not just extension)
- Max file size: 10 MB
- Max documents per shop: 20
- Files stored at `storage/shops/{shop_id}/{uuid}.bin` — outside public web root
- Original filenames never written to disk (only stored in metadata)
- Raw files deleted from disk immediately after chunking and embedding

### ChromaDB tenant isolation

```python
# shop_id filter is MANDATORY on every query — never skipped
collection.query(
    query_embeddings=[embedding],
    where={"shop_id": shop_id},   # enforced in vectorstore.py
    n_results=3
)
```

### Frontend never sends shop_id

`shop_id` is always injected server-side by Laravel from the Sanctum token.
The frontend sends only `{ message, session_id }`.

### Access control matrix

| Endpoint | Auth |
|----------|------|
| `POST /api/chat` | Sanctum token (any authenticated user) |
| `POST /rag/ingest` | Sanctum token + Owner role only |
| `DELETE /rag/document/{id}` | Sanctum token + Owner role only |
| `GET /internal/*` | INTERNAL_SERVICE_TOKEN only (Docker network) |

### Audit logging

Every document upload, deletion, and chat session is written to the existing
`tenant_audit_events` table with `shop_id`, `user_id`, `action`, and `timestamp`.

---

## Section 8 — Deployment

### docker-compose.yml additions

```yaml
ai-service:
  build: ./ai-service
  ports: ["8001:8001"]
  environment:
    - LLM_PROVIDER=nvidia_nim
    - LLM_MODEL=meta/llama-3.1-8b-instruct
    - LLM_API_KEY=${LLM_API_KEY}
    - LLM_BASE_URL=https://integrate.api.nvidia.com/v1
    - LLM_FALLBACK_PROVIDER=ollama
    - LLM_FALLBACK_MODEL=phi3:mini
    - INTERNAL_SERVICE_TOKEN=${INTERNAL_SERVICE_TOKEN}
    - LARAVEL_INTERNAL_URL=http://laravel-app:8000
    - CHROMA_PATH=/data/chromadb
  volumes:
    - chroma_data:/data/chromadb
  depends_on: [laravel-app]

ollama:
  image: ollama/ollama
  volumes:
    - ollama_data:/root/.ollama
  deploy:
    resources:
      limits:
        memory: 3G

volumes:
  chroma_data:
  ollama_data:
```

### RAM budget (c7i-flex.large, 4 GB)

| Service | RAM |
|---------|-----|
| Laravel + MySQL | ~800 MB |
| ai-service (sentence-transformers loaded) | ~400 MB |
| ollama (phi3:mini, fallback only) | ~2.3 GB |
| OS + buffer | ~500 MB |
| **Total** | **~4.0 GB ✓** |

### New .env variables

```bash
# Laravel .env
AI_SERVICE_URL=http://ai-service:8001
INTERNAL_SERVICE_TOKEN=<64-char random secret>

# ai-service .env
LLM_PROVIDER=nvidia_nim
LLM_MODEL=meta/llama-3.1-8b-instruct
LLM_API_KEY=nvapi-xxxx
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_FALLBACK_PROVIDER=ollama
LLM_FALLBACK_MODEL=phi3:mini
INTERNAL_SERVICE_TOKEN=<same 64-char secret>
LARAVEL_INTERNAL_URL=http://laravel-app:8000
CHROMA_PATH=/data/chromadb
```

### First-deploy step in deploy.sh

```bash
# Pull Ollama fallback model on first deploy
docker exec mospams-ollama-1 ollama pull phi3:mini
```

---

## File Summary

### New files — Python ai-service

```
ai-service/
├── Dockerfile
├── requirements.txt
├── main.py
├── config.py
├── chat/handler.py, router.py, history.py
├── rag/embedder.py, vectorstore.py, ingestor.py
├── tools/definitions.py, executor.py
└── llm/base.py, factory.py, nvidia_nim_client.py,
        groq_client.py, ollama_client.py,
        openai_client.py, anthropic_client.py, gemini_client.py
```

### New files — Laravel backend

```
Backend/app/Http/Controllers/Api/ChatController.php
Backend/app/Http/Controllers/Api/InternalChatController.php
Backend/app/Http/Middleware/ServiceTokenMiddleware.php
```

### New files — React frontend

```
Frontend/src/features/chat/
├── components/ChatBubble.tsx, ChatWindow.tsx,
│             ChatMessage.tsx, ChatTypingIndicator.tsx
├── hooks/useChat.ts
└── api/chatApi.ts
```

### Modified files

```
Backend/routes/api.php                   (add /chat + /internal/* routes)
Backend/app/Http/Kernel.php              (register ServiceTokenMiddleware)
docker-compose.yml                       (add ai-service + ollama)
deploy.sh                                (add ollama model pull step)
Frontend/src/app/App.tsx                 (mount ChatBubble in auth wrapper)
```
