import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Search, Filter, Download } from 'lucide-react';
import type { Transaction } from '@/shared/types/shop';

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}

export function TransactionTable({ transactions, loading }: TransactionTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative group"
    >
      <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Transaction History</h3>
            <p className="text-sm text-zinc-400">Recent financial activity</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-zinc-700 border-t-[rgb(var(--color-primary-rgb))] rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <p>No transactions yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="hover:bg-zinc-800/20 transition-colors group/row"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-400 tabular-nums">
                        {new Date(transaction.date).toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{transaction.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'income' ? (
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                        <span className="text-sm text-zinc-400 capitalize">{transaction.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">{transaction.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${
                        transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₱{transaction.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors opacity-0 group-hover/row:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </motion.div>
  );
}
