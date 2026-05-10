import { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle2, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { CustomerService } from '@/shared/types';

type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed';

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
    Pending: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', icon: Clock },
    Ongoing: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', icon: Wrench },
    Completed: { bg: 'bg-[#ECFDF5]', text: 'text-[#059669]', icon: CheckCircle2 },
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Service History</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">View all your motorcycle services</p>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['All', 'Pending', 'Ongoing', 'Completed'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-[7px] rounded-full text-[12px] font-medium whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-[#1C1917] text-foreground'
                : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:border-[#E7E5E4] hover:text-[#78716C]'
            }`}
          >
            {s} <span className="opacity-50 ml-0.5">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input
          placeholder="Search motorcycle or service type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0"
        />
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-[13px] text-[#D6D3D1] bg-white rounded-2xl border border-[#F5F5F4]">
            No service records found
          </div>
        ) : (
          filtered.map(service => {
            type StatusKey = 'Pending' | 'Ongoing' | 'Completed';
            const statusKey = (service.status as StatusKey) in STATUS_STYLES ? (service.status as StatusKey) : 'Pending';
            const style = STATUS_STYLES[statusKey];
            const StatusIcon = style.icon;
            return (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-[10px] ${style.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-[18px] h-[18px] ${style.text}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#44403C]">{service.motorcycleModel}</p>
                      <p className="text-[12px] text-[#A8A29E]">{service.serviceType}</p>
                      <p className="text-[11px] text-[#D6D3D1] mt-0.5">Labor ₱{service.laborCost.toLocaleString()}</p>
                      {service.mechanics && service.mechanics.length > 0 && (
                        <p className="text-[11px] text-[#A8A29E] mt-0.5">Mechanic: {service.mechanics.map(m => m.name).join(', ')}</p>
                      )}
                      {service.partsUsed && service.partsUsed.length > 0 && (
                        <p className="text-[11px] text-[#A8A29E] mt-0.5">Parts: {service.partsUsed.map(p => `${p.name} x${p.quantity}`).join(', ')}</p>
                      )}
                      {service.notes && (
                        <p className="text-[11px] text-[#78716C] mt-1">{service.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-semibold px-2.5 py-[3px] rounded-full ${style.bg} ${style.text}`}>
                      {service.status}
                    </span>
                    {service.status === 'Pending' && (
                      <button
                        onClick={() => handleCancel(service.id)}
                        className="block mt-2 ml-auto text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                    <p className="text-[10px] text-[#D6D3D1] mt-2">
                      {new Date(service.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
