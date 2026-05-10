import { useEffect, useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';

export function SupportTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    apiGet<{ data: any[] }>('/api/superadmin/support-tickets')
      .then(r => setShops(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Support Tickets</h1><p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">Active shop directory — ticketing system coming in a future update.</p></div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase"><th className="px-6 py-4">Shop</th><th className="px-6 py-4">Subdomain</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Created</th></tr></thead>
          <tbody>{shops.map((s: any) => (
            <tr key={s.shopId} className="border-b border-border hover:bg-muted/50">
              <td className="px-6 py-4"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><span className="text-foreground font-medium">{s.shopName}</span></div></td>
              <td className="px-6 py-4 text-muted-foreground"><a href={`https://${s.subdomain}.mospams.shop`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1">{s.subdomain}.mospams.shop <ExternalLink className="w-3 h-3" /></a></td>
              <td className="px-6 py-4 text-muted-foreground">{s.phone || 'N/A'}</td>
              <td className="px-6 py-4 text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
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
    apiGet<{ message: string }>('/api/superadmin/shop-feedback')
      .then(r => setMessage(r.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Shop Feedback</h1><p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">Review feedback from shops</p></div>
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4"><MessageSquare className="w-8 h-8 text-zinc-600" /></div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Not Yet Available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">{message || 'Shops will be able to submit feedback through their dashboards. This feature is planned for a future release.'}</p>
      </div>
    </div>
  );
}
