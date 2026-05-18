import { useState, useCallback } from 'react';
import {
  getConversations,
  getConversation,
  deleteConversation,
  type ConversationSummary,
  type ConversationDetail,
} from '../api/chatApi';

export function useHistory() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [detail, setDetail]               = useState<ConversationDetail | null>(null);
  const [loading, setLoading]             = useState(false);

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
