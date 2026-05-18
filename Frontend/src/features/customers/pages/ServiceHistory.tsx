import { useEffect, useMemo, useState } from 'react';
import { Wrench, Clock, CheckCircle2, Search, XCircle, Calendar, CreditCard, User, Package, Ban, Loader2, AlertTriangle, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { CustomerService } from '@/shared/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import RatingDialog from '@/features/mechanic/components/RatingDialog';

type StatusFilter = 'All' | 'Pending' | 'Confirmed' | 'Ongoing' | 'Work Done' | 'Completed' | 'Cancelled';

const fadeUp = (delay = 0) => ({
 initial: { opacity: 0, y: 16 },
 animate: { opacity: 1, y: 0 },
 transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function ServiceHistory() {
 const [services, setServices] = useState<CustomerService[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
 const [cancellingId, setCancellingId] = useState<string | null>(null);
 const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
 const [requestingCancelId, setRequestingCancelId] = useState<string | null>(null);
 const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
 const [ratingDialog, setRatingDialog] = useState<{ jobId: string; mechanicName: string; serviceType: string } | null>(null);
 const [vehicleFilter, setVehicleFilter] = useState('all');

 useEffect(() => {
 const fetchServices = async () => {
 try {
 const data = await apiGet<{ data: CustomerService[] }>('/api/customer/services');
 setServices(data.data);
 } catch {
 setServices([]);
 } finally {
 setLoading(false);
 }
 };
 void fetchServices();
 }, []);

 const handleCancel = async (id: string) => {
 setConfirmCancelId(null);
 setCancellingId(id);
 try {
 await apiMutation(`/api/customer/services/${id}`, 'DELETE');
 setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'Cancelled', statusCode: 'cancelled' } : s));
 toast.success('Booking cancelled.');
 } catch {
 toast.error('Failed to cancel the booking. Please try again.');
 } finally {
 setCancellingId(null);
 }
 };

 const handleRequestCancel = async (id: string) => {
 setRequestingCancelId(id);
 try {
 await apiMutation(`/api/customer/services/${id}/cancel-request`, 'POST');
 setRequestedIds(prev => new Set(prev).add(id));
 toast.success('Cancellation request sent to the shop.');
 } catch {
 toast.error('Failed to send cancellation request. Please try again.');
 } finally {
 setRequestingCancelId(null);
 }
 };

 const vehicleMap = useMemo(() => {
 const seen = new Map<string, string>();
 services.forEach(s => {
 if (s.vehicleId) seen.set(s.vehicleId, s.motorcycleModel);
 });
 return seen;
 }, [services]);

 const filtered = services.filter(s => {
 const q = search.toLowerCase();
 return (
 (s.motorcycleModel.toLowerCase().includes(q) || s.serviceType.toLowerCase().includes(q)) &&
 (statusFilter === 'All' || s.status === statusFilter) &&
 (vehicleFilter === 'all' || s.vehicleId === vehicleFilter)
 );
 });

 const statusCounts = {
 All: services.length,
 Pending: services.filter(s => s.status === 'Pending').length,
 Confirmed: services.filter(s => s.status === 'Confirmed').length,
 Ongoing: services.filter(s => s.status === 'Ongoing').length,
 'Work Done': services.filter(s => s.status === 'Work Done').length,
 Completed: services.filter(s => s.status === 'Completed').length,
 Cancelled: services.filter(s => s.status === 'Cancelled').length,
 };

 const STATUS_STYLES = {
 Pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock },
 Confirmed: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', icon: CheckCircle2 },
 Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Wrench },
 'Work Done': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: CheckCircle2 },
 Completed: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', icon: CheckCircle2 },
 Cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', icon: Ban },
 };

 return (
 <div className="max-w-4xl mx-auto">
 <motion.div {...fadeUp(0)} className="mb-8">
 <h2 className="text-2xl font-bold text-foreground tracking-tight">Service History</h2>
 <p className="text-sm text-muted-foreground mt-1">View all your motorcycle services</p>
 </motion.div>

 <motion.div {...fadeUp(0.1)} className="flex gap-2 mb-6 flex-wrap">
 {(['All', 'Pending', 'Confirmed', 'Ongoing', 'Work Done', 'Completed', 'Cancelled'] as StatusFilter[]).map(s => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
 statusFilter === s
 ? 'bg-[rgb(var(--color-primary-rgb))] text-white shadow-lg shadow-[rgb(var(--color-primary-rgb))]/20'
 : 'bg-card dark:bg-zinc-900/40 border border-border/50 text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 hover:text-foreground'
 }`}
 >
 {s} <span className="opacity-50 ml-1.5 font-medium">{statusCounts[s]}</span>
 </button>
 ))}
 </motion.div>

 <motion.div {...fadeUp(0.2)} className="relative mb-6">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder="Search by motorcycle model or service type…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-12 h-12 rounded-2xl border-border/50 bg-muted/50 text-sm focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 />
 </motion.div>

 {vehicleMap.size > 0 && (
 <motion.div {...fadeUp(0.25)} className="relative mb-6">
 <select
 value={vehicleFilter}
 onChange={e => setVehicleFilter(e.target.value)}
 className="w-full h-12 pl-5 pr-10 rounded-2xl bg-muted/50 border border-border/50 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
 >
 <option value="all">All Vehicles</option>
 {Array.from(vehicleMap.entries()).map(([id, label]) => (
 <option key={id} value={id}>{label}</option>
 ))}
 </select>
 </motion.div>
 )}

 <div className="space-y-4">
 {loading ? (
 <div className="flex items-center justify-center py-20 brand-card rounded-[32px] border" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <div className="w-8 h-8 border-4 border-muted border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
 </div>
 ) : filtered.length === 0 ? (
 <div className="text-center py-20 brand-card rounded-[32px] border" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 <Wrench className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
 <p className="text-sm font-medium text-muted-foreground">No service records found</p>
 </div>
 ) : (
 filtered.map((service, i) => {
 type StatusKey = 'Pending' | 'Confirmed' | 'Ongoing' | 'Work Done' | 'Completed' | 'Cancelled';
 const statusKey = (service.status as StatusKey) in STATUS_STYLES ? (service.status as StatusKey) : 'Pending';
 const style = STATUS_STYLES[statusKey];
 const StatusIcon = style.icon;
 return (
 <motion.div
 key={service.id}
 {...fadeUp(0.2 + (i * 0.05))}
 className="brand-card rounded-2xl border shadow-sm p-6 transition-all duration-300 group"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
 <div className="flex items-start gap-4">
 <div className={`w-12 h-12 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
 <StatusIcon className={`w-6 h-6 ${style.text}`} strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-lg font-bold text-foreground group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{service.motorcycleModel}</p>
 <p className="text-sm font-semibold text-muted-foreground">{service.serviceType}</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mt-3">
 <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
 <CreditCard className="w-3.5 h-3.5 text-muted-foreground/70" strokeWidth={2} /> Labor Cost: ₱{service.laborCost.toLocaleString()}
 </p>
 {service.mechanics && service.mechanics.length > 0 && (
 <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
 <User className="w-3.5 h-3.5 text-muted-foreground/70" strokeWidth={2} /> Mechanic: {service.mechanics.map(m => m.name).join(', ')}
 </p>
 )}
 {service.partsUsed && service.partsUsed.length > 0 && (
 <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 col-span-full">
 <Package className="w-3.5 h-3.5 text-muted-foreground/70" strokeWidth={2} /> Parts: {service.partsUsed.map(p => `${p.name} x${p.quantity}`).join(', ')}
 </p>
 )}
 </div>
 {service.notes && (
 <div className="mt-4 p-3 rounded-xl brand-card border" style={{ borderColor: 'var(--brand-border)' }}>
 <p className="text-xs italic text-muted-foreground leading-relaxed">"{service.notes}"</p>
 </div>
 )}
 {service.statusCode === 'work_done' && service.totalBill && (
 <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
 <p className="text-xs text-green-400 font-semibold">Service Complete — Ready for Payment</p>
 <p className="text-sm text-foreground font-bold mt-1">Total: ₱{service.totalBill.toLocaleString()}</p>
 <p className="text-xs text-muted-foreground">Please proceed to the counter for payment.</p>
 </div>
 )}
 </div>
 </div>
 <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
 <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${style.bg} ${style.text} border ${style.border}`}>
 {service.status}
 </span>
 <div className="text-right">
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-end gap-1.5">
 <Calendar className="w-3 h-3" />
 {new Date(service.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
 </p>
 {service.statusCode === 'pending' && (
 <button
 onClick={() => setConfirmCancelId(service.id)}
 disabled={cancellingId === service.id}
 className="mt-3 text-[11px] font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 active:scale-95 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {cancellingId === service.id
 ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
 : <XCircle className="w-3.5 h-3.5" />}
 {cancellingId === service.id ? 'Cancelling…' : 'Cancel Request'}
 </button>
 )}
 {service.statusCode === 'booked_confirmed' && (
 requestedIds.has(service.id) ? (
 <span className="mt-3 text-[11px] font-semibold text-amber-500 flex items-center gap-1.5 ml-auto">
 <CheckCircle2 className="w-3.5 h-3.5" /> Request Sent
 </span>
 ) : (
 <button
 onClick={() => handleRequestCancel(service.id)}
 disabled={requestingCancelId === service.id}
 className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-500 transition-colors flex items-center gap-1.5 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 hover:border-amber-500/20 active:scale-95 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {requestingCancelId === service.id
 ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
 : <XCircle className="w-3.5 h-3.5" />}
 {requestingCancelId === service.id ? 'Sending…' : 'Request Cancellation'}
 </button>
 )
 )}
 {(['work_done', 'completed'] as string[]).includes(service.statusCode) && !service.hasRating && service.mechanics.length > 0 && (
 <button
 onClick={() => setRatingDialog({ jobId: service.id, mechanicName: service.mechanics[0].name, serviceType: service.serviceType })}
 className="mt-3 text-[11px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1.5 bg-yellow-500/5 px-3 py-1.5 rounded-lg border border-yellow-500/10 hover:border-yellow-500/20 active:scale-95 ml-auto"
 >
 <Star className="w-3.5 h-3.5" />
 Rate Mechanic
 </button>
 )}
 {(['work_done', 'completed'] as string[]).includes(service.statusCode) && service.hasRating && (
 <span className="mt-3 text-[11px] font-semibold text-green-500 flex items-center gap-1.5 ml-auto">
 <CheckCircle2 className="w-3.5 h-3.5" /> Rated
 </span>
 )}
 </div>
 </div>
 </div>
 </motion.div>
 );
 })
 )}
 </div>

 {/* Rating dialog */}
 {ratingDialog && (
 <RatingDialog
 jobId={ratingDialog.jobId}
 mechanicName={ratingDialog.mechanicName}
 serviceType={ratingDialog.serviceType}
 isOpen={true}
 onClose={() => setRatingDialog(null)}
 onSubmit={() => {
 setServices(prev => prev.map(s => s.id === ratingDialog.jobId ? { ...s, hasRating: true } : s));
 setRatingDialog(null);
 }}
 />
 )}

 {/* Cancel confirmation modal */}
 <AnimatePresence>
 {confirmCancelId && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="absolute inset-0 bg-background/60 "
 onClick={() => setConfirmCancelId(null)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="relative w-full max-w-sm bg-card dark:bg-zinc-950 rounded-[28px] border border-border/50 shadow-2xl p-8 text-center"
 >
 <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
 <AlertTriangle className="w-6 h-6 text-red-400" />
 </div>
 <h3 className="text-lg font-bold text-foreground mb-1">Cancel Booking?</h3>
 <p className="text-sm text-muted-foreground mb-6">This will cancel your service request. This action cannot be undone.</p>
 <div className="flex gap-3">
 <Button
 variant="ghost"
 onClick={() => setConfirmCancelId(null)}
 className="flex-1 h-11 rounded-2xl font-bold text-muted-foreground hover:bg-muted"
 >
 Keep
 </Button>
 <Button
 onClick={() => handleCancel(confirmCancelId)}
 className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
 >
 Yes, Cancel
 </Button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}
