<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SuperAdminModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.platform_hosts', ['localhost', 'admin.mospams.app', 'admin.mospams.local']);
        $this->seed();
    }

    private function superAdminToken(): string
    {
        $user = User::query()->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->firstOrFail();

        return $user->createToken('test-superadmin')->plainTextToken;
    }

    private function ownerToken(): string
    {
        $user = User::query()->where('username', env('ADMIN_USERNAME', 'admin'))->firstOrFail();

        return $user->createToken('test-owner')->plainTextToken;
    }

    public function test_superadmin_can_view_platform_analytics(): void
    {
        $token = $this->superAdminToken();

        $this->withToken($token)
            ->getJson('http://admin.mospams.local/api/superadmin/analytics?period=week')
            ->assertOk()
            ->assertJsonStructure([
                'summary' => ['platformSalesRevenue', 'subscriptionRevenue', 'totalRevenue', 'totalShops', 'totalPlatformAdmins'],
                'shopHealth' => ['active', 'suspended', 'pending', 'inactive'],
                'growth' => ['period', 'series', 'total'],
            ]);
    }

    public function test_owner_cannot_access_superadmin_routes(): void
    {
        $token = $this->ownerToken();

        $this->withToken($token)
            ->getJson('http://admin.mospams.local/api/superadmin/analytics')
            ->assertForbidden();
    }

    public function test_superadmin_can_provision_shop_with_pending_defaults(): void
    {
        $token = $this->superAdminToken();

        $response = $this->withToken($token)
            ->postJson('http://admin.mospams.local/api/superadmin/shops', [
                'shopName' => 'Moto Prime',
                'email' => 'motoprime@test.com',
                'ownerName' => 'Prime Owner',
                'ownerEmail' => 'owner@motoprime.com',
            ])
            ->assertCreated()
            ->assertJsonPath('data.statusCode', 'PENDING')
            ->assertJsonPath('data.passwordPolicy', 'manual_reset');

        $shopId = (int) $response->json('data.shopId');

        $pendingStatusId = DB::table('shop_statuses')->where('status_code', 'PENDING')->value('shop_status_id');
        $ownerRoleId = DB::table('roles')->where('role_name', 'Owner')->value('role_id');

        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'shop_status_id_fk' => $pendingStatusId,
        ]);

        $this->assertDatabaseHas('users', [
            'shop_id_fk' => $shopId,
            'role_id_fk' => $ownerRoleId,
            'email' => 'owner@motoprime.com',
        ]);

        $this->assertDatabaseHas('shop_subscriptions', [
            'shop_id_fk' => $shopId,
            'subscription_status' => 'PENDING',
        ]);
    }

    public function test_expired_subscription_is_synced_to_pending_shop_status(): void
    {
        $token = $this->superAdminToken();

        $shopId = DB::table('shops')->value('shop_id');
        $planId = DB::table('subscription_plans')->where('plan_code', 'BASIC')->value('plan_id');
        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $pendingStatusId = DB::table('shop_statuses')->where('status_code', 'PENDING')->value('shop_status_id');

        DB::table('shops')->where('shop_id', $shopId)->update(['shop_status_id_fk' => $activeStatusId]);

        DB::table('shop_subscriptions')->insert([
            'shop_id_fk' => $shopId,
            'plan_id_fk' => $planId,
            'subscription_status' => 'ACTIVE',
            'starts_at' => now()->subDays(40),
            'ends_at' => now()->subDay(),
            'renews_at' => null,
            'created_by_fk' => null,
            'updated_by_fk' => null,
            'created_at' => now()->subDays(40),
            'updated_at' => now()->subDays(40),
        ]);

        $this->withToken($token)->getJson('http://admin.mospams.local/api/superadmin/analytics')->assertOk();

        $this->assertDatabaseHas('shop_subscriptions', [
            'shop_id_fk' => $shopId,
            'subscription_status' => 'EXPIRED',
        ]);

        $this->assertDatabaseHas('shops', [
            'shop_id' => $shopId,
            'shop_status_id_fk' => $pendingStatusId,
        ]);
    }

    public function test_superadmin_is_blocked_from_tenant_shop_routes(): void
    {
        $token = $this->superAdminToken();

        $this->withToken($token)
            ->getJson('/api/parts')
            ->assertForbidden();
    }
}
