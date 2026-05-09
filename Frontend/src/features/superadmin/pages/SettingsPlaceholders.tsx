import { Settings, MessageSquare } from 'lucide-react';

export function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Support Tickets</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shop support requests</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Support System Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          View and respond to support tickets from shops, track resolution times, and manage support queue.
        </p>
      </div>
    </div>
  );
}

export function ShopFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Shop Feedback</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Review feedback from shops</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Feedback System Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Collect and analyze feedback from shops to improve the platform.
        </p>
      </div>
    </div>
  );
}
