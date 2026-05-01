import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/shared/lib/api';

interface Payment {
  id: string;
  type: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await apiGet<{ data: Payment[] }>('/api/customer/payments');
        setPayments(data.data);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchPayments();
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (
      p.paymentMethod.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.total.toString().includes(q)
    );
  });

  const totalSpent = payments.reduce((sum, p) => sum + p.total, 0);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Payments</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">View your payment history</p>
      </div>

      {/* Total Spent Card */}
      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center">
            <CreditCard className="w-[18px] h-[18px] text-[#3B82F6]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A8A29E]">Total Spent</p>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">
              ₱{totalSpent.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input
          placeholder="Search payments…"
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
            No payment records found
          </div>
        ) : (
          filtered.map(payment => (
            <div
              key={payment.id}
              className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-[#F5F3FF] flex items-center justify-center">
                    <CreditCard className="w-[18px] h-[18px] text-[#8B5CF6]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#44403C]">{payment.type}</p>
                    <p className="text-[11px] text-[#A8A29E]">{payment.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#1C1917]">₱{payment.total.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[#D6D3D1] mt-0.5">
                    <Calendar className="w-3 h-3" strokeWidth={1.5} />
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
