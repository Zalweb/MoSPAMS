import { useEffect, useState } from 'react';
import { Calendar, AlertTriangle, Building2 } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

const CURRENCY_PREFIX = '\u20b1';

export default function OverdueAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => { apiGet<{ data: any[] }>('/api/superadmin/overdue-accounts').then(r => setData(r.data)).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Overdue Accounts</h1><p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shops with overdue payments</p></div>
      {data.length === 0 ? (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-zinc-600" /><h3 className="text-lg font-semibold text-white mb-2">No Overdue Accounts</h3><p className="text-zinc-400">All subscriptions are current.</p>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm"><thead><tr className="border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-semibold text-zinc-500 uppercase"><th className="px-6 py-4">Shop</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Monthly Price</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Ended</th><th className="px-6 py-4 text-right">Days Overdue</th></tr></thead>
            <tbody>{data.map((a: any) => (
              <tr key={a.shopSubscriptionId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                <td className="px-6 py-4"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-500" /><span className="text-white font-medium">{a.shopName}</span></div><p className="text-xs text-zinc-500 mt-0.5">{a.subdomain}.mospams.shop</p></td>
                <td className="px-6 py-4 text-zinc-300">{a.planName}</td>
                <td className="px-6 py-4 text-white font-semibold">{CURRENCY_PREFIX}{a.monthlyPrice?.toLocaleString()}</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">{a.status}</span></td>
                <td className="px-6 py-4 text-zinc-400">{a.endsAt ? new Date(a.endsAt).toLocaleDateString() : '-'}</td>
                <td className="px-6 py-4 text-right"><span className="inline-flex items-center gap-1 text-red-400 font-semibold"><AlertTriangle className="w-4 h-4" />{a.daysOverdue}d</span></td>
              </tr>
            ))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
