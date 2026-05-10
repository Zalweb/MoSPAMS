import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

const CURRENCY_PREFIX = '\u20b1';

export default function RevenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet('/api/superadmin/revenue-analytics').then(setData).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  const d = data;
  const change = d?.summary?.changePercent ?? 0;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Revenue Analytics</h1><p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">Deep dive into revenue metrics and trends</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold text-foreground mt-1">{CURRENCY_PREFIX}{(d?.summary?.thisMonth ?? 0).toLocaleString()}</p></div>
        <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">Last Month</p><p className="text-2xl font-bold text-foreground mt-1">{CURRENCY_PREFIX}{(d?.summary?.lastMonth ?? 0).toLocaleString()}</p></div>
        <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">Month Change</p><p className={`text-2xl font-bold mt-1 flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}{change}%</p></div>
        <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground">Avg Per Transaction</p><p className="text-2xl font-bold text-foreground mt-1">{CURRENCY_PREFIX}{(d?.summary?.avgPerTransaction ?? 0).toLocaleString()}</p></div>
      </div>
      {d?.topShops?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-[16px] font-bold text-foreground mb-4">Top Shops by Revenue</h2>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase"><th className="pb-3 pr-4">Shop</th><th className="pb-3 px-4 text-right">Revenue</th><th className="pb-3 pl-4 text-right">Transactions</th></tr></thead>
          <tbody>{d.topShops.map((s: any, i: number) => <tr key={i} className="border-b border-border/50"><td className="py-3 pr-4 text-foreground font-medium">{s.shopName}</td><td className="py-3 px-4 text-right text-foreground font-semibold">{CURRENCY_PREFIX}{s.revenue.toLocaleString()}</td><td className="py-3 pl-4 text-right text-muted-foreground">{s.transactions}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
