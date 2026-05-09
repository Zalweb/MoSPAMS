import { useEffect, useState } from 'react';
import { Users, UserCheck, Wrench, UserPlus } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';

export default function UserStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet('/api/superadmin/user-statistics').then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  const d = data;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">User Statistics</h1><p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Platform-wide user metrics and activity</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={d?.summary?.totalUsers ?? 0} />
        <StatCard icon={UserCheck} label="Active Users" value={d?.summary?.activeUsers ?? 0} color="emerald" />
        <StatCard icon={UserPlus} label="Customers" value={d?.summary?.totalCustomers ?? 0} color="blue" />
        <StatCard icon={Wrench} label="Mechanics" value={d?.summary?.totalMechanics ?? 0} color="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d?.byRole?.length > 0 && (
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6"><h2 className="text-[16px] font-bold text-white mb-4">Users by Role</h2><div className="space-y-3">{d.byRole.map((r: any) => { const maxVal = Math.max(...d.byRole.map((x: any) => x.count), 1); const pct = Math.round((r.count / maxVal) * 100); return <div key={r.role}><div className="flex justify-between text-sm mb-1"><span className="text-zinc-300">{r.role}</span><span className="text-white font-semibold">{r.count}</span></div><div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-white/60 rounded-full" style={{ width: `${pct}%` }} /></div></div>; })}</div></div>
        )}
        {d?.byShop?.length > 0 && (
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6"><h2 className="text-[16px] font-bold text-white mb-4">Top Shops by Users</h2><div className="space-y-3">{d.byShop.map((s: any) => { const maxVal = Math.max(...d.byShop.map((x: any) => x.count), 1); const pct = Math.round((s.count / maxVal) * 100); return <div key={s.shopName}><div className="flex justify-between text-sm mb-1"><span className="text-zinc-300">{s.shopName}</span><span className="text-white font-semibold">{s.count}</span></div><div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-white/60 rounded-full" style={{ width: `${pct}%` }} /></div></div>; })}</div></div>
        )}
      </div>
      {d?.monthlySignups?.length > 0 && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6"><h2 className="text-[16px] font-bold text-white mb-4">Monthly Signups</h2>
          <div className="h-[200px] flex items-end gap-[2px]">{d.monthlySignups.map((m: any, i: number) => { const maxVal = Math.max(...d.monthlySignups.map((x: any) => x.count), 1); return <div key={i} className="flex-1 min-w-[8px] relative" style={{ height: '100%' }} title={`${m.month}: ${m.count}`}><div className="absolute bottom-0 w-full rounded-t-sm bg-white/20" style={{ height: `${Math.max((m.count / maxVal) * 100, 2)}%` }} /></div>; })}</div>
          <div className="flex justify-between mt-2 text-[10px] text-zinc-600"><span>{d.monthlySignups[0]?.month}</span><span>{d.monthlySignups[d.monthlySignups.length - 1]?.month}</span></div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'zinc' }: any) {
  const colors: any = { emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', zinc: 'bg-zinc-800 border-zinc-700 text-white' };
  return <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}><Icon className="w-5 h-5" /></div><div><p className="text-xs text-zinc-500">{label}</p><p className="text-xl font-bold text-white">{value}</p></div></div></div>;
}
