import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Clock, Wrench, CheckCircle2, History, X, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import type { Part, ServiceRecord } from '@/shared/types';

type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed';

const serviceSchema = z.object({
  customerName: z.string().min(2, 'Required'),
  motorcycleModel: z.string().min(1, 'Required'),
  serviceType: z.string().min(1, 'Required'),
  laborCost: z.number().min(0),
  status: z.enum(['Pending', 'Ongoing', 'Completed']),
  notes: z.string(),
});
type ServiceForm = z.infer<typeof serviceSchema>;

const stSchema = z.object({
  name: z.string().min(2, 'Required'),
  defaultLaborCost: z.number().min(0),
});
type STForm = z.infer<typeof stSchema>;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const STATUS_STYLES = {
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock },
  Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Wrench },
  Completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: CheckCircle2 },
};

export default function Services() {
  const { addService, updateService, deleteService, serviceTypes, addServiceType, updateServiceType, deleteServiceType } = useData();
  const { user } = useAuth();
  const role = user?.role;
  const canDeleteService = can(role, 'services', 'delete');
  const canManageTypes = can(role, 'service-types', 'create');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<{ name: string; model: string } | null>(null);
  const [customerHistory, setCustomerHistory] = useState<ServiceRecord[]>([]);
  const [typesOpen, setTypesOpen] = useState(false);
  const [partsUsed, setPartsUsed] = useState<{ partId: string; quantity: number }[]>([]);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);

  const { data: services, loading, meta, page, setPage, prependItem, updateItem, removeItem } = usePaginatedFetch<ServiceRecord>('/api/services');

  useEffect(() => {
    if (!modalOpen) return;
    void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setAvailableParts(r.data)).catch(() => {});
  }, [modalOpen]);

  useEffect(() => {
    if (!historyCustomer) { setCustomerHistory([]); return; }
    void apiGet<{ data: ServiceRecord[] }>('/api/services?limit=50').then(r => {
      setCustomerHistory(
        r.data
          .filter(s => s.customerName === historyCustomer.name && s.motorcycleModel === historyCustomer.model)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    }).catch(() => {});
  }, [historyCustomer]);

  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '' },
  });
  const stForm = useForm<STForm>({ resolver: zodResolver(stSchema), defaultValues: { name: '', defaultLaborCost: 0 } });

  const filtered = useMemo(() => services.filter(s => {
    const q = search.toLowerCase();
    return (s.customerName.toLowerCase().includes(q) || s.motorcycleModel.toLowerCase().includes(q)) && (statusFilter === 'All' || s.status === statusFilter);
  }), [services, search, statusFilter]);

  const statusCounts = useMemo(() => ({
    All: services.length,
    Pending: services.filter(s => s.status === 'Pending').length,
    Ongoing: services.filter(s => s.status === 'Ongoing').length,
    Completed: services.filter(s => s.status === 'Completed').length,
  }), [services]);

  const openAdd = () => {
    setEditing(null);
    form.reset({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '' });
    setPartsUsed([]);
    setModalOpen(true);
  };
  const openEdit = (s: ServiceRecord) => {
    setEditing(s);
    form.reset({ customerName: s.customerName, motorcycleModel: s.motorcycleModel, serviceType: s.serviceType, laborCost: s.laborCost, status: s.status, notes: s.notes });
    setPartsUsed(s.partsUsed);
    setModalOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, partsUsed };
    if (editing) {
      const updated = await updateService(editing.id, payload);
      updateItem(editing.id, 'id', updated);
    } else {
      const created = await addService(payload);
      prependItem(created);
    }
    setModalOpen(false);
  });

  const handleTypeChange = (typeId: string) => {
    const t = serviceTypes.find(st => st.id === typeId);
    if (!t) return;
    form.setValue('serviceType', t.name);
    form.setValue('laborCost', t.defaultLaborCost);
  };

  const addPartToService = (partId: string) => {
    const existing = partsUsed.find(p => p.partId === partId);
    setPartsUsed(existing ? partsUsed.map(p => p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p) : [...partsUsed, { partId, quantity: 1 }]);
  };
  const removePartFromService = (partId: string) => setPartsUsed(partsUsed.filter(p => p.partId !== partId));

  const handleStatusChange = async (service: ServiceRecord, status: string) => {
    const updated = await updateService(service.id, { status: status as 'Pending' | 'Ongoing' | 'Completed' });
    updateItem(service.id, 'id', updated);
  };

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Services</h2>
          <p className="text-sm text-zinc-500 mt-1">{meta ? meta.total : services.length} service records</p>
        </div>
        <div className="flex gap-3">
          {canManageTypes && (
            <Button onClick={() => setTypesOpen(true)} variant="outline" size="sm" className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <Settings2 className="w-4 h-4 mr-2" /> Service Types
            </Button>
          )}
          <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold px-5 transition-opacity">
            <Plus className="w-4 h-4 mr-2" /> New Service
          </Button>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex gap-2 flex-wrap">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${statusFilter === s ? 'bg-white text-black' : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'}`}>
            {s} <span className="opacity-50 ml-1">{statusCounts[s]}</span>
          </button>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          placeholder="Search customer or motorcycle…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-2 focus:ring-white/10"
        />
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-2xl animate-pulse" />
          ))
        ) : filtered.map(service => {
          const style = STATUS_STYLES[service.status];
          const StatusIcon = style.icon;
          return (
            <div key={service.id} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${style.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <button onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="text-sm font-semibold text-white hover:underline text-left">
                      {service.customerName}
                    </button>
                    <p className="text-xs text-zinc-500">{service.motorcycleModel} — {service.serviceType}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Labor ₱{service.laborCost.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={service.status} onChange={e => handleStatusChange(service, e.target.value)} className={`h-9 px-3 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none ${style.bg} ${style.text} ${style.border}`}>
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <button title="History" onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
                    <History className="w-4 h-4" />
                  </button>
                  <button title="Edit" onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                  {canDeleteService && (
                    <button title="Delete" onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
              {service.partsUsed.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                  {service.partsUsed.map(pu => (
                    <span key={pu.partId} className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-700">
                      Part #{pu.partId} x{pu.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-zinc-500 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-zinc-600" />
            </div>
            No service records found
          </div>
        )}
      </motion.div>

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page >= meta.lastPage} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-zinc-800 bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2"><DialogTitle className="text-base font-semibold text-white">{editing ? 'Edit Service' : 'New Service Record'}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-400">Customer Name</Label>
                <Input {...form.register('customerName')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Juan Dela Cruz" />
                {form.formState.errors.customerName && <p className="text-xs text-red-400 mt-1">{form.formState.errors.customerName.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">Motorcycle Model</Label>
                <Input {...form.register('motorcycleModel')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Honda Click 150i" />
                {form.formState.errors.motorcycleModel && <p className="text-xs text-red-400 mt-1">{form.formState.errors.motorcycleModel.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-zinc-400">Service Type</Label>
                <select onChange={e => handleTypeChange(e.target.value)} defaultValue="" className="w-full mt-1.5 h-10 px-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-white">
                  <option value="">Pick from catalog…</option>
                  {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name} (₱{st.defaultLaborCost})</option>)}
                </select>
                <Input {...form.register('serviceType')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Or type custom service" />
                {form.formState.errors.serviceType && <p className="text-xs text-red-400 mt-1">{form.formState.errors.serviceType.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">Labor Cost (₱)</Label>
                <Input type="number" {...form.register('laborCost', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white focus:border-zinc-600" />
                <Label className="text-xs font-medium text-zinc-400 mt-3 block">Status</Label>
                <select {...form.register('status')} className="w-full mt-1.5 h-10 px-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-white">
                  <option value="Pending">Pending</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-zinc-400">Notes</Label>
              <Input {...form.register('notes')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Special instructions…" />
            </div>

            <div>
              <Label className="text-xs font-medium text-zinc-400">Parts Used</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {availableParts.filter(p => p.stock > 0).map(part => (
                  <button type="button" key={part.id} onClick={() => addPartToService(part.id)} className="text-xs font-medium bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors">+ {part.name}</button>
                ))}
              </div>
              {partsUsed.length > 0 && (
                <div className="mt-2 space-y-1">
                  {partsUsed.map(pu => {
                    const part = availableParts.find(p => p.id === pu.partId);
                    return (
                      <div key={pu.partId} className="flex items-center justify-between text-sm bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-700">
                        <span className="text-white">{part ? `${part.name} x${pu.quantity}` : `Part #${pu.partId} x${pu.quantity}`}</span>
                        <button type="button" onClick={() => removePartFromService(pu.partId)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold transition-opacity">{editing ? 'Save Changes' : 'Create Record'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-white">Service Type Catalog</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {serviceTypes.map(st => (
              <div key={st.id} className="flex items-center gap-2 bg-zinc-800/50 rounded-xl px-3 py-2 border border-zinc-700">
                <Input
                  defaultValue={st.name}
                  onBlur={e => e.target.value !== st.name && updateServiceType(st.id, { name: e.target.value })}
                  className="flex-1 h-8 text-sm rounded-lg bg-transparent border-0 text-white"
                />
                <Input
                  type="number"
                  defaultValue={st.defaultLaborCost}
                  onBlur={e => Number(e.target.value) !== st.defaultLaborCost && updateServiceType(st.id, { defaultLaborCost: Number(e.target.value) })}
                  className="w-20 h-8 text-sm rounded-lg bg-transparent border-0 text-white"
                />
                <button onClick={() => deleteServiceType(st.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <form onSubmit={stForm.handleSubmit(values => { addServiceType(values); stForm.reset({ name: '', defaultLaborCost: 0 }); })} className="flex gap-2 pt-4 mt-4 border-t border-zinc-800">
            <Input {...stForm.register('name')} placeholder="Type name" className="flex-1 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500" />
            <Input type="number" {...stForm.register('defaultLaborCost', { valueAsNumber: true })} placeholder="₱" className="w-24 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white" />
            <Button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold px-5 transition-opacity">Add</Button>
          </form>
        </DialogContent>
      </Dialog>

      {historyCustomer && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setHistoryCustomer(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-900 border-l border-zinc-800 z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Service History</p>
                <p className="text-sm font-semibold text-white">{historyCustomer.name}</p>
                <p className="text-xs text-zinc-500">{historyCustomer.model}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {customerHistory.length === 0 && <p className="text-sm text-zinc-500 text-center py-12">No prior records.</p>}
              <ul className="space-y-2">
                {customerHistory.map(h => (
                  <li key={h.id} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{h.serviceType}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[h.status].bg} ${STATUS_STYLES[h.status].text}`}>{h.status}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Labor ₱{h.laborCost.toLocaleString()}</p>
                    {h.notes && <p className="text-xs text-zinc-400 mt-1">{h.notes}</p>}
                    <p className="text-xs text-zinc-600 mt-1 tabular-nums">{new Date(h.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-white">Delete Service?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-400 mt-1">This will permanently remove this service record.</p>
          <div className="flex gap-3 pt-4">
            <Button onClick={async () => { if (confirmDelete) { await deleteService(confirmDelete); removeItem(confirmDelete, 'id'); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
