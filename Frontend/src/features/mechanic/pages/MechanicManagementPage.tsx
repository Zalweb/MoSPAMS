import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Wrench, Phone, Mail, Power, ChevronLeft, ChevronRight, BarChart3, X } from 'lucide-react';
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

interface MechanicPerf {
  id: string | number;
  name: string;
  jobs_this_month: number;
  avg_rating: number | null;
  last_activity: string | null;
}

interface MechanicDetail {
  mechanic_name: string;
  jobs_completed_this_month: number;
  avg_rating: number | null;
  trend_last_three_months: Array<{ month: string; jobs_completed: number }>;
  recent_jobs: Array<{ id: number; service_type: string; customer_name: string; completed_at: string; rating: number | null; comment: string | null }>;
}

const mechanicSchema = z.object({
  name: z.string().min(2, 'Required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});
type MechanicForm = z.infer<typeof mechanicSchema>;

export default function MechanicManagementPage({ hideAddButton = false }: { hideAddButton?: boolean }) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Mechanic | null>(null);
  const [meta, setMeta] = useState<{ currentPage: number; lastPage: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [perfMap, setPerfMap] = useState<Record<string, MechanicPerf>>({});
  const [selectedPerf, setSelectedPerf] = useState<MechanicDetail | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

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

  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const res = await apiGet<{ data: MechanicPerf[] }>('/api/owner/mechanics');
        const map: Record<string, MechanicPerf> = {};
        res.data.forEach(p => { map[String(p.id)] = p; });
        setPerfMap(map);
      } catch { /* non-critical */ }
    };
    void fetchPerf();
  }, []);

  const openPerfDetail = async (mechanicId: string) => {
    setPerfLoading(true);
    setSelectedPerf(null);
    try {
      const res = await apiGet<{ data: MechanicDetail }>(`/api/owner/mechanics/${mechanicId}`);
      setSelectedPerf(res.data);
    } catch {
      toast.error('Failed to load performance details');
    } finally {
      setPerfLoading(false);
    }
  };

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
        {!hideAddButton && (
          <Button
            onClick={openAdd}
            size="sm"
            className="h-10 rounded-xl text-sm font-semibold px-5 transition-all active:scale-95 shadow-lg"
            style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Mechanic
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && fetchMechanics()}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border dark:border-zinc-700 focus:ring-2 focus:ring-white/10"
        />
      </div>

      <div className="bg-card dark:bg-zinc-900/40 backdrop-blur-2xl border border-border/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Mechanic</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Joined</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Jobs (Mo.)</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Avg Rating</th>
                <th className="text-right px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-6 py-8"><div className="h-6 bg-muted rounded-xl animate-pulse w-full" /></td></tr>
                ))
              ) : mechanics.map(m => (
                <tr key={m.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/50"
                        style={{ background: 'var(--brand-surface-gradient)' }}
                      >
                        <span className="text-sm font-bold" style={{ color: 'var(--brand-safe-text)' }}>
                          {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{m.name}</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">Mechanic</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {m.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-md bg-secondary/50 flex items-center justify-center">
                            <Phone className="w-3 h-3" />
                          </div>
                          <span className="font-medium tabular-nums">{m.phone}</span>
                        </div>
                      )}
                      {m.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-md bg-secondary/50 flex items-center justify-center">
                            <Mail className="w-3 h-3" />
                          </div>
                          <span className="font-medium truncate max-w-[160px]">{m.email}</span>
                        </div>
                      )}
                      {!m.phone && !m.email && <span className="text-xs text-muted-foreground/40 italic">No contact info</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      m.status?.toLowerCase() === 'available' || m.statusCode === 'active'
                        ? 'bg-green-500/15 text-green-500'
                        : m.status?.toLowerCase() === 'busy'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-secondary text-muted-foreground'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-xs font-medium text-muted-foreground tabular-nums">
                    {new Date(m.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm font-semibold text-foreground">
                    {perfMap[m.id]?.jobs_this_month ?? <span className="text-muted-foreground font-normal">—</span>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm">
                    {perfMap[m.id]?.avg_rating != null ? (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">{perfMap[m.id].avg_rating}</span>
                        <span className="text-yellow-400">★</span>
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button onClick={() => openPerfDetail(m.id)} className="p-2.5 rounded-xl hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-all active:scale-90" title="View Performance">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(m)} className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90" title={m.statusCode === 'active' ? 'Deactivate' : 'Activate'}>
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(m)} className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(m)} className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all active:scale-90">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && mechanics.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
                      <Wrench className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">No mechanics found</h4>
                      <p className="text-sm text-muted-foreground mt-1">{search ? "No mechanics match your search." : "Start building your team today."}</p>
                    </div>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-6 py-5 bg-muted/30 border-t border-border/50">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Showing Page {meta.currentPage} of {meta.lastPage}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchMechanics(page - 1)} disabled={page <= 1} className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => fetchMechanics(page + 1)} disabled={page >= meta.lastPage} className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">{editing ? 'Edit Mechanic' : 'Add Mechanic'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Juan Dela Cruz" />
              {form.formState.errors.name && <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <Input {...form.register('phone')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="+63..." />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <Input type="email" {...form.register('email')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="mechanic@email.com" />
                {form.formState.errors.email && <p className="text-xs text-red-400 mt-1">{form.formState.errors.email.message}</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Address</Label>
              <Input {...form.register('address')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Full address" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}>{editing ? 'Save Changes' : 'Add Mechanic'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Delete Mechanic?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">{confirmDelete?.name} will be permanently removed.</p>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleDelete} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Detail Modal */}
      {(perfLoading || selectedPerf) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {selectedPerf?.mechanic_name ?? 'Performance'}
              </h3>
              <button onClick={() => setSelectedPerf(null)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {perfLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedPerf && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Jobs This Month</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{selectedPerf.jobs_completed_this_month}</p>
                  </div>
                  <div className="border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {selectedPerf.avg_rating != null ? <>{selectedPerf.avg_rating} <span className="text-yellow-400 text-xl">★</span></> : 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">3-Month Trend</p>
                  <div className="flex items-end gap-4 h-28">
                    {selectedPerf.trend_last_three_months.map((t, i) => {
                      const max = Math.max(...selectedPerf.trend_last_three_months.map(x => x.jobs_completed), 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                          <span className="text-xs font-bold text-foreground">{t.jobs_completed}</span>
                          <div className="w-full bg-primary/70 rounded-t" style={{ height: `${(t.jobs_completed / max) * 64}px`, minHeight: '3px' }} />
                          <span className="text-[10px] text-muted-foreground">{t.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedPerf.recent_jobs.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Recent Jobs</p>
                    <div className="space-y-2">
                      {selectedPerf.recent_jobs.slice(0, 5).map(job => (
                        <div key={job.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div>
                            <p className="text-sm text-foreground">{job.service_type}</p>
                            <p className="text-xs text-muted-foreground">{job.customer_name}</p>
                          </div>
                          {job.rating && <span className="text-sm font-medium text-yellow-500">{job.rating} ★</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
