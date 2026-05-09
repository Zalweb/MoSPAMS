import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, CreditCard, Receipt, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '@/shared/lib/api';

const CURRENCY_PREFIX = '\u20b1';

export default function RevenueReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet('/api/superadmin/revenue-reports').then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  const d = data;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Revenue Reports</h1><p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Detailed revenue analytics and reports</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={`${CURRENCY_PREFIX}${(d?.summary?.totalRevenue ?? 0).toLocaleString()}`} color="emerald" />
        <StatCard icon={Receipt} label="Sales Revenue" value={`${CURRENCY_PREFIX}${(d?.summary?.totalSales ?? 0).toLocaleString()}`} color="blue" />
        <StatCard icon={CreditCard} label="Subscriptions" value={`${CURRENCY_PREFIX}${(d?.summary?.totalSubscriptions ?? 0).toLocaleString()}`} color="amber" />
        <StatCard icon={BarChart3} label="Transactions" value={(d?.summary?.totalTransactions ?? 0).toLocaleString()} color="zinc" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSection title="Monthly Sales Revenue" data={d?.monthlySales} dataKey="total" />
        <ChartSection title="Monthly Subscription Revenue" data={d?.monthlySubscriptions} dataKey="total" />
      </div>
      {d?.byPaymentMethod?.length > 0 && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-[16px] font-bold text-white mb-4">By Payment Method</h2>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase"><th className="pb-3 pr-4">Method</th><th className="pb-3 px-4">Count</th><th className="pb-3 pl-4 text-right">Total</th></tr></thead><tbody>{d.byPaymentMethod.map((m: any) => <tr key={m.method} className="border-b border-zinc-800/50"><td className="py-3 pr-4 text-white">{m.method}</td><td className="py-3 px-4 text-zinc-400">{m.count}</td><td className="py-3 pl-4 text-right text-white font-semibold">{CURRENCY_PREFIX}{m.total.toLocaleString()}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = { emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', zinc: 'bg-zinc-800 border-zinc-700 text-white' };
  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}><Icon className="w-5 h-5" /></div><div><p className="text-xs text-zinc-500">{label}</p><p className="text-xl font-bold text-white">{value}</p></div></div>
    </div>
  );
}

function ChartSection({ title, data, dataKey }: any) {
  if (!data?.length) return <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6"><h2 className="text-[16px] font-bold text-white mb-4">{title}</h2><p className="text-zinc-500 text-sm text-center py-12">No data available</p></div>;
  const maxVal = Math.max(...data.map((d: any) => d[dataKey]), 1);
  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6"><h2 className="text-[16px] font-bold text-white mb-4">{title}</h2>
      <div className="h-[200px] flex items-end gap-[2px]">{data.map((d: any, i: number) => <div key={i} className="flex-1 min-w-[8px] relative group" style={{ height: '100%' }} title={`${d.month}: ${CURRENCY_PREFIX}${d[dataKey].toLocaleString()}`}><div className="absolute bottom-0 w-full rounded-t-sm bg-white/20 hover:bg-white/40 transition-colors" style={{ height: `${Math.max((d[dataKey] / maxVal) * 100, 2)}%` }} /></div>)}</div>
      <div className="flex justify-between mt-2 text-[10px] text-zinc-600">{data.length > 0 && <><span>{data[0].month}</span><span>{data[data.length - 1].month}</span></>}</div>
    </div>
  );
}
