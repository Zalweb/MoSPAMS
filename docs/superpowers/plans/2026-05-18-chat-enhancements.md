# Chat Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversation persistence, daily quotas, SSE streaming, and token budgeting to the MoSPAMS AI chatbot.

**Architecture:** Laravel stores chat history and enforces daily message quotas per user. The AI service gains a streaming endpoint and a token-budget module that summarizes old context when approaching the 20k-token limit. The frontend upgrades from a single-round-trip fetch to a streaming ReadableStream consumer that renders tokens as they arrive.

**Tech Stack:** Laravel 11, MySQL, Python FastAPI, OpenAI streaming SDK, React + TypeScript, EventSource / ReadableStream

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `Backend/database/migrations/*_create_chat_tables.php` | Create | `chat_conversations`, `chat_messages`, `chat_daily_usage` tables |
| `Backend/app/Models/ChatConversation.php` | Create | Eloquent model |
| `Backend/app/Models/ChatMessage.php` | Create | Eloquent model |
| `Backend/app/Models/ChatDailyUsage.php` | Create | Eloquent model |
| `Backend/app/Http/Controllers/Api/ChatController.php` | Modify | Save messages, enforce quotas, proxy SSE |
| `Backend/app/Http/Controllers/Api/ChatHistoryController.php` | Create | List/get/delete conversations |
| `Backend/routes/api.php` | Modify | Add history + stream routes |
| `ai-service/chat/token_budget.py` | Create | Summarize old messages when >20k tokens |
| `ai-service/llm/openai_compat.py` | Modify | Add `chat_stream()` generator |
| `ai-service/chat/handler.py` | Modify | Add `handle_chat_stream()` async generator |
| `ai-service/main.py` | Modify | Add `/chat/stream/owner` and `/chat/stream/customer` SSE endpoints |
| `Frontend/src/features/chat/api/chatApi.ts` | Modify | Add `streamMessage()` using fetch + ReadableStream |
| `Frontend/src/features/chat/hooks/useChat.ts` | Modify | Use streaming, expose streaming state |
| `Frontend/src/features/chat/components/ChatWindow.tsx` | Modify | Show streaming token-by-token, quota error message |

---

## Task 1: Database migrations for chat persistence

**Files:**
- Create: `Backend/database/migrations/2026_05_18_000001_create_chat_tables.php`

- [ ] **Step 1: Write the migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id('conversation_id');
            $table->unsignedBigInteger('user_id_fk');
            $table->unsignedBigInteger('shop_id_fk');
            $table->string('session_id', 64)->unique();
            $table->string('title', 200)->nullable();
            $table->timestamps();
            $table->index(['user_id_fk', 'shop_id_fk']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id('message_id');
            $table->unsignedBigInteger('conversation_id_fk');
            $table->enum('role', ['user', 'assistant']);
            $table->text('content');
            $table->unsignedInteger('token_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->index('conversation_id_fk');
        });

        Schema::create('chat_daily_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id_fk');
            $table->unsignedBigInteger('shop_id_fk');
            $table->date('usage_date');
            $table->unsignedInteger('message_count')->default(0);
            $table->unique(['user_id_fk', 'shop_id_fk', 'usage_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_daily_usage');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_conversations');
    }
};
```

- [ ] **Step 2: Run migration on the server**

```bash
docker exec mospams-app php artisan migrate
```

Expected: `Migrating: 2026_05_18_000001_create_chat_tables` then `Migrated` for each table.

- [ ] **Step 3: Commit**

```bash
git add Backend/database/migrations/
git commit -m "feat: add chat_conversations, chat_messages, chat_daily_usage tables"
```

---

## Task 2: Eloquent models for chat tables

**Files:**
- Create: `Backend/app/Models/ChatConversation.php`
- Create: `Backend/app/Models/ChatMessage.php`
- Create: `Backend/app/Models/ChatDailyUsage.php`

- [ ] **Step 1: Write ChatConversation model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatConversation extends Model
{
    protected $primaryKey = 'conversation_id';
    protected $fillable = ['user_id_fk', 'shop_id_fk', 'session_id', 'title'];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id_fk', 'conversation_id');
    }
}
```

- [ ] **Step 2: Write ChatMessage model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'message_id';
    protected $fillable = ['conversation_id_fk', 'role', 'content', 'token_count'];
    protected $casts = ['created_at' => 'datetime'];
}
```

- [ ] **Step 3: Write ChatDailyUsage model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatDailyUsage extends Model
{
    public $timestamps = false;
    protected $fillable = ['user_id_fk', 'shop_id_fk', 'usage_date', 'message_count'];
}
```

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Models/ChatConversation.php Backend/app/Models/ChatMessage.php Backend/app/Models/ChatDailyUsage.php
git commit -m "feat: add ChatConversation, ChatMessage, ChatDailyUsage models"
```

---

## Task 3: Chat history API controller

**Files:**
- Create: `Backend/app/Http/Controllers/Api/ChatHistoryController.php`
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Write ChatHistoryController**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Models\ChatConversation;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ChatHistoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $conversations = ChatConversation::where('user_id_fk', $user->user_id)
            ->where('shop_id_fk', $user->shop_id_fk)
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['conversation_id', 'session_id', 'title', 'updated_at']);
        return response()->json($conversations);
    }

    public function show(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = ChatConversation::where('conversation_id', $conversationId)
            ->where('user_id_fk', $user->user_id)
            ->firstOrFail();
        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get(['role', 'content', 'created_at']);
        return response()->json(['conversation' => $conversation, 'messages' => $messages]);
    }

    public function destroy(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = ChatConversation::where('conversation_id', $conversationId)
            ->where('user_id_fk', $user->user_id)
            ->firstOrFail();
        $conversation->messages()->delete();
        $conversation->delete();
        return response()->json(['deleted' => true]);
    }
}
```

- [ ] **Step 2: Add routes to `Backend/routes/api.php`**

Inside the `auth:sanctum` middleware group, add:

```php
Route::get('/chat/history',                    [ChatHistoryController::class, 'index']);
Route::get('/chat/history/{id}',               [ChatHistoryController::class, 'show']);
Route::delete('/chat/history/{id}',            [ChatHistoryController::class, 'destroy']);
```

Also add the import at the top of the file:
```php
use App\Http\Controllers\Api\ChatHistoryController;
```

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ChatHistoryController.php Backend/routes/api.php
git commit -m "feat: add chat history API (list, show, delete conversations)"
```

---

## Task 4: Update ChatController — save messages + enforce daily quotas

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/ChatController.php`

Daily limits by role: `owner` = unlimited, `staff` = 200, `mechanic` = 50, `customer` = 50.

- [ ] **Step 1: Rewrite ChatController**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatDailyUsage;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    private const DAILY_LIMITS = [
        'owner'    => PHP_INT_MAX,
        'staff'    => 200,
        'mechanic' => 50,
        'customer' => 50,
    ];

    public function send(Request $request)
    {
        $request->validate([
            'message'    => 'required|string|max:2000',
            'session_id' => 'required|string|max:64',
        ]);

        $user = $request->user();
        $role = strtolower($user->role?->role_name ?? 'customer');

        if ($role === 'superadmin') {
            return response()->json(['error' => 'Chat is not available for SuperAdmin.'], 403);
        }

        $shopId = $user->shop_id_fk;
        if (!$shopId) {
            return response()->json(['error' => 'No shop associated with this account.'], 422);
        }

        // Quota check
        $limit = self::DAILY_LIMITS[$role] ?? 50;
        if ($limit !== PHP_INT_MAX) {
            $usage = ChatDailyUsage::firstOrCreate(
                ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId, 'usage_date' => today()],
                ['message_count' => 0]
            );
            if ($usage->message_count >= $limit) {
                return response()->json(['error' => "Daily message limit of {$limit} reached. Try again tomorrow."], 429);
            }
        }

        // Find or create conversation for this session
        $conversation = ChatConversation::firstOrCreate(
            ['session_id' => $request->session_id],
            ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId]
        );

        $endpoint = in_array($role, ['owner', 'staff', 'mechanic']) ? 'owner' : 'customer';
        $aiUrl    = config('services.ai.url');

        $response = Http::timeout(60)->post("{$aiUrl}/chat/{$endpoint}", [
            'shop_id'    => $shopId,
            'user_id'    => $user->user_id,
            'role'       => $role,
            'session_id' => $request->session_id,
            'message'    => $request->message,
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'AI service unavailable. Please try again.'], 503);
        }

        $data = $response->json();
        $answer = $data['response'] ?? '';

        // Persist messages
        ChatMessage::create([
            'conversation_id_fk' => $conversation->conversation_id,
            'role'               => 'user',
            'content'            => $request->message,
            'token_count'        => 0,
        ]);
        ChatMessage::create([
            'conversation_id_fk' => $conversation->conversation_id,
            'role'               => 'assistant',
            'content'            => $answer,
            'token_count'        => 0,
        ]);

        // Auto-title the conversation from first user message
        if (!$conversation->title) {
            $conversation->update(['title' => substr($request->message, 0, 80)]);
        }

        $conversation->touch();

        // Increment usage counter
        if ($limit !== PHP_INT_MAX) {
            ChatDailyUsage::where('user_id_fk', $user->user_id)
                ->where('shop_id_fk', $shopId)
                ->where('usage_date', today())
                ->increment('message_count');
        }

        return response()->json($data);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ChatController.php
git commit -m "feat: persist chat messages to DB and enforce daily message quotas"
```

---

## Task 5: Frontend conversation history panel

**Files:**
- Modify: `Frontend/src/features/chat/components/ChatWindow.tsx`

Show a "History" panel accessible from the chat header. Clicking a past conversation loads it into the current view (read-only display). Keep it simple — no routing needed, toggle within the component.

- [ ] **Step 1: Add history API helper to `chatApi.ts`**

```typescript
export interface ConversationSummary {
  conversation_id: number;
  session_id: string;
  title: string | null;
  updated_at: string;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: { role: 'user' | 'assistant'; content: string; created_at: string }[];
}

export async function getConversations(): Promise<ConversationSummary[]> {
  return apiMutation<ConversationSummary[]>('/api/chat/history', 'GET');
}

export async function getConversation(id: number): Promise<ConversationDetail> {
  return apiMutation<ConversationDetail>(`/api/chat/history/${id}`, 'GET');
}

export async function deleteConversation(id: number): Promise<void> {
  await apiMutation<void>(`/api/chat/history/${id}`, 'DELETE');
}
```

Note: `apiMutation` is used for GET here — if the shared lib has a dedicated `apiFetch` for GET requests, use that instead. Check `Frontend/src/shared/lib/api.ts` for the correct function.

- [ ] **Step 2: Add a `useHistory` hook at `Frontend/src/features/chat/hooks/useHistory.ts`**

```typescript
import { useState, useCallback } from 'react';
import { getConversations, getConversation, deleteConversation } from '../api/chatApi';
import type { ConversationSummary, ConversationDetail } from '../api/chatApi';

export function useHistory() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setConversations(await getConversations()); }
    finally { setLoading(false); }
  }, []);

  const open = useCallback(async (id: number) => {
    setLoading(true);
    try { setDetail(await getConversation(id)); }
    finally { setLoading(false); }
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteConversation(id);
    setConversations(prev => prev.filter(c => c.conversation_id !== id));
    setDetail(null);
  }, []);

  const close = useCallback(() => setDetail(null), []);

  return { conversations, detail, loading, load, open, remove, close };
}
```

- [ ] **Step 3: Update `ChatWindow.tsx` to include history panel**

Add a "History" button in the header. When clicked it loads and shows the history list as a slide-over panel inside the chat window.

```tsx
import { useState } from 'react';
import { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useHistory } from '../hooks/useHistory';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';
import { useAuth } from '@/features/auth/context/AuthContext';

interface Props { onClose: () => void; }

export default function ChatWindow({ onClose }: Props) {
  const { messages, isLoading, error, send, reset } = useChat();
  const { conversations, detail, loading: histLoading, load, open, remove, close } = useHistory();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const isOwnerOrStaff = user?.role === 'Owner' || user?.role === 'Staff';
  const greeting = isOwnerOrStaff
    ? "Hi! I'm your shop assistant. Ask me about inventory, sales, jobs, or upload documents."
    : "Hi! I can help with your service history, bookings, vehicles, and payments.";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => { send(input); setInput(''); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleHistory = () => {
    if (!showHistory) load();
    setShowHistory(prev => !prev);
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
          <button onClick={toggleHistory} className="text-zinc-500 hover:text-zinc-300 text-xs">
            {showHistory ? 'Chat' : 'History'}
          </button>
          <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-xs">
            Clear
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">
            ×
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History panel */
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {detail ? (
            <>
              <button onClick={close} className="text-xs text-zinc-400 hover:text-zinc-200 mb-2">← Back</button>
              {detail.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm
                    ${m.role === 'user' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </>
          ) : histLoading ? (
            <p className="text-xs text-zinc-500 text-center mt-8">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center mt-8">No conversation history yet.</p>
          ) : (
            conversations.map(c => (
              <div key={c.conversation_id} className="flex items-center justify-between
                group bg-zinc-800 hover:bg-zinc-700 rounded-xl px-3 py-2 cursor-pointer"
                onClick={() => open(c.conversation_id)}>
                <span className="text-xs text-zinc-200 truncate flex-1">
                  {c.title || 'Untitled conversation'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); remove(c.conversation_id); }}
                  className="text-zinc-600 hover:text-red-400 text-xs ml-2 opacity-0 group-hover:opacity-100">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Chat panel */
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            <div className="flex justify-start mb-3">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm
                              text-sm leading-relaxed bg-zinc-800 text-zinc-100 border border-zinc-700">
                {greeting}
              </div>
            </div>
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {isLoading && <ChatTypingIndicator />}
            {error && <p className="text-xs text-red-400 text-center px-2">{error}</p>}
            <div ref={bottomRef} />
          </div>
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
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Check the `apiMutation` signature in `Frontend/src/shared/lib/api.ts`**

If `apiMutation` does not support GET, add an `apiFetch` function (or rename call for GET requests):

```typescript
export async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

Then update `getConversations` and `getConversation` to use `apiFetch`.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/chat/
git commit -m "feat: chat history panel — list, open, and delete past conversations"
```

---

## Task 6: AI service token budget module

**Files:**
- Create: `ai-service/chat/token_budget.py`

When the conversation history exceeds 20,000 estimated tokens, summarize older messages into a single system note so the context stays within limits. Uses a rough 4-chars-per-token estimate (no tiktoken dependency).

- [ ] **Step 1: Write `token_budget.py`**

```python
from __future__ import annotations

BUDGET_TOKENS = 20_000
CHARS_PER_TOKEN = 4  # conservative estimate

def _estimate(messages: list[dict]) -> int:
    return sum(len(m.get("content") or "") for m in messages) // CHARS_PER_TOKEN

def maybe_trim(
    messages: list[dict],
    provider,
    system_prompt: str,
) -> list[dict]:
    """
    If messages exceed the token budget, summarize the oldest half via the LLM,
    then replace them with a single summarized system message.
    Returns the (possibly trimmed) messages list.
    """
    if _estimate(messages) <= BUDGET_TOKENS:
        return messages

    # Split: keep the newest 50%, summarize the oldest 50%
    split = len(messages) // 2
    old_half = messages[:split]
    new_half = messages[split:]

    summary_prompt = [
        {"role": "system", "content": "Summarize the following conversation in 3-5 bullet points, preserving key facts mentioned by the user."},
        *old_half,
    ]
    summary_response = provider.chat(summary_prompt, tools=None)
    summary_text = summary_response.content or "(summary unavailable)"

    summary_message = {
        "role": "system",
        "content": f"[Earlier conversation summary]\n{summary_text}",
    }
    return [summary_message] + new_half
```

- [ ] **Step 2: Integrate into `ai-service/chat/handler.py`**

At the top of `handle_chat`, after building `messages`, add:

```python
from chat.token_budget import maybe_trim

# inside handle_chat, after: messages = [...history..., user_message]
messages = maybe_trim(messages, provider, system)
```

Full updated section of `handle_chat`:

```python
provider = get_llm_provider()
if not provider.is_available():
    provider = get_fallback_provider()
    tools = []

messages = maybe_trim(messages, provider, system)

for _ in range(MAX_TOOL_ITERATIONS):
    ...
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/chat/token_budget.py ai-service/chat/handler.py
git commit -m "feat: token budget — summarize old context when approaching 20k tokens"
```

---

## Task 7: Add streaming to the OpenAI-compat LLM client

**Files:**
- Modify: `ai-service/llm/openai_compat.py`
- Modify: `ai-service/llm/base.py`

- [ ] **Step 1: Add `chat_stream()` to `llm/base.py`**

Open `ai-service/llm/base.py` and add an abstract streaming method:

```python
from typing import Generator

class LLMProvider:
    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> "ChatResponse":
        raise NotImplementedError

    def chat_stream(self, messages: list[dict]) -> Generator[str, None, None]:
        """Yield text tokens as they arrive. No tool use during streaming."""
        raise NotImplementedError

    def is_available(self) -> bool:
        raise NotImplementedError
```

- [ ] **Step 2: Implement `chat_stream()` in `OpenAICompatClient`**

In `ai-service/llm/openai_compat.py`, add after `chat()`:

```python
from typing import Generator

def chat_stream(self, messages: list[dict]) -> Generator[str, None, None]:
    stream = self._client.chat.completions.create(
        model=self._model,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/llm/base.py ai-service/llm/openai_compat.py
git commit -m "feat: add streaming chat_stream() to LLM provider"
```

---

## Task 8: Streaming handler + SSE endpoints in the AI service

**Files:**
- Modify: `ai-service/chat/handler.py`
- Modify: `ai-service/main.py`

- [ ] **Step 1: Add `handle_chat_stream()` to `handler.py`**

This runs the tool-calling loop first (non-streaming) to collect tool results, then streams the final answer.

Add to `ai-service/chat/handler.py`:

```python
from typing import AsyncGenerator

async def handle_chat_stream(
    shop_id: int, user_id: int, role: str, session_id: str, message: str
) -> AsyncGenerator[str, None]:
    embedding = embed(message)
    rag_chunks = query(shop_id=shop_id, embedding=embedding, n=3)

    system = _system_prompt(role, shop_id, rag_chunks)
    history = get_history(session_id)
    messages = [{"role": "system", "content": system}] + history + [{"role": "user", "content": message}]
    append_message(session_id, "user", message)

    tools = _tools_for_role(role)
    provider = get_llm_provider()
    if not provider.is_available():
        provider = get_fallback_provider()
        tools = []

    messages = maybe_trim(messages, provider, system)

    # Run tool-calling loop (non-streaming) to resolve all tool calls first
    full_answer = ""
    for _ in range(MAX_TOOL_ITERATIONS):
        response = provider.chat(messages, tools=tools)
        if not response.tool_calls:
            full_answer = response.content or ""
            break
        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [{"id": tc["id"], "type": "function", "function": tc["function"]} for tc in response.tool_calls],
        })
        for tc in response.tool_calls:
            args = json.loads(tc["function"]["arguments"])
            result = execute_tool(name=tc["function"]["name"], arguments=args, shop_id=shop_id, user_id=user_id)
            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": result})
    else:
        # Loop exhausted — stream final synthesis
        pass

    if full_answer:
        # Tool calls resolved — stream the final answer word by word from accumulated context
        # Re-ask the LLM to stream a readable answer from the tool results
        messages.append({"role": "user", "content": "(Answer based on the tool results above.)"})

    accumulated = ""
    for token in provider.chat_stream(messages):
        accumulated += token
        yield token

    if accumulated:
        append_message(session_id, "assistant", accumulated)
```

- [ ] **Step 2: Add SSE endpoints to `main.py`**

Open `ai-service/main.py` and add:

```python
from fastapi.responses import StreamingResponse
from chat.handler import handle_chat_stream

@app.post("/chat/stream/owner")
@app.post("/chat/stream/customer")
async def chat_stream_endpoint(request: Request):
    body = await request.json()
    shop_id   = int(body.get("shop_id", 0))
    user_id   = int(body.get("user_id", 0))
    role      = body.get("role", "customer")
    session_id = body.get("session_id", "")
    message   = body.get("message", "")

    async def event_generator():
        async for token in handle_chat_stream(shop_id, user_id, role, session_id, message):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

- [ ] **Step 3: Commit**

```bash
git add ai-service/chat/handler.py ai-service/main.py
git commit -m "feat: SSE streaming endpoints /chat/stream/owner and /chat/stream/customer"
```

---

## Task 9: Laravel SSE proxy endpoint

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/ChatController.php`
- Modify: `Backend/routes/api.php`

Laravel streams the AI service SSE response directly back to the frontend. This avoids CORS issues and keeps the internal service hidden.

- [ ] **Step 1: Add `stream()` method to `ChatController.php`**

```php
public function stream(Request $request)
{
    $request->validate([
        'message'    => 'required|string|max:2000',
        'session_id' => 'required|string|max:64',
    ]);

    $user = $request->user();
    $role = strtolower($user->role?->role_name ?? 'customer');

    if ($role === 'superadmin') {
        return response()->json(['error' => 'Chat is not available for SuperAdmin.'], 403);
    }

    $shopId = $user->shop_id_fk;
    if (!$shopId) {
        return response()->json(['error' => 'No shop associated with this account.'], 422);
    }

    // Quota check
    $limit = self::DAILY_LIMITS[$role] ?? 50;
    if ($limit !== PHP_INT_MAX) {
        $usage = ChatDailyUsage::firstOrCreate(
            ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId, 'usage_date' => today()],
            ['message_count' => 0]
        );
        if ($usage->message_count >= $limit) {
            return response()->json(['error' => "Daily message limit of {$limit} reached. Try again tomorrow."], 429);
        }
    }

    $conversation = ChatConversation::firstOrCreate(
        ['session_id' => $request->session_id],
        ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId]
    );

    $endpoint = in_array($role, ['owner', 'staff', 'mechanic']) ? 'owner' : 'customer';
    $aiUrl    = config('services.ai.url');
    $payload  = [
        'shop_id'    => $shopId,
        'user_id'    => $user->user_id,
        'role'       => $role,
        'session_id' => $request->session_id,
        'message'    => $request->message,
    ];

    // Save user message now; assistant message saved after stream
    ChatMessage::create([
        'conversation_id_fk' => $conversation->conversation_id,
        'role'               => 'user',
        'content'            => $request->message,
    ]);
    if (!$conversation->title) {
        $conversation->update(['title' => substr($request->message, 0, 80)]);
    }

    $conversationId = $conversation->conversation_id;
    $userId = $user->user_id;
    $shopIdVal = $shopId;
    $roleVal = $role;
    $limit_ = $limit;

    return response()->stream(function () use ($aiUrl, $endpoint, $payload, $conversationId, $userId, $shopIdVal, $roleVal, $limit_) {
        $client = new \GuzzleHttp\Client();
        $response = $client->post("{$aiUrl}/chat/stream/{$endpoint}", [
            'json'    => $payload,
            'stream'  => true,
            'timeout' => 60,
        ]);

        $accumulated = '';
        $body = $response->getBody();
        while (!$body->eof()) {
            $line = '';
            while (!$body->eof()) {
                $char = $body->read(1);
                $line .= $char;
                if ($char === "\n") break;
            }
            $line = trim($line);
            if (!str_starts_with($line, 'data: ')) continue;
            $data = substr($line, 6);
            if ($data === '[DONE]') break;
            $accumulated .= $data;
            echo "data: " . json_encode(['token' => $data]) . "\n\n";
            ob_flush();
            flush();
        }

        // Persist assistant reply
        \App\Models\ChatMessage::create([
            'conversation_id_fk' => $conversationId,
            'role'               => 'assistant',
            'content'            => $accumulated,
        ]);

        // Increment quota
        if ($limit_ !== PHP_INT_MAX) {
            \App\Models\ChatDailyUsage::where('user_id_fk', $userId)
                ->where('shop_id_fk', $shopIdVal)
                ->where('usage_date', today())
                ->increment('message_count');
        }

        echo "data: " . json_encode(['done' => true]) . "\n\n";
        ob_flush();
        flush();
    }, 200, [
        'Content-Type'      => 'text/event-stream',
        'Cache-Control'     => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
}
```

- [ ] **Step 2: Add route in `api.php`**

```php
Route::post('/chat/stream', [ChatController::class, 'stream']);
```

- [ ] **Step 3: Verify guzzlehttp/guzzle is in composer.json**

Run:
```bash
docker exec mospams-app composer require guzzlehttp/guzzle
```

If already present (Laravel ships with it), this is a no-op.

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ChatController.php Backend/routes/api.php
git commit -m "feat: Laravel SSE proxy for streaming chat responses"
```

---

## Task 10: Frontend streaming consumer

**Files:**
- Modify: `Frontend/src/features/chat/api/chatApi.ts`
- Modify: `Frontend/src/features/chat/hooks/useChat.ts`
- Modify: `Frontend/src/features/chat/components/ChatMessage.tsx`

Replace the single-shot `sendMessage` call with a streaming fetch that appends tokens as they arrive.

- [ ] **Step 1: Add `streamMessage()` to `chatApi.ts`**

```typescript
export async function streamMessage(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    if (res.status === 429) {
      onError(err.error || 'Daily message limit reached.');
    } else {
      onError('Failed to get a response. Please try again.');
    }
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.done) { onDone(); return; }
        if (parsed.token) onToken(parsed.token);
      } catch { /* partial chunk */ }
    }
  }
  onDone();
}
```

- [ ] **Step 2: Update `useChat.ts` to use streaming**

```typescript
import { useState, useCallback, useRef } from 'react';
import { streamMessage } from '../api/chatApi';

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

  const append = (role: Message['role'], content: string): string => {
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, { id, role, content, timestamp: new Date() }]);
    return id;
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    append('user', text);
    setIsLoading(true);

    // Create an empty assistant message that will be filled token-by-token
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    await streamMessage(
      text,
      sessionId.current,
      (token) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + token } : m
        ));
      },
      () => setIsLoading(false),
      (err) => {
        setError(err);
        // Remove empty assistant placeholder on error
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setIsLoading(false);
      },
    );
  }, [isLoading]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    sessionId.current = crypto.randomUUID();
  }, []);

  return { messages, isLoading, error, send, reset };
}
```

- [ ] **Step 3: Update `ChatMessage.tsx` to show streaming cursor**

Add a blinking cursor on the last assistant message while it's streaming. Pass `isStreaming` prop:

In `ChatMessage.tsx`:

```tsx
import type { Message } from '../hooks/useChat';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
        ${isUser
          ? 'bg-white text-black rounded-br-sm'
          : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-sm'}`}>
        {message.content}
        {isStreaming && !isUser && (
          <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
```

In `ChatWindow.tsx`, update the messages map to pass `isStreaming`:

```tsx
{messages.map((msg, i) => (
  <ChatMessage
    key={msg.id}
    message={msg}
    isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
  />
))}
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/features/chat/
git commit -m "feat: streaming chat — tokens render as they arrive with blinking cursor"
```

---

## Task 11: Deploy

- [ ] **Step 1: Run deploy script**

```bash
bash deploy.sh
```

Expected: git push succeeds, SSH Docker rebuild completes without errors.

- [ ] **Step 2: Verify on server**

```bash
docker exec mospams-app php artisan migrate --force
docker compose restart
```

- [ ] **Step 3: Smoke test**

1. Open the chat as Owner — send "how many customers?" — should stream the answer token-by-token.
2. Open History — past conversation should appear.
3. Send 51 messages as Customer role — 51st should return "Daily message limit of 50 reached."
