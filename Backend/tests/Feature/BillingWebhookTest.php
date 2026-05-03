<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BillingWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.paymongo.webhook_secret', 'test-secret');

        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
        $this->artisan('db:seed', ['--class' => 'BillingSeeder']);
    }

    public function test_paymongo_webhook_is_verified_and_idempotent(): void
    {
        $subscription = DB::table('shop_subscriptions')->first();
        $this->assertNotNull($subscription);

        $payload = [
            'type' => 'payment.paid',
            'data' => [
                'id' => 'evt_test_123',
                'attributes' => [
                    'status' => 'PAID',
                    'amount' => 49900,
                    'paid_at' => now()->toIso8601String(),
                    'reference_number' => 'REF-001',
                    'metadata' => [
                        'shop_subscription_id' => $subscription->shop_subscription_id,
                    ],
                ],
            ],
        ];

        $raw = json_encode($payload);
        $signature = hash_hmac('sha256', $raw, 'test-secret');

        $first = $this->withHeaders(['Paymongo-Signature' => $signature])
            ->postJson('/api/webhooks/paymongo', $payload);

        $first->assertOk()->assertJsonPath('data.signatureValid', true);

        $second = $this->withHeaders(['Paymongo-Signature' => $signature])
            ->postJson('/api/webhooks/paymongo', $payload);

        $second->assertOk()->assertJsonPath('data.status', 'PROCESSED');

        $this->assertDatabaseCount('billing_webhook_events', 1);
        $this->assertDatabaseCount('subscription_payments', 1);
    }
}
