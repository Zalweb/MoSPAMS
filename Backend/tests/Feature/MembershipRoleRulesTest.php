<?php

namespace Tests\Feature;

use App\Models\Shop;
use App\Models\User;
use App\Services\Identity\AccountProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MembershipRoleRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        $this->seed();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_existing_customer_can_join_a_second_shop_after_login(): void
    {
        [$shopA, $shopB] = $this->twoActiveShops();
        $user = $this->createTenantUser('customer@example.com', 'Customer', $shopA->shop_id, 'password123');

        $login = $this->postJson("http://{$shopB->subdomain}.mospams.local/api/login", [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $login->assertOk()->assertJson([
            'needs_membership' => true,
            'allowed_join_role' => 'Customer',
            'shop' => [
                'shopId' => (string) $shopB->shop_id,
            ],
        ]);

        $join = $this->postJson("http://{$shopB->subdomain}.mospams.local/api/join-shop", [
            'join_token' => $login->json('join_token'),
        ]);

        $join->assertOk()->assertJsonPath('user.role', 'Customer')
            ->assertJsonPath('user.shopId', (string) $shopB->shop_id);

        $accountId = (int) $user->account_id_fk;
        $customerRoleId = (int) DB::table('roles')->where('role_name', 'Customer')->value('role_id');

        $this->assertDatabaseHas('shop_memberships', [
            'account_id_fk' => $accountId,
            'shop_id_fk' => $shopB->shop_id,
            'role_id_fk' => $customerRoleId,
        ]);
    }

    public function test_owner_can_join_another_shop_as_customer_but_not_as_staff(): void
    {
        [$shopA, $shopB] = $this->twoActiveShops();
        $ownerA = $this->createTenantUser('owner-a@example.com', 'Owner', $shopA->shop_id, 'password123');
        $ownerB = $this->createTenantUser('owner-b@example.com', 'Owner', $shopB->shop_id, 'password123');

        $login = $this->postJson("http://{$shopB->subdomain}.mospams.local/api/login", [
            'email' => 'owner-a@example.com',
            'password' => 'password123',
        ]);

        $login->assertOk()->assertJson(['needs_membership' => true]);

        $this->postJson("http://{$shopB->subdomain}.mospams.local/api/join-shop", [
            'join_token' => $login->json('join_token'),
        ])->assertOk()->assertJsonPath('user.role', 'Customer');

        $token = User::findOrFail($ownerB->user_id)->createToken('owner-b', [sprintf('tenant:%d', (int) $shopB->shop_id)])->plainTextToken;

        $this->withToken($token)->postJson("http://{$shopB->subdomain}.mospams.local/api/users", [
            'name' => 'Cross Shop Staff',
            'email' => 'owner-a@example.com',
            'role' => 'Staff',
            'password' => 'password123',
        ])->assertStatus(422);

        $this->assertDatabaseHas('shop_memberships', [
            'account_id_fk' => $ownerA->account_id_fk,
            'shop_id_fk' => $shopB->shop_id,
            'role_id_fk' => DB::table('roles')->where('role_name', 'Customer')->value('role_id'),
        ]);
    }

    public function test_role_request_approval_is_blocked_when_account_has_work_role_in_another_shop(): void
    {
        [$shopA, $shopB] = $this->twoActiveShops();
        $ownerA = $this->createTenantUser('owner-a@example.com', 'Owner', $shopA->shop_id, 'password123');
        $ownerB = $this->createTenantUser('owner-b@example.com', 'Owner', $shopB->shop_id, 'password123');

        $provisioner = app(AccountProvisioner::class);
        $customerMembership = $provisioner->createOrUpdateMembership((int) $ownerA->account_id_fk, (int) $shopB->shop_id, 'Customer');
        $customerUser = $provisioner->ensureTenantUser((int) $ownerA->account_id_fk, (int) $shopB->shop_id, 'Customer');

        $requestId = DB::table('role_requests')->insertGetId([
            'shop_id_fk' => $shopB->shop_id,
            'user_id_fk' => $customerUser->user_id,
            'account_id_fk' => $ownerA->account_id_fk,
            'membership_id_fk' => $customerMembership->membership_id,
            'requested_role_id_fk' => DB::table('roles')->where('role_name', 'Staff')->value('role_id'),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = User::findOrFail($ownerB->user_id)->createToken('owner-b', [sprintf('tenant:%d', (int) $shopB->shop_id)])->plainTextToken;

        $this->withToken($token)
            ->patchJson("http://{$shopB->subdomain}.mospams.local/api/role-requests/{$requestId}/approve")
            ->assertStatus(422);

        $this->assertDatabaseHas('role_requests', [
            'id' => $requestId,
            'status' => 'pending',
        ]);
    }

    public function test_superadmin_cannot_provision_a_new_shop_with_an_owner_who_already_has_a_work_role(): void
    {
        [$shopA] = $this->twoActiveShops();
        $this->createTenantUser('owner-a@example.com', 'Owner', $shopA->shop_id, 'password123');

        $superAdmin = User::query()->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->firstOrFail();
        $token = $superAdmin->createToken('platform-test', ['platform:*'])->plainTextToken;

        $this->withToken($token)
            ->postJson('http://admin.mospams.local/api/superadmin/shops', [
                'shopName' => 'Third Shop',
                'subdomain' => 'third-shop',
                'ownerName' => 'Existing Owner',
                'ownerEmail' => 'owner-a@example.com',
            ])
            ->assertStatus(422);
    }

    private function twoActiveShops(): array
    {
        $shopA = Shop::query()->orderBy('shop_id')->firstOrFail();
        $activeStatusId = (int) DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $shopB = Shop::query()->create([
            'shop_name' => 'Second Shop',
            'subdomain' => 'second-shop',
            'invitation_code' => 'SECOND01',
            'shop_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$shopA, $shopB];
    }

    private function createTenantUser(string $email, string $role, int $shopId, string $password): User
    {
        $provisioner = app(AccountProvisioner::class);
        $account = $provisioner->createOrUpdateAccount(ucfirst(strtok($email, '@')), $email, $password);
        if (! $account->email_verified_at) {
            $account->update(['email_verified_at' => now()]);
        }
        $provisioner->createOrUpdateMembership($account, $shopId, $role);

        return $provisioner->ensureTenantUser($account, $shopId, $role, $password);
    }
}
