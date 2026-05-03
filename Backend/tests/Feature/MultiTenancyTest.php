<?php

namespace Tests\Feature;

use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.platform_hosts', ['localhost', 'admin.mospams.app', 'admin.mospams.local']);
        config()->set('tenancy.public_hosts', ['mospams.app']);
        config()->set('tenancy.api_hosts', ['api.mospams.app']);
        config()->set('tenancy.base_domain', 'mospams.app');
        config()->set('tenancy.enforcement_mode', 'shadow');
        config()->set('tenancy.allow_localhost_fallback', true);
        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
    }

    public function test_user_can_only_see_their_own_shop_parts()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $response = $this->actingAs($userA)->getJson("http://{$shopA->subdomain}.mospams.app/api/parts");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['name' => 'Part A']);
        $response->assertJsonMissing(['name' => 'Part B']);
    }

    public function test_user_cannot_access_other_shop_part_by_id()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        // Try to update Shop B's part from Shop A user
        $response = $this->actingAs($userA)->patchJson("http://{$shopA->subdomain}.mospams.app/api/parts/{$partB}", ['name' => 'Hacked']);

        $response->assertNotFound();
    }

    public function test_user_cannot_update_other_shop_part()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $response = $this->actingAs($userA)->patchJson("http://{$shopA->subdomain}.mospams.app/api/parts/{$partB}", [
            'name' => 'Hacked Part',
        ]);

        $response->assertNotFound();
        $this->assertDatabaseMissing('parts', ['part_name' => 'Hacked Part']);
    }

    public function test_user_cannot_delete_other_shop_part()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $response = $this->actingAs($userA)->deleteJson("http://{$shopA->subdomain}.mospams.app/api/parts/{$partB}");

        $response->assertNotFound();
        $this->assertDatabaseHas('parts', ['part_id' => $partB]);
    }

    public function test_user_can_only_see_their_own_shop_services()
    {
        [$shopA, $userA] = $this->createShopWithUser('Shop A');
        [$shopB, $userB] = $this->createShopWithUser('Shop B');

        $serviceA = $this->createService($shopA->shop_id, 'Customer A');
        $serviceB = $this->createService($shopB->shop_id, 'Customer B');

        $response = $this->actingAs($userA)->getJson("http://{$shopA->subdomain}.mospams.app/api/services");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['customerName' => 'Customer A']);
        $response->assertJsonMissing(['customerName' => 'Customer B']);
    }

    public function test_user_can_only_see_their_own_shop_transactions()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $saleA = $this->createSale($shopA->shop_id, $userA->user_id);
        $saleB = $this->createSale($shopB->shop_id, $userB->user_id);

        $response = $this->actingAs($userA)->getJson("http://{$shopA->subdomain}.mospams.app/api/transactions");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_user_can_only_see_their_own_shop_users()
    {
        [$shopA, $userA] = $this->createShopWithUser('Shop A');
        [$shopB, $userB] = $this->createShopWithUser('Shop B');

        $response = $this->actingAs($userA)->getJson("http://{$shopA->subdomain}.mospams.app/api/users");

        $response->assertOk();
        $this->assertTrue(count($response->json('data')) === 1);
    }

    public function test_reports_are_scoped_to_shop()
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $saleA = $this->createSale($shopA->shop_id, $userA->user_id, 1000);
        $saleB = $this->createSale($shopB->shop_id, $userB->user_id, 5000);

        $response = $this->actingAs($userA)->getJson("http://{$shopA->subdomain}.mospams.app/api/reports/sales");

        $response->assertOk();
        $response->assertJson(['data' => ['totalRevenue' => 1000]]);
    }

    public function test_superadmin_must_use_dedicated_platform_endpoints()
    {
        $superAdmin = $this->createSuperAdmin();
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');
        [$shopB, $userB, $partB] = $this->createShopWithUserAndPart('Shop B');

        $tenantResponse = $this->actingAs($superAdmin)->getJson("http://{$shopA->subdomain}.mospams.app/api/parts");
        $tenantResponse->assertForbidden();

        $platformResponse = $this->actingAs($superAdmin)->getJson('http://admin.mospams.local/api/superadmin/shops');
        $platformResponse->assertOk();
        $this->assertGreaterThanOrEqual(2, count($platformResponse->json('data')));
    }

    public function test_tenant_routes_are_blocked_on_public_host(): void
    {
        [$shopA, $userA, $partA] = $this->createShopWithUserAndPart('Shop A');

        $response = $this->actingAs($userA)->getJson('http://mospams.app/api/parts');

        $response->assertForbidden();
    }

    public function test_suspended_shop_users_cannot_access_system()
    {
        [$shop, $user, $part] = $this->createShopWithUserAndPart('Shop A');

        // Suspend the shop
        DB::table('shops')->where('shop_id', $shop->shop_id)->update([
            'shop_status_id_fk' => DB::table('shop_statuses')->where('status_code', 'SUSPENDED')->value('shop_status_id'),
        ]);

        $response = $this->actingAs($user)->getJson("http://{$shop->subdomain}.mospams.app/api/parts");

        $response->assertStatus(503);
    }

    public function test_categories_are_shop_specific()
    {
        [$shopA, $userA] = $this->createShopWithUser('Shop A');
        [$shopB, $userB] = $this->createShopWithUser('Shop B');

        // Both shops create a part with the same category name
        $responseA = $this->actingAs($userA)->postJson("http://{$shopA->subdomain}.mospams.app/api/parts", [
            'name' => 'Brake Pad A',
            'category' => 'Brakes',
            'stock' => 10,
            'minStock' => 5,
            'price' => 100,
        ]);

        $responseB = $this->actingAs($userB)->postJson("http://{$shopB->subdomain}.mospams.app/api/parts", [
            'name' => 'Brake Pad B',
            'category' => 'Brakes',
            'stock' => 20,
            'minStock' => 5,
            'price' => 200,
        ]);

        // Verify both requests succeeded
        $responseA->assertStatus(201);
        $responseB->assertStatus(201);

        // Each shop should have their own "Brakes" category
        $categoriesA = DB::table('categories')->where('shop_id_fk', $shopA->shop_id)->where('category_name', 'Brakes')->count();
        $categoriesB = DB::table('categories')->where('shop_id_fk', $shopB->shop_id)->where('category_name', 'Brakes')->count();

        $this->assertEquals(1, $categoriesA);
        $this->assertEquals(1, $categoriesB);
    }

    // Helper methods

    private function createShopWithUser(string $shopName): array
    {
        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $ownerRoleId = DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        $subdomain = strtolower(str_replace(' ', '-', $shopName)).'-'.rand(100, 999);

        $shopId = DB::table('shops')->insertGetId([
            'shop_name' => $shopName,
            'invitation_code' => strtoupper(substr(preg_replace('/\s+/', '', $shopName), 0, 6)).rand(10, 99),
            'subdomain' => $subdomain,
            'shop_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'shop_id_fk' => $shopId,
            'role_id_fk' => $ownerRoleId,
            'full_name' => 'Owner of ' . $shopName,
            'username' => strtolower(str_replace(' ', '', $shopName)) . '@test.com',
            'password_hash' => Hash::make('password'),
            'user_status_id_fk' => $activeUserStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shop = (object) ['shop_id' => $shopId, 'shop_name' => $shopName, 'subdomain' => $subdomain];
        $user = User::find($userId);

        return [$shop, $user];
    }

    private function createShopWithUserAndPart(string $shopName): array
    {
        [$shop, $user] = $this->createShopWithUser($shopName);

        $categoryId = DB::table('categories')->insertGetId([
            'shop_id_fk' => $shop->shop_id,
            'category_name' => 'Test Category',
            'category_status_id_fk' => DB::table('category_statuses')->where('status_code', 'active')->value('category_status_id'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $partId = DB::table('parts')->insertGetId([
            'shop_id_fk' => $shop->shop_id,
            'category_id_fk' => $categoryId,
            'part_name' => 'Part ' . substr($shopName, -1),
            'unit_price' => 100,
            'stock_quantity' => 10,
            'reorder_level' => 5,
            'part_status_id_fk' => DB::table('part_statuses')->where('status_code', 'in_stock')->value('part_status_id'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$shop, $user, $partId];
    }

    private function createService(int $shopId, string $customerName): int
    {
        $customerId = DB::table('customers')->insertGetId([
            'shop_id_fk' => $shopId,
            'full_name' => $customerName,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->where('shop_id_fk', $shopId)->value('user_id');

        return DB::table('service_jobs')->insertGetId([
            'shop_id_fk' => $shopId,
            'customer_id_fk' => $customerId,
            'created_by_fk' => $userId,
            'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id'),
            'job_date' => now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createSale(int $shopId, int $userId, float $amount = 1000): int
    {
        return DB::table('sales')->insertGetId([
            'shop_id_fk' => $shopId,
            'processed_by_fk' => $userId,
            'sale_type' => 'parts-only',
            'total_amount' => $amount,
            'net_amount' => $amount,
            'sale_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createSuperAdmin(): User
    {
        $superAdminRoleId = DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        $userId = DB::table('users')->insertGetId([
            'shop_id_fk' => null,
            'role_id_fk' => $superAdminRoleId,
            'full_name' => 'Super Admin',
            'username' => 'superadmin@test.com',
            'password_hash' => Hash::make('password'),
            'user_status_id_fk' => $activeUserStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::find($userId);
    }
}
