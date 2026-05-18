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

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);
    setIsLoading(true);

    await streamMessage(
      text,
      sessionId.current,
      (token) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)
        );
      },
      () => {
        setIsLoading(false);
      },
      (err) => {
        setError(err);
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
