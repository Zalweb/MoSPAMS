import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../api/chatApi';
import { ApiError } from '@/shared/lib/api';

export interface Message {
 id: string;
 role: 'user' | 'assistant';
 content: string;
 timestamp: Date;
}

const TYPEWRITER_CHUNK = 3;
const TYPEWRITER_INTERVAL_MS = 12;

function typewrite(
 id: string,
 text: string,
 setter: React.Dispatch<React.SetStateAction<Message[]>>,
) {
 let i = 0;
 const tick = () => {
 i += TYPEWRITER_CHUNK;
 setter(prev =>
 prev.map(m => m.id === id ? { ...m, content: text.slice(0, i) } : m),
 );
 if (i < text.length) setTimeout(tick, TYPEWRITER_INTERVAL_MS);
 };
 setTimeout(tick, TYPEWRITER_INTERVAL_MS);
}

export function useChat() {
 const [messages, setMessages] = useState<Message[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const sessionId = useRef(crypto.randomUUID());

 const send = useCallback(async (text: string) => {
 if (!text.trim() || isLoading) return;
 setError(null);
 setMessages(prev => [
 ...prev,
 { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() },
 ]);
 setIsLoading(true);
 try {
 const res = await sendMessage(text, sessionId.current);
 const assistantId = crypto.randomUUID();
 setMessages(prev => [
 ...prev,
 { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
 ]);
 setIsLoading(false);
 typewrite(assistantId, res.response, setMessages);
 } catch (e) {
 if (e instanceof ApiError && e.status === 429) {
 setError((e.data as { error?: string }).error ?? 'Daily message limit reached.');
 } else {
 setError('Failed to get a response. Please try again.');
 }
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
