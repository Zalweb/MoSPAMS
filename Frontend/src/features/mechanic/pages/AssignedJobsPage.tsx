import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, Search, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

interface Job {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  statusCode: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

export default function AssignedJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      const response = await apiGet<{ data: Job[] }>('/api/mechanic/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs', error);
      toast.error('Failed to load assigned jobs');
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.motorcycleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.statusCode === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return Wrench;
      case 'completed':
        return CheckCircle2;
      default:
        return AlertCircle;
    }
  };

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.statusCode === 'pending').length,
    inProgress: jobs.filter(j => j.statusCode === 'in_progress').length,
    completed: jobs.filter(j => j.statusCode === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-zinc-800 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: stats.total, icon: Wrench, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
          { label: 'In Progress', value: stats.inProgress, icon: Wrench, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl border ${stat.color}`}>
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-2xl font-bold text-white">{stat.value}</span>
            </div>
            <p className="text-xs font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by customer, motorcycle, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Jobs Found</h3>
          <p className="text-sm text-zinc-500">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'No jobs have been assigned to you yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => {
            const StatusIcon = getStatusIcon(job.statusCode);
            return (
              <div
                key={job.id}
                onClick={() => navigate(`/dashboard/mechanic/jobs/${job.id}`)}
                className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{job.customerName}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.statusCode)}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-1">{job.motorcycleModel}</p>
                    <p className="text-sm text-zinc-500">{job.serviceType}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Labor: ₱{job.laborCost.toLocaleString()}</span>
                    <span>•</span>
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                  {job.completedAt && (
                    <span className="text-xs text-green-400">
                      Completed {new Date(job.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
