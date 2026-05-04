import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ArrowLeft, Wrench, User, Phone, Mail, Bike, Clock, 
  CheckCircle2, Package, Plus, Trash2, AlertTriangle 
} from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';
import { AddPartDialog } from '../components/AddPartDialog';
import { StatusUpdateDialog } from '../components/StatusUpdateDialog';

interface JobPart {
  id: string;
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface JobDetails {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  statusCode: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
  parts: JobPart[];
}

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  useEffect(() => {
    if (id) {
      loadJobDetails();
    }
  }, [id]);

  async function loadJobDetails() {
    try {
      setLoading(true);
      const response = await apiGet<{ data: JobDetails }>(`/api/mechanic/jobs/${id}`);
      setJob(response.data);
    } catch (error) {
      console.error('Failed to load job details', error);
      toast.error('Failed to load job details');
      navigate('/dashboard/mechanic/jobs');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePart(partId: string, partName: string) {
    if (!confirm(`Remove ${partName} from this job?`)) return;

    try {
      const response = await apiMutation<{ data: JobDetails }>(
        `/api/mechanic/jobs/${id}/parts/${partId}`,
        'DELETE'
      );
      setJob(response.data);
      toast.success('Part removed from job');
    } catch (error) {
      console.error('Failed to remove part', error);
      toast.error('Failed to remove part');
    }
  }

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
        return AlertTriangle;
    }
  };

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-zinc-800 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading job details...</p>
        </div>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(job.statusCode);
  const partsCost = job.parts.reduce((sum, part) => sum + part.subtotal, 0);
  const totalCost = job.laborCost + partsCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard/mechanic/jobs')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Jobs</span>
        </button>

        <button
          onClick={() => setShowStatusUpdate(true)}
          disabled={job.statusCode === 'completed'}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            job.statusCode === 'completed'
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white hover:opacity-90'
          }`}
        >
          Update Status
        </button>
      </div>

      {/* Job Info Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{job.customerName}</h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(job.statusCode)}`}>
                <StatusIcon className="w-4 h-4" />
                {job.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Job ID</p>
            <p className="text-sm font-mono text-white">#{job.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Customer Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-white">{job.customerName}</span>
              </div>
              {job.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm text-white">{job.customerPhone}</span>
                </div>
              )}
              {job.customerEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm text-white">{job.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Service Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Service Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Bike className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-white">{job.motorcycleModel || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-white">{job.serviceType}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-white">
                  {new Date(job.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {job.notes && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-zinc-300">{job.notes}</p>
          </div>
        )}
      </div>

      {/* Parts Used */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Parts Used</h2>
          {job.statusCode !== 'completed' && (
            <button
              onClick={() => setShowAddPart(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Part
            </button>
          )}
        </div>

        {job.parts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Package className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No parts added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {job.parts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-800"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1">{part.name}</p>
                  <p className="text-xs text-zinc-500">
                    {part.quantity} × ₱{part.unitPrice.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-white">
                    ₱{part.subtotal.toLocaleString()}
                  </p>
                  {job.statusCode !== 'completed' && (
                    <button
                      onClick={() => handleRemovePart(part.id, part.name)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Cost Summary</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Labor Cost</span>
            <span className="text-white font-medium">₱{job.laborCost.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Parts Cost</span>
            <span className="text-white font-medium">₱{partsCost.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-base font-semibold text-white">Total Cost</span>
            <span className="text-2xl font-bold text-white">₱{totalCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showAddPart && (
        <AddPartDialog
          jobId={job.id}
          onClose={() => setShowAddPart(false)}
          onSuccess={() => {
            setShowAddPart(false);
            loadJobDetails();
          }}
        />
      )}

      {showStatusUpdate && (
        <StatusUpdateDialog
          jobId={job.id}
          currentStatus={job.statusCode}
          onClose={() => setShowStatusUpdate(false)}
          onSuccess={() => {
            setShowStatusUpdate(false);
            loadJobDetails();
          }}
        />
      )}
    </div>
  );
}
