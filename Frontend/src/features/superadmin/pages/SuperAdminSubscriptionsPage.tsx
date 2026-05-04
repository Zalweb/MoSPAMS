import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createShopSubscription,
  createSubscriptionPayment,
  createSubscriptionPlan,
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
  const [subscriptionForm, setSubscriptionForm] = useState({ shopId: '', planId: '', status: 'PENDING' as 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED', endsAt: '' });
  const [paymentForm, setPaymentForm] = useState({ shopSubscriptionId: '', amount: '', paymentStatus: 'PAID' as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED', paymentMethod: 'Cash', dueAt: '' });

  const load = async () => {
    try {
      const [planRes, shopRes, subRes, payRes, expRes] = await Promise.all([
        getSubscriptionPlans(),
        getShops(),
        getShopSubscriptions(),
        getSubscriptionPayments(),
        getExpiringSubscriptions(7),
      ]);

      setPlans(planRes.data);
      setShops(shopRes.data);
      setSubscriptions(subRes.data);
      setPayments(payRes.data);
      setExpiring(expRes.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load subscription data');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreatePlan = async () => {
    if (!planForm.planCode || !planForm.planName || !planForm.monthlyPrice) {
      toast.error('Plan code, name, and monthly price are required');
      return;
    }

    try {
      await createSubscriptionPlan({
        planCode: planForm.planCode,
        planName: planForm.planName,
        monthlyPrice: Number(planForm.monthlyPrice),
      });
      setPlanForm({ planCode: '', planName: '', monthlyPrice: '' });
      toast.success('Plan created');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create plan');
    }
  };

  const onAssignSubscription = async () => {
    if (!subscriptionForm.shopId || !subscriptionForm.planId) {
      toast.error('Shop and plan are required');
      return;
    }

    try {
      await createShopSubscription({
        shopId: Number(subscriptionForm.shopId),
        planId: Number(subscriptionForm.planId),
        status: subscriptionForm.status,
        endsAt: subscriptionForm.endsAt || undefined,
      });
      setSubscriptionForm({ shopId: '', planId: '', status: 'PENDING', endsAt: '' });
      toast.success('Subscription assigned');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign subscription');
    }
  };

  const onRecordPayment = async () => {
    if (!paymentForm.shopSubscriptionId || !paymentForm.amount) {
      toast.error('Subscription and amount are required');
      return;
    }

    try {
      await createSubscriptionPayment({
        shopSubscriptionId: Number(paymentForm.shopSubscriptionId),
        amount: Number(paymentForm.amount),
        paymentStatus: paymentForm.paymentStatus,
        paymentMethod: paymentForm.paymentMethod,
        dueAt: paymentForm.dueAt || undefined,
        paidAt: paymentForm.paymentStatus === 'PAID' ? new Date().toISOString() : undefined,
      });
      setPaymentForm({ shopSubscriptionId: '', amount: '', paymentStatus: 'PAID', paymentMethod: 'Cash', dueAt: '' });
      toast.success('Payment recorded');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Subscription & Billing</h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Manage plan tiers, shop subscriptions, and payment records</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4">
          <h3 className="text-[13px] font-semibold text-white mb-3">Create Plan</h3>
          <div className="space-y-2.5">
            <Input placeholder="Plan code (e.g. BASIC_PLUS)" value={planForm.planCode} onChange={(e) => setPlanForm((prev) => ({ ...prev, planCode: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
            <Input placeholder="Plan name" value={planForm.planName} onChange={(e) => setPlanForm((prev) => ({ ...prev, planName: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
            <Input type="number" placeholder="Monthly price" value={planForm.monthlyPrice} onChange={(e) => setPlanForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
            <Button className="w-full h-9 text-[12px] bg-white hover:bg-zinc-200 text-black" onClick={() => void onCreatePlan()}>Save Plan</Button>
          </div>
        </section>

        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4">
          <h3 className="text-[13px] font-semibold text-white mb-3">Assign Subscription</h3>
          <div className="space-y-2.5">
            <select className="w-full h-9 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 px-3 text-[12px]" value={subscriptionForm.shopId} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, shopId: e.target.value }))}>
              <option value="">Select shop</option>
              {shops.map((shop) => (
                <option key={shop.shopId} value={shop.shopId}>{shop.shopName}</option>
              ))}
            </select>
            <select className="w-full h-9 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 px-3 text-[12px]" value={subscriptionForm.planId} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, planId: e.target.value }))}>
              <option value="">Select plan</option>
              {plans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>{plan.planName}</option>
              ))}
            </select>
            <select className="w-full h-9 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 px-3 text-[12px]" value={subscriptionForm.status} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, status: e.target.value as typeof prev.status }))}>
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Input type="date" value={subscriptionForm.endsAt} onChange={(e) => setSubscriptionForm((prev) => ({ ...prev, endsAt: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
            <Button className="w-full h-9 text-[12px] bg-white hover:bg-zinc-200 text-black" onClick={() => void onAssignSubscription()}>Assign</Button>
          </div>
        </section>

        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4">
          <h3 className="text-[13px] font-semibold text-white mb-3">Record Payment</h3>
          <div className="space-y-2.5">
            <select className="w-full h-9 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 px-3 text-[12px]" value={paymentForm.shopSubscriptionId} onChange={(e) => setPaymentForm((prev) => ({ ...prev, shopSubscriptionId: e.target.value }))}>
              <option value="">Select subscription</option>
              {subscriptions.map((subscription) => (
                <option key={subscription.shopSubscriptionId} value={subscription.shopSubscriptionId}>{subscription.shopName} | {subscription.planName}</option>
              ))}
            </select>
            <Input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
            <select className="w-full h-9 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 px-3 text-[12px]" value={paymentForm.paymentStatus} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentStatus: e.target.value as typeof prev.paymentStatus }))}>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
            <Input placeholder="Payment method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
            <Input type="date" value={paymentForm.dueAt} onChange={(e) => setPaymentForm((prev) => ({ ...prev, dueAt: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
            <Button className="w-full h-9 text-[12px] bg-white hover:bg-zinc-200 text-black" onClick={() => void onRecordPayment()}>Record</Button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-white mb-3">Plans</h3>
          <table className="w-full text-[12px] text-zinc-300 min-w-[360px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-zinc-400">Code</th>
                <th className="text-left py-2 text-zinc-400">Name</th>
                <th className="text-left py-2 text-zinc-400">Monthly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {plans.map((plan) => (
                <tr key={plan.planId}>
                  <td className="py-2">{plan.planCode}</td>
                  <td className="py-2">{plan.planName}</td>
                  <td className="py-2">{CURRENCY_PREFIX}{plan.monthlyPrice.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-white mb-3">Expiring in 7 Days</h3>
          <table className="w-full text-[12px] text-zinc-300 min-w-[360px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-zinc-400">Shop</th>
                <th className="text-left py-2 text-zinc-400">Plan</th>
                <th className="text-left py-2 text-zinc-400">Days Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {expiring.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-400" colSpan={3}>No expiring subscriptions.</td>
                </tr>
              ) : (
                expiring.map((item) => (
                  <tr key={item.shopSubscriptionId}>
                    <td className="py-2">{item.shopName}</td>
                    <td className="py-2">{item.planName}</td>
                    <td className="py-2">{item.daysRemaining}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-white mb-3">Subscriptions</h3>
          <table className="w-full text-[12px] text-zinc-300 min-w-[480px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-zinc-400">Shop</th>
                <th className="text-left py-2 text-zinc-400">Plan</th>
                <th className="text-left py-2 text-zinc-400">Status</th>
                <th className="text-left py-2 text-zinc-400">Ends At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {subscriptions.map((subscription) => (
                <tr key={subscription.shopSubscriptionId}>
                  <td className="py-2">{subscription.shopName}</td>
                  <td className="py-2">{subscription.planName}</td>
                  <td className="py-2">{subscription.status}</td>
                  <td className="py-2">{subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 overflow-x-auto">
          <h3 className="text-[13px] font-semibold text-white mb-3">Payment History</h3>
          <table className="w-full text-[12px] text-zinc-300 min-w-[480px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 text-zinc-400">Shop</th>
                <th className="text-left py-2 text-zinc-400">Amount</th>
                <th className="text-left py-2 text-zinc-400">Status</th>
                <th className="text-left py-2 text-zinc-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {payments.map((payment) => (
                <tr key={payment.subscriptionPaymentId}>
                  <td className="py-2">{payment.shopName}</td>
                  <td className="py-2">{CURRENCY_PREFIX}{payment.amount.toLocaleString()}</td>
                  <td className="py-2">{payment.paymentStatus}</td>
                  <td className="py-2">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}



