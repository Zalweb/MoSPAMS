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
        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->insert(['role_name' => $role]);
        }
        DB::table('user_statuses')->insert([
            ['status_code' => 'ACTIVE',   'status_name' => 'Active',   'description' => null],
            ['status_code' => 'INACTIVE', 'status_name' => 'Inactive', 'description' => null],
        ]);
        DB::table('mechanic_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createUser(array $seed, string $role, array $extra = []): object
    {
        $id = DB::table('users')->insertGetId(array_merge([
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
        $admin = $this->createUser($seed, 'Admin');
        $token = \App\Models\User::find($admin->user_id)->createToken('test')->plainTextToken;
        return $this->withToken($token);
    }

    public function test_admin_can_list_pending_role_requests(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c@test.com']);
        DB::table('role_requests')->insert([
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->getJson('/api/role-requests');
        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_approve_role_request(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c2@test.com']);
        $requestId = DB::table('role_requests')->insertGetId([
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("/api/role-requests/{$requestId}/approve");
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
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Mechanic'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("/api/role-requests/{$requestId}/deny");
        $response->assertOk();
        $this->assertDatabaseHas('role_requests', ['id' => $requestId, 'status' => 'denied']);
    }
}
