import { apiMutation } from '@/shared/lib/api';

export interface ChatResponse {
  response: string;
  session_id: string;
}

export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  return apiMutation<ChatResponse>('/api/chat', 'POST', { message, session_id: sessionId });
}
