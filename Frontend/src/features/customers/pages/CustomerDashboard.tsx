import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Calendar, ArrowRight, XCircle, Ban, Loader2 } from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { toast } from 'sonner';

import type { CustomerService } from '@/shared/types';

const fadeUp = (delay = 0) => ({
 initial: { opacity: 0, y: 20 },
 animate: { opacity: 1, y: 0 },
 transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function CustomerDashboard() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const [services, setServices] = useState<CustomerService[]>([]);
 const [loading, setLoading] = useState(true);
 const [cancellingId, setCancellingId] = useState<string | null>(null);

 useEffect(() => {
 let active = true;

 const fetchServices = async (showLoader = false) => {
 if (showLoader) {
 setLoading(true);
 }

 try {
 const data = await apiGet<{ data: CustomerService[] }>('/api/customer/services');
 if (active) {
 setServices(data.data);
 }
 } catch {
 if (active) {
 setServices([]);
 }
 } finally {
 if (active && showLoader) {
 setLoading(false);
 }
 }
 };

 void fetchServices(true);
 const intervalId = window.setInterval(() => void fetchServices(), 3000);

 return () => {
 active = false;
 window.clearInterval(intervalId);
 };
 }, []);

 const handleCancel = async (id: string) => {
 if (!window.confirm('Are you sure you want to cancel this booking?')) return;
 setCancellingId(id);
 try {
 await apiMutation(`/api/customer/services/${id}`, 'DELETE');
 setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'Cancelled' } : s));
 toast.success('Booking cancelled.');
 } catch {
 toast.error('Failed to cancel the booking. Please try again.');
 } finally {
 setCancellingId(null);
 }
 };

 const pending = services.filter(s => s.statusCode === 'pending' || s.statusCode === 'booked_confirmed').length;
 const ongoing = services.filter(s => s.statusCode === 'in_progress' || s.statusCode === 'work_done').length;
 const completed = services.filter(s => s.statusCode === 'completed').length;

 const recentServices = services.slice(0, 3);

 const STATUS_STYLES = {
 Pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock },
 Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Wrench },
 Completed: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', icon: CheckCircle2 },
 Cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', icon: Ban },
 };

 return (
 <div className="space-y-8 pb-10">
 {/* Header */}
 <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/10 via-transparent to-[rgb(var(--color-secondary-rgb))]/5 p-8 border border-border/50">
 <div className="relative z-10">
 <h1 className="text-3xl font-bold text-foreground tracking-tight">
 Hello, {user?.name?.split(' ')[0]}!
 </h1>
 <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
 Welcome back to your personalized service hub. You can track your motorcycle's health and manage bookings here.
 </p>
 </div>
 <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/10 to-transparent -mr-20 -mt-20 opacity-50" />
 </motion.div>

 {/* Stats Row */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {[
 { label: 'Pending Bookings', count: pending, icon: Clock },
 { label: 'Ongoing Services', count: ongoing, icon: Wrench },
 { label: 'Completed Jobs', count: completed, icon: CheckCircle2 },
 ].map((s, i) => (
 <motion.div
 key={s.label}
 {...fadeUp(i * 0.05 + 0.1)}
 className="brand-card rounded-3xl p-6 border"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="brand-icon-box w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
 <s.icon className="w-6 h-6" strokeWidth={2} />
 </div>
 <p className="text-3xl font-bold text-foreground tracking-tight leading-none">{s.count}</p>
 <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{s.label}</p>
 </motion.div>
 ))}
 </div>

 {/* Quick Actions */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <motion.button
 {...fadeUp(0.3)}
 onClick={() => navigate('book')}
 className="relative overflow-hidden brand-card rounded-[28px] border p-6 text-left hover:shadow-xl transition-all duration-500 group"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="flex items-center justify-between relative z-10">
 <div>
 <div className="brand-icon-box w-10 h-10 rounded-xl flex items-center justify-center mb-3">
 <Calendar className="w-5 h-5" strokeWidth={2} />
 </div>
 <p className="text-lg font-bold text-foreground">Book a Service</p>
 <p className="text-xs text-muted-foreground mt-1">Schedule your next maintenance visit</p>
 </div>
 <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
 <ArrowRight className="w-4 h-4 text-muted-foreground" />
 </div>
 </div>
 <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 </motion.button>

 <motion.button
 {...fadeUp(0.35)}
 onClick={() => navigate('history')}
 className="relative overflow-hidden brand-card rounded-[28px] border p-6 text-left hover:shadow-xl transition-all duration-500 group"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="flex items-center justify-between relative z-10">
 <div>
 <div className="brand-icon-box w-10 h-10 rounded-xl flex items-center justify-center mb-3">
 <Clock className="w-5 h-5" strokeWidth={2} />
 </div>
 <p className="text-lg font-bold text-foreground">Service History</p>
 <p className="text-xs text-muted-foreground mt-1">View your full maintenance records</p>
 </div>
 <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
 <ArrowRight className="w-4 h-4 text-muted-foreground" />
 </div>
 </div>
 <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-secondary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 </motion.button>
 </div>

 {/* Recent Services */}
 <motion.div
 {...fadeUp(0.45)}
 className="brand-card rounded-[32px] border overflow-hidden shadow-xl"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--brand-border)' }}>
 <div className="flex items-center gap-3">
 <div className="brand-icon-box w-8 h-8 rounded-lg flex items-center justify-center">
 <Calendar className="w-4 h-4" strokeWidth={2} />
 </div>
 <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
 </div>
 <button
 onClick={() => navigate('history')}
 className="text-xs font-bold text-[rgb(var(--color-primary-rgb))] hover:underline underline-offset-4"
 >
 View Full History
 </button>
 </div>

 <div className="divide-y" style={{ borderColor: 'var(--brand-border)' }}>
 {loading ? (
 <div className="py-20 flex flex-col items-center gap-4">
 <div className="w-8 h-8 border-2 border-[rgb(var(--color-primary-rgb))] border-t-transparent rounded-full animate-spin" />
 <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Synchronizing records...</p>
 </div>
 ) : recentServices.length === 0 ? (
 <div className="py-20 text-center">
 <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
 <Calendar className="w-8 h-8 text-muted-foreground/30" />
 </div>
 <p className="text-sm font-semibold text-foreground">No recent services</p>
 <p className="text-xs text-muted-foreground mt-1">Book your first service to get started.</p>
 </div>
 ) : (
 recentServices.map((service, i) => {
 type StatusKey = 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled';
 const statusKey: StatusKey =
 (service.statusCode === 'pending' || service.statusCode === 'booked_confirmed') ? 'Pending' :
 (service.statusCode === 'in_progress' || service.statusCode === 'work_done') ? 'Ongoing' :
 service.statusCode === 'completed' ? 'Completed' : 'Cancelled';
 const style = STATUS_STYLES[statusKey];
 const Icon = style.icon;

 return (
 <motion.div
 key={service.id}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.5 + i * 0.05 }}
 className="flex items-center justify-between px-8 py-5 hover:bg-white/5 dark:hover:bg-white/5 transition-colors group"
 >
 <div className="flex items-center gap-5 min-w-0 flex-1">
 <div className={`w-12 h-12 rounded-2xl ${style.bg} ${style.border} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
 <Icon className={`w-5 h-5 ${style.text}`} strokeWidth={2} />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-bold text-foreground truncate group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">
 {service.motorcycleModel}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter brand-card border px-2 py-0.5 rounded-md" style={{ borderColor: 'var(--brand-border)' }}>
 {service.serviceType}
 </span>
 {service.mechanics && service.mechanics.length > 0 && (
 <span className="text-[10px] font-medium text-muted-foreground">
 • {service.mechanics[0].name}
 </span>
 )}
 </div>
 </div>
 </div>
 
 <div className="text-right flex flex-col items-end gap-2">
 <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${style.bg} ${style.text} border ${style.border}`}>
 {statusKey}
 </span>
 {service.statusCode === 'pending' && (
 <button
 onClick={() => handleCancel(service.id)}
 disabled={cancellingId === service.id}
 className="text-[10px] font-bold text-red-500/70 hover:text-red-500 uppercase tracking-tighter flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {cancellingId === service.id
 ? <Loader2 className="w-3 h-3 animate-spin" />
 : <XCircle className="w-3 h-3" />}
 {cancellingId === service.id ? 'Cancelling…' : 'Cancel'}
 </button>
 )}
 </div>
 </motion.div>
 );
 })
 )}
 </div>
 </motion.div>
 </div>
 );
}
