import { useEffect, useState } from 'react';
import { TrendingUp, Store, Activity, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.monthlyGrowth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="shopGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '10px 14px' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                formatter={(v: number) => [v, 'New shops']}
              />
              <Bar dataKey="count" fill="url(#shopGrowthGrad)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'zinc' }: any) {
  const colors: any = { emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', zinc: 'bg-secondary dark:bg-zinc-800 border-border dark:border-zinc-700 text-foreground' };
  return <div className="bg-card rounded-xl border border-border p-5"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}><Icon className="w-5 h-5" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold text-foreground">{value}</p></div></div></div>;
}
