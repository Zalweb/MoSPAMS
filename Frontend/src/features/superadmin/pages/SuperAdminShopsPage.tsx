import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, ShieldAlert, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  approveShopRegistration,
  getShopDiagnostics,
  getShops,
  rejectShopRegistration,
  setShopStatus,
  type ShopDiagnostics,
} from '@/features/superadmin/lib/api';
import type { SuperAdminShop } from '@/shared/types';

export default function SuperAdminShopsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [diag, setDiag] = useState<ShopDiagnostics | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);

  const load = async (query = '') => {
    setLoading(true);
    try {
      const response = await getShops(query);
      setShops(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingCount = useMemo(() => shops.filter((shop) => shop.statusCode === 'PENDING').length, [shops]);

  const onSearch = async (value: string) => {
    setSearch(value);
    await load(value);
  };

  const onToggleStatus = async (shop: SuperAdminShop) => {
    const target = shop.statusCode === 'SUSPENDED' ? 'activate' : 'suspend';

    try {
      await setShopStatus(shop.shopId, target);
      toast.success(`Shop ${target === 'activate' ? 'activated' : 'suspended'}`);
      await load(search);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status update failed');
    }
  };

  const onApproveRegistration = async (shop: SuperAdminShop) => {
    try {
      const response = await approveShopRegistration(shop.shopId);
      
      if (response.data.temporaryPassword) {
        // New Owner was created
        toast.success(`Registration approved. Temporary owner password: ${response.data.temporaryPassword}`);
      } else {
        // Existing Owner was used
        toast.success(`Registration approved. Shop activated with existing Owner account.`);
      }
      
      await load(search);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Approval failed');
    }
  };

  const onRejectRegistration = async (shop: SuperAdminShop) => {
    const reason = window.prompt('Reason for rejection (optional):') ?? undefined;

    try {
      await rejectShopRegistration(shop.shopId, { reason: reason?.trim() || undefined });
      toast.success('Registration rejected');
      await load(search);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rejection failed');
    }
  };

  const onOpenDiagnostics = async (shopId: number) => {
    try {
      const response = await getShopDiagnostics(shopId);
      setDiag(response.data);
      setDiagOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load diagnostics');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">Shop Management</h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">Provision, suspend, and monitor tenant shops</p>
        </div>

        <Button onClick={() => navigate('/superadmin/shops/new')} className="h-9 rounded-xl bg-white hover:bg-zinc-200 text-black text-[12px] font-medium px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Shop
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Total Shops" value={shops.length} icon={Wrench} tone="slate" />
        <Stat label="Pending" value={pendingCount} icon={ShieldAlert} tone="amber" />
        <Stat label="Healthy" value={shops.filter((shop) => shop.statusCode === 'ACTIVE').length} icon={CheckCircle2} tone="green" />
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <Input
          value={search}
          onChange={(event) => {
            void onSearch(event.target.value);
          }}
          placeholder="Search shops or owners..."
          className="pl-9 h-9 rounded-xl border-zinc-700 bg-zinc-950 text-zinc-200 placeholder:text-zinc-500 text-[13px]"
        />
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Shop</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Owner / Applicant</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Subscription</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">Loading shops...</td>
              </tr>
            ) : shops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">No shops found</td>
              </tr>
            ) : (
              shops.map((shop) => (
                <tr key={shop.shopId}>
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-semibold text-white">{shop.shopName}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {shop.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.mospams.shop
                    </p>
                    <p className="text-[11px] text-zinc-400">Registration: {shop.registration.status}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-zinc-300">
                    <p>{shop.owner.name ?? 'Unassigned'}</p>
                    {!shop.owner.name && shop.applicant.name ? (
                      <p className="text-[11px] text-zinc-400">Applicant: {shop.applicant.name} ({shop.applicant.email ?? 'No email'})</p>
                    ) : null}
                    {shop.registration.status === 'REJECTED' && shop.registration.rejectionReason ? (
                      <p className="text-[11px] text-red-400">Rejected: {shop.registration.rejectionReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-zinc-300">
                    {shop.subscription ? `${shop.subscription.plan.planName} (${shop.subscription.status})` : 'No subscription'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full ${statusTone(shop.statusCode)}`}>
                      {shop.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="outline" className="h-8 px-3 text-[11px] border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700" onClick={() => void onOpenDiagnostics(shop.shopId)}>
                        Diagnostics
                      </Button>
                      {shop.registration.status === 'PENDING_APPROVAL' ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-[11px] border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700"
                            onClick={() => void onApproveRegistration(shop)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-[11px] border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700"
                            onClick={() => void onRejectRegistration(shop)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-[11px] border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700"
                        onClick={() => void onToggleStatus(shop)}
                      >
                        {shop.statusCode === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[20px] border-zinc-800 bg-zinc-950 text-zinc-300 p-6">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-white">Shop Diagnostics</DialogTitle>
          </DialogHeader>

          {!diag ? (
            <p className="text-[12px] text-zinc-400">Loading...</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[13px] font-semibold text-white">{diag.shop.shopName}</p>
                <p className="text-[12px] text-zinc-400">Status: {diag.shop.statusCode}</p>
                <p className="text-[12px] text-zinc-400">Owner: {diag.owner?.name ?? 'Unassigned'}</p>
                {diag.applicant.name ? (
                  <p className="text-[12px] text-zinc-400">Applicant: {diag.applicant.name} ({diag.applicant.email ?? 'No email'})</p>
                ) : null}
                <p className="text-[12px] text-zinc-400">Registration: {diag.registration.status}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <DiagMetric label="Users" value={diag.metrics.users} />
                <DiagMetric label="Parts" value={diag.metrics.parts} />
                <DiagMetric label="Jobs" value={diag.metrics.serviceJobs} />
                <DiagMetric label="Sales" value={diag.metrics.sales} />
                <DiagMetric label="Pending Jobs" value={diag.metrics.pendingJobs} />
                <DiagMetric label="Revenue" value={`PHP ${diag.metrics.revenue.toLocaleString()}`} />
              </div>

              <div>
                <p className="text-[12px] font-semibold text-white mb-2">Recent Activity</p>
                <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                  {diag.recentLogs.length === 0 ? (
                    <p className="px-3 py-4 text-[12px] text-zinc-400">No activity yet.</p>
                  ) : (
                    diag.recentLogs.map((log) => (
                      <div key={log.id} className="px-3 py-2.5">
                        <p className="text-[11px] text-white">{log.action}</p>
                        <p className="text-[10px] text-zinc-400">{log.actorName ?? 'System'} | {log.loggedAt ? new Date(log.loggedAt).toLocaleString() : 'N/A'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusTone(code: string) {
  switch (code) {
    case 'ACTIVE':
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    case 'SUSPENDED':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'PENDING':
      return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  }
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wrench; tone: 'slate' | 'amber' | 'green' }) {
  const bg = tone === 'amber' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : tone === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-900 text-zinc-300 border-zinc-700';

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4">
      <div className={`w-8 h-8 rounded-[10px] border ${bg} flex items-center justify-center mb-3`}>
        <Icon className="w-[14px] h-[14px]" strokeWidth={2} />
      </div>
      <p className="text-[11px] text-zinc-400">{label}</p>
      <p className="text-[20px] font-bold text-white">{value}</p>
    </div>
  );
}

function DiagMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-800">
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className="text-[13px] font-semibold text-white">{value}</p>
    </div>
  );
}



