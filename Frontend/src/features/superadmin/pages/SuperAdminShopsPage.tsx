import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, ShieldAlert, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  approveShopRegistration,
  createShop,
  getShopDiagnostics,
  getShops,
  rejectShopRegistration,
  setShopStatus,
  type ShopDiagnostics,
} from '@/features/superadmin/lib/api';
import type { SuperAdminShop } from '@/shared/types';

export default function SuperAdminShopsPage() {
  const [search, setSearch] = useState('');
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [diag, setDiag] = useState<ShopDiagnostics | null>(null);
  const [diagOpen, setDiagOpen] = useState(false);

  const [form, setForm] = useState({
    shopName: '',
    email: '',
    phone: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
  });

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
      toast.success(`Registration approved. Temporary owner password: ${response.data.temporaryPassword}`);
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

  const onCreateShop = async () => {
    if (!form.shopName || !form.ownerName || !form.ownerEmail) {
      toast.error('Shop name, owner name, and owner email are required');
      return;
    }

    try {
      const response = await createShop({
        shopName: form.shopName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
      });

      toast.success(`Shop provisioned. Temporary owner password: ${response.data.temporaryPassword}`);
      setForm({ shopName: '', email: '', phone: '', address: '', ownerName: '', ownerEmail: '' });
      setOpenCreate(false);
      await load(search);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create shop');
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
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Shop Management</h2>
          <p className="text-[13px] text-[#A8A29E] mt-0.5">Provision, suspend, and monitor tenant shops</p>
        </div>

        <Button onClick={() => setOpenCreate(true)} className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Shop
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Total Shops" value={shops.length} icon={Wrench} tone="slate" />
        <Stat label="Pending" value={pendingCount} icon={ShieldAlert} tone="amber" />
        <Stat label="Healthy" value={shops.filter((shop) => shop.statusCode === 'ACTIVE').length} icon={CheckCircle2} tone="green" />
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
        <Input
          value={search}
          onChange={(event) => {
            void onSearch(event.target.value);
          }}
          placeholder="Search shops or owners..."
          className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Shop</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Owner / Applicant</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Subscription</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Status</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#A8A29E] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAFAF9]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#A8A29E]">Loading shops...</td>
              </tr>
            ) : shops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-[#A8A29E]">No shops found</td>
              </tr>
            ) : (
              shops.map((shop) => (
                <tr key={shop.shopId}>
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-semibold text-[#1C1917]">{shop.shopName}</p>
                    <p className="text-[11px] text-[#A8A29E]">Registration: {shop.registration.status}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#44403C]">
                    <p>{shop.owner.name ?? 'Unassigned'}</p>
                    {!shop.owner.name && shop.applicant.name ? (
                      <p className="text-[11px] text-[#A8A29E]">Applicant: {shop.applicant.name} ({shop.applicant.email ?? 'No email'})</p>
                    ) : null}
                    {shop.registration.status === 'REJECTED' && shop.registration.rejectionReason ? (
                      <p className="text-[11px] text-[#B91C1C]">Rejected: {shop.registration.rejectionReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#44403C]">
                    {shop.subscription ? `${shop.subscription.plan.planName} (${shop.subscription.status})` : 'No subscription'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full ${statusTone(shop.statusCode)}`}>
                      {shop.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button variant="outline" className="h-8 px-3 text-[11px]" onClick={() => void onOpenDiagnostics(shop.shopId)}>
                        Diagnostics
                      </Button>
                      {shop.registration.status === 'PENDING_APPROVAL' ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-[11px]"
                            onClick={() => void onApproveRegistration(shop)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-[11px]"
                            onClick={() => void onRejectRegistration(shop)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      <Button
                        variant="outline"
                        className="h-8 px-3 text-[11px]"
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

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Provision New Shop</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Field label="Shop Name" value={form.shopName} onChange={(value) => setForm((prev) => ({ ...prev, shopName: value }))} />
            <Field label="Shop Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
            <Field label="Address" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} />
            <Field label="Owner Name" value={form.ownerName} onChange={(value) => setForm((prev) => ({ ...prev, ownerName: value }))} />
            <Field label="Owner Email" value={form.ownerEmail} onChange={(value) => setForm((prev) => ({ ...prev, ownerEmail: value }))} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="h-9 rounded-xl bg-[#1C1917] text-white text-[12px]" onClick={() => void onCreateShop()}>
              Create Shop
            </Button>
            <Button variant="outline" className="h-9 rounded-xl text-[12px]" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Shop Diagnostics</DialogTitle>
          </DialogHeader>

          {!diag ? (
            <p className="text-[12px] text-[#A8A29E]">Loading...</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[13px] font-semibold text-[#1C1917]">{diag.shop.shopName}</p>
                <p className="text-[12px] text-[#A8A29E]">Status: {diag.shop.statusCode}</p>
                <p className="text-[12px] text-[#A8A29E]">Owner: {diag.owner?.name ?? 'Unassigned'}</p>
                {diag.applicant.name ? (
                  <p className="text-[12px] text-[#A8A29E]">Applicant: {diag.applicant.name} ({diag.applicant.email ?? 'No email'})</p>
                ) : null}
                <p className="text-[12px] text-[#A8A29E]">Registration: {diag.registration.status}</p>
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
                <p className="text-[12px] font-semibold text-[#1C1917] mb-2">Recent Activity</p>
                <div className="max-h-48 overflow-y-auto border border-[#F5F5F4] rounded-xl divide-y divide-[#FAFAF9]">
                  {diag.recentLogs.length === 0 ? (
                    <p className="px-3 py-4 text-[12px] text-[#A8A29E]">No activity yet.</p>
                  ) : (
                    diag.recentLogs.map((log) => (
                      <div key={log.id} className="px-3 py-2.5">
                        <p className="text-[11px] text-[#1C1917]">{log.action}</p>
                        <p className="text-[10px] text-[#A8A29E]">{log.actorName ?? 'System'} · {log.loggedAt ? new Date(log.loggedAt).toLocaleString() : 'N/A'}</p>
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
      return 'bg-[#ECFDF5] text-[#059669]';
    case 'SUSPENDED':
      return 'bg-[#FEF2F2] text-[#DC2626]';
    case 'PENDING':
      return 'bg-[#FFFBEB] text-[#D97706]';
    default:
      return 'bg-[#F4F4F5] text-[#52525B]';
  }
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wrench; tone: 'slate' | 'amber' | 'green' }) {
  const bg = tone === 'amber' ? 'bg-[#FFFBEB] text-[#D97706]' : tone === 'green' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F5F5F4] text-[#44403C]';

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-4">
      <div className={`w-8 h-8 rounded-[10px] ${bg} flex items-center justify-center mb-3`}>
        <Icon className="w-[14px] h-[14px]" strokeWidth={1.75} />
      </div>
      <p className="text-[11px] text-[#A8A29E]">{label}</p>
      <p className="text-[20px] font-bold text-[#1C1917]">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[#78716C]">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
    </label>
  );
}

function DiagMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#FAFAF9] rounded-xl px-3 py-2.5 border border-[#F5F5F4]">
      <p className="text-[10px] text-[#A8A29E]">{label}</p>
      <p className="text-[13px] font-semibold text-[#1C1917]">{value}</p>
    </div>
  );
}
