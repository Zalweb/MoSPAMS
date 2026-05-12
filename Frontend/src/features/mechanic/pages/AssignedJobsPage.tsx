import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, Search, CheckCircle2, AlertCircle, ArrowRight, Users, Package } from 'lucide-react';
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
  mechanics: { id: string; name: string }[];
  partsUsed: { id: string; name: string; quantity: number; status: string }[];
}

export default function AssignedJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;

    const pollJobs = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await apiGet<{ data: Job[] }>('/api/mechanic/jobs');
        if (active) {
          setJobs(response.data);
        }
      } catch (error) {
        console.error('Failed to load jobs', error);
        if (showLoader) {
          toast.error('Failed to load assigned jobs');
        }
      } finally {
        if (active && showLoader) {
          setLoading(false);
        }
      }
    };

    void pollJobs(true);
    const intervalId = window.setInterval(() => void pollJobs(), 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

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
      case 'booked_confirmed':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'work_done':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20';
    }
  };

  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'booked_confirmed':
        return Users;
      case 'in_progress':
        return Wrench;
      case 'work_done':
        return CheckCircle2;
      case 'completed':
        return CheckCircle2;
      default:
        return AlertCircle;
    }
  };

  const getStatusLabel = (statusCode: string): string => {
    switch (statusCode) {
      case 'booked_confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'work_done': return 'Work Done';
      case 'completed': return 'Completed';
      default: return statusCode;
    }
  };

  const stats = {
    total: jobs.length,
    confirmed: jobs.filter(j => j.statusCode === 'booked_confirmed').length,
    inProgress: jobs.filter(j => j.statusCode === 'in_progress').length,
    workDone: jobs.filter(j => j.statusCode === 'work_done').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-secondary dark:bg-zinc-800 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: stats.total, icon: Wrench, color: 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20' },
          { label: 'Confirmed', value: stats.confirmed, icon: Users, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
          { label: 'In Progress', value: stats.inProgress, icon: Wrench, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
          { label: 'Work Done', value: stats.workDone, icon: CheckCircle2, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl border ${stat.color}`}>
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="text-xs font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer, motorcycle, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-700"
        >
          <option value="all">All Status</option>
          <option value="booked_confirmed">{getStatusLabel('booked_confirmed')}</option>
          <option value="in_progress">{getStatusLabel('in_progress')}</option>
          <option value="work_done">{getStatusLabel('work_done')}</option>
        </select>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-2xl border border-border">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary dark:bg-zinc-800 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-muted-foreground dark:text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Jobs Found</h3>
          <p className="text-sm text-muted-foreground">
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
                className="group bg-muted border border-border rounded-2xl p-6 hover:border-border dark:border-zinc-700 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{job.customerName}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.statusCode)}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {getStatusLabel(job.statusCode)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{job.motorcycleModel}</p>
                    <p className="text-sm text-muted-foreground">{job.serviceType}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground dark:text-zinc-600 group-hover:text-muted-foreground group-hover:translate-x-1 transition-all" />
                </div>

                {(job.mechanics.length > 1 || job.partsUsed.length > 0) && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {job.mechanics.length > 1 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{job.mechanics.map(m => m.name).join(', ')}</span>
                      </div>
                    )}
                    {job.partsUsed.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="w-3.5 h-3.5" />
                        <span>{job.partsUsed.length} part{job.partsUsed.length !== 1 ? 's' : ''}</span>
                        {job.partsUsed.some(p => p.status === 'requested') && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {(job.statusCode === 'booked_confirmed' || job.statusCode === 'in_progress') && (
                  <div className="mb-3">
                    {job.statusCode === 'booked_confirmed' && (
                      <span className="text-xs font-semibold text-green-400">▶ Start Service</span>
                    )}
                    {job.statusCode === 'in_progress' && (
                      <span className="text-xs font-semibold text-blue-400">✓ Mark Complete</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
