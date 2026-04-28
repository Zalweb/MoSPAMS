import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Clock, Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import type { ServiceRecord } from '@/shared/types';

type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed';

export default function Services() {
  const { services, parts, addService, updateService, deleteService } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState<{
    customerName: string; motorcycleModel: string; serviceType: string; laborCost: number;
    status: 'Pending' | 'Ongoing' | 'Completed'; notes: string; partsUsed: { partId: string; quantity: number }[];
  }>({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '', partsUsed: [] });

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    return (s.customerName.toLowerCase().includes(q) || s.motorcycleModel.toLowerCase().includes(q)) && (statusFilter === 'All' || s.status === statusFilter);
  });

  const statusCounts = { All: services.length, Pending: services.filter(s => s.status === 'Pending').length, Ongoing: services.filter(s => s.status === 'Ongoing').length, Completed: services.filter(s => s.status === 'Completed').length };

  const openAdd = () => { setEditing(null); setForm({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '', partsUsed: [] }); setModalOpen(true); };
  const openEdit = (s: ServiceRecord) => { setEditing(s); setForm({ customerName: s.customerName, motorcycleModel: s.motorcycleModel, serviceType: s.serviceType, laborCost: s.laborCost, status: s.status, notes: s.notes, partsUsed: s.partsUsed }); setModalOpen(true); };
  const handleSubmit = () => { if (!form.customerName.trim() || !form.serviceType.trim()) return; editing ? updateService(editing.id, form) : addService(form); setModalOpen(false); };

  const addPartToService = (partId: string) => {
    const existing = form.partsUsed.find(p => p.partId === partId);
    existing ? setForm({ ...form, partsUsed: form.partsUsed.map(p => p.partId === partId ? { ...p, quantity: p.quantity + 1 } : p) }) : setForm({ ...form, partsUsed: [...form.partsUsed, { partId, quantity: 1 }] });
  };
  const removePartFromService = (partId: string) => setForm({ ...form, partsUsed: form.partsUsed.filter(p => p.partId !== partId) });

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
        <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Service
        </Button>
      </div>

      {/* Status Pills */}
      <div className="flex gap-1.5 mb-5">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${statusFilter === s ? 'bg-[#1C1917] text-white' : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:border-[#E7E5E4] hover:text-[#78716C]'}`}>
            {s} <span className="opacity-50 ml-0.5">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input placeholder="Search customer or motorcycle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0" />
      </div>

      {/* Service Cards */}
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
                    <p className="text-[13px] font-semibold text-[#44403C]">{service.customerName}</p>
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
                  <button onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-50 text-[#D6D3D1] hover:text-[#EF4444] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[20px] border-[#F0EFED] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1"><DialogTitle className="text-[15px] font-semibold">{editing ? 'Edit Service' : 'New Service Record'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] font-medium text-[#78716C]">Customer Name</Label><Input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="Juan Dela Cruz" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Motorcycle Model</Label><Input value={form.motorcycleModel} onChange={e => setForm({...form, motorcycleModel: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="Honda Click 150i" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px] font-medium text-[#78716C]">Service Type</Label><Input value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="Oil Change" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Labor Cost (₱)</Label><Input type="number" value={form.laborCost} onChange={e => setForm({...form, laborCost: parseInt(e.target.value)||0})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
            </div>
            <div><Label className="text-[11px] font-medium text-[#78716C]">Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="Special instructions..." /></div>

            <div>
              <Label className="text-[11px] font-medium text-[#78716C]">Parts Used</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {parts.filter(p => p.stock > 0).map(part => (
                  <button key={part.id} onClick={() => addPartToService(part.id)} className="text-[11px] font-medium bg-[#FAFAF9] hover:bg-[#F5F5F4] text-[#A8A29E] px-2.5 py-[5px] rounded-lg border border-[#F5F5F4] transition-colors">+ {part.name}</button>
                ))}
              </div>
              {form.partsUsed.length > 0 && (
                <div className="mt-2 space-y-1">
                  {form.partsUsed.map(pu => {
                    const part = parts.find(p => p.id === pu.partId);
                    return part ? (
                      <div key={pu.partId} className="flex items-center justify-between text-[12px] bg-[#FAFAF9] px-3 py-2 rounded-lg">
                        <span className="text-[#44403C]">{part.name} x{pu.quantity}</span>
                        <button onClick={() => removePartFromService(pu.partId)} className="text-[#D6D3D1] hover:text-[#EF4444]"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium">{editing ? 'Save Changes' : 'Create Record'}</Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
