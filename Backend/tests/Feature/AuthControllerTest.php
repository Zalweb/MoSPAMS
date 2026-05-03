<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        $this->seed();
    }

    public function test_owner_can_login_only_on_their_shop_host(): void
    {
        $shopId = (int) DB::table('shops')->value('shop_id');
        $ownerRoleId = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeStatusId = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        DB::table('users')->insert([
            'shop_id_fk' => $shopId,
            'role_id_fk' => $ownerRoleId,
            'full_name' => 'Owner User',
            'username' => 'owner@test.com',
            'email' => 'owner@test.com',
            'password_hash' => Hash::make('password123'),
            'user_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->postJson('http://default.mospams.local/api/login', [
                'email' => 'owner@test.com',
                'password' => 'password123',
            ])
            ->assertOk()
            ->assertJsonPath('user.role', 'Owner');

        $this->postJson('http://admin.mospams.local/api/login', [
                'email' => 'owner@test.com',
                'password' => 'password123',
            ])
            ->assertStatus(422);
    }

    public function test_superadmin_can_login_only_on_platform_host(): void
    {
        $superadmin = DB::table('users')->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->first();
        $this->assertNotNull($superadmin);

        $this->postJson('http://admin.mospams.local/api/login', [
                'email' => env('SUPERADMIN_USERNAME', 'superadmin'),
                'password' => env('SUPERADMIN_PASSWORD', 'superadmin123'),
            ])
            ->assertOk()
            ->assertJsonPath('user.role', 'SuperAdmin');

        $this->postJson('http://default.mospams.local/api/login', [
                'email' => env('SUPERADMIN_USERNAME', 'superadmin'),
                'password' => env('SUPERADMIN_PASSWORD', 'superadmin123'),
            ])
            ->assertStatus(422);
    }

    public function test_api_host_requires_tenant_host_header_for_login(): void
    {
        $this->postJson('http://api.mospams.local/api/login', [
                'email' => env('SUPERADMIN_USERNAME', 'superadmin'),
                'password' => env('SUPERADMIN_PASSWORD', 'superadmin123'),
            ])
            ->assertStatus(400);
    }

    public function test_superadmin_can_login_through_api_host_with_platform_context_header(): void
    {
        $this->withHeaders(['X-Tenant-Host' => 'admin.mospams.local'])
            ->postJson('http://api.mospams.local/api/login', [
                'email' => env('SUPERADMIN_USERNAME', 'superadmin'),
                'password' => env('SUPERADMIN_PASSWORD', 'superadmin123'),
            ])
            ->assertOk()
            ->assertJsonPath('user.role', 'SuperAdmin');
    }
}
