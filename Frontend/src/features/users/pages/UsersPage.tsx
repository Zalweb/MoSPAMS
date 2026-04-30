import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, UserCheck, Clock, Activity, Plus, Pencil, Trash2, Power, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest, User } from '@/shared/types';

const newUserSchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email(),
  role: z.enum(['Admin', 'Staff', 'Mechanic', 'Customer']),
  password: z.string().min(6, 'Min 6 characters'),
});
const editUserSchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email(),
  role: z.enum(['Admin', 'Staff', 'Mechanic', 'Customer']),
  password: z.string().optional(),
});
type NewUserForm = z.infer<typeof newUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

export default function Users() {
  const { logs, users, addUser, updateUser, setUserStatus, deleteUser } = useData();
  const { user: me } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [logFilter, setLogFilter] = useState<{ user: string; query: string }>({ user: 'All', query: '' });
  const [pendingRequests, setPendingRequests] = useState<RoleRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'requests'>('users');

  const addForm = useForm<NewUserForm>({ resolver: zodResolver(newUserSchema), defaultValues: { name: '', email: '', role: 'Staff', password: '' } });
  const editForm = useForm<EditUserForm>({ resolver: zodResolver(editUserSchema) });

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const staffCount = users.filter(u => u.role === 'Staff').length;

  const filteredLogs = useMemo(() => {
    return logs.filter(l => (logFilter.user === 'All' || l.user === logFilter.user) && (!logFilter.query || l.action.toLowerCase().includes(logFilter.query.toLowerCase())));
  }, [logs, logFilter]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await apiGet<{ data: RoleRequest[] }>('/api/role-requests?status=pending');
      setPendingRequests(data.data);
    } catch {
      // Keep the Users page usable if the approvals endpoint is temporarily unavailable.
    }
  }, []);

  useEffect(() => { void fetchPendingRequests(); }, [fetchPendingRequests]);

  const handleApprove = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/approve`, 'PATCH');
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDeny = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/deny`, 'PATCH');
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  };

  const openAdd = () => { setEditing(null); addForm.reset({ name: '', email: '', role: 'Staff', password: '' }); setModalOpen(true); };
  const openEdit = (u: User) => { setEditing(u); editForm.reset({ name: u.name, email: u.email, role: u.role, password: '' }); setModalOpen(true); };

  const onSubmitAdd = addForm.handleSubmit(async (values) => {
    await addUser(values);
    setModalOpen(false);
  });
  const onSubmitEdit = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    await updateUser(editing.id, values);
    setModalOpen(false);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">User Management</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">Manage access and monitor activity</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add User
        </Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#F5F5F4]">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            tab === 'users'
              ? 'border-[#1C1917] text-[#1C1917]'
              : 'border-transparent text-[#A8A29E] hover:text-[#78716C]'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'requests'
              ? 'border-[#1C1917] text-[#1C1917]'
              : 'border-transparent text-[#A8A29E] hover:text-[#78716C]'
          }`}
        >
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'users' && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: 'Administrators', desc: 'Full system access', count: adminCount, icon: Shield, accent: 'bg-[#1C1917] text-white' },
          { title: 'Staff / Mechanic', desc: 'Operational access', count: staffCount, icon: UserCheck, accent: 'bg-[#EFF6FF] text-[#3B82F6]' },
          { title: 'Activity Logs', desc: 'Recorded actions', count: logs.length, icon: Activity, accent: 'bg-[#F5F3FF] text-[#8B5CF6]' },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-[10px] ${card.accent.split(' ')[0]} flex items-center justify-center`}>
                <card.icon className={`w-[18px] h-[18px] ${card.accent.split(' ')[1]}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#44403C]">{card.title}</p>
                <p className="text-[10px] text-[#D6D3D1]">{card.desc}</p>
              </div>
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-6">
        <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Users ({users.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Name</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Email</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Role</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Status</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Last Active</th>
              <th className="text-right px-3 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase"></th>
            </tr></thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-3 py-3 text-[12px] font-medium text-[#44403C]">{u.name}{me?.id === u.id && <span className="ml-1.5 text-[10px] text-[#3B82F6]">(you)</span>}</td>
                  <td className="px-3 py-3 text-[12px] text-[#78716C]">{u.email}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-[3px] rounded-full ${u.role === 'Admin' ? 'bg-[#1C1917] text-white' : 'bg-[#EFF6FF] text-[#3B82F6]'}`}>{u.role}</span></td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-medium px-2 py-[3px] rounded-full ${u.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F5F4] text-[#A8A29E]'}`}>{u.status}</span></td>
                  <td className="px-3 py-3 text-[11px] text-[#A8A29E] tabular-nums">{new Date(u.lastActive).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <button title={u.status === 'Active' ? 'Disable' : 'Enable'} onClick={() => setUserStatus(u.id, u.status === 'Active' ? 'Inactive' : 'Active')} disabled={me?.id === u.id} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors disabled:opacity-30">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button title="Edit" onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button title="Delete" onClick={() => setConfirmDelete(u)} disabled={me?.id === u.id} className="p-1.5 rounded-lg hover:bg-red-50 text-[#D6D3D1] hover:text-[#EF4444] transition-colors disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={6} className="px-3 py-12 text-center text-[12px] text-[#D6D3D1]">No users yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-6">
        <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Access Privileges</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Module</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Administrator</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Staff / Mechanic</th>
            </tr></thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {[
                { module: 'Inventory', admin: 'Full Control', staff: 'View, Update, Stock Movements' },
                { module: 'Services', admin: 'Full Control', staff: 'Create & Update' },
                { module: 'Sales', admin: 'Full Control', staff: 'Record Transactions' },
                { module: 'Reports', admin: 'View All Reports', staff: 'View Only' },
                { module: 'Users & Audit', admin: 'Manage Users & Roles', staff: 'No Access' },
              ].map(row => (
                <tr key={row.module}>
                  <td className="px-4 py-3 text-[12px] font-medium text-[#44403C]">{row.module}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-[#78716C]">{row.admin}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-[#78716C]">{row.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-[13px] font-semibold text-[#1C1917] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#D6D3D1]" strokeWidth={1.5} />
            Audit Trail
          </h3>
          <div className="flex items-center gap-2">
            <select value={logFilter.user} onChange={e => setLogFilter(f => ({ ...f, user: e.target.value }))} className="h-8 px-3 rounded-lg border border-[#E7E5E4] text-[11px] bg-white">
              <option value="All">All users</option>
              {Array.from(new Set(logs.map(l => l.user))).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <Input value={logFilter.query} onChange={e => setLogFilter(f => ({ ...f, query: e.target.value }))} placeholder="Filter actions…" className="h-8 w-44 text-[11px] rounded-lg border-[#E7E5E4]" />
            <span className="text-[10px] font-medium text-[#D6D3D1]">{filteredLogs.length} entries</span>
          </div>
        </div>
        <div className="space-y-0 max-h-[480px] overflow-y-auto">
          {filteredLogs.map((log, i) => (
            <div key={log.id} className={`flex items-start gap-3 py-3 ${i < filteredLogs.length - 1 ? 'border-b border-[#FAFAF9]' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${log.user.includes('Admin') ? 'bg-[#1C1917] text-white' : 'bg-[#EFF6FF] text-[#3B82F6]'}`}>
                {log.user.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#44403C]">{log.user}</p>
                <p className="text-[11px] text-[#A8A29E]">{log.action}</p>
              </div>
              <span className="text-[10px] text-[#D6D3D1] shrink-0 tabular-nums">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && <p className="text-[12px] text-[#D6D3D1] text-center py-8">No entries match this filter</p>}
        </div>
      </div>

        </>
      )}

      {tab === 'requests' && (
        <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock className="w-10 h-10 text-[#D6D3D1]" strokeWidth={1} />
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
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-[#F5F5F4] last:border-0 hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1C1917]">{req.user_name}</td>
                    <td className="px-5 py-3.5 text-[#78716C]">{req.user_email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                        {req.requested_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#A8A29E]">{new Date(req.created_at).toLocaleDateString()}</td>
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
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          {editing ? (
            <form onSubmit={onSubmitEdit} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Name</Label>
                <Input {...editForm.register('name')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Email</Label>
                <Input type="email" {...editForm.register('email')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Role</Label>
                <select {...editForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white">
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">New Password (leave blank to keep)</Label>
                <Input type="password" {...editForm.register('password')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-[#1C1917] text-white text-[12px]">Save</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSubmitAdd} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Name</Label>
                <Input {...addForm.register('name')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
                {addForm.formState.errors.name && <p className="text-[10px] text-[#EF4444] mt-1">{addForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Email</Label>
                <Input type="email" {...addForm.register('email')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
                {addForm.formState.errors.email && <p className="text-[10px] text-[#EF4444] mt-1">{addForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Role</Label>
                <select {...addForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white">
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Password</Label>
                <Input type="password" {...addForm.register('password')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
                {addForm.formState.errors.password && <p className="text-[10px] text-[#EF4444] mt-1">{addForm.formState.errors.password.message}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-[#1C1917] text-white text-[12px]">Create</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Delete User?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#A8A29E] mt-1">{confirmDelete?.name} will lose access immediately.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deleteUser(confirmDelete.id); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
