# Chat & AI Service Backend Guide

**Last updated:** 2026-05-18

## Overview

MoSPAMS includes an AI-powered chatbot assistant available to all user roles (Owner, Staff, Mechanic, Customer). The architecture consists of:

1. **Laravel ChatController** — Frontend-facing API that handles authentication, rate limiting, and conversation persistence
2. **Python AI Service (FastAPI)** — Runs LLM inference with tool-calling capabilities
3. **InternalChatController** — Internal API that provides the AI service with database access, enforcing RBAC

## Database Tables

### chat_conversations
| Column | Type | Notes |
|---|---|---|
| conversation_id | bigint | PK, auto-increment |
| user_id_fk | bigint unsigned | FK → users |
| shop_id_fk | bigint unsigned | FK → shops |
| session_id | varchar(64) | UNIQUE |
| title | varchar(200) | nullable |
| created_at / updated_at | timestamps | |

### chat_messages
| Column | Type | Notes |
|---|---|---|
| message_id | bigint | PK, auto-increment |
| conversation_id_fk | bigint unsigned | FK → chat_conversations |
| role | enum('user','assistant') | |
| content | text | |
| token_count | int unsigned | default 0 |
| created_at | timestamp | |

### chat_daily_usage
| Column | Type | Notes |
|---|---|---|
| id | bigint | PK |
| user_id_fk | bigint unsigned | |
| shop_id_fk | bigint unsigned | |
| usage_date | date | |
| message_count | int unsigned | default 0 |
| | | UNIQUE(user_id_fk, shop_id_fk, usage_date) |

> **Important:** The table is named `chat_daily_usage` (singular). The `ChatDailyUsage` model explicitly sets `protected $table = 'chat_daily_usage'` to override Laravel's default pluralization.

## Models

- `App\Models\ChatConversation` — PK: `conversation_id`
- `App\Models\ChatMessage` — PK: `message_id`
- `App\Models\ChatDailyUsage` — Custom table name: `chat_daily_usage`

## API Routes

### Public (authenticated)
| Method | Route | Controller | Description |
|---|---|---|---|
| POST | `/api/chat` | `ChatController@send` | Send a chat message |
| POST | `/api/chat/stream` | `ChatController@stream` | Stream a chat response (SSE) |
| GET | `/api/chat/conversations` | `ChatController@conversations` | List user's conversations |
| GET | `/api/chat/conversations/{id}/messages` | `ChatController@messages` | Get messages for a conversation |

### Internal (service-to-service)
| Method | Route | Controller | Description |
|---|---|---|---|
| POST | `/api/internal/db` | `InternalChatController@dbOperation` | Unified database access for AI tool calls |

## Daily Rate Limits

| Role | Messages/Day |
|---|---|
| Owner | Unlimited (`PHP_INT_MAX`) |
| Staff | 200 |
| Mechanic | 50 |
| Customer | 50 |

## RBAC (Role-Based Access Control)

The `InternalChatController::dbOperation()` method enforces read/write access per role:

### Read Access
| Entity | Owner | Staff | Mechanic | Customer |
|---|---|---|---|---|
| customers | ✅ | ✅ | ❌ | ❌ |
| service_jobs | ✅ all | ✅ all | ✅ own only | ✅ own only |
| parts | ✅ | ✅ | ❌ | ❌ |
| mechanics | ✅ | ✅ | ❌ | ❌ |
| sales | ✅ | ❌ | ❌ | ❌ |
| service_types | ✅ | ✅ | ❌ | ✅ |
| shop | ✅ | ✅ | ❌ | ✅ |
| user_profile | ✅ | ✅ | ✅ | ✅ |
| payments | ❌ | ❌ | ❌ | ✅ own only |

### Write Access
| Entity | Owner | Staff | Mechanic | Customer |
|---|---|---|---|---|
| customers | ✅ | ✅ | ❌ | ❌ |
| service_jobs | ✅ | ✅ | ✅ | ✅ |
| parts | ✅ | ❌ | ❌ | ❌ |
| service_types | ✅ | ❌ | ❌ | ❌ |
| shop | ✅ | ❌ | ❌ | ❌ |

**Delete operations are globally blocked.**

## Error Handling

All chat endpoints have comprehensive try/catch:
- `ChatController::send()` — catches `ConnectionException` (503) and general `\Exception` (500)
- `ChatController::stream()` — inner try/catch inside the stream closure, plus outer try/catch
- AI Service `router.py` — try/except on all endpoints with logging
- AI Service `main.py` — global FastAPI exception handler

## Testing

To test the chatbot:
1. Log in as any role
2. Click the chat bubble (bottom-right)
3. Type a message and send
4. For Owner: "What is my name?", "How many customers?", "Show revenue"
5. For Staff: "What is my name?", "List pending jobs"
6. For Mechanic: "Show my assigned jobs"
7. For Customer: "What services do you offer?", "Show my payments"
