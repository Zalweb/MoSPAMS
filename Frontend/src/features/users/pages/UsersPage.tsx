import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, UserCheck, Clock, Activity, Plus, Pencil, Trash2, Power, CheckCircle, XCircle, Users as UsersIcon, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest, User } from '@/shared/types';
import CustomerManagementPage from '@/features/customers/pages/CustomerManagementPage';
import MechanicManagementPage from '@/features/mechanic/pages/MechanicManagementPage';

const newUserSchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email(),
  role: z.enum(['Staff', 'Mechanic', 'Customer']),
  password: z.string().min(6, 'Min 6 characters'),
});
const editUserSchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email(),
  role: z.enum(['Staff', 'Mechanic', 'Customer']),
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

  const [pendingRequests, setPendingRequests] = useState<RoleRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'customers' | 'mechanics' | 'requests'>('users');

  const addForm = useForm<NewUserForm>({ resolver: zodResolver(newUserSchema), defaultValues: { name: '', email: '', role: 'Staff', password: '' } });
  const editForm = useForm<EditUserForm>({ resolver: zodResolver(editUserSchema) });

  const adminCount = users.filter(u => u.role === 'Owner').length;
  const staffCount = users.filter(u => u.role === 'Staff' || u.role === 'Mechanic').length;
  const customerCount = users.filter(u => u.role === 'Customer').length;


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
    return role === 'Staff' || role === 'Mechanic' || role === 'Customer' ? role : 'Staff';
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
          <h2 className="text-[22px] font-bold text-foreground tracking-tight">User Management</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Manage access and monitor activity</p>
        </div>
        <Button
          onClick={openAdd}
          size="sm"
          className="h-9 rounded-xl text-[12px] font-semibold px-4 transition-all active:scale-95 shadow-lg"
          style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add User
        </Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {([
          { key: 'users' as const, label: 'All Users', icon: UsersIcon, badge: 0 },
          { key: 'customers' as const, label: 'Customers', icon: UserCheck, badge: 0 },
          { key: 'mechanics' as const, label: 'Mechanics', icon: Wrench, badge: 0 },
          { key: 'requests' as const, label: 'Pending Requests', icon: Clock, badge: pendingRequests.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'border-current text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={tab === t.key ? { borderColor: 'var(--brand-mixed)', color: 'var(--brand-safe-text)' } : undefined}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.badge ? (
              <span className="inline-flex items-center rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {tab === 'users' && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        {[
          { title: 'Owners', desc: 'Full system access', count: adminCount, icon: Shield },
          { title: 'Staff / Mechanic', desc: 'Operational access', count: staffCount, icon: UserCheck },
          { title: 'Customers', desc: 'Registered clients', count: customerCount, icon: UsersIcon },
          { title: 'Activity Logs', desc: 'Recorded actions', count: logs.length, icon: Activity },
        ].map(card => (
          <div key={card.title} className="border rounded-2xl p-5 brand-card" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="brand-icon-box w-9 h-9 rounded-[10px] flex items-center justify-center">
                <card.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground dark:text-zinc-200">{card.title}</p>
                <p className="text-[10px] text-muted-foreground">{card.desc}</p>
              </div>
            </div>
            <p className="text-[22px] font-bold text-foreground tracking-tight">{card.count}</p>
          </div>
        ))}
      </div>

      <div className="brand-card backdrop-blur-2xl border rounded-3xl overflow-hidden shadow-xl mb-6" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Last Active</th>
                <th className="text-right px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-border/50"
                        style={{ background: u.role === 'Owner' ? 'var(--brand-gradient)' : 'var(--brand-surface-gradient)' }}
                      >
                        <span className="text-xs font-bold" style={{ color: u.role === 'Owner' ? 'var(--brand-text-on-primary)' : 'var(--brand-safe-text)' }}>
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-foreground">
                          {u.name}
                          {me?.id === u.id && <span className="ml-1.5 text-[10px] font-semibold" style={{ color: 'var(--brand-safe-text)' }}>(you)</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[12px] text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      u.role === 'Owner'
                        ? 'text-white'
                        : u.role === 'Mechanic'
                          ? 'bg-blue-500/15 text-blue-500'
                          : u.role === 'Staff'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-violet-500/15 text-violet-500'
                    }`}
                    style={u.role === 'Owner' ? { background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)' } : undefined}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${u.status === 'Active' ? 'bg-green-500/15 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-muted-foreground tabular-nums">{u.lastActive ? new Date(u.lastActive).toLocaleString() : '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button title={u.status === 'Active' ? 'Disable' : 'Enable'} onClick={() => setUserStatus(u.id, u.status === 'Active' ? 'Inactive' : 'Active')} disabled={me?.id === u.id} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90 disabled:opacity-30">
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button title="Edit" onClick={() => openEdit(u)} disabled={u.role === 'Owner'} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90 disabled:opacity-30">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button title="Delete" onClick={() => setConfirmDelete(u)} disabled={me?.id === u.id} className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all active:scale-90 disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
                        <UsersIcon className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm text-muted-foreground">No users yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="brand-card backdrop-blur-sm border rounded-2xl p-5 mb-6" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
        <h3 className="text-[13px] font-semibold text-foreground mb-4">Access Privileges</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Module</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Owner</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Staff / Mechanic</th>
            </tr></thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {[
                { module: 'Inventory', admin: 'Full Control', staff: 'View, Update, Stock Movements' },
                { module: 'Services', admin: 'Full Control', staff: 'Create & Update' },
                { module: 'Sales', admin: 'Full Control', staff: 'Record Transactions' },
                { module: 'Reports', admin: 'View All Reports', staff: 'View Only' },
                { module: 'Users & Audit', admin: 'Manage Users & Roles', staff: 'No Access' },
              ].map(row => (
                <tr key={row.module}>
                  <td className="px-4 py-3 text-[12px] font-medium text-foreground dark:text-zinc-200">{row.module}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-muted-foreground">{row.admin}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-muted-foreground">{row.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



        </>
      )}

      {tab === 'customers' && <CustomerManagementPage hideAddButton />}

      {tab === 'mechanics' && <MechanicManagementPage hideAddButton />}

      {tab === 'requests' && (
        <div className="bg-card shadow-soft dark:shadow-none dark:bg-muted/50 backdrop-blur-sm border border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)] rounded-2xl overflow-hidden">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock className="w-10 h-10 text-muted-foreground dark:text-zinc-600" strokeWidth={1} />
              <p className="text-[13px] text-muted-foreground">No pending role requests</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Requested Role</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground dark:text-zinc-200">{req.user_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{req.user_email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-secondary dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:text-zinc-300">
                        {req.requested_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-zinc-700 bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground dark:text-zinc-300 hover:bg-secondary dark:bg-zinc-800 transition-colors"
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
        <DialogContent className="sm:max-w-md rounded-[20px] border-border bg-muted p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold text-foreground">{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          {editing ? (
            <form onSubmit={onSubmitEdit} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Name</Label>
                <Input {...editForm.register('name')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Email</Label>
                <Input type="email" {...editForm.register('email')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Role</Label>
                <select {...editForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-border dark:border-zinc-700 text-[13px] bg-secondary dark:bg-zinc-800 text-foreground dark:text-zinc-200">
                  <option value="Staff">Staff</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">New Password (leave blank to keep)</Label>
                <Input type="password" {...editForm.register('password')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-95" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-muted-foreground dark:text-zinc-300 hover:bg-muted dark:bg-zinc-700">Cancel</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSubmitAdd} className="space-y-4 pt-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Name</Label>
                <Input {...addForm.register('name')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
                {addForm.formState.errors.name && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Email</Label>
                <Input type="email" {...addForm.register('email')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
                {addForm.formState.errors.email && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Role</Label>
                <select {...addForm.register('role')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-border dark:border-zinc-700 text-[13px] bg-secondary dark:bg-zinc-800 text-foreground dark:text-zinc-200">
                  <option value="Staff">Staff</option>
                  <option value="Mechanic">Mechanic</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">Password</Label>
                <Input type="password" {...addForm.register('password')} className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-[13px] text-foreground dark:text-zinc-200 placeholder:text-muted-foreground dark:text-zinc-600" />
                {addForm.formState.errors.password && <p className="text-[10px] text-red-400 mt-1">{addForm.formState.errors.password.message}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-95" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-muted-foreground dark:text-zinc-300 hover:bg-muted dark:bg-zinc-700">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-border bg-muted p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold text-foreground">Delete User?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground mt-1">{confirmDelete?.name} will lose access immediately.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deleteUser(confirmDelete.id); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800 text-muted-foreground dark:text-zinc-300 hover:bg-muted dark:bg-zinc-700">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
