import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

interface HistoryJob {
 id: string;
 service_type: string;
 customer_name: string;
 completed_at: string | null;
 duration_hours: number | null;
 rating: number | null;
 comment: string | null;
}

interface HistoryResponse {
 data: HistoryJob[];
 pagination: {
 current_page: number;
 total: number;
 per_page: number;
 };
}

export default function JobHistoryPage() {
 const [jobs, setJobs] = useState<HistoryJob[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [timeframe, setTimeframe] = useState('all');
 const [currentPage, setCurrentPage] = useState(1);

 useEffect(() => {
 fetchHistory();
 }, [search, timeframe, currentPage]);

 const fetchHistory = async () => {
 try {
 setLoading(true);
 const params = new URLSearchParams();
 if (search) params.append('search', search);
 if (timeframe !== 'all') {
 const now = new Date();
 if (timeframe === 'month') {
 params.append('date_from', new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
 } else if (timeframe === 'three-months') {
 params.append('date_from', new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0]);
 }
 }
 params.append('page', String(currentPage));

 const response = await apiGet<HistoryResponse>(`/api/mechanic/history?${params.toString()}`);
 setJobs(response.data);
 } catch (error) {
 console.error('Failed to load job history', error);
 toast.error('Failed to load job history');
 } finally {
 setLoading(false);
 }
 };

 const formatDate = (dateStr: string) => {
 return new Date(dateStr).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric'
 });
 };

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-foreground">Job History</h2>
 <p className="text-sm text-muted-foreground mt-1">View your completed jobs and customer ratings</p>
 </div>

 {/* Filters */}
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search by customer or service..."
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setCurrentPage(1);
 }}
 className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
 />
 </div>
 <select
 value={timeframe}
 onChange={(e) => {
 setTimeframe(e.target.value);
 setCurrentPage(1);
 }}
 className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
 >
 <option value="all">All Time</option>
 <option value="month">This Month</option>
 <option value="three-months">Last 3 Months</option>
 </select>
 </div>

 {/* Jobs Table */}
 <div className="border border-border rounded-lg overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-secondary dark:bg-zinc-800">
 <tr>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Service Type</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Customer</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Completed</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Duration</th>
 <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Rating</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {loading ? (
 <tr>
 <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
 Loading...
 </td>
 </tr>
 ) : jobs.length === 0 ? (
 <tr>
 <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
 No completed jobs yet
 </td>
 </tr>
 ) : (
 jobs.map((job) => (
 <tr key={job.id} className="hover:bg-secondary/50 dark:hover:bg-zinc-800/50 transition-colors">
 <td className="px-6 py-4 text-sm font-medium text-foreground">{job.service_type}</td>
 <td className="px-6 py-4 text-sm text-foreground">{job.customer_name}</td>
 <td className="px-6 py-4 text-sm text-muted-foreground">{job.completed_at ? formatDate(job.completed_at) : '—'}</td>
 <td className="px-6 py-4 text-sm text-muted-foreground">{job.duration_hours != null ? `${job.duration_hours.toFixed(1)} hrs` : '—'}</td>
 <td className="px-6 py-4">
 {job.rating ? (
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-foreground">{job.rating}</span>
 <span className="text-yellow-400">★</span>
 {job.comment && (
 <span className="text-xs text-muted-foreground truncate max-w-xs" title={job.comment}>
 "{job.comment}"
 </span>
 )}
 </div>
 ) : (
 <span className="text-xs text-muted-foreground">Not rated</span>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Pagination */}
 {jobs.length > 0 && (
 <div className="flex justify-center gap-2 mt-4">
 <button
 onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
 disabled={currentPage === 1}
 className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
 >
 ← Prev
 </button>
 <span className="px-3 py-1 text-sm text-muted-foreground">
 Page {currentPage}
 </span>
 <button
 onClick={() => setCurrentPage(currentPage + 1)}
 disabled={jobs.length < 20}
 className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
 >
 Next →
 </button>
 </div>
 )}
 </div>
 );
}
