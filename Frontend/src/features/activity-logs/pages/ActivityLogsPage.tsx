import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Search, RefreshCw, Calendar, User, Activity, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { downloadCSV, toCSV } from '@/shared/lib/csv';
import { toast } from 'sonner';
import { useIsMobile } from '@/shared/hooks/use-mobile';

interface LogEntry {
 id: string;
 user: string;
 action: string;
 timestamp: string | null;
}

export default function ActivityLogsPage() {
 const isMobile = useIsMobile();
 const [logs, setLogs] = useState<LogEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [refreshing, setRefreshing] = useState(false);
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');
 const [todayCount, setTodayCount] = useState(0);
 const [meta, setMeta] = useState<{ currentPage: number; lastPage: number; total: number } | null>(null);
 const [page, setPage] = useState(1);

 const buildParams = useCallback((p: number) => {
 const params = new URLSearchParams();
 params.set('per_page', '50');
 params.set('page', String(p));
 if (dateFrom) params.set('from', dateFrom);
 if (dateTo) params.set('to', dateTo);
 return params.toString();
 }, [dateFrom, dateTo]);

 const fetchLogs = useCallback(async (showToast = false, p = 1) => {
 try {
 if (showToast) setRefreshing(true);
 const res = await apiGet<{ data: LogEntry[]; meta: { current_page: number; last_page: number; total: number } | null }>(
 `/api/activity-logs?${buildParams(p)}`
 );
 setLogs(res.data);
 setMeta(res.meta ? { currentPage: res.meta.current_page, lastPage: res.meta.last_page, total: res.meta.total } : null);
 setPage(res.meta?.current_page ?? 1);
 if (showToast) toast.success('Logs refreshed');

 // Fetch today's count separately
 const today = new Date().toISOString().slice(0, 10);
 const todayRes = await apiGet<{ meta?: { total: number } }>(`/api/activity-logs?from=${today}&to=${today}&per_page=1`);
 setTodayCount(todayRes.meta?.total ?? 0);
 } catch {
 toast.error('Failed to load activity logs');
 } finally {
 setLoading(false);
 setRefreshing(false);
 }
 }, [buildParams]);

 useEffect(() => {
 void fetchLogs();
 }, [fetchLogs]);

 const handlePageChange = (newPage: number) => {
 void fetchLogs(false, newPage);
 };

 const handleDateFilter = () => {
 setLoading(true);
 void fetchLogs(false, 1);
 };

 const handleClearDates = () => {
 setDateFrom('');
 setDateTo('');
 setLoading(true);
 void fetchLogs(false, 1);
 };

 const handleExport = () => {
 if (logs.length === 0) return;
 const rows = logs.map(l => ({
 user: l.user,
 action: l.action,
 timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : '',
 }));
 downloadCSV(`activity-logs-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, [
 { key: 'user', label: 'User' },
 { key: 'action', label: 'Action' },
 { key: 'timestamp', label: 'Timestamp' },
 ]));
 toast.success('Logs exported to CSV');
 };

 const filtered = search
 ? logs.filter(
 (l) =>
 l.user.toLowerCase().includes(search.toLowerCase()) ||
 l.action.toLowerCase().includes(search.toLowerCase())
 )
 : logs;

 const formatDate = (iso: string | null) => {
 if (!iso) return '—';
 const d = new Date(iso);
 return d.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 hour: 'numeric',
 minute: '2-digit',
 hour12: true,
 });
 };

 const getActionColor = (action: string) => {
 const lower = action.toLowerCase();
 if (lower.includes('delete') || lower.includes('removed')) return 'text-red-400';
 if (lower.includes('created') || lower.includes('added') || lower.includes('registered')) return 'text-emerald-400';
 if (lower.includes('updated') || lower.includes('set')) return 'text-blue-400';
 if (lower.includes('login') || lower.includes('logged in')) return 'text-violet-400';
 if (lower.includes('logout') || lower.includes('logged out')) return 'text-muted-foreground';
 return 'text-muted-foreground dark:text-zinc-300';
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Activity Logs</h1>
 <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">
 Track all actions performed in your shop
 </p>
 </div>
 <button
 onClick={() => void fetchLogs(true)}
 disabled={refreshing}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-sm font-medium text-muted-foreground dark:text-zinc-300 hover:text-foreground hover:bg-muted dark:bg-zinc-700 transition-all disabled:opacity-50"
 >
 <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 </div>

 {/* Search Bar */}
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search by user or action..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-transparent transition-all"
 />
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="brand-card rounded-2xl border p-4" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <div className="flex items-center gap-2 mb-2">
 <Activity className="w-4 h-4 text-muted-foreground" />
 <span className="text-xs text-muted-foreground font-medium">Total Events</span>
 </div>
 <p className="text-xl font-bold text-foreground">{meta?.total ?? logs.length}</p>
 </div>
 <div className="brand-card rounded-2xl border p-4" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <div className="flex items-center gap-2 mb-2">
 <User className="w-4 h-4 text-muted-foreground" />
 <span className="text-xs text-muted-foreground font-medium">Active Users</span>
 </div>
 <p className="text-xl font-bold text-foreground">
 {new Set(logs.map((l) => l.user)).size}
 </p>
 </div>
 <div className="bg-card rounded-2xl border border-border p-4 hidden sm:block">
 <div className="flex items-center gap-2 mb-2">
 <Calendar className="w-4 h-4 text-muted-foreground" />
 <span className="text-xs text-muted-foreground font-medium">Today's Events</span>
 </div>
 <p className="text-xl font-bold text-foreground">{todayCount}</p>
 </div>
 </div>

 {/* Date Filter + Export */}
 <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
 <div className="flex items-center gap-2">
 <input
 type="date"
 value={dateFrom}
 onChange={(e) => setDateFrom(e.target.value)}
 className="px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
 />
 <span className="text-muted-foreground text-sm">to</span>
 <input
 type="date"
 value={dateTo}
 onChange={(e) => setDateTo(e.target.value)}
 className="px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
 />
 <button
 onClick={handleDateFilter}
 className="px-3 py-2 rounded-xl bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-sm text-muted-foreground dark:text-zinc-300 hover:text-foreground hover:bg-muted dark:bg-zinc-700 transition-colors"
 >
 Filter
 </button>
 {(dateFrom || dateTo) && (
 <button
 onClick={handleClearDates}
 className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-muted-foreground dark:text-zinc-300 transition-colors"
 >
 Clear
 </button>
 )}
 </div>
 <button
 onClick={handleExport}
 disabled={logs.length === 0}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-sm font-medium text-muted-foreground dark:text-zinc-300 hover:text-foreground hover:bg-muted dark:bg-zinc-700 transition-all disabled:opacity-50 sm:ml-auto"
 >
 <Download className="w-4 h-4" />
 Export CSV
 </button>
 </div>

 {/* Logs Table */}
 <div className="brand-card rounded-2xl border overflow-hidden" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 {loading ? (
 isMobile ? (
 <div className="divide-y divide-border/50">
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="flex items-center gap-3 px-5 py-3.5">
 <div className="w-7 h-7 rounded-lg bg-muted/50 animate-pulse shrink-0" />
 <div className="flex-1 space-y-1.5">
 <div className="h-3.5 bg-muted/50 animate-pulse rounded w-24" />
 <div className="h-3 bg-muted/50 animate-pulse rounded w-44" />
 </div>
 </div>
 ))}
 </div>
 ) : (
 <table className="w-full">
 <thead>
 <tr className="border-b border-border">
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date & Time</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/50">
 {Array.from({ length: 8 }).map((_, i) => (
 <tr key={i}>
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-muted/50 animate-pulse shrink-0" />
 <div className="h-3.5 bg-muted/50 animate-pulse rounded w-24" />
 </div>
 </td>
 <td className="px-5 py-3.5"><div className="h-3.5 bg-muted/50 animate-pulse rounded w-48" /></td>
 <td className="px-5 py-3.5 hidden sm:table-cell"><div className="h-3.5 bg-muted/50 animate-pulse rounded w-32" /></td>
 </tr>
 ))}
 </tbody>
 </table>
 )
 ) : filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
 <ScrollText className="w-6 h-6 text-muted-foreground dark:text-zinc-600" strokeWidth={1.5} />
 </div>
 <h3 className="text-sm font-semibold text-foreground mb-1">
 {search ? 'No matching logs' : 'No activity yet'}
 </h3>
 <p className="text-xs text-muted-foreground max-w-xs">
 {search
 ? 'Try adjusting your search terms.'
 : 'Activity logs will appear here as actions are performed in your shop.'}
 </p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-border">
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
 User
 </th>
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
 Action
 </th>
 <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
 Date & Time
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border dark:divide-zinc-800/50">
 {filtered.map((log) => (
 <tr
 key={log.id}
 className="hover:bg-muted/50 transition-colors"
 >
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-secondary dark:bg-zinc-800 flex items-center justify-center shrink-0">
 <span className="text-[10px] font-bold text-muted-foreground">
 {log.user
 .split(' ')
 .map((n) => n[0])
 .join('')
 .slice(0, 2)
 .toUpperCase()}
 </span>
 </div>
 <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
 {log.user}
 </span>
 </div>
 </td>
 <td className="px-5 py-3.5">
 <span className={`text-sm ${getActionColor(log.action)}`}>{log.action}</span>
 </td>
 <td className="px-5 py-3.5 hidden sm:table-cell">
 <span className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {meta && meta.lastPage > 1 && (
 <div className="flex items-center justify-between px-5 py-3 border-t border-border">
 <p className="text-xs text-muted-foreground">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
 <div className="flex items-center gap-1">
 <button
 onClick={() => handlePageChange(page - 1)}
 disabled={page <= 1}
 className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 <button
 onClick={() => handlePageChange(page + 1)}
 disabled={page >= meta.lastPage}
 className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
