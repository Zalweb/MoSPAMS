import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Wrench, Clock, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';

interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<CustomerService[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Track your motorcycle services and payments</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Pending', count: pending, icon: Clock, color: 'bg-[#FFFBEB] text-[#D97706]' },
          { label: 'Ongoing', count: ongoing, icon: Wrench, color: 'bg-[#EFF6FF] text-[#2563EB]' },
          { label: 'Completed', count: completed, icon: CheckCircle2, color: 'bg-[#ECFDF5] text-[#059669]' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp(i * 0.06 + 0.05)}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#F5F5F4]"
          >
            <div className={`w-8 h-8 rounded-[10px] ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-[14px] h-[14px]" strokeWidth={2} />
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">{s.count}</p>
            <p className="text-[12px] font-medium text-[#A8A29E] mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.25)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/customer/book')}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-left hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1917]">Book a Service</p>
              <p className="text-[11px] text-[#A8A29E] mt-0.5">Schedule your next motorcycle service</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#D6D3D1] group-hover:text-[#1C1917] transition-colors" />
          </div>
        </button>
        <button
          onClick={() => navigate('/customer/history')}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 text-left hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1917]">Service History</p>
              <p className="text-[11px] text-[#A8A29E] mt-0.5">View all past services</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#D6D3D1] group-hover:text-[#1C1917] transition-colors" />
          </div>
        </button>
      </motion.div>

      {/* Recent Services */}
      <motion.div {...fadeUp(0.35)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={2} />
            <h3 className="text-[13px] font-semibold text-[#1C1917]">Recent Services</h3>
          </div>
          <button
            onClick={() => navigate('/customer/history')}
            className="text-[11px] text-[#1C1917] hover:text-[#292524] font-medium"
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-[#FAFAF9]">
          {loading ? (
            <p className="text-[12px] text-[#D6D3D1] py-10 text-center">Loading...</p>
          ) : recentServices.length === 0 ? (
            <p className="text-[12px] text-[#D6D3D1] py-10 text-center">No services yet. Book your first service!</p>
          ) : (
            recentServices.map(service => {
              const style = STATUS_STYLES[service.status];
              return (
                <div key={service.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#44403C] truncate">{service.motorcycleModel}</p>
                    <p className="text-[11px] text-[#A8A29E]">{service.serviceType}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-[3px] rounded-full ml-3 ${style.bg} ${style.text}`}>
                    {service.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
