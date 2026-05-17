import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/shared/lib/api';
import InvoiceModal from '../components/InvoiceModal';
import { motion } from 'framer-motion';

interface Payment {
  id: string;
  type: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

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
    <div className="max-w-4xl mx-auto">
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Payments</h2>
        <p className="text-sm text-muted-foreground mt-1">View your payment history</p>
      </motion.div>

      {/* Total Spent Card */}
      <motion.div
        {...fadeUp(0.1)}
        className="brand-card backdrop-blur-xl rounded-[32px] border shadow-xl p-8 mb-8"
        style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[20px] bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <CreditCard className="w-8 h-8 text-blue-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Investment</p>
            <p className="text-4xl font-bold text-foreground tracking-tight mt-1">
              ₱{totalSpent.toLocaleString()}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search payments by method or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 rounded-2xl border-border/50 bg-muted/50 text-sm focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
        />
      </motion.div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 brand-card backdrop-blur-xl rounded-[32px] border" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
            <div className="w-8 h-8 border-4 border-muted border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 brand-card backdrop-blur-xl rounded-[32px] border" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
            <CreditCard className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">No payment records found</p>
          </div>
        ) : (
          filtered.map((payment, i) => (
            <motion.button
              key={payment.id}
              {...fadeUp(0.2 + (i * 0.05))}
              onClick={() => setSelectedPaymentId(payment.id)}
              className="w-full text-left brand-card backdrop-blur-xl rounded-2xl border shadow-sm p-5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 group"
              style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                    <CreditCard className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground group-hover:text-[rgb(var(--color-primary-rgb))] transition-colors">{payment.type}</p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">{payment.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">₱{payment.total.toLocaleString()}</p>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                    {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {selectedPaymentId && (
        <InvoiceModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}
