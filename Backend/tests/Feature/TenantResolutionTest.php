<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureTenantUser;
use App\Models\Shop;
use App\Models\User;
use App\Support\Tenancy\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class TenantResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('tenancy.base_domain', 'mospams.app');
        config()->set('tenancy.public_hosts', ['mospams.app']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.app']);
        config()->set('tenancy.api_hosts', ['api.mospams.app']);

        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
    }

    public function test_public_shop_info_returns_tenant_branding(): void
    {
        [$shopId] = $this->createShopAndOwner('Resolver Shop', 'resolver-shop');
        $response = $this->getJson('http://resolver-shop.mospams.app/api/shop/info');

        $response->assertOk()->assertJsonStructure([
            'data' => ['shopId', 'shopName', 'subdomain', 'primaryColor', 'secondaryColor'],
        ])->assertJsonPath('data.shopId', $shopId);
    }

    public function test_unknown_domain_returns_not_found(): void
    {
        config()->set('tenancy.allow_localhost_fallback', false);
        $response = $this->getJson('/api/shop/info');

        $response->assertStatus(404);
    }

    public function test_api_host_requires_tenant_header_for_tenant_bootstrap_endpoint(): void
    {
        $this->getJson('http://api.mospams.app/api/shop/info')
            ->assertStatus(400);
    }

    public function test_api_host_resolves_tenant_using_tenant_host_header(): void
    {
        [$shopId] = $this->createShopAndOwner('API Resolver Shop', 'api-resolver');

        $this->withHeaders(['X-Tenant-Host' => 'api-resolver.mospams.app'])
            ->getJson('http://api.mospams.app/api/shop/info')
            ->assertOk()
            ->assertJsonPath('data.shopId', $shopId);
    }

    public function test_tenant_mismatch_is_blocked_when_enforcement_enabled(): void
    {
        config()->set('tenancy.enforcement_mode', 'enforce');

        [$shopA, $userA] = $this->createShopAndOwner('Shop A', 'shop-a');
        [$shopB] = $this->createShopAndOwner('Shop B', 'shop-b');

        /** @var TenantManager $tenant */
        $tenant = app(TenantManager::class);
        $tenant->setCurrent(Shop::query()->findOrFail($shopB));

        $request = Request::create('/api/categories', 'GET');
        $request->setUserResolver(fn () => $userA);

        $middleware = app(EnsureTenantUser::class);

        try {
            $middleware->handle($request, fn () => response()->noContent());
            $this->fail('Expected tenant mismatch to abort.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $this->assertDatabaseHas('tenant_audit_events', [
            'event_code' => 'tenant_user_mismatch',
        ]);
    }

    private function createShopAndOwner(string $shopName, string $subdomain): array
    {
        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $ownerRoleId = DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        $shopId = DB::table('shops')->insertGetId([
            'shop_name' => $shopName,
            'invitation_code' => strtoupper(substr($subdomain, 0, 6)).'01',
            'subdomain' => $subdomain,
            'shop_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'shop_id_fk' => $shopId,
            'role_id_fk' => $ownerRoleId,
            'full_name' => 'Owner '.$shopName,
            'username' => $subdomain.'@example.com',
            'email' => $subdomain.'@example.com',
            'password_hash' => Hash::make('password'),
            'user_status_id_fk' => $activeUserStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$shopId, User::findOrFail($userId)];
    }
}
