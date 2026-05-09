import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Calendar } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (actionFilter) params.set('action', actionFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('limit', '200');

    apiGet<{ data: any[] }>(`/api/superadmin/audit-logs?${params.toString()}`)
      .then(r => setLogs(r.data))
      .catch(e => toast.error(e instanceof Error ? e.message : 'Failed to load logs'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLogs(); }, [search, actionFilter, dateFrom, dateTo]);

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Platform Audit Logs</h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Global visibility of high-level platform actions</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search actions, users, shops..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 min-w-[160px]"
        />
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-zinc-700"
          />
          <span className="text-zinc-500 text-[13px]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Actor</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Shop</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Resource</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.logId} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-[12px] text-zinc-400">{log.loggedAt ? new Date(log.loggedAt).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-[12px] text-white">{log.actorName ?? 'System'}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-300">{log.shopName ?? 'Platform'}</td>
                  <td className="px-4 py-3 text-[12px] text-white">{log.action}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500">{log.tableName ?? 'N/A'}#{log.recordId ?? 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
