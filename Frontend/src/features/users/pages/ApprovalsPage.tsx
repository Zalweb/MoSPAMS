import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest } from '@/shared/types';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ data: RoleRequest[] }>('/api/role-requests?status=pending');
      setRequests(data.data);
    } catch (error) {
      console.error('Failed to fetch role requests:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load role requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await apiMutation(`/api/role-requests/${id}/approve`, 'PATCH');
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Role request approved successfully');
    } catch (error) {
      console.error('Failed to approve role request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: number) => {
    setActionLoading(id);
    try {
      await apiMutation(`/api/role-requests/${id}/deny`, 'PATCH');
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Role request denied');
    } catch (error) {
      console.error('Failed to deny role request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">Role Approvals</h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">Review pending Staff and Mechanic role requests</p>
        </div>
        <div className="flex items-center gap-2">
          {requests.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-zinc-900">
              <Clock className="w-3 h-3" /> {requests.length} pending
            </span>
          )}
          <button
            onClick={() => void fetchRequests()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCheck className="w-10 h-10 text-zinc-600" strokeWidth={1} />
            <p className="text-[13px] text-zinc-500">No pending role requests</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Requested Role</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-zinc-200">{req.user_name}</td>
                  <td className="px-5 py-3.5 text-zinc-500">{req.user_email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      req.requested_role === 'Mechanic'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {req.requested_role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => void handleApprove(req.id)}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === req.id ? (
                          <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )} Approve
                      </button>
                      <button
                        onClick={() => void handleDeny(req.id)}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === req.id ? (
                          <div className="w-3 h-3 rounded-full border border-zinc-500 border-t-transparent animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )} Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
