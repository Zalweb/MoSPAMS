import { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle2, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { CustomerService } from '@/shared/types';
import { motion } from 'framer-motion';

type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed';

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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await apiMutation(`/api/customer/services/${id}`, 'DELETE');
      setServices(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to cancel the booking. Please try again.');
    }
  };

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.motorcycleModel.toLowerCase().includes(q) || s.serviceType.toLowerCase().includes(q)) &&
      (statusFilter === 'All' || s.status === statusFilter)
    );
  });

  const statusCounts = {
    All: services.length,
    Pending: services.filter(s => s.status === 'Pending').length,
    Ongoing: services.filter(s => s.status === 'Ongoing').length,
    Completed: services.filter(s => s.status === 'Completed').length,
  };

  const STATUS_STYLES = {
    Pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock },
    Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Wrench },
    Completed: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', icon: CheckCircle2 },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Service History</h2>
        <p className="text-sm text-muted-foreground mt-1">View all your motorcycle services</p>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex gap-2 mb-6 flex-wrap">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-[rgb(var(--color-primary-rgb))] text-white shadow-lg shadow-[rgb(var(--color-primary-rgb))]/20'
                : 'bg-card dark:bg-zinc-900/40 border border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
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

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50">
            <div className="w-8 h-8 border-4 border-muted border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50">
            <Wrench className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No service records found</p>
          </div>
        ) : (
          filtered.map((service, i) => {
            type StatusKey = 'Pending' | 'Ongoing' | 'Completed';
            const statusKey = (service.status as StatusKey) in STATUS_STYLES ? (service.status as StatusKey) : 'Pending';
            const style = STATUS_STYLES[statusKey];
            const StatusIcon = style.icon;
            return (
              <motion.div
                key={service.id}
                {...fadeUp(0.2 + (i * 0.05))}
                className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-border/50 shadow-sm p-6 hover:border-[rgb(var(--color-primary-rgb))]/30 transition-all duration-300 group"
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
                          <span className="w-1.5 h-1.5 rounded-full bg-border" /> Labor Cost: ₱{service.laborCost.toLocaleString()}
                        </p>
                        {service.mechanics && service.mechanics.length > 0 && (
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-border" /> Mechanic: {service.mechanics.map(m => m.name).join(', ')}
                          </p>
                        )}
                        {service.partsUsed && service.partsUsed.length > 0 && (
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2 col-span-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-border" /> Parts: {service.partsUsed.map(p => `${p.name} x${p.quantity}`).join(', ')}
                          </p>
                        )}
                      </div>
                      {service.notes && (
                        <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                          <p className="text-xs italic text-muted-foreground leading-relaxed">"{service.notes}"</p>
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
                      {service.status === 'Pending' && (
                        <button
                          onClick={() => handleCancel(service.id)}
                          className="mt-3 text-[11px] font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 active:scale-95 ml-auto"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
