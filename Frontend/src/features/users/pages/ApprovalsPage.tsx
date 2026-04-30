import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest } from '@/shared/types';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ data: RoleRequest[] }>('/api/role-requests?status=pending');
      setRequests(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/approve`, 'PATCH');
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDeny = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/deny`, 'PATCH');
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Role Approvals</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">Review pending Staff and Mechanic role requests</p>
        </div>
        {requests.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-neutral-800">
            <Clock className="w-3 h-3" /> {requests.length} pending
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#A8A29E] text-[13px]">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCheck className="w-10 h-10 text-[#D6D3D1]" strokeWidth={1} />
            <p className="text-[13px] text-[#A8A29E]">No pending role requests</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F5F5F4] bg-[#FAFAF9]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Requested Role</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-[#F5F5F4] last:border-0 hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#1C1917]">{req.user_name}</td>
                  <td className="px-5 py-3.5 text-[#78716C]">{req.user_email}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                      {req.requested_role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#A8A29E]">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-neutral-800 hover:bg-yellow-500 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        <XCircle className="w-3 h-3" /> Deny
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
