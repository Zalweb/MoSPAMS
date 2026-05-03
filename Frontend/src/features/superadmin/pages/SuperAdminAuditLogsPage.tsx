import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPlatformAuditLogs } from '@/features/superadmin/lib/api';
import type { PlatformAuditLog } from '@/shared/types';

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getPlatformAuditLogs(150)
      .then((response) => {
        if (cancelled) return;
        setLogs(response.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load audit logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Platform Audit Logs</h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Global visibility of high-level platform actions</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Actor</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Shop</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Resource</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-500">Loading logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-500">No logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.logId} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-[12px] text-zinc-500">{log.loggedAt ? new Date(log.loggedAt).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-200">{log.actorName ?? 'System'}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-400">{log.shopName ?? 'Platform'}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-200">{log.action}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500">{log.tableName ?? 'N/A'}#{log.recordId ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
