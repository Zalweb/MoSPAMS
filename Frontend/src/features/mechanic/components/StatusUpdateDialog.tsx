import { useState } from 'react';
import { X, Clock, Wrench, CheckCircle2 } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface StatusUpdateDialogProps {
  jobId: string;
  currentStatus: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusUpdateDialog({ jobId, currentStatus, onClose, onSuccess }: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [submitting, setSubmitting] = useState(false);

  const statuses = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { value: 'in_progress', label: 'In Progress', icon: Wrench, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  ];

  async function handleSubmit() {
    if (selectedStatus === currentStatus) {
      toast.info('Status unchanged');
      onClose();
      return;
    }

    try {
      setSubmitting(true);
      const statusLabel = statuses.find(s => s.value === selectedStatus)?.label || selectedStatus;
      await apiMutation(`/api/mechanic/jobs/${jobId}/status`, 'PATCH', {
        status: statusLabel,
      });
      toast.success(`Job status updated to ${statusLabel}`);
      onSuccess();
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update job status');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Update Job Status</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Select the new status for this job. The customer will be notified of the update.
          </p>

          <div className="space-y-3">
            {statuses.map((status) => {
              const StatusIcon = status.icon;
              const isSelected = selectedStatus === status.value;
              const isCurrent = currentStatus === status.value;

              return (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`w-full p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-600 ring-2 ring-zinc-600'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${status.color}`}>
                      <StatusIcon className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{status.label}</p>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {status.value === 'pending' && 'Job is waiting to be started'}
                        {status.value === 'in_progress' && 'Job is currently being worked on'}
                        {status.value === 'completed' && 'Job is finished and ready for pickup'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedStatus === 'completed' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm text-green-400">
                ⚠️ Marking this job as completed will notify the customer that their motorcycle is ready for pickup.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedStatus === currentStatus}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
