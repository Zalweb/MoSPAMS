import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Clock, Wrench, CheckCircle2, History, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import type { ServiceRecord } from '@/shared/types';

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

export default function Services() {
  const { services, parts, addService, updateService, deleteService, serviceTypes, addServiceType, updateServiceType, deleteServiceType } = useData();
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
  const [typesOpen, setTypesOpen] = useState(false);
  const [partsUsed, setPartsUsed] = useState<{ partId: string; quantity: number }[]>([]);

  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '' },
  });
  const stForm = useForm<STForm>({ resolver: zodResolver(stSchema), defaultValues: { name: '', defaultLaborCost: 0 } });

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    return (s.customerName.toLowerCase().includes(q) || s.motorcycleModel.toLowerCase().includes(q)) && (statusFilter === 'All' || s.status === statusFilter);
  });

  const statusCounts = { All: services.length, Pending: services.filter(s => s.status === 'Pending').length, Ongoing: services.filter(s => s.status === 'Ongoing').length, Completed: services.filter(s => s.status === 'Completed').length };

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
  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, partsUsed };
    if (editing) updateService(editing.id, payload); else addService(payload);
    setModalOpen(false);
  });

  const handleTypeChange = (typeId: string) => {
    const t = serviceTypes.find(st => st.id === typeId);
    if (!t) return;
    form.setValue('serviceType', t.name);
    form.setValue('laborCost', t.defaultLaborCost);
  };

  const customerHistory = useMemo(() => {
    if (!historyCustomer) return [];
    return services
      .filter(s => s.customerName === historyCustomer.name && s.motorcycleModel === historyCustomer.model)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [services, historyCustomer]);

  const addPartToService = (partId: string) => {
    const existing = partsUsed.find(p => p.partId === partId);
    setPartsUsed(existing ? partsUsed.map(p => p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p) : [...partsUsed, { partId, quantity: 1 }]);
  };
  const removePartFromService = (partId: string) => setPartsUsed(partsUsed.filter(p => p.partId !== partId));

  const STATUS_STYLES = {
    Pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
    Ongoing: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', icon: Wrench },
    Completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: CheckCircle2 },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Services</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">{services.length} service records</p>
        </div>
        <div className="flex gap-2">
          {canManageTypes && (
            <Button onClick={() => setTypesOpen(true)} variant="outline" size="sm" className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]">
              <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Service Types
            </Button>
          )}
          <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Service
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${statusFilter === s ? 'bg-[#1C1917] text-white' : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:border-[#E7E5E4] hover:text-[#78716C]'}`}>
            {s} <span className="opacity-50 ml-0.5">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input placeholder="Search customer or motorcycle…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0" />
      </div>

      <div className="space-y-2.5">
        {filtered.map(service => {
          const style = STATUS_STYLES[service.status];
          const StatusIcon = style.icon;
          return (
            <div key={service.id} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-[10px] ${style.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-[18px] h-[18px] ${style.text}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <button onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="text-[13px] font-semibold text-[#44403C] hover:underline text-left">
                      {service.customerName}
                    </button>
                    <p className="text-[12px] text-[#A8A29E]">{service.motorcycleModel} — {service.serviceType}</p>
                    <p className="text-[11px] text-[#D6D3D1] mt-0.5">Labor ₱{service.laborCost.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <select value={service.status} onChange={e => updateService(service.id, { status: e.target.value as 'Pending' | 'Ongoing' | 'Completed' })} className={`h-8 px-3 rounded-lg text-[11px] font-semibold border-0 cursor-pointer focus:outline-none ${style.bg} ${style.text}`}>
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <button title="History" onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="p-2 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors">
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button title="Edit" onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  {canDeleteService && (
                    <button title="Delete" onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#D6D3D1] hover:text-[#EF4444] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              {service.partsUsed.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#FAFAF9] flex flex-wrap gap-1.5">
                  {service.partsUsed.map(pu => {
                    const part = parts.find(p => p.id === pu.partId);
                    return part ? (
                      <span key={pu.partId} className="text-[10px] font-medium text-[#A8A29E] bg-[#FAFAF9] px-2 py-[3px] rounded-md border border-[#F5F5F4]">{part.name} x{pu.quantity}</span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">No service records found</div>}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[20px] border-[#F0EFED] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1"><DialogTitle className="text-[15px] font-semibold">{editing ? 'Edit Service' : 'New Service Record'}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Customer Name</Label>
                <Input {...form.register('customerName')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" placeholder="Juan Dela Cruz" />
                {form.formState.errors.customerName && <p className="text-[10px] text-[#EF4444] mt-1">{form.formState.errors.customerName.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Motorcycle Model</Label>
                <Input {...form.register('motorcycleModel')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" placeholder="Honda Click 150i" />
                {form.formState.errors.motorcycleModel && <p className="text-[10px] text-[#EF4444] mt-1">{form.formState.errors.motorcycleModel.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Service Type</Label>
                <select onChange={e => handleTypeChange(e.target.value)} defaultValue="" className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white">
                  <option value="">Pick from catalog…</option>
                  {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name} (₱{st.defaultLaborCost})</option>)}
                </select>
                <Input {...form.register('serviceType')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" placeholder="Or type custom service" />
                {form.formState.errors.serviceType && <p className="text-[10px] text-[#EF4444] mt-1">{form.formState.errors.serviceType.message}</p>}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Labor Cost (₱)</Label>
                <Input type="number" {...form.register('laborCost', { valueAsNumber: true })} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
                <Label className="text-[11px] font-medium text-[#78716C] mt-3 block">Status</Label>
                <select {...form.register('status')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-medium text-[#78716C]">Notes</Label>
              <Input {...form.register('notes')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" placeholder="Special instructions…" />
            </div>

            <div>
              <Label className="text-[11px] font-medium text-[#78716C]">Parts Used</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {parts.filter(p => p.stock > 0).map(part => (
                  <button type="button" key={part.id} onClick={() => addPartToService(part.id)} className="text-[11px] font-medium bg-[#FAFAF9] hover:bg-[#F5F5F4] text-[#A8A29E] px-2.5 py-[5px] rounded-lg border border-[#F5F5F4] transition-colors">+ {part.name}</button>
                ))}
              </div>
              {partsUsed.length > 0 && (
                <div className="mt-2 space-y-1">
                  {partsUsed.map(pu => {
                    const part = parts.find(p => p.id === pu.partId);
                    return part ? (
                      <div key={pu.partId} className="flex items-center justify-between text-[12px] bg-[#FAFAF9] px-3 py-2 rounded-lg">
                        <span className="text-[#44403C]">{part.name} x{pu.quantity}</span>
                        <button type="button" onClick={() => removePartFromService(pu.partId)} className="text-[#D6D3D1] hover:text-[#EF4444]"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px]">{editing ? 'Save Changes' : 'Create Record'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C]">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service-types manager */}
      <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Service Type Catalog</DialogTitle></DialogHeader>
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {serviceTypes.map(st => (
              <div key={st.id} className="flex items-center gap-2 bg-[#FAFAF9] rounded-lg px-3 py-2">
                <Input
                  defaultValue={st.name}
                  onBlur={e => e.target.value !== st.name && updateServiceType(st.id, { name: e.target.value })}
                  className="flex-1 h-8 text-[12px] rounded-lg border-[#E7E5E4]"
                />
                <Input
                  type="number"
                  defaultValue={st.defaultLaborCost}
                  onBlur={e => Number(e.target.value) !== st.defaultLaborCost && updateServiceType(st.id, { defaultLaborCost: Number(e.target.value) })}
                  className="w-20 h-8 text-[12px] rounded-lg border-[#E7E5E4]"
                />
                <button onClick={() => deleteServiceType(st.id)} className="p-1.5 text-[#D6D3D1] hover:text-[#EF4444]"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <form onSubmit={stForm.handleSubmit(values => { addServiceType(values); stForm.reset({ name: '', defaultLaborCost: 0 }); })} className="flex gap-2 pt-3 mt-3 border-t border-[#F0EFED]">
            <Input {...stForm.register('name')} placeholder="Type name" className="flex-1 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
            <Input type="number" {...stForm.register('defaultLaborCost', { valueAsNumber: true })} placeholder="₱" className="w-24 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
            <Button type="submit" className="h-9 rounded-xl bg-[#1C1917] text-white text-[12px] px-4">Add</Button>
          </form>
        </DialogContent>
      </Dialog>

      {historyCustomer && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setHistoryCustomer(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-[56px] border-b border-[#F0EFED]">
              <div>
                <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide">Service History</p>
                <p className="text-[13px] font-semibold text-[#1C1917]">{historyCustomer.name}</p>
                <p className="text-[10px] text-[#A8A29E]">{historyCustomer.model}</p>
              </div>
              <button onClick={() => setHistoryCustomer(null)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E]"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {customerHistory.length === 0 && <p className="text-[12px] text-[#D6D3D1] text-center py-12">No prior records.</p>}
              <ul className="space-y-2">
                {customerHistory.map(h => (
                  <li key={h.id} className="bg-[#FAFAF9] rounded-xl p-3 border border-[#F5F5F4]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#44403C]">{h.serviceType}</span>
                      <span className={`text-[10px] font-bold px-2 py-[3px] rounded-full ${STATUS_STYLES[h.status].bg} ${STATUS_STYLES[h.status].text}`}>{h.status}</span>
                    </div>
                    <p className="text-[11px] text-[#A8A29E] mt-1">Labor ₱{h.laborCost.toLocaleString()}</p>
                    {h.notes && <p className="text-[11px] text-[#78716C] mt-1">{h.notes}</p>}
                    <p className="text-[10px] text-[#D6D3D1] mt-1 tabular-nums">{new Date(h.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Delete Service?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#A8A29E] mt-1">This will permanently remove this service record.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deleteService(confirmDelete); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
