import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, Plus, Pencil, Trash2, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  plate_number: string;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

const EMPTY_FORM = { make: '', model: '', year: '', plate_number: '' };

export default function CustomerVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      const data = await apiGet<{ data: Vehicle[] }>('/api/customer/vehicles');
      setVehicles(data.data);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchVehicles(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (v: Vehicle) => { setForm({ make: v.make, model: v.model, year: v.year, plate_number: v.plate_number }); setEditingId(v.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.make.trim() || !form.model.trim()) { toast.error('Make and Model are required.'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await apiMutation(`/api/customer/vehicles/${editingId}`, 'PATCH', form);
        toast.success('Vehicle updated!');
      } else {
        await apiMutation('/api/customer/vehicles', 'POST', form);
        toast.success('Vehicle added!');
      }
      closeForm();
      void fetchVehicles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this vehicle from your garage?')) return;
    setDeletingId(id);
    try {
      await apiMutation(`/api/customer/vehicles/${id}`, 'DELETE');
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Vehicle removed.');
    } catch {
      toast.error('Failed to remove vehicle.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">My Garage</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">Manage your saved motorcycles</p>
        </div>
        <Button
          onClick={openAdd}
          className="flex items-center gap-2 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[13px] font-medium px-4"
        >
          <Plus className="w-4 h-4" /> Add Vehicle
        </Button>
      </motion.div>

      {/* Vehicle list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#D6D3D1] animate-spin" />
          </div>
        ) : vehicles.length === 0 ? (
          <motion.div {...fadeUp(0.1)} className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#F5F5F4]">
            <div className="w-14 h-14 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-4">
              <Bike className="w-7 h-7 text-[#D6D3D1]" />
            </div>
            <p className="text-[13px] font-semibold text-[#78716C]">No vehicles yet</p>
            <p className="text-[12px] text-[#A8A29E] mt-1">Add your motorcycle to book services faster.</p>
            <button onClick={openAdd} className="mt-4 text-[12px] font-medium text-[#1C1917] underline underline-offset-2">
              Add your first vehicle
            </button>
          </motion.div>
        ) : (
          vehicles.map((v, i) => (
            <motion.div key={v.id} {...fadeUp(i * 0.06)}>
              <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 flex items-center justify-between gap-4 hover:border-[#E7E5E4] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F4] flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-[#78716C]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1C1917]">
                      {v.year ? `${v.year} ` : ''}{v.make} {v.model}
                    </p>
                    {v.plate_number && (
                      <p className="text-[11px] text-[#A8A29E] mt-0.5">Plate: {v.plate_number}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(v)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {deletingId === v.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[#F5F5F4] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F4] flex items-center justify-center">
                    <Bike className="w-5 h-5 text-[#78716C]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1C1917]">
                    {editingId ? 'Edit Vehicle' : 'Add Vehicle'}
                  </h3>
                </div>
                <button onClick={closeForm} className="p-2 text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Make *</Label>
                    <Input
                      value={form.make}
                      onChange={e => setForm({ ...form, make: e.target.value })}
                      placeholder="e.g. Honda"
                      className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Model *</Label>
                    <Input
                      value={form.model}
                      onChange={e => setForm({ ...form, model: e.target.value })}
                      placeholder="e.g. Click 150i"
                      className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Year</Label>
                    <Input
                      value={form.year}
                      onChange={e => setForm({ ...form, year: e.target.value })}
                      placeholder="e.g. 2022"
                      className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Plate Number</Label>
                    <Input
                      value={form.plate_number}
                      onChange={e => setForm({ ...form, plate_number: e.target.value })}
                      placeholder="e.g. ABC 1234"
                      className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                    />
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button type="button" onClick={closeForm} variant="outline" className="flex-1 h-10 rounded-xl border-[#E7E5E4] text-[13px]">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[13px] font-medium disabled:opacity-50"
                  >
                    {submitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><CheckCircle2 className="w-4 h-4 mr-1.5" />{editingId ? 'Save Changes' : 'Add Vehicle'}</>}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
