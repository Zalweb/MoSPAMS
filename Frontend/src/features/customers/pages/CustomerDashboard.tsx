import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Calendar, ArrowRight, XCircle } from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';

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
    const intervalId = window.setInterval(() => void fetchServices(), 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
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

  const pending = services.filter(s => s.status === 'Pending').length;
  const ongoing = services.filter(s => s.status === 'Ongoing').length;
  const completed = services.filter(s => s.status === 'Completed').length;

  const recentServices = services.slice(0, 3);

  const STATUS_STYLES = {
    Pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
    Ongoing: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', icon: Wrench },
    Completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: CheckCircle2 },
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/10 to-transparent blur-3xl -mr-20 -mt-20 opacity-50" />
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Bookings', count: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Ongoing Services', count: ongoing, icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Completed Jobs', count: completed, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp(i * 0.05 + 0.1)}
            className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-3xl p-6 border border-border/50 shadow-sm group hover:border-[rgb(var(--color-primary-rgb))]/30 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <s.icon className={`w-6 h-6 ${s.color}`} strokeWidth={2} />
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
          className="relative overflow-hidden bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[28px] border border-border/50 p-6 text-left hover:border-[rgb(var(--color-primary-rgb))]/50 hover:shadow-xl transition-all duration-500 group"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary-rgb))]/10 flex items-center justify-center mb-3 group-hover:bg-[rgb(var(--color-primary-rgb))] transition-colors">
                <Calendar className="w-5 h-5 text-[rgb(var(--color-primary-rgb))] group-hover:text-white transition-colors" />
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
          className="relative overflow-hidden bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[28px] border border-border/50 p-6 text-left hover:border-[rgb(var(--color-secondary-rgb))]/50 hover:shadow-xl transition-all duration-500 group"
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-secondary-rgb))]/10 flex items-center justify-center mb-3 group-hover:bg-[rgb(var(--color-secondary-rgb))] transition-colors">
                <Clock className="w-5 h-5 text-[rgb(var(--color-secondary-rgb))] group-hover:text-white transition-colors" />
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
        className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50 shadow-xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgb(var(--color-primary-rgb))]/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[rgb(var(--color-primary-rgb))]" strokeWidth={2} />
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
        
        <div className="divide-y divide-border/50">
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
              type StatusKey = 'Pending' | 'Ongoing' | 'Completed';
              const statusKey = (service.status as StatusKey) in STATUS_STYLES ? (service.status as StatusKey) : 'Pending';
              const style = STATUS_STYLES[statusKey];
              const Icon = style.icon;
              
              return (
                <motion.div 
                  key={service.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center justify-between px-8 py-5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-2xl ${style.bg.replace('[#FFFBEB]', 'amber-500/10').replace('[#EFF6FF]', 'blue-500/10').replace('[#ECFDF5]', 'green-500/10')} flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-5 h-5 ${style.text.replace('[#D97706]', 'amber-500').replace('[#2563EB]', 'blue-500').replace('[#059669]', 'green-500')}`} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">
                        {service.motorcycleModel}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter bg-muted px-2 py-0.5 rounded-md">
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
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${style.bg.replace('[#FFFBEB]', 'amber-500/10').replace('[#EFF6FF]', 'blue-500/10').replace('[#ECFDF5]', 'green-500/10')} ${style.text.replace('[#D97706]', 'amber-500').replace('[#2563EB]', 'blue-500').replace('[#059669]', 'green-500')} border border-border/50`}>
                      {service.status}
                    </span>
                    {service.status === 'Pending' && (
                      <button
                        onClick={() => handleCancel(service.id)}
                        className="text-[10px] font-bold text-red-500/70 hover:text-red-500 uppercase tracking-tighter flex items-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel
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
