import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import {
  createShopSubscription,
  createSubscriptionPayment,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  updateShopSubscription,
  getExpiringSubscriptions,
  getShopSubscriptions,
  getShops,
  getSubscriptionPayments,
  getSubscriptionPlans,
} from '@/features/superadmin/lib/api';
import type { ShopSubscription, SubscriptionPayment, SubscriptionPlan, SuperAdminShop } from '@/shared/types';

const CURRENCY_PREFIX = '\u20b1';

export default function SuperAdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [subscriptions, setSubscriptions] = useState<ShopSubscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [expiring, setExpiring] = useState<Array<{ shopSubscriptionId: number; shopId: number; shopName: string; planName: string; endsAt: string | null; daysRemaining: number }>>([]);

  const [planForm, setPlanForm] = useState({ planCode: '', planName: '', monthlyPrice: '' });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({ shopId: '', planId: '', status: 'PENDING' as 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED', endsAt: '' });
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubStatus, setEditingSubStatus] = useState('');
  const [editingSubEndsAt, setEditingSubEndsAt] = useState('');
  const [paymentForm, setPaymentForm] = useState({ shopSubscriptionId: '', amount: '', paymentStatus: 'PAID' as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED', paymentMethod: 'Cash', dueAt: '' });

  const load = async () => {
    try {
      const [planRes, shopRes, subRes, payRes, expRes] = await Promise.all([
        getSubscriptionPlans(), getShops(), getShopSubscriptions(), getSubscriptionPayments(), getExpiringSubscriptions(7),
      ]);
      setPlans(planRes.data); setShops(shopRes.data); setSubscriptions(subRes.data); setPayments(payRes.data); setExpiring(expRes.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    }
  };

  useEffect(() => { void load(); }, []);

  const onCreateOrUpdatePlan = async () => {
    if (!planForm.planCode || !planForm.planName || !planForm.monthlyPrice) { toast.error('Plan code, name, and monthly price are required'); return; }
    try {
      if (editingPlanId) {
        await updateSubscriptionPlan(editingPlanId, { planCode: planForm.planCode, planName: planForm.planName, monthlyPrice: Number(planForm.monthlyPrice) });
        toast.success('Plan updated');
      } else {
        await createSubscriptionPlan({ planCode: planForm.planCode, planName: planForm.planName, monthlyPrice: Number(planForm.monthlyPrice) });
        toast.success('Plan created');
      }
      setPlanForm({ planCode: '', planName: '', monthlyPrice: '' }); setEditingPlanId(null);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save plan'); }
  };

  const startEditPlan = (plan: SubscriptionPlan) => {
    setPlanForm({ planCode: plan.planCode, planName: plan.planName, monthlyPrice: plan.monthlyPrice.toString() });
    setEditingPlanId(plan.planId);
  };

  const cancelEditPlan = () => { setPlanForm({ planCode: '', planName: '', monthlyPrice: '' }); setEditingPlanId(null); };

  const onAssignSubscription = async () => {
    if (!subscriptionForm.shopId || !subscriptionForm.planId) { toast.error('Shop and plan are required'); return; }
    try {
      await createShopSubscription({ shopId: Number(subscriptionForm.shopId), planId: Number(subscriptionForm.planId), status: subscriptionForm.status, endsAt: subscriptionForm.endsAt || undefined });
      setSubscriptionForm({ shopId: '', planId: '', status: 'PENDING', endsAt: '' }); toast.success('Subscription assigned'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to assign'); }
  };

  const startEditSub = (sub: ShopSubscription) => {
    setEditingSubId(sub.shopSubscriptionId);
    setEditingSubStatus(sub.status);
    setEditingSubEndsAt(sub.endsAt ? new Date(sub.endsAt).toISOString().split('T')[0] : '');
  };

  const saveEditSub = async () => {
    if (!editingSubId) return;
    try {
      await updateShopSubscription(editingSubId, { status: editingSubStatus as any, endsAt: editingSubEndsAt || undefined });
      toast.success('Subscription updated'); setEditingSubId(null); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to update'); }
  };

  const cancelEditSub = () => { setEditingSubId(null); };

  const onRecordPayment = async () => {
    if (!paymentForm.shopSubscriptionId || !paymentForm.amount) { toast.error('Subscription and amount are required'); return; }
    try {
      await createSubscriptionPayment({ shopSubscriptionId: Number(paymentForm.shopSubscriptionId), amount: Number(paymentForm.amount), paymentStatus: paymentForm.paymentStatus, paymentMethod: paymentForm.paymentMethod, dueAt: paymentForm.dueAt || undefined, paidAt: paymentForm.paymentStatus === 'PAID' ? new Date().toISOString() : undefined });
      setPaymentForm({ shopSubscriptionId: '', amount: '', paymentStatus: 'PAID', paymentMethod: 'Cash', dueAt: '' }); toast.success('Payment recorded'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to record'); }
  };

  return (
    <div>
      <div className="mb-7"><h2 className="text-[22px] font-bold text-foreground tracking-tight">Subscription & Billing</h2><p className="text-[13px] text-muted-foreground mt-0.5">Manage plan tiers, shop subscriptions, and payment records</p></div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <section className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">{editingPlanId ? 'Edit Plan' : 'Create Plan'}</h3>
          <div className="space-y-2.5">
            <Input placeholder="Plan code" value={planForm.planCode} onChange={(e) => setPlanForm(p => ({ ...p, planCode: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 placeholder:text-muted-foreground" />
            <Input placeholder="Plan name" value={planForm.planName} onChange={(e) => setPlanForm(p => ({ ...p, planName: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 placeholder:text-muted-foreground" />
            <Input type="number" placeholder="Monthly price" value={planForm.monthlyPrice} onChange={(e) => setPlanForm(p => ({ ...p, monthlyPrice: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 placeholder:text-muted-foreground" />
            <div className="flex gap-2">
              <Button className="flex-1 h-9 text-[12px]" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }} onClick={() => void onCreateOrUpdatePlan()}>{editingPlanId ? 'Update Plan' : 'Save Plan'}</Button>
              {editingPlanId && <Button className="h-9 text-[12px] bg-secondary dark:bg-zinc-800 hover:bg-muted dark:bg-zinc-700 text-muted-foreground dark:text-zinc-300" onClick={cancelEditPlan}>Cancel</Button>}
            </div>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Assign Subscription</h3>
          <div className="space-y-2.5">
            <select className="w-full h-9 rounded-xl border border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 px-3 text-[12px]" value={subscriptionForm.shopId} onChange={(e) => setSubscriptionForm(p => ({ ...p, shopId: e.target.value }))}><option value="">Select shop</option>{shops.map(s => <option key={s.shopId} value={s.shopId}>{s.shopName}</option>)}</select>
            <select className="w-full h-9 rounded-xl border border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 px-3 text-[12px]" value={subscriptionForm.planId} onChange={(e) => setSubscriptionForm(p => ({ ...p, planId: e.target.value }))}><option value="">Select plan</option>{plans.map(p => <option key={p.planId} value={p.planId}>{p.planName}</option>)}</select>
            <select className="w-full h-9 rounded-xl border border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 px-3 text-[12px]" value={subscriptionForm.status} onChange={(e) => setSubscriptionForm(p => ({ ...p, status: e.target.value as typeof p.status }))}><option value="PENDING">PENDING</option><option value="ACTIVE">ACTIVE</option><option value="EXPIRED">EXPIRED</option><option value="CANCELLED">CANCELLED</option></select>
            <Input type="date" value={subscriptionForm.endsAt} onChange={(e) => setSubscriptionForm(p => ({ ...p, endsAt: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200" />
            <Button className="w-full h-9 text-[12px]" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }} onClick={() => void onAssignSubscription()}>Assign</Button>
          </div>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Record Payment</h3>
          <div className="space-y-2.5">
            <select className="w-full h-9 rounded-xl border border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 px-3 text-[12px]" value={paymentForm.shopSubscriptionId} onChange={(e) => setPaymentForm(p => ({ ...p, shopSubscriptionId: e.target.value }))}><option value="">Select subscription</option>{subscriptions.map(s => <option key={s.shopSubscriptionId} value={s.shopSubscriptionId}>{s.shopName} | {s.planName}</option>)}</select>
            <Input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 placeholder:text-muted-foreground" />
            <select className="w-full h-9 rounded-xl border border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 px-3 text-[12px]" value={paymentForm.paymentStatus} onChange={(e) => setPaymentForm(p => ({ ...p, paymentStatus: e.target.value as typeof p.paymentStatus }))}><option value="PAID">PAID</option><option value="PENDING">PENDING</option><option value="FAILED">FAILED</option><option value="REFUNDED">REFUNDED</option></select>
            <Input placeholder="Payment method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 placeholder:text-muted-foreground" />
            <Input type="date" value={paymentForm.dueAt} onChange={(e) => setPaymentForm(p => ({ ...p, dueAt: e.target.value }))} className="bg-muted border-border dark:border-zinc-700 text-foreground dark:text-zinc-200" />
            <Button className="w-full h-9 text-[12px]" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }} onClick={() => void onRecordPayment()}>Record</Button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-card rounded-2xl border border-border p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Plans</h3>
          <table className="w-full text-[12px] text-muted-foreground dark:text-zinc-300 min-w-[360px]"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Code</th><th className="text-left py-2 text-muted-foreground">Name</th><th className="text-left py-2 text-muted-foreground">Monthly</th><th className="text-right py-2 text-muted-foreground"></th></tr></thead>
          <tbody className="divide-y divide-border dark:divide-zinc-800">
            {plans.map(plan => (
              <tr key={plan.planId} className="hover:bg-muted/50"><td className="py-2">{plan.planCode}</td><td className="py-2">{plan.planName}</td><td className="py-2">{CURRENCY_PREFIX}{plan.monthlyPrice.toLocaleString()}</td>
                <td className="py-2 text-right"><button onClick={() => startEditPlan(plan)} className="text-muted-foreground hover:text-foreground p-1 rounded" title="Edit plan"><Pencil className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody></table>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Expiring in 7 Days</h3>
          <table className="w-full text-[12px] text-muted-foreground dark:text-zinc-300 min-w-[360px]"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Shop</th><th className="text-left py-2 text-muted-foreground">Plan</th><th className="text-left py-2 text-muted-foreground">Days Left</th></tr></thead>
          <tbody className="divide-y divide-border dark:divide-zinc-800">
            {expiring.length === 0 ? <tr><td className="py-3 text-muted-foreground" colSpan={3}>No expiring subscriptions.</td></tr> :
              expiring.map(item => <tr key={item.shopSubscriptionId}><td className="py-2">{item.shopName}</td><td className="py-2">{item.planName}</td><td className="py-2">{item.daysRemaining}</td></tr>)
            }
          </tbody></table>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <section className="bg-card rounded-2xl border border-border p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Subscriptions</h3>
          <table className="w-full text-[12px] text-muted-foreground dark:text-zinc-300 min-w-[540px]"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Shop</th><th className="text-left py-2 text-muted-foreground">Plan</th><th className="text-left py-2 text-muted-foreground">Status</th><th className="text-left py-2 text-muted-foreground">Ends At</th><th className="text-right py-2 text-muted-foreground"></th></tr></thead>
          <tbody className="divide-y divide-border dark:divide-zinc-800">
            {subscriptions.map(sub => (
              editingSubId === sub.shopSubscriptionId ? (
                <tr key={sub.shopSubscriptionId} className="bg-muted/50">
                  <td className="py-2 text-foreground">{sub.shopName}</td><td className="py-2">{sub.planName}</td>
                  <td className="py-2"><select className="bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 rounded px-2 py-1 text-[11px]" value={editingSubStatus} onChange={e => setEditingSubStatus(e.target.value)}><option value="PENDING">PENDING</option><option value="ACTIVE">ACTIVE</option><option value="EXPIRED">EXPIRED</option><option value="CANCELLED">CANCELLED</option></select></td>
                  <td className="py-2"><input type="date" className="bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 rounded px-2 py-1 text-[11px] w-[130px]" value={editingSubEndsAt} onChange={e => setEditingSubEndsAt(e.target.value)} /></td>
                  <td className="py-2 text-right"><button onClick={() => void saveEditSub()} className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold mr-2">Save</button><button onClick={cancelEditSub} className="text-muted-foreground hover:text-muted-foreground dark:text-zinc-300 text-[11px]">Cancel</button></td>
                </tr>
              ) : (
                <tr key={sub.shopSubscriptionId} className="hover:bg-muted/50"><td className="py-2">{sub.shopName}</td><td className="py-2">{sub.planName}</td><td className="py-2"><StatusBadge status={sub.status} /></td><td className="py-2">{sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-2 text-right"><button onClick={() => startEditSub(sub)} className="text-muted-foreground hover:text-foreground p-1 rounded" title="Edit subscription"><Pencil className="w-3.5 h-3.5" /></button></td>
                </tr>
              )
            ))}
          </tbody></table>
        </section>

        <section className="bg-card rounded-2xl border border-border p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">Payment History</h3>
          <table className="w-full text-[12px] text-muted-foreground dark:text-zinc-300 min-w-[480px]"><thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Shop</th><th className="text-left py-2 text-muted-foreground">Amount</th><th className="text-left py-2 text-muted-foreground">Status</th><th className="text-left py-2 text-muted-foreground">Date</th></tr></thead>
          <tbody className="divide-y divide-border dark:divide-zinc-800">
            {payments.map(payment => <tr key={payment.subscriptionPaymentId}><td className="py-2">{payment.shopName}</td><td className="py-2">{CURRENCY_PREFIX}{payment.amount.toLocaleString()}</td><td className="py-2"><StatusBadge status={payment.paymentStatus} /></td><td className="py-2">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}</td></tr>)}
          </tbody></table>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { PAID: 'bg-emerald-500/10 text-emerald-400', ACTIVE: 'bg-emerald-500/10 text-emerald-400', PENDING: 'bg-amber-500/10 text-amber-400', FAILED: 'bg-red-500/10 text-red-400', REFUNDED: 'bg-blue-500/10 text-blue-400', EXPIRED: 'bg-zinc-500/10 text-muted-foreground', CANCELLED: 'bg-red-500/10 text-red-400', };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${styles[status] || 'bg-zinc-500/10 text-muted-foreground'}`}>{status}</span>;
}
