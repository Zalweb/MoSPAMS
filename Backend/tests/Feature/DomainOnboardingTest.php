<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DomainOnboardingTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('tenancy.base_domain', 'mospams.app');

        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);

        $this->owner = $this->createOwner();
    }

    public function test_owner_can_request_custom_domain(): void
    {
        $token = $this->owner->createToken('domain-test', [sprintf('tenant:%d', (int) $this->owner->shop_id_fk)])->plainTextToken;

        $response = $this
            ->withToken($token)
            ->postJson('http://domain-shop.mospams.app/api/shop/domain/request', [
                'customDomain' => 'tenant-example.test',
            ]);

        $response->assertOk()->assertJsonPath('data.domainStatus', 'PENDING_VERIFICATION');

        $this->assertDatabaseHas('shops', [
            'shop_id' => $this->owner->shop_id_fk,
            'custom_domain' => 'tenant-example.test',
            'domain_status' => 'PENDING_VERIFICATION',
        ]);
    }

    private function createOwner(): User
    {
        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $ownerRoleId = DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        $shopId = DB::table('shops')->insertGetId([
            'shop_name' => 'Domain Shop',
            'invitation_code' => 'DOM001',
            'subdomain' => 'domain-shop',
            'shop_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'shop_id_fk' => $shopId,
            'role_id_fk' => $ownerRoleId,
            'full_name' => 'Owner Domain',
            'username' => 'domain-owner@example.com',
            'email' => 'domain-owner@example.com',
            'password_hash' => Hash::make('password'),
            'user_status_id_fk' => $activeUserStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($userId);
    }
}
