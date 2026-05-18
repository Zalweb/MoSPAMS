import type { Message } from '../hooks/useChat';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-white text-black rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-bl-sm'
          }`}
      >
        {message.content}
        {isStreaming && !isUser && (
          <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}
