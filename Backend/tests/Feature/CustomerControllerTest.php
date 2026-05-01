<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
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
        DB::table('service_type_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
        ]);
        DB::table('service_job_statuses')->insert([
            ['status_code' => 'PENDING', 'status_name' => 'Pending', 'description' => null],
            ['status_code' => 'ONGOING', 'status_name' => 'Ongoing', 'description' => null],
            ['status_code' => 'COMPLETED', 'status_name' => 'Completed', 'description' => null],
        ]);
        DB::table('service_types')->insert([
            ['service_name' => 'Oil Change', 'labor_cost' => 500, 'service_type_status_id_fk' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['service_name' => 'Tune Up', 'labor_cost' => 800, 'service_type_status_id_fk' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createCustomer(array $seed, string $email): object
    {
        $id = DB::table('users')->insertGetId([
            'full_name'         => 'Test Customer',
            'username'          => $email,
            'email'             => $email,
            'password_hash'     => Hash::make('password'),
            'role_id_fk'        => $seed['roles']['Customer'],
            'user_status_id_fk' => $seed['activeId'],
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        DB::table('customers')->insert([
            'user_id_fk' => $id,
            'full_name'  => 'Test Customer',
            'email'      => $email,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return DB::table('users')->where('user_id', $id)->first();
    }

    private function actingAsCustomer(array $seed, string $email): self
    {
        $customer = $this->createCustomer($seed, $email);
        $token = \App\Models\User::find($customer->user_id)->createToken('test')->plainTextToken;
        return $this->withToken($token);
    }

    public function test_customer_can_view_their_services(): void
    {
        $seed = $this->seedBase();
        $this->actingAsCustomer($seed, 'customer@test.com');

        $response = $this->getJson('/api/customer/services');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }

    public function test_customer_can_create_service_request(): void
    {
        $seed = $this->seedBase();

        $response = $this->actingAsCustomer($seed, 'customer@test.com')->postJson('/api/customer/services', [
            'motorcycle_model' => 'Honda Click 150i',
            'service_type'     => 'Oil Change',
            'notes'            => 'Please check brakes too',
        ]);

        $response->assertOk()->assertJsonStructure(['id', 'customer_name', 'status']);
        $this->assertDatabaseHas('service_jobs', ['motorcycle_model' => 'Honda Click 150i']);
    }

    public function test_customer_can_view_their_payments(): void
    {
        $seed = $this->seedBase();
        $this->actingAsCustomer($seed, 'customer@test.com');

        $response = $this->getJson('/api/customer/payments');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }
}
