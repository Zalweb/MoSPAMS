import { useEffect, useState } from 'react';
import { LifeBuoy, Phone, Building2, ExternalLink } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';

export function SupportTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<{ data: any[]; message: string }>('/api/superadmin/support-tickets')
      .then(r => { setData(r.data); setMessage(r.message); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Support Tickets</h1><p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shop support requests</p></div>
      {message && <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">{message}</div>}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-semibold text-zinc-500 uppercase"><th className="px-6 py-4">Shop</th><th className="px-6 py-4">Subdomain</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Created</th></tr></thead>
          <tbody>{data.map((s: any) => (
            <tr key={s.shopId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
              <td className="px-6 py-4"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-zinc-500" /><span className="text-white font-medium">{s.shopName}</span></div></td>
              <td className="px-6 py-4 text-zinc-400"><a href={`https://${s.subdomain}.mospams.shop`} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">{s.subdomain}.mospams.shop <ExternalLink className="w-3 h-3" /></a></td>
              <td className="px-6 py-4 text-zinc-400">{s.phone || 'N/A'}</td>
              <td className="px-6 py-4 text-zinc-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}</tbody></table>
        </div>
      </div>
    </div>
  );
}

import { MessageSquare } from 'lucide-react';

export function ShopFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<{ data: any[]; message: string }>('/api/superadmin/shop-feedback')
      .then(r => setMessage(r.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Shop Feedback</h1><p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Review feedback from shops</p></div>
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8 text-zinc-600" /></div>
        <h3 className="text-lg font-semibold text-white mb-2">Feedback System Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">{message || 'Collect and analyze feedback from shops to improve the platform.'}</p>
      </div>
    </div>
  );
}
