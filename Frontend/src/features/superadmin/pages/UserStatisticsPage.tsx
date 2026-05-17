import { useEffect, useState } from 'react';
import { Users, UserCheck, Wrench, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

export default function UserStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet('/api/superadmin/user-statistics').then(setData).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  const d = data;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">User Statistics</h1><p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">Platform-wide user metrics and activity</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={d?.summary?.totalUsers ?? 0} />
        <StatCard icon={UserCheck} label="Active Users" value={d?.summary?.activeUsers ?? 0} color="emerald" />
        <StatCard icon={UserPlus} label="Customers" value={d?.summary?.totalCustomers ?? 0} color="blue" />
        <StatCard icon={Wrench} label="Mechanics" value={d?.summary?.totalMechanics ?? 0} color="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d?.byRole?.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6"><h2 className="text-[16px] font-bold text-foreground mb-4">Users by Role</h2><div className="space-y-3">{d.byRole.map((r: any) => { const maxVal = Math.max(...d.byRole.map((x: any) => x.count), 1); const pct = Math.round((r.count / maxVal) * 100); return <div key={r.role}><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground dark:text-zinc-300">{r.role}</span><span className="text-foreground font-semibold">{r.count}</span></div><div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} /></div></div>; })}</div></div>
        )}
        {d?.byShop?.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6"><h2 className="text-[16px] font-bold text-foreground mb-4">Top Shops by Users</h2><div className="space-y-3">{d.byShop.map((s: any) => { const maxVal = Math.max(...d.byShop.map((x: any) => x.count), 1); const pct = Math.round((s.count / maxVal) * 100); return <div key={s.shopName}><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground dark:text-zinc-300">{s.shopName}</span><span className="text-foreground font-semibold">{s.count}</span></div><div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} /></div></div>; })}</div></div>
        )}
      </div>
      {d?.monthlySignups?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-[16px] font-bold text-foreground mb-4">Monthly Signups</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.monthlySignups} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', padding: '10px 14px' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                formatter={(v: number) => [v, 'New users']}
              />
              <Bar dataKey="count" fill="url(#signupsGrad)" radius={[4, 4, 0, 0]} maxBarSize={48} />
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
