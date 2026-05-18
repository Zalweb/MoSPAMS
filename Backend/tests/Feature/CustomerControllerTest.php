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
        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
        
        $shopId = DB::table('shops')->value('shop_id');
        $serviceTypeStatusId = DB::table('service_type_statuses')->where('status_code', 'active')->value('service_type_status_id');
        
        DB::table('service_types')->insert([
            ['shop_id_fk' => $shopId, 'service_name' => 'Oil Change', 'labor_cost' => 500, 'service_type_status_id_fk' => $serviceTypeStatusId, 'created_at' => now(), 'updated_at' => now()],
            ['shop_id_fk' => $shopId, 'service_name' => 'Tune Up', 'labor_cost' => 800, 'service_type_status_id_fk' => $serviceTypeStatusId, 'created_at' => now(), 'updated_at' => now()],
        ]);
        
        return [
            'shopId' => $shopId,
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
        ];
    }

    private function createCustomer(array $seed, string $email): object
    {
        $id = DB::table('users')->insertGetId([
            'shop_id_fk'        => $seed['shopId'],
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
            'shop_id_fk' => $seed['shopId'],
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
        $token = \App\Models\User::find($customer->user_id)
            ->createToken('test', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;
        return $this->withToken($token);
    }

    public function test_customer_can_view_their_services(): void
    {
        $seed = $this->seedBase();
        $this->actingAsCustomer($seed, 'customer@test.com');

        $response = $this->getJson('http://default.mospams.local/api/customer/services');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }

    public function test_customer_can_create_service_request(): void
    {
        $seed = $this->seedBase();

        $response = $this->actingAsCustomer($seed, 'customer@test.com')->postJson('http://default.mospams.local/api/customer/services', [
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

        $response = $this->getJson('http://default.mospams.local/api/customer/payments');

        $response->assertOk()->assertJsonStructure(['data' => []]);
    }

    public function test_customer_can_cancel_a_pending_service(): void
    {
        $seed     = $this->seedBase();
        $customer = $this->createCustomer($seed, 'customer@test.com');
        $token    = \App\Models\User::find($customer->user_id)
            ->createToken('test', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;

        $customerId      = DB::table('customers')->where('user_id_fk', $customer->user_id)->value('customer_id');
        $pendingStatusId = DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');

        $jobId = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $seed['shopId'],
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $customer->user_id,
            'service_job_status_id_fk' => $pendingStatusId,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda Click',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $this->withToken($token)
            ->deleteJson("http://default.mospams.local/api/customer/services/{$jobId}")
            ->assertOk()
            ->assertJsonPath('message', 'Service cancelled successfully');

        $cancelledStatusId = DB::table('service_job_statuses')->where('status_code', 'cancelled')->value('service_job_status_id');
        $this->assertDatabaseHas('service_jobs', [
            'job_id'                   => $jobId,
            'service_job_status_id_fk' => $cancelledStatusId,
        ]);
    }

    public function test_customer_cannot_cancel_a_non_pending_service(): void
    {
        $seed     = $this->seedBase();
        $customer = $this->createCustomer($seed, 'customer@test.com');
        $token    = \App\Models\User::find($customer->user_id)
            ->createToken('test', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;

        $customerId        = DB::table('customers')->where('user_id_fk', $customer->user_id)->value('customer_id');
        $inProgressStatusId = DB::table('service_job_statuses')->where('status_code', 'in_progress')->value('service_job_status_id');

        $jobId = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $seed['shopId'],
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $customer->user_id,
            'service_job_status_id_fk' => $inProgressStatusId,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Yamaha Mio',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $this->withToken($token)
            ->deleteJson("http://default.mospams.local/api/customer/services/{$jobId}")
            ->assertStatus(400);
    }

    public function test_customer_cannot_cancel_another_customers_service(): void
    {
        $seed      = $this->seedBase();
        $customer1 = $this->createCustomer($seed, 'customer1@test.com');
        $customer2 = $this->createCustomer($seed, 'customer2@test.com');

        $token1 = \App\Models\User::find($customer1->user_id)
            ->createToken('c1', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;
        $token2 = \App\Models\User::find($customer2->user_id)
            ->createToken('c2', [sprintf('tenant:%d', (int) $seed['shopId'])])
            ->plainTextToken;

        $customer1Id     = DB::table('customers')->where('user_id_fk', $customer1->user_id)->value('customer_id');
        $pendingStatusId = DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');

        $jobId = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $seed['shopId'],
            'customer_id_fk'           => $customer1Id,
            'created_by_fk'            => $customer1->user_id,
            'service_job_status_id_fk' => $pendingStatusId,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Kawasaki Barako',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $this->withToken($token2)
            ->deleteJson("http://default.mospams.local/api/customer/services/{$jobId}")
            ->assertStatus(404);

        $this->assertDatabaseHas('service_jobs', [
            'job_id'                   => $jobId,
            'service_job_status_id_fk' => $pendingStatusId,
        ]);
    }
}
