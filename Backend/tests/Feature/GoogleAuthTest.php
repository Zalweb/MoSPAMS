<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->insert(['role_name' => $role]);
        }
        DB::table('user_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
            ['status_code' => 'INACTIVE', 'status_name' => 'Inactive', 'description' => null],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createUser(array $seed, string $role = 'Customer', array $extra = []): object
    {
        $id = DB::table('users')->insertGetId(array_merge([
            'full_name'          => 'Test User',
            'username'           => 'testuser_' . uniqid(),
            'password_hash'      => Hash::make('password'),
            'role_id_fk'         => $seed['roles'][$role],
            'user_status_id_fk'  => $seed['activeId'],
            'created_at'         => now(),
            'updated_at'         => now(),
        ], $extra));
        return DB::table('users')->where('user_id', $id)->first();
    }

    public function test_google_login_returns_needs_registration_for_new_user(): void
    {
        $this->seedBase();
        config(['services.google.client_id' => 'test-client-id']);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response([
                'sub'   => 'google_sub_new',
                'email' => 'new@example.com',
                'name'  => 'New User',
                'aud'   => 'test-client-id',
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/google', ['credential' => 'fake-token']);

        $response->assertOk()->assertJson([
            'needs_registration' => true,
            'google_data'        => ['email' => 'new@example.com', 'name' => 'New User'],
        ]);
    }

    public function test_google_login_returns_token_for_existing_user(): void
    {
        $seed = $this->seedBase();
        config(['services.google.client_id' => 'test-client-id']);

        $this->createUser($seed, 'Customer', [
            'email'     => 'existing@example.com',
            'google_id' => 'google_sub_existing',
        ]);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response([
                'sub'   => 'google_sub_existing',
                'email' => 'existing@example.com',
                'name'  => 'Existing User',
                'aud'   => 'test-client-id',
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/google', ['credential' => 'fake-token']);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_google_register_creates_customer_and_returns_token(): void
    {
        $seed = $this->seedBase();

        $response = $this->postJson('/api/auth/google/register', [
            'google_id'       => 'google_sub_123',
            'name'            => 'New Customer',
            'email'           => 'customer@example.com',
            'password'        => 'password123',
            'requested_role'  => 'customer',
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertDatabaseHas('users', ['email' => 'customer@example.com', 'google_id' => 'google_sub_123']);
        $this->assertDatabaseHas('customers', ['email' => 'customer@example.com']);
        $this->assertDatabaseMissing('role_requests', ['status' => 'pending']);
    }

    public function test_google_register_creates_role_request_for_staff(): void
    {
        $seed = $this->seedBase();

        $response = $this->postJson('/api/auth/google/register', [
            'google_id'      => 'google_sub_456',
            'name'           => 'New Staff',
            'email'          => 'staff@example.com',
            'password'       => 'password123',
            'requested_role' => 'staff',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('role_requests', ['status' => 'pending']);
        $user = DB::table('users')->where('email', 'staff@example.com')->first();
        $customerRoleId = $seed['roles']['Customer'];
        $this->assertEquals($customerRoleId, $user->role_id_fk);
    }
}
