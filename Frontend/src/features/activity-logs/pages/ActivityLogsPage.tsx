import { ScrollText } from 'lucide-react';

export default function ActivityLogsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 flex items-center justify-center mb-5">
        <ScrollText className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] font-semibold text-white mb-1.5">Activity Logs</h2>
      <p className="text-[13px] text-zinc-500">This page is coming soon.</p>
    </div>
  );
}
