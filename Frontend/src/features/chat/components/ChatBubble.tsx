import { useState } from 'react';
import ChatWindow from './ChatWindow';

export default function ChatBubble() {
 const [open, setOpen] = useState(false);

 return (
 <>
 {open && <ChatWindow onClose={() => setOpen(false)} />}

 <button
 onClick={() => setOpen(prev => !prev)}
 aria-label="Open AI Assistant"
 className="fixed bottom-6 right-6 w-14 h-14 rounded-full z-50
 bg-zinc-900 border border-zinc-700 shadow-xl
 hover:scale-105 hover:shadow-zinc-800/50
 transition-all duration-200
 flex items-center justify-center"
 >
 <img src="/images/logo.svg" alt="MoSPAMS" className="w-8 h-8 object-contain" />
 </button>
 </>
 );
}
