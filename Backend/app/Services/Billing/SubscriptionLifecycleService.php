<?php

namespace App\Services\Billing;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionLifecycleService
{
    public function runRenewalSweep(): void
    {
        $now = now();
        $graceDays = $this->graceDays();

        $expiring = DB::table('shop_subscriptions')
            ->whereRaw('UPPER(subscription_status) = ?', ['ACTIVE'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', $now)
            ->get();

        foreach ($expiring as $subscription) {
            $graceUntil = Carbon::parse($subscription->ends_at)->addDays($graceDays);

            if ($now->lte($graceUntil)) {
                DB::table('shop_subscriptions')->where('shop_subscription_id', $subscription->shop_subscription_id)->update([
                    'subscription_status' => 'GRACE',
                    'updated_at' => $now,
                ]);
                $this->syncShopStatus((int) $subscription->shop_id_fk, 'GRACE');
            } else {
                DB::table('shop_subscriptions')->where('shop_subscription_id', $subscription->shop_subscription_id)->update([
                    'subscription_status' => 'EXPIRED',
                    'updated_at' => $now,
                ]);
                $this->syncShopStatus((int) $subscription->shop_id_fk, 'EXPIRED');
            }
        }

        $pastDue = DB::table('shop_subscriptions')
            ->whereRaw('UPPER(subscription_status) = ?', ['PAST_DUE'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', $now->copy()->subDays($graceDays))
            ->get();

        foreach ($pastDue as $subscription) {
            DB::table('shop_subscriptions')->where('shop_subscription_id', $subscription->shop_subscription_id)->update([
                'subscription_status' => 'SUSPENDED',
                'updated_at' => $now,
            ]);
            $this->syncShopStatus((int) $subscription->shop_id_fk, 'SUSPENDED');
        }
    }

    public function applyWebhookPayment(int $shopSubscriptionId, string $status, float $amount, ?Carbon $paidAt = null, ?string $reference = null): void
    {
        if ($shopSubscriptionId <= 0) {
            return;
        }

        $subscription = DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscriptionId)->first();
        if (! $subscription) {
            return;
        }

        $normalizedStatus = strtoupper($status);
        $paymentStatus = match ($normalizedStatus) {
            'PAID', 'SUCCEEDED' => 'PAID',
            'FAILED' => 'FAILED',
            default => 'PENDING',
        };

        $paidAtValue = $paidAt ?: ($paymentStatus === 'PAID' ? now() : null);

        $paymentId = DB::table('subscription_payments')->insertGetId([
            'shop_subscription_id_fk' => $shopSubscriptionId,
            'shop_id_fk' => (int) $subscription->shop_id_fk,
            'payment_status' => $paymentStatus,
            'amount' => $amount,
            'payment_method' => 'PAYMONGO',
            'due_at' => now(),
            'paid_at' => $paidAtValue,
            'reference_number' => $reference,
            'notes' => 'Recorded from provider webhook',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($paymentStatus === 'PAID') {
            $startsAt = $subscription->starts_at ? Carbon::parse($subscription->starts_at) : now();
            $endsAt = $subscription->ends_at ? Carbon::parse($subscription->ends_at) : now();
            $nextEndsAt = $endsAt->isFuture() ? $endsAt->copy()->addMonth() : now()->addMonth();

            DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscriptionId)->update([
                'subscription_status' => 'ACTIVE',
                'starts_at' => $startsAt,
                'ends_at' => $nextEndsAt,
                'renews_at' => $nextEndsAt,
                'updated_at' => now(),
            ]);

            $invoiceId = $this->createInvoice((int) $subscription->shop_id_fk, $shopSubscriptionId, $amount, $nextEndsAt);

            DB::table('subscription_reconciliation_entries')->insert([
                'shop_id_fk' => (int) $subscription->shop_id_fk,
                'shop_subscription_id_fk' => $shopSubscriptionId,
                'subscription_payment_id_fk' => $paymentId,
                'subscription_invoice_id_fk' => $invoiceId,
                'entry_type' => 'PAYMENT_RECEIVED',
                'amount' => $amount,
                'notes' => 'Auto reconciliation from webhook payment',
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->syncShopStatus((int) $subscription->shop_id_fk, 'ACTIVE');
        } else {
            DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscriptionId)->update([
                'subscription_status' => 'PAST_DUE',
                'updated_at' => now(),
            ]);

            $this->syncShopStatus((int) $subscription->shop_id_fk, 'PAST_DUE');
        }
    }

    public function createInvoice(int $shopId, int $shopSubscriptionId, float $amount, Carbon $dueAt): int
    {
        $invoiceNumber = sprintf('INV-%d-%s', $shopId, now()->format('YmdHis'));

        return DB::table('subscription_invoices')->insertGetId([
            'shop_subscription_id_fk' => $shopSubscriptionId,
            'shop_id_fk' => $shopId,
            'invoice_number' => $invoiceNumber,
            'invoice_status' => 'PENDING',
            'amount_due' => $amount,
            'due_at' => $dueAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function syncShopStatus(int $shopId, string $subscriptionStatus): void
    {
        $target = match (strtoupper($subscriptionStatus)) {
            'ACTIVE' => 'ACTIVE',
            'GRACE' => 'PENDING',
            'PAST_DUE', 'SUSPENDED', 'EXPIRED' => 'SUSPENDED',
            default => 'PENDING',
        };

        $statusId = DB::table('shop_statuses')->where('status_code', $target)->value('shop_status_id');
        if (! $statusId) {
            return;
        }

        DB::table('shops')->where('shop_id', $shopId)->update([
            'shop_status_id_fk' => $statusId,
            'updated_at' => now(),
        ]);
    }

    private function graceDays(): int
    {
        $value = DB::table('platform_settings')->where('setting_key', 'subscription_grace_days')->value('setting_value');

        return max(0, (int) ($value ?? 7));
    }
}
