import { useState, useEffect, useRef } from 'react';
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
 <button
 onClick={close}
 className="text-xs text-zinc-400 hover:text-zinc-200 mb-2 block"
 >
 ← Back
 </button>
 {detail.messages.map((m, i) => (
 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
 <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap
 ${m.role === 'user'
 ? 'bg-white text-black'
 : 'bg-zinc-800 text-zinc-100 border border-zinc-700'}`}>
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
 <div
 key={c.conversation_id}
 className="flex items-center justify-between group
 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-3 py-2 cursor-pointer"
 onClick={() => open(c.conversation_id)}
 >
 <span className="text-xs text-zinc-200 truncate flex-1">
 {c.title ?? 'Untitled conversation'}
 </span>
 <button
 onClick={e => { e.stopPropagation(); remove(c.conversation_id); }}
 className="text-zinc-600 hover:text-red-400 text-xs ml-2 opacity-0 group-hover:opacity-100"
 >
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
 {error && (
 <p className="text-xs text-red-400 text-center px-2">{error}</p>
 )}
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
