import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

const customerSchema = z.object({
  name: z.string().min(2, 'Required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [meta, setMeta] = useState<{ currentPage: number; lastPage: number; total: number } | null>(null);
  const [page, setPage] = useState(1);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', email: '', address: '' },
  });

  const fetchCustomers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: '25' });
      if (search) params.set('search', search);
      const res = await apiGet<{ data: Customer[]; meta: { current_page: number; last_page: number; total: number } }>(
        `/api/customers?${params}`
      );
      setCustomers(res.data);
      setMeta(res.meta ? { currentPage: res.meta.current_page, lastPage: res.meta.last_page, total: res.meta.total } : null);
      setPage(res.meta?.current_page ?? 1);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  const openAdd = () => { setEditing(null); form.reset({ name: '', phone: '', email: '', address: '' }); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); form.reset({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' }); setModalOpen(true); };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await apiMutation(`/api/customers/${editing.id}`, 'PATCH', values);
        setCustomers(prev => prev.map(c => c.id === editing.id ? { ...c, ...values, phone: values.phone || null, email: values.email || null, address: values.address || null } : c));
        toast.success('Customer updated');
      } else {
        const created = await apiMutation<Customer>('/api/customers', 'POST', values);
        setCustomers(prev => [created, ...prev]);
        toast.success('Customer added');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save customer');
    }
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiMutation(`/api/customers/${confirmDelete.id}`, 'DELETE');
      setCustomers(prev => prev.filter(c => c.id !== confirmDelete.id));
      toast.success('Customer deleted');
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Customers</h2>
          <p className="text-sm text-zinc-500 mt-1">{meta?.total ?? customers.length} customers</p>
        </div>
        <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold px-5 transition-opacity">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-2 focus:ring-white/10"
        />
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Address</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                <th className="text-right px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-zinc-800/60 rounded animate-pulse w-full" /></td></tr>
                ))
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 transition-colors">
                        <Users className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {c.phone && <p className="text-xs text-zinc-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                      {c.email && <p className="text-xs text-zinc-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
                      {!c.phone && !c.email && <span className="text-xs text-zinc-600">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-xs text-zinc-400 flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{c.address || '—'}</span>
                    </p>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell text-xs text-zinc-500 tabular-nums">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-zinc-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                    <Users className="w-8 h-8 text-zinc-600" />
                  </div>
                  {search ? 'No customers match your search' : 'No customers yet'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchCustomers(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => fetchCustomers(page + 1)} disabled={page >= meta.lastPage} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-zinc-400">Full Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Juan Dela Cruz" />
              {form.formState.errors.name && <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-zinc-400">Phone</Label>
                <Input {...form.register('phone')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="+63..." />
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">Email</Label>
                <Input type="email" {...form.register('email')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="customer@email.com" />
                {form.formState.errors.email && <p className="text-xs text-red-400 mt-1">{form.formState.errors.email.message}</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-zinc-400">Address</Label>
              <Input {...form.register('address')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Full address" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold transition-opacity">{editing ? 'Save Changes' : 'Add Customer'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-white">Delete Customer?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-400 mt-1">{confirmDelete?.name} will be permanently removed.</p>
          <div className="flex gap-3 pt-4">
            <Button onClick={handleDelete} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
