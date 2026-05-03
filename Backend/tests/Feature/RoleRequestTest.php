<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleRequestTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
        
        return [
            'shopId' => DB::table('shops')->value('shop_id'),
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
        ];
    }

    private function createUser(array $seed, string $role, array $extra = []): object
    {
        $id = DB::table('users')->insertGetId(array_merge([
            'shop_id_fk'        => $seed['shopId'],
            'full_name'         => 'Test User',
            'username'          => 'user_' . uniqid(),
            'password_hash'     => Hash::make('password'),
            'role_id_fk'        => $seed['roles'][$role],
            'user_status_id_fk' => $seed['activeId'],
            'created_at'        => now(),
            'updated_at'        => now(),
        ], $extra));
        return DB::table('users')->where('user_id', $id)->first();
    }

    private function actingAsAdmin(array $seed): static
    {
        $admin = $this->createUser($seed, 'Owner');
        $token = \App\Models\User::find($admin->user_id)
            ->createToken('test', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;
        return $this->withToken($token);
    }

    public function test_admin_can_list_pending_role_requests(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c@test.com']);
        DB::table('role_requests')->insert([
            'shop_id_fk'             => $seed['shopId'],
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->getJson('http://default.mospams.local/api/role-requests');
        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_approve_role_request(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c2@test.com']);
        $requestId = DB::table('role_requests')->insertGetId([
            'shop_id_fk'             => $seed['shopId'],
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("http://default.mospams.local/api/role-requests/{$requestId}/approve");
        $response->assertOk();

        $updated = DB::table('users')->where('user_id', $customer->user_id)->first();
        $this->assertEquals($seed['roles']['Staff'], $updated->role_id_fk);
        $this->assertDatabaseHas('role_requests', ['id' => $requestId, 'status' => 'approved']);
    }

    public function test_admin_can_deny_role_request(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c3@test.com']);
        $requestId = DB::table('role_requests')->insertGetId([
            'shop_id_fk'             => $seed['shopId'],
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Mechanic'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("http://default.mospams.local/api/role-requests/{$requestId}/deny");
        $response->assertOk();
        $this->assertDatabaseHas('role_requests', ['id' => $requestId, 'status' => 'denied']);
    }
}
