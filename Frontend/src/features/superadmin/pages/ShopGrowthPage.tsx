import { useEffect, useState } from 'react';
import { TrendingUp, Store, Activity, CheckCircle } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

export default function ShopGrowthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet('/api/superadmin/shop-growth').then(setData).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  const d = data;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Shop Growth Trends</h1><p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">Track shop registration and growth over time</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Store} label="Total Shops" value={d?.summary?.totalShops ?? 0} />
        <StatCard icon={CheckCircle} label="Active Shops" value={d?.summary?.activeShops ?? 0} color="emerald" />
        <StatCard icon={Activity} label="This Month" value={d?.summary?.thisMonthShops ?? 0} color="amber" />
        <StatCard icon={TrendingUp} label="Activation Rate" value={`${d?.summary?.activationRate ?? 0}%`} color="blue" />
      </div>
      {d?.monthlyGrowth?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-[16px] font-bold text-foreground mb-4">Monthly Shop Registrations</h2>
          <div className="h-[200px] flex items-end gap-[2px]">
            {d.monthlyGrowth.map((m: any, i: number) => {
              const maxVal = Math.max(...d.monthlyGrowth.map((x: any) => x.count), 1);
              return <div key={i} className="flex-1 min-w-[8px] relative" style={{ height: '100%' }} title={`${m.month}: ${m.count}`}><div className="absolute bottom-0 w-full rounded-t-sm bg-white/20 hover:bg-white/40 transition-colors" style={{ height: `${Math.max((m.count / maxVal) * 100, 2)}%` }} /></div>;
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-zinc-600"><span>{d.monthlyGrowth[0]?.month}</span><span>{d.monthlyGrowth[d.monthlyGrowth.length - 1]?.month}</span></div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'zinc' }: any) {
  const colors: any = { emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', zinc: 'bg-zinc-800 border-zinc-700 text-foreground' };
  return <div className="bg-card rounded-xl border border-border p-5"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}><Icon className="w-5 h-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold text-foreground">{value}</p></div></div></div>;
}
