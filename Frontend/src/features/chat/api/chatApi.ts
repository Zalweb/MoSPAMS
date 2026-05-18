import { apiGet, apiMutation, getAuthToken } from '@/shared/lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export interface ChatResponse {
  response: string;
  session_id: string;
}

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

export async function sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
  return apiMutation<ChatResponse>('/api/chat', 'POST', { message, session_id: sessionId });
}

export async function getConversations(): Promise<ConversationSummary[]> {
  return apiGet<ConversationSummary[]>('/api/chat/history');
}

export async function getConversation(id: number): Promise<ConversationDetail> {
  return apiGet<ConversationDetail>(`/api/chat/history/${id}`);
}

export async function deleteConversation(id: number): Promise<void> {
  await apiMutation<void>(`/api/chat/history/${id}`, 'DELETE');
}

export async function streamMessage(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const token = getAuthToken();
  const host  = typeof window !== 'undefined' ? window.location.host : '';

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'text/event-stream',
        'X-Tenant-Host': host,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  } catch {
    onError('Network error. Please try again.');
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    if (res.status === 429) {
      onError((err as { error?: string }).error ?? 'Daily message limit reached.');
    } else {
      onError('Failed to get a response. Please try again.');
    }
    return;
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

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
        const parsed = JSON.parse(raw) as { token?: string; done?: boolean };
        if (parsed.done) { onDone(); return; }
        if (parsed.token) onToken(parsed.token);
      } catch {
        // partial or malformed chunk — skip
      }
    }
  }
  onDone();
}
