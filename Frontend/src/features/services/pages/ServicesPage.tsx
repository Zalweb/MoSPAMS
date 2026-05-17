import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Clock, Wrench, CheckCircle2, History, X, XCircle, Settings2, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import type { Part, ServiceRecord } from '@/shared/types';
import { StartServiceModal } from '../components/StartServiceModal';
import { CustomerSearchInput } from '../components/CustomerSearchInput';

type StatusFilter = 'All' | 'Pending' | 'Confirmed' | 'Ongoing' | 'Work Done' | 'Completed' | 'Cancelled';

interface Mechanic { id: string; name: string }

const serviceSchema = z.object({
  customerName: z.string().min(2, 'Required'),
  motorcycleModel: z.string().min(1, 'Required'),
  serviceType: z.string().min(1, 'Required'),
  laborCost: z.number().min(0),
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

const STATUS_STYLES: Record<ServiceRecord['status'], { bg: string; text: string; border: string; icon: typeof Clock }> = {
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock },
  Confirmed: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', icon: CheckCircle2 },
  Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Wrench },
  'In Progress': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Wrench },
  'Work Done': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Wrench },
  Completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: CheckCircle2 },
  Cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
};

function getStatusStyle(status: ServiceRecord['status']) {
  return STATUS_STYLES[status] ?? STATUS_STYLES['Pending'];
}

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
  const [availableMechanics, setAvailableMechanics] = useState<Mechanic[]>([]);
  const [selectedMechanicIds, setSelectedMechanicIds] = useState<string[]>([]);
  const [billJob, setBillJob] = useState<ServiceRecord | null>(null);
  const [billPaymentMethod, setBillPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [billLaborCost, setBillLaborCost] = useState<number>(0);
  const [billing, setBilling] = useState(false);
  const [startJobTarget, setStartJobTarget] = useState<ServiceRecord | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [addPartsTarget, setAddPartsTarget] = useState<ServiceRecord | null>(null);
  const [addPartId, setAddPartId] = useState<string>('');
  const [addPartQty, setAddPartQty] = useState<number>(1);
  const [addingPart, setAddingPart] = useState(false);
  const [addPartsSearch, setAddPartsSearch] = useState('');
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const [newPartsSearch, setNewPartsSearch] = useState('');

  const { data: services, loading, meta, page, setPage, prependItem, updateItem, removeItem } = usePaginatedFetch<ServiceRecord>('/api/services', 25, {}, 10000);

  useEffect(() => {
    if (!modalOpen) return;
    void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setAvailableParts(r.data)).catch(() => {});
    void apiGet<{ data: { id: string; name: string }[] }>('/api/mechanics?limit=100').then(r => setAvailableMechanics(r.data)).catch(() => {});
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
    defaultValues: { customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, notes: '' },
  });
  const stForm = useForm<STForm>({ resolver: zodResolver(stSchema), defaultValues: { name: '', defaultLaborCost: 0 } });

  const filtered = useMemo(() => services.filter(s => {
    const q = search.toLowerCase();
    return (s.customerName.toLowerCase().includes(q) || s.motorcycleModel.toLowerCase().includes(q)) && (statusFilter === 'All' || s.status === statusFilter);
  }), [services, search, statusFilter]);

  const statusCounts = useMemo(() => ({
    All: services.length,
    Pending: services.filter(s => s.status === 'Pending').length,
    Confirmed: services.filter(s => s.status === 'Confirmed').length,
    Ongoing: services.filter(s => s.status === 'Ongoing').length,
    'Work Done': services.filter(s => s.status === 'Work Done').length,
    Completed: services.filter(s => s.status === 'Completed').length,
    Cancelled: services.filter(s => s.status === 'Cancelled').length,
  }), [services]);

  const workDoneCount = useMemo(() => services.filter(s => s.statusCode === 'work_done').length, [services]);
  const pendingRequestsCount = useMemo(() => services.filter(s => s.statusCode === 'in_progress').length, [services]);

  const openAdd = () => {
    setEditing(null);
    form.reset({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, notes: '' });
    setPartsUsed([]);
    setSelectedMechanicIds([]);
    setLinkedCustomerId(null);
    setNewPartsSearch('');
    setModalOpen(true);
  };
  const openEdit = (s: ServiceRecord) => {
    setEditing(s);
    form.reset({ customerName: s.customerName, motorcycleModel: s.motorcycleModel, serviceType: s.serviceType, laborCost: s.laborCost, notes: s.notes });
    setPartsUsed(s.partsUsed.map(p => ({ partId: p.partId, quantity: p.quantity })));
    setSelectedMechanicIds((s.mechanics ?? []).map(m => m.id));
    setLinkedCustomerId(null);
    setNewPartsSearch('');
    setModalOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const shapedParts = partsUsed.map(p => ({
      jobPartId: '',
      partId: p.partId,
      quantity: p.quantity,
      status: 'confirmed' as const,
    }));
    const mechanics = selectedMechanicIds
      .map(id => availableMechanics.find(m => m.id === id))
      .filter((m): m is Mechanic => Boolean(m));
    if (editing) {
      const updated = await updateService(editing.id, {
        ...values,
        partsUsed: shapedParts,
        mechanicIds: selectedMechanicIds,
        mechanics,
      } as Partial<import('@/shared/types').ServiceRecord>);
      updateItem(editing.id, 'id', updated);
    } else {
      const created = await addService({
        ...values,
        customerId: linkedCustomerId ?? undefined,
        status: 'Pending',
        statusCode: 'pending',
        partsUsed: shapedParts,
        partRequests: [],
        mechanicIds: selectedMechanicIds,
        mechanics,
        completedAt: undefined,
      } as Omit<import('@/shared/types').ServiceRecord, 'id' | 'createdAt'>);
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

  const toggleMechanic = (id: string) =>
    setSelectedMechanicIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleBill = async () => {
    if (!billJob) return;
    setBilling(true);
    try {
      await apiMutation(`/api/services/${billJob.id}/bill`, 'POST', {
        paymentMethod: billPaymentMethod,
        laborCost: isNaN(billLaborCost) ? billJob.laborCost : billLaborCost,
      });
      const updated = await apiGet<{ data: ServiceRecord }>(`/api/services/${billJob.id}`).then(r => r.data).catch(() => null);
      if (updated) updateItem(billJob.id, 'id', updated);
      setBillJob(null);
      setBillPaymentMethod('Cash');
      setBillLaborCost(0);
    } finally {
      setBilling(false);
    }
  };

  const handleStartService = async (mechanicIds: string[]) => {
    if (!startJobTarget) return;
    const updated = await apiMutation<{ data: ServiceRecord }>(
      `/api/services/${startJobTarget.id}/start`, 'POST', { mechanicIds }
    ).then(r => r.data);
    updateItem(startJobTarget.id, 'id', updated);
    setStartJobTarget(null);
  };

  const handleCancelService = async (serviceId: string) => {
    const updated = await apiMutation<{ data: ServiceRecord }>(
      `/api/services/${serviceId}/cancel`, 'POST', {}
    ).then(r => r.data);
    updateItem(serviceId, 'id', updated);
    setCancelConfirm(null);
  };

  const handleConfirmPart = async (serviceId: string, jobPartId: string) => {
    const updated = await apiMutation<{ data: ServiceRecord }>(
      `/api/services/${serviceId}/parts/${jobPartId}/confirm`, 'PATCH', {}
    ).then(r => r.data);
    updateItem(serviceId, 'id', updated);
  };

  const handleRejectPart = async (serviceId: string, jobPartId: string) => {
    const updated = await apiMutation<{ data: ServiceRecord }>(
      `/api/services/${serviceId}/parts/${jobPartId}`, 'DELETE', {}
    ).then(r => r.data);
    updateItem(serviceId, 'id', updated);
  };

  const openAddPartsModal = (service: ServiceRecord) => {
    setAddPartsTarget(service);
    setAddPartId('');
    setAddPartsSearch('');
    setAddPartQty(1);
    void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setAvailableParts(r.data)).catch(() => {});
  };

  const handleAddPartToOngoing = async () => {
    if (!addPartsTarget || !addPartId) return;
    setAddingPart(true);
    try {
      const updated = await apiMutation<{ data: ServiceRecord }>(
        `/api/services/${addPartsTarget.id}/parts`, 'POST',
        { partId: Number(addPartId), quantity: addPartQty }
      ).then(r => r.data);
      updateItem(addPartsTarget.id, 'id', updated);
      setAddPartsTarget(null);
    } finally {
      setAddingPart(false);
    }
  };

  const togglePartRequests = (serviceId: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Services</h2>
          <p className="text-sm text-muted-foreground mt-1">{meta ? meta.total : services.length} service records</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {workDoneCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {workDoneCount} Ready for Payment
              </span>
            )}
            {pendingRequestsCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {pendingRequestsCount} Part Requests
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {canManageTypes && (
            <Button onClick={() => setTypesOpen(true)} variant="outline" size="sm" className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800 hover:text-foreground">
              <Settings2 className="w-4 h-4 mr-2" /> Service Types
            </Button>
          )}
          <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold px-5 transition-opacity">
            <Plus className="w-4 h-4 mr-2" /> New Service
          </Button>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex gap-2 flex-wrap">
        {(['All', 'Pending', 'Confirmed', 'Ongoing', 'Work Done', 'Completed', 'Cancelled'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${statusFilter === s ? 'shadow-lg' : 'bg-muted/50 text-muted-foreground border border-border hover:border-border dark:border-zinc-700 hover:text-foreground'}`} style={statusFilter === s ? { background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' } : undefined}>
            {s} <span className="opacity-50 ml-1">{statusCounts[s]}</span>
          </button>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search customer or motorcycle…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border dark:border-zinc-700 focus:ring-2 focus:ring-white/10"
        />
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 border border-border rounded-2xl animate-pulse" />
          ))
        ) : filtered.map(service => {
          const style = getStatusStyle(service.status);
          const StatusIcon = style.icon;
          const pendingRequests = (service.partRequests ?? []).length;
          return (
            <div key={service.id} className="brand-card backdrop-blur-sm border rounded-2xl p-5 transition-all duration-300 group" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${style.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <button onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="text-sm font-semibold text-foreground hover:underline text-left">
                      {service.customerName}
                    </button>
                    <p className="text-xs text-muted-foreground">{service.motorcycleModel} — {service.serviceType}</p>
                    <p className="text-xs text-muted-foreground dark:text-zinc-600 mt-0.5">Labor ₱{service.laborCost.toLocaleString()}</p>
                    {(service.mechanics ?? []).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-muted-foreground dark:text-zinc-600">Mechanic:</span> {service.mechanics.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {service.preferredMechanic && (service.mechanics ?? []).length === 0 && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        ★ Customer prefers: {service.preferredMechanic.name}
                        {service.queuePosition != null && (
                          <span className="ml-1.5 text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                            #{service.queuePosition} in queue
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {service.statusCode === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => setStartJobTarget(service)}
                        className="h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3">
                        Confirm Booking
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {service.statusCode === 'booked_confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                      className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                      Cancel
                    </Button>
                  )}
                  {service.statusCode === 'in_progress' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAddPartsModal(service)}
                        className="h-8 rounded-xl border-border dark:border-zinc-700 text-muted-foreground hover:text-foreground text-xs px-3">
                        Add Items
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {service.statusCode === 'work_done' && (
                    <>
                      <Button size="sm" onClick={() => { setBillJob(service); setBillLaborCost(service.laborCost); }}
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3">
                        Confirm Payment
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {(service.statusCode === 'completed' || service.statusCode === 'cancelled') && (
                    <span className={`inline-flex h-8 items-center px-3 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                      {service.status}
                    </span>
                  )}
                  <button title="History" onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors">
                    <History className="w-4 h-4" />
                  </button>
                  <button title="Edit" onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                  {canDeleteService && (
                    <button title="Delete" onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
              {service.partsUsed.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                  {service.partsUsed.map(pu => (
                    <span key={pu.jobPartId} className="text-xs font-medium text-muted-foreground bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-border dark:border-zinc-700">
                      {pu.name ?? `Part #${pu.partId}`} x{pu.quantity}
                    </span>
                  ))}
                </div>
              )}
              {service.statusCode === 'in_progress' && pendingRequests > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => togglePartRequests(service.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Part Requests ({pendingRequests})
                  </button>
                  {expandedRequests.has(service.id) && (
                    <div className="mt-2 space-y-1.5">
                      {service.partRequests.map(pr => (
                        <div key={pr.jobPartId} className="flex items-center justify-between text-xs bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                          <span className="text-foreground font-medium">{pr.name} x{pr.quantity}</span>
                          <span className="text-muted-foreground">by {pr.requestedBy}</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleConfirmPart(service.id, pr.jobPartId)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectPart(service.id, pr.jobPartId)}
                              className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground brand-card backdrop-blur-sm border rounded-2xl" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-muted-foreground dark:text-zinc-600" />
            </div>
            No service records found
          </div>
        )}
      </motion.div>

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page >= meta.lastPage} className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Service create/edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card dark:bg-zinc-950 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2"><DialogTitle className="text-base font-semibold text-foreground">{editing ? 'Edit Service' : 'New Service Record'}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Customer Name</Label>
                <CustomerSearchInput
                  value={form.watch('customerName')}
                  customerId={linkedCustomerId}
                  onChange={(name, id) => { form.setValue('customerName', name, { shouldValidate: true }); setLinkedCustomerId(id); }}
                  placeholder="Juan Dela Cruz"
                  className="mt-1.5"
                />
                {form.formState.errors.customerName && <p className="text-xs text-red-400 mt-1">{form.formState.errors.customerName.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Motorcycle Model</Label>
                <Input {...form.register('motorcycleModel')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Honda Click 150i" />
                {form.formState.errors.motorcycleModel && <p className="text-xs text-red-400 mt-1">{form.formState.errors.motorcycleModel.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Service Type</Label>
                <select onChange={e => handleTypeChange(e.target.value)} defaultValue="" className="w-full mt-1.5 h-10 px-3 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground">
                  <option value="">Pick from catalog…</option>
                  {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name} (₱{st.defaultLaborCost})</option>)}
                </select>
                <Input {...form.register('serviceType')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Or type custom service" />
                {form.formState.errors.serviceType && <p className="text-xs text-red-400 mt-1">{form.formState.errors.serviceType.message}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Labor Cost (₱)</Label>
                <Input type="number" {...form.register('laborCost', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground focus:border-border dark:border-zinc-600" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Input {...form.register('notes')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Special instructions…" />
            </div>

            {availableMechanics.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Assign Mechanics</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {availableMechanics.map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleMechanic(m.id)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${selectedMechanicIds.includes(m.id) ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Parts Used</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search parts to add…"
                  value={newPartsSearch}
                  onChange={e => setNewPartsSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>
              {newPartsSearch && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-border dark:border-zinc-700 p-1">
                  {availableParts.filter(p => p.stock > 0 && p.name.toLowerCase().includes(newPartsSearch.toLowerCase())).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No parts found</p>
                  ) : availableParts.filter(p => p.stock > 0 && p.name.toLowerCase().includes(newPartsSearch.toLowerCase())).map(p => (
                    <button key={p.id} type="button" onClick={() => { addPartToService(p.id); setNewPartsSearch(''); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted flex items-center justify-between transition-colors">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">₱{p.price} · {p.stock} left</span>
                    </button>
                  ))}
                </div>
              )}
              {partsUsed.length > 0 && (
                <div className="mt-2 space-y-1">
                  {partsUsed.map(pu => {
                    const part = availableParts.find(p => p.id === pu.partId);
                    return (
                      <div key={pu.partId} className="flex items-center justify-between text-sm bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-border dark:border-zinc-700">
                        <span className="text-foreground">{part ? `${part.name} x${pu.quantity}` : `Part #${pu.partId} x${pu.quantity}`}</span>
                        <button type="button" onClick={() => removePartFromService(pu.partId)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold transition-opacity">{editing ? 'Save Changes' : 'Create Record'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete & Collect Payment modal */}
      {billJob && (
        <Dialog open={!!billJob} onOpenChange={() => { setBillJob(null); setBillLaborCost(0); }}>
          <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">Complete & Collect Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Labor Cost (₱)</Label>
                <Input
                  type="number"
                  min={0}
                  value={billLaborCost}
                  onChange={e => { const v = parseFloat(e.target.value); setBillLaborCost(isNaN(v) ? 0 : v); }}
                  className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground"
                />
              </div>
              {billJob.partsUsed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Confirmed Parts</p>
                  <div className="space-y-1">
                    {billJob.partsUsed.map(p => (
                      <div key={p.jobPartId} className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.name ?? `Part #${p.partId}`} x{p.quantity}</span>
                        <span>₱{((p.unitPrice ?? 0) * p.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-3">
                <span>Total</span>
                <span>₱{(billLaborCost + billJob.partsUsed.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantity, 0)).toLocaleString()}</span>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Payment Method</Label>
                <div className="flex gap-2 mt-1.5">
                  {(['Cash', 'GCash'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setBillPaymentMethod(m)}
                      className={`flex-1 h-10 rounded-xl text-sm font-medium border transition-colors ${
                        billPaymentMethod === m
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleBill}
                disabled={billing}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {billing ? 'Processing…' : 'Confirm Payment Received'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Service Type Catalog</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {serviceTypes.map(st => (
              <div key={st.id} className="flex items-center gap-2 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl px-3 py-2 border border-border dark:border-zinc-700">
                <Input
                  defaultValue={st.name}
                  onBlur={e => e.target.value !== st.name && updateServiceType(st.id, { name: e.target.value })}
                  className="flex-1 h-8 text-sm rounded-lg bg-transparent border-0 text-foreground"
                />
                <Input
                  type="number"
                  defaultValue={st.defaultLaborCost}
                  onBlur={e => Number(e.target.value) !== st.defaultLaborCost && updateServiceType(st.id, { defaultLaborCost: Number(e.target.value) })}
                  className="w-20 h-8 text-sm rounded-lg bg-transparent border-0 text-foreground"
                />
                <button onClick={() => deleteServiceType(st.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <form onSubmit={stForm.handleSubmit(values => { addServiceType(values); stForm.reset({ name: '', defaultLaborCost: 0 }); })} className="flex gap-2 pt-4 mt-4 border-t border-border">
            <Input {...stForm.register('name')} placeholder="Type name" className="flex-1 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground" />
            <Input type="number" {...stForm.register('defaultLaborCost', { valueAsNumber: true })} placeholder="₱" className="w-24 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground" />
            <Button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold px-5 transition-opacity">Add</Button>
          </form>
        </DialogContent>
      </Dialog>

      {historyCustomer && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setHistoryCustomer(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-card dark:bg-zinc-950 border-l border-border z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service History</p>
                <p className="text-sm font-semibold text-foreground">{historyCustomer.name}</p>
                <p className="text-xs text-muted-foreground">{historyCustomer.model}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {customerHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No prior records.</p>}
              <ul className="space-y-2">
                {customerHistory.map(h => (
                  <li key={h.id} className="bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{h.serviceType}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusStyle(h.status).bg} ${getStatusStyle(h.status).text}`}>{h.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Labor ₱{h.laborCost.toLocaleString()}</p>
                    {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground dark:text-zinc-600 mt-1 tabular-nums">{new Date(h.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Delete Service?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">This will permanently remove this service record.</p>
          <div className="flex gap-3 pt-4">
            <Button onClick={async () => { if (confirmDelete) { await deleteService(confirmDelete); removeItem(confirmDelete, 'id'); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Service modal */}
      <StartServiceModal
        open={!!startJobTarget}
        onClose={() => setStartJobTarget(null)}
        onConfirm={handleStartService}
      />

      {/* Cancel Service confirmation */}
      {cancelConfirm && (
        <Dialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
          <DialogContent className="sm:max-w-xs rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">Cancel Service?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-1 mb-4">This will mark the job as cancelled.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCancelConfirm(null)} className="rounded-xl">Keep</Button>
              <Button size="sm" onClick={() => handleCancelService(cancelConfirm)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">Cancel Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Items to Ongoing job */}
      {addPartsTarget && (
        <Dialog open={!!addPartsTarget} onOpenChange={() => setAddPartsTarget(null)}>
          <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">Add Items</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Part</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search parts…"
                    value={addPartsSearch}
                    onChange={e => setAddPartsSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/10"
                  />
                </div>
                <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border dark:border-zinc-700 p-1">
                  {availableParts.filter(p => p.stock > 0 && (addPartsSearch === '' || p.name.toLowerCase().includes(addPartsSearch.toLowerCase()))).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">{addPartsSearch ? 'No parts found' : 'No parts in stock'}</p>
                  ) : (
                    availableParts.filter(p => p.stock > 0 && (addPartsSearch === '' || p.name.toLowerCase().includes(addPartsSearch.toLowerCase()))).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAddPartId(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${addPartId === p.id ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-foreground hover:bg-muted'}`}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">₱{p.price} · {p.stock} left</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={addPartQty}
                  onChange={e => setAddPartQty(Number(e.target.value))}
                  className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setAddPartsTarget(null)} className="rounded-xl">Cancel</Button>
                <Button size="sm" onClick={handleAddPartToOngoing} disabled={!addPartId || addingPart}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  {addingPart ? 'Adding…' : 'Add Part'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
