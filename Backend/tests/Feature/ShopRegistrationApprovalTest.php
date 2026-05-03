<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ShopRegistrationApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.shop_trial_days', 14);
        $this->seed();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_public_registration_persists_applicant_and_pending_subscription(): void
    {
        $response = $this->postJson('http://mospams.local/api/shop-registration', [
                'shopName' => 'Trial Moto Shop',
                'subdomain' => 'trial-moto',
                'ownerName' => 'Applicant Owner',
                'ownerEmail' => 'applicant@example.com',
                'planCode' => 'BASIC',
            ])
            ->assertCreated();

        $shopId = (int) $response->json('data.shopId');

        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'registration_owner_name' => 'Applicant Owner',
            'registration_owner_email' => 'applicant@example.com',
            'registration_status' => 'PENDING_APPROVAL',
        ]);

        $this->assertDatabaseHas('shop_subscriptions', [
            'shop_id_fk' => $shopId,
            'subscription_status' => 'PENDING',
        ]);
    }

    public function test_public_registration_is_blocked_on_tenant_host(): void
    {
        $this->postJson('http://default.mospams.local/api/shop-registration', [
                'shopName' => 'Blocked Tenant Host Registration',
                'subdomain' => 'blocked-tenant-host',
                'ownerName' => 'Applicant Owner',
                'ownerEmail' => 'blocked@example.com',
                'planCode' => 'BASIC',
            ])
            ->assertStatus(403);
    }

    public function test_superadmin_can_approve_registration_and_provision_owner_trial(): void
    {
        $registration = $this->postJson('http://mospams.local/api/shop-registration', [
                'shopName' => 'Approve Moto Shop',
                'subdomain' => 'approve-moto',
                'ownerName' => 'Ready Owner',
                'ownerEmail' => 'ready.owner@example.com',
                'planCode' => 'PREMIUM',
            ])
            ->assertCreated();

        $shopId = (int) $registration->json('data.shopId');
        $superAdmin = User::query()->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->firstOrFail();
        $token = $superAdmin->createToken('approval-test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson("http://admin.mospams.local/api/superadmin/shops/{$shopId}/approve-registration")
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['ownerId', 'temporaryPassword', 'trialDays', 'trialEndsAt'],
            ]);

        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'registration_status' => 'APPROVED',
        ]);

        $this->assertDatabaseHas('users', [
            'shop_id_fk' => $shopId,
            'email' => 'ready.owner@example.com',
        ]);

        $this->assertDatabaseHas('shop_subscriptions', [
            'shop_id_fk' => $shopId,
            'subscription_status' => 'ACTIVE',
        ]);

        $this->assertSame(14, (int) $response->json('data.trialDays'));
    }

    public function test_superadmin_can_reject_registration(): void
    {
        $registration = $this->postJson('http://mospams.local/api/shop-registration', [
                'shopName' => 'Reject Moto Shop',
                'subdomain' => 'reject-moto',
                'ownerName' => 'Reject Owner',
                'ownerEmail' => 'reject.owner@example.com',
                'planCode' => 'BASIC',
            ])
            ->assertCreated();

        $shopId = (int) $registration->json('data.shopId');
        $superAdmin = User::query()->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->firstOrFail();
        $token = $superAdmin->createToken('rejection-test')->plainTextToken;

        $this->withToken($token)
            ->postJson("http://admin.mospams.local/api/superadmin/shops/{$shopId}/reject-registration", [
                'reason' => 'Incomplete legal requirements',
            ])
            ->assertOk();

        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'registration_status' => 'REJECTED',
            'registration_rejection_reason' => 'Incomplete legal requirements',
        ]);

        $inactiveStatusId = DB::table('shop_statuses')->where('status_code', 'INACTIVE')->value('shop_status_id');
        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'shop_status_id_fk' => $inactiveStatusId,
        ]);

        $this->assertDatabaseMissing('users', [
            'shop_id_fk' => $shopId,
            'email' => 'reject.owner@example.com',
        ]);
    }
}
