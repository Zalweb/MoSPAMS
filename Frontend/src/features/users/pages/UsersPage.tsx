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
  role: z.enum(['Owner', 'Staff', 'Mechanic', 'Customer']),
  password: z.string().min(6, 'Min 6 characters'),
});
const editUserSchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email(),
  role: z.enum(['Owner', 'Staff', 'Mechanic', 'Customer']),
  password: z.string().optional(),
});
type NewUserForm = z.infer<typeof newUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type EditableRole = NewUserForm['role'];

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

  const adminCount = users.filter(u => u.role === 'Owner').length;
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
  const asEditableRole = (role: User['role']): EditableRole => {
    return role === 'Owner' || role === 'Staff' || role === 'Mechanic' || role === 'Customer' ? role : 'Staff';
  };

  const openEdit = (u: User) => { setEditing(u); editForm.reset({ name: u.name, email: u.email, role: asEditableRole(u.role), password: '' }); setModalOpen(true); };

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
          <h2 className="text-[22px] font-bold text-white tracking-tight">User Management</h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">Manage access and monitor activity</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-[12px] font-medium px-4 transition-opacity">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add User
        </Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            tab === 'users'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'requests'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
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
          { title: 'Owners', desc: 'Full system access', count: adminCount, icon: Shield, accent: 'bg-white text-zinc-900' },
          { title: 'Staff / Mechanic', desc: 'Operational access', count: staffCount, icon: UserCheck, accent: 'bg-blue-500/20 text-blue-400' },
          { title: 'Activity Logs', desc: 'Recorded actions', count: logs.length, icon: Activity, accent: 'bg-purple-500/20 text-purple-400' },
        ].map(card => (
          <div key={card.title} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-[10px] ${card.accent.split(' ')[0]} flex items-center justify-center`}>
                <card.icon className={`w-[18px] h-[18px] ${card.accent.split(' ')[1]}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-200">{card.title}</p>
                <p className="text-[10px] text-zinc-500">{card.desc}</p>
              </div>
            </div>
            <p className="text-[22px] font-bold text-white tracking-tight">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 mb-6">
        <h3 className="text-[13px] font-semibold text-white mb-4">Users ({users.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Name</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Email</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Role</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Status</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Last Active</th>
              <th className="text-right px-3 py-3 text-[10px] font-semibold text-zinc-500 uppercase"></th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-3 py-3 text-[12px] font-medium text-zinc-200">{u.name}{me?.id === u.id && <span className="ml-1.5 text-[10px] text-blue-400">(you)</span>}</td>
                  <td className="px-3 py-3 text-[12px] text-zinc-500">{u.email}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-[3px] rounded-full ${u.role === 'Owner' ? 'bg-white text-zinc-900' : 'bg-blue-500/20 text-blue-400'}`}>{u.role}</span></td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-medium px-2 py-[3px] rounded-full ${u.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{u.status}</span></td>
                  <td className="px-3 py-3 text-[11px] text-zinc-500 tabular-nums">{new Date(u.lastActive).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <button title={u.status === 'Active' ? 'Disable' : 'Enable'} onClick={() => setUserStatus(u.id, u.status === 'Active' ? 'Inactive' : 'Active')} disabled={me?.id === u.id} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button title="Edit" onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button title="Delete" onClick={() => setConfirmDelete(u)} disabled={me?.id === u.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={6} className="px-3 py-12 text-center text-[12px] text-zinc-500">No users yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 mb-6">
        <h3 className="text-[13px] font-semibold text-white mb-4">Access Privileges</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Module</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Owner</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase">Staff / Mechanic</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {[
                { module: 'Inventory', admin: 'Full Control', staff: 'View, Update, Stock Movements' },
                { module: 'Services', admin: 'Full Control', staff: 'Create & Update' },
                { module: 'Sales', admin: 'Full Control', staff: 'Record Transactions' },
                { module: 'Reports', admin: 'View All Reports', staff: 'View Only' },
                { module: 'Users & Audit', admin: 'Manage Users & Roles', staff: 'No Access' },
              ].map(row => (
                <tr key={row.module}>
                  <td className="px-4 py-3 text-[12px] font-medium text-zinc-200">{row.module}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-zinc-500">{row.admin}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-zinc-500">{row.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
            Audit Trail
          </h3>
          <div className="flex items-center gap-2">
            <select value={logFilter.user} onChange={e => setLogFilter(f => ({ ...f, user: e.target.value }))} className="h-8 px-3 rounded-lg border border-zinc-800 text-[11px] bg-zinc-900 text-zinc-300">
              <option value="All">All users</option>
              {Array.from(new Set(logs.map(l => l.user))).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <Input value={logFilter.query} onChange={e => setLogFilter(f => ({ ...f, query: e.target.value }))} placeholder="Filter actions…" className="h-8 w-44 text-[11px] rounded-lg border-zinc-800 bg-zinc-900 text-zinc-300 placeholder:text-zinc-600" />
            <span className="text-[10px] font-medium text-zinc-500">{filteredLogs.length} entries</span>
          </div>
        </div>
        <div className="space-y-0 max-h-[480px] overflow-y-auto">
          {filteredLogs.map((log, i) => (
            <div key={log.id} className={`flex items-start gap-3 py-3 ${i < filteredLogs.length - 1 ? 'border-b border-zinc-800' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${log.user.includes('Owner') ? 'bg-white text-zinc-900' : 'bg-blue-500/20 text-blue-400'}`}>
                {log.user.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-zinc-200">{log.user}</p>
                <p className="text-[11px] text-zinc-500">{log.action}</p>
              </div>
              <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && <p className="text-[12px] text-zinc-500 text-center py-8">No entries match this filter</p>}
        </div>
      </div>

        </>
      )}

      {tab === 'requests' && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)] rounded-2xl overflow-hidden">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock className="w-10 h-10 text-zinc-600" strokeWidth={1} />
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
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-200">{req.user_name}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{req.user_email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                        {req.requested_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
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
        <DialogContent className="sm:max-w-md rounded-[20px] border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold text-white">{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          {editing ? (
            <form onSubmit={onSubmitEdit} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Name</Label>
                <Input {...editForm.register('name')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Email</Label>
                <Input type="email" {...editForm.register('email')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Role</Label>
                <select {...editForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-zinc-700 text-[13px] bg-zinc-800 text-zinc-200">
                  <option value="Owner">Owner</option>
                  <option value="Staff">Staff</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">New Password (leave blank to keep)</Label>
                <Input type="password" {...editForm.register('password')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-[12px] transition-opacity">Save</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSubmitAdd} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Name</Label>
                <Input {...addForm.register('name')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
                {addForm.formState.errors.name && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Email</Label>
                <Input type="email" {...addForm.register('email')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
                {addForm.formState.errors.email && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Role</Label>
                <select {...addForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-zinc-700 text-[13px] bg-zinc-800 text-zinc-200">
                  <option value="Staff">Staff</option>
                  <option value="Owner">Owner</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-zinc-400">Password</Label>
                <Input type="password" {...addForm.register('password')} className="mt-1.5 h-9 rounded-xl border-zinc-700 bg-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600" />
                {addForm.formState.errors.password && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.password.message}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-[12px] transition-opacity">Create</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold text-white">Delete User?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-zinc-400 mt-1">{confirmDelete?.name} will lose access immediately.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deleteUser(confirmDelete.id); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
