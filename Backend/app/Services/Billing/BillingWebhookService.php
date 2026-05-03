<?php

namespace App\Services\Billing;

use App\Models\BillingWebhookEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BillingWebhookService
{
    public function __construct(
        private readonly SubscriptionLifecycleService $subscriptions,
    ) {
    }

    public function process(BillingProviderInterface $provider, array $payload, string $rawPayload, ?string $signatureHeader): BillingWebhookEvent
    {
        $parsed = $provider->parseEvent($payload);

        $event = BillingWebhookEvent::query()->firstOrCreate(
            [
                'provider' => $provider->providerKey(),
                'event_id' => $parsed['event_id'],
            ],
            [
                'event_type' => $parsed['event_type'],
                'signature_valid' => false,
                'processing_status' => 'PENDING',
                'payload' => $payload,
                'received_at' => now(),
            ]
        );

        if ($event->processing_status === 'PROCESSED') {
            return $event;
        }

        $signatureValid = $provider->verifySignature($rawPayload, $signatureHeader);

        $event->signature_valid = $signatureValid;
        $event->event_type = $parsed['event_type'];
        $event->payload = $payload;

        if (! $signatureValid) {
            $event->processing_status = 'REJECTED';
            $event->error_message = 'Invalid webhook signature.';
            $event->processed_at = now();
            $event->save();

            return $event;
        }

        DB::transaction(function () use ($event, $parsed): void {
            $event->processing_status = 'PROCESSING';
            $event->save();

            $this->subscriptions->applyWebhookPayment(
                (int) ($parsed['shop_subscription_id'] ?? 0),
                (string) ($parsed['status'] ?? 'PENDING'),
                (float) ($parsed['amount'] ?? 0),
                $parsed['paid_at'] ? Carbon::parse($parsed['paid_at']) : null,
                $parsed['reference_number']
            );

            $event->processing_status = 'PROCESSED';
            $event->processed_at = now();
            $event->error_message = null;
            $event->save();
        });

        return $event;
    }
}
