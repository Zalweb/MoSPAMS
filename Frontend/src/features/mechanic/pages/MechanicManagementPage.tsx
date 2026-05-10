import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Wrench, Phone, Mail, Power, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface Mechanic {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  statusCode: string;
  createdAt: string;
}

const mechanicSchema = z.object({
  name: z.string().min(2, 'Required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});
type MechanicForm = z.infer<typeof mechanicSchema>;

export default function MechanicManagementPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Mechanic | null>(null);
  const [meta, setMeta] = useState<{ currentPage: number; lastPage: number; total: number } | null>(null);
  const [page, setPage] = useState(1);

  const form = useForm<MechanicForm>({
    resolver: zodResolver(mechanicSchema),
    defaultValues: { name: '', phone: '', email: '', address: '' },
  });

  const fetchMechanics = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '25' });
      if (search) params.set('search', search);
      const res = await apiGet<{ data: Mechanic[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/api/mechanics/manage?${params}`
      );
      setMechanics(res.data);
      setMeta(res.meta ? { currentPage: res.meta.current_page, lastPage: res.meta.last_page, total: res.meta.total } : null);
      setPage(res.meta?.current_page ?? 1);
    } catch {
      toast.error('Failed to load mechanics');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void fetchMechanics(); }, [fetchMechanics]);

  const openAdd = () => { setEditing(null); form.reset({ name: '', phone: '', email: '', address: '' }); setModalOpen(true); };
  const openEdit = (m: Mechanic) => { setEditing(m); form.reset({ name: m.name, phone: m.phone || '', email: m.email || '', address: m.address || '' }); setModalOpen(true); };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        const updated = await apiMutation<Mechanic>(`/api/mechanics/${editing.id}`, 'PATCH', values);
        setMechanics(prev => prev.map(m => m.id === editing.id ? { ...m, ...updated } : m));
        toast.success('Mechanic updated');
      } else {
        const created = await apiMutation<Mechanic>('/api/mechanics', 'POST', values);
        setMechanics(prev => [created, ...prev]);
        toast.success('Mechanic added');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save mechanic');
    }
  });

  const toggleStatus = async (mechanic: Mechanic) => {
    const newCode = mechanic.statusCode === 'active' ? 'inactive' : 'active';
    try {
      const updated = await apiMutation<Mechanic>(`/api/mechanics/${mechanic.id}`, 'PATCH', { ...mechanic, statusCode: newCode });
      setMechanics(prev => prev.map(m => m.id === mechanic.id ? { ...m, ...updated } : m));
      toast.success(`Mechanic ${newCode === 'active' ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiMutation(`/api/mechanics/${confirmDelete.id}`, 'DELETE');
      setMechanics(prev => prev.filter(m => m.id !== confirmDelete.id));
      toast.success('Mechanic deleted');
    } catch {
      toast.error('Failed to delete mechanic');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Mechanics</h2>
          <p className="text-sm text-muted-foreground mt-1">{meta?.total ?? mechanics.length} mechanics</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold px-5 transition-opacity">
          <Plus className="w-4 h-4 mr-2" /> Add Mechanic
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && fetchMechanics()}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-zinc-700 focus:ring-2 focus:ring-white/10"
        />
      </div>

      <div className="bg-muted/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mechanic</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Joined</th>
                <th className="text-right px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-zinc-800/60 rounded animate-pulse w-full" /></td></tr>
                ))
              ) : mechanics.map(m => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 transition-colors">
                        <Wrench className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {m.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" />{m.phone}</p>}
                      {m.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" />{m.email}</p>}
                      {!m.phone && !m.email && <span className="text-xs text-zinc-600">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${m.statusCode === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-muted-foreground'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs text-muted-foreground tabular-nums">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleStatus(m)} className="p-2 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-zinc-300 transition-colors" title={m.statusCode === 'active' ? 'Deactivate' : 'Activate'}>
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(m)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && mechanics.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                    <Wrench className="w-8 h-8 text-zinc-600" />
                  </div>
                  {search ? 'No mechanics match your search' : 'No mechanics yet'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchMechanics(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => fetchMechanics(page + 1)} disabled={page >= meta.lastPage} className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-muted p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">{editing ? 'Edit Mechanic' : 'Add Mechanic'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-zinc-600" placeholder="Juan Dela Cruz" />
              {form.formState.errors.name && <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <Input {...form.register('phone')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-zinc-600" placeholder="+63..." />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input type="email" {...form.register('email')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-zinc-600" placeholder="mechanic@email.com" />
                {form.formState.errors.email && <p className="text-xs text-red-400 mt-1">{form.formState.errors.email.message}</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Address</Label>
              <Input {...form.register('address')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-zinc-600" placeholder="Full address" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold transition-opacity">{editing ? 'Save Changes' : 'Add Mechanic'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-zinc-700 text-muted-foreground hover:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-muted p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Delete Mechanic?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">{confirmDelete?.name} will be permanently removed.</p>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleDelete} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-zinc-700 text-muted-foreground">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
