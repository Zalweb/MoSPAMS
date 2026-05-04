import { useEffect, useState } from 'react';
import { FileText, Calendar, DollarSign, Filter, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSubscriptionPayments, type SubscriptionPayment } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

const CURRENCY_PREFIX = '\u20b1';

export default function PaymentsHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [filter, setFilter] = useState<'all' | 'PAID' | 'PENDING' | 'FAILED'>('all');

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const response = await getSubscriptionPayments();
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to load payments', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.paymentStatus === filter);

  const totalPaid = payments
    .filter(p => p.paymentStatus === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.paymentStatus === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Payments History</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Track all subscription payments</p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" strokeWidth={2} />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Paid</p>
              <p className="text-xl font-bold text-white">{CURRENCY_PREFIX}{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pending</p>
              <p className="text-xl font-bold text-white">{CURRENCY_PREFIX}{totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Total Payments</p>
              <p className="text-xl font-bold text-white">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={2} />
        {['all', 'PAID', 'PENDING', 'FAILED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === status
                ? 'bg-white text-black'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
            <h3 className="text-lg font-semibold text-white mb-2">No Payments Found</h3>
            <p className="text-zinc-400">
              {filter === 'all' ? 'No payment records available' : `No ${filter.toLowerCase()} payments`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Shop
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Paid Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <motion.tr
                    key={payment.subscriptionPaymentId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      #{payment.subscriptionPaymentId}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {payment.shopName || `Shop #${payment.shopId}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">
                      {CURRENCY_PREFIX}{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {payment.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={payment.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {payment.dueAt ? new Date(payment.dueAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    REFUNDED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const style = styles[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${style}`}>
      {status}
    </span>
  );
}
