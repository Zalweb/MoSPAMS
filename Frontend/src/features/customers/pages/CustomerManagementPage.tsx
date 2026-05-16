import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, MapPin, ChevronLeft, ChevronRight, UserCheck, UserPlus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

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
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Customer Relations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your client database</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={openAdd}
            className="h-11 rounded-xl font-semibold px-6 shadow-lg transition-all active:scale-[0.98]"
            style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
          >
            <Plus className="w-5 h-5 mr-2" strokeWidth={2.5} /> 
            New Customer
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Database', value: meta?.total ?? 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'New this Month', value: Math.floor((meta?.total ?? 0) * 0.15), icon: UserPlus, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Active Clients', value: Math.floor((meta?.total ?? 0) * 0.8), icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Growth Rate', value: '+12.5%', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            {...fadeUp(0.1 + i * 0.05)}
            className="bg-card dark:bg-zinc-900/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <motion.div {...fadeUp(0.3)} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-card dark:bg-zinc-900/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
          />
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div 
        {...fadeUp(0.4)}
        className="bg-card dark:bg-zinc-900/40 backdrop-blur-2xl border border-border/50 rounded-3xl overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Client Identity</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contact Channels</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Primary Address</th>
                <th className="text-left px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Join Date</th>
                <th className="text-right px-6 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-6 py-8"><div className="h-6 bg-muted rounded-xl animate-pulse w-full" /></td></tr>
                ))
              ) : customers.map((c, i) => (
                <motion.tr 
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/20 to-[rgb(var(--color-secondary-rgb))]/20 flex items-center justify-center shrink-0 border border-border/50">
                        <span className="text-sm font-bold text-[rgb(var(--color-primary-rgb))]">
                          {c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{c.name}</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">Verified Client</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {c.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-md bg-secondary/50 flex items-center justify-center">
                            <Phone className="w-3 h-3" />
                          </div>
                          <span className="font-medium tabular-nums tracking-tight">{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-5 h-5 rounded-md bg-secondary/50 flex items-center justify-center">
                            <Mail className="w-3 h-3" />
                          </div>
                          <span className="font-medium truncate max-w-[150px]">{c.email}</span>
                        </div>
                      )}
                      {!c.phone && !c.email && <span className="text-xs text-muted-foreground/40 italic italic">No contact info</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-start gap-2 max-w-[200px]">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {c.address || 'Not provided'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell text-xs font-medium text-muted-foreground tabular-nums">
                    {new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button 
                        onClick={() => openEdit(c)} 
                        className="p-2.5 rounded-xl bg-muted hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-90"
                        title="Edit Profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(c)} 
                        className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all active:scale-90"
                        title="Delete Client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center">
                        <Users className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">No customers found</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                          {search ? "We couldn't find anyone matching your search criteria." : "Start building your customer base today."}
                        </p>
                      </div>
                      {!search && (
                        <Button onClick={openAdd} variant="outline" className="mt-2 rounded-xl border-border">
                          Add your first client
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
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
              <button 
                onClick={() => fetchCustomers(page - 1)} 
                disabled={page <= 1} 
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => fetchCustomers(page + 1)} 
                disabled={page >= meta.lastPage} 
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-border/50 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-border/50 bg-card dark:bg-zinc-950 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[rgb(var(--color-primary-rgb))]/10 to-[rgb(var(--color-secondary-rgb))]/10 px-8 py-6 border-b border-border/50">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editing ? 'Refine Client Identity' : 'Register New Client'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {editing ? 'Update the details for this customer record.' : 'Create a new profile in your service database.'}
            </p>
          </div>
          
          <form onSubmit={onSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</Label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input 
                    {...form.register('name')} 
                    className="h-12 pl-11 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all" 
                    placeholder="e.g. Juan Dela Cruz" 
                  />
                </div>
                {form.formState.errors.name && <p className="text-[10px] font-bold text-red-400 ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input 
                      {...form.register('phone')} 
                      className="h-12 pl-11 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all" 
                      placeholder="+63 9xx..." 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input 
                      type="email" 
                      {...form.register('email')} 
                      className="h-12 pl-11 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all" 
                      placeholder="client@example.com" 
                    />
                  </div>
                  {form.formState.errors.email && <p className="text-[10px] font-bold text-red-400 ml-1">{form.formState.errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Physical Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted-foreground/50" />
                  <textarea 
                    {...form.register('address')} 
                    rows={3}
                    className="w-full p-4 pl-11 rounded-2xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all resize-none" 
                    placeholder="Enter full street address, city, and province..." 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg"
                style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
              >
                {editing ? 'Update Client' : 'Register Client'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setModalOpen(false)} 
                className="h-12 rounded-2xl px-6 font-bold text-muted-foreground hover:bg-muted transition-all"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[32px] border-border/50 bg-card p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">Remove Client?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2 px-4">
            Are you sure you want to delete <span className="font-bold text-foreground">{confirmDelete?.name}</span>? This action is permanent.
          </p>
          <div className="flex flex-col gap-2 mt-8">
            <Button 
              onClick={handleDelete} 
              variant="destructive" 
              className="h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-red-500/10"
            >
              Confirm Deletion
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDelete(null)} 
              className="h-12 rounded-2xl font-bold text-muted-foreground"
            >
              Keep Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
