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
 const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
 setDeleteConfirmId(null);
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
 <h2 className="text-2xl font-bold text-foreground tracking-tight">My Garage</h2>
 <p className="text-sm text-muted-foreground mt-1">Manage your saved motorcycles</p>
 </div>
 <Button
 onClick={openAdd}
 className="flex items-center gap-2 h-10 rounded-xl font-semibold px-5 shadow-lg transition-all"
 style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
 >
 <Plus className="w-4 h-4" /> Add Vehicle
 </Button>
 </motion.div>

 {/* Vehicle list */}
 <div className="space-y-4">
 {loading ? (
 <div className="flex items-center justify-center py-16">
 <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
 </div>
 ) : vehicles.length === 0 ? (
 <motion.div {...fadeUp(0.1)} className="flex flex-col items-center justify-center py-20 brand-card rounded-[32px] border shadow-xl" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
 <Bike className="w-10 h-10 text-primary" />
 </div>
 <p className="text-base font-semibold text-foreground">No vehicles yet</p>
 <p className="text-sm text-muted-foreground mt-1">Add your motorcycle to book services faster.</p>
 <button onClick={openAdd} className="mt-6 text-sm font-bold text-[rgb(var(--color-primary-rgb))] hover:underline underline-offset-4">
 Add your first vehicle
 </button>
 </motion.div>
 ) : (
 vehicles.map((v, i) => (
 <motion.div key={v.id} {...fadeUp(i * 0.06)}>
 <div className="brand-card rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-4 group transition-all duration-300" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <div className="flex items-center gap-4">
 <div className="brand-icon-box w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
 <Bike className="w-6 h-6" strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-base font-bold text-foreground group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">
 {v.year ? `${v.year} ` : ''}{v.make} {v.model}
 </p>
 {v.plate_number && (
 <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">Plate: {v.plate_number}</p>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => openEdit(v)}
 className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-90"
 title="Edit Profile"
 >
 <Pencil className="w-4 h-4" />
 </button>
 <button
 onClick={() => setDeleteConfirmId(v.id)}
 disabled={deletingId === v.id}
 className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all active:scale-90 disabled:opacity-40"
 title="Remove Vehicle"
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

 {/* Delete confirmation */}
 <AnimatePresence>
 {deleteConfirmId && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="absolute inset-0 bg-background/60 "
 onClick={() => setDeleteConfirmId(null)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="relative w-full max-w-sm bg-card dark:bg-zinc-950 rounded-[28px] border border-border/50 shadow-2xl p-8 text-center"
 >
 <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
 <Trash2 className="w-6 h-6 text-red-400" />
 </div>
 <h3 className="text-lg font-bold text-foreground mb-1">Remove Vehicle?</h3>
 <p className="text-sm text-muted-foreground mb-6">This vehicle will be removed from your garage.</p>
 <div className="flex gap-3">
 <Button
 variant="ghost"
 onClick={() => setDeleteConfirmId(null)}
 className="flex-1 h-11 rounded-2xl font-bold text-muted-foreground hover:bg-muted"
 >
 Keep
 </Button>
 <Button
 onClick={() => handleDelete(deleteConfirmId)}
 className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
 >
 Remove
 </Button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Add / Edit modal */}
 <AnimatePresence>
 {showForm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="absolute inset-0 bg-background/60 "
 onClick={closeForm}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="relative w-full max-w-md bg-card dark:bg-zinc-950 rounded-[32px] border border-border/50 shadow-2xl overflow-hidden"
 >
 <div className="px-8 py-6 bg-gradient-to-r from-[rgb(var(--color-primary-rgb))]/10 to-[rgb(var(--color-secondary-rgb))]/10 border-b border-border/50 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
 <Bike className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
 </div>
 <div>
 <h3 className="text-lg font-bold text-foreground">
 {editingId ? 'Edit Vehicle' : 'Add Vehicle'}
 </h3>
 <p className="text-xs text-muted-foreground">Garage management</p>
 </div>
 </div>
 <button onClick={closeForm} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-8 space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Make *</Label>
 <Input
 value={form.make}
 onChange={e => setForm({ ...form, make: e.target.value })}
 placeholder="e.g. Honda"
 className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 required
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Model *</Label>
 <Input
 value={form.model}
 onChange={e => setForm({ ...form, model: e.target.value })}
 placeholder="e.g. Click 150i"
 className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 required
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Year</Label>
 <Input
 value={form.year}
 onChange={e => setForm({ ...form, year: e.target.value })}
 placeholder="e.g. 2022"
 className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Plate Number</Label>
 <Input
 value={form.plate_number}
 onChange={e => setForm({ ...form, plate_number: e.target.value })}
 placeholder="e.g. ABC 1234"
 className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 />
 </div>
 </div>
 <div className="pt-4 flex gap-3">
 <Button
 type="submit"
 disabled={submitting}
 className="flex-1 h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-50"
 style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
 >
 {submitting
 ? <Loader2 className="w-5 h-5 animate-spin" />
 : <><CheckCircle2 className="w-5 h-5 mr-2" />{editingId ? 'Save Changes' : 'Confirm Vehicle'}</>}
 </Button>
 <Button type="button" onClick={closeForm} variant="ghost" className="h-12 rounded-2xl px-6 font-bold text-muted-foreground hover:bg-muted transition-all">
 Cancel
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
