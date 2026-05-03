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
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Platform Audit Logs</h2>
        <p className="text-[13px] text-[#A8A29E] mt-0.5">Global visibility of high-level platform actions</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Time</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Actor</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Shop</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Action</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Resource</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAFAF9]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#A8A29E]">Loading logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#A8A29E]">No logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.logId}>
                  <td className="px-4 py-3 text-[12px] text-[#A8A29E]">{log.loggedAt ? new Date(log.loggedAt).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-[12px] text-[#1C1917]">{log.actorName ?? 'System'}</td>
                  <td className="px-4 py-3 text-[12px] text-[#44403C]">{log.shopName ?? 'Platform'}</td>
                  <td className="px-4 py-3 text-[12px] text-[#1C1917]">{log.action}</td>
                  <td className="px-4 py-3 text-[12px] text-[#78716C]">{log.tableName ?? 'N/A'}#{log.recordId ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
