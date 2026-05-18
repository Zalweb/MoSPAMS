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
