import { ScrollText } from 'lucide-react';

export default function ActivityLogsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F5F5F4] flex items-center justify-center mb-5">
        <ScrollText className="w-6 h-6 text-[#A8A29E]" strokeWidth={1.5} />
      </div>
      <h2 className="text-[18px] font-semibold text-[#1C1917] mb-1.5">Activity Logs</h2>
      <p className="text-[13px] text-[#A8A29E]">This page is coming soon.</p>
    </div>
  );
}
