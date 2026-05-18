import { Message } from '../hooks/useChat';

interface Props { message: Message; }

export default function ChatMessage({ message }: Props) {
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
      </div>
    </div>
  );
}
