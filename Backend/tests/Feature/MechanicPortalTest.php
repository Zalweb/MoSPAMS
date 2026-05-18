<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MechanicPortalTest extends TestCase
{
    use RefreshDatabase;

    private int $shopId;
    private int $mechanicUserId;
    private int $mechanicId;
    private int $ownerId;
    private int $serviceTypeId;
    private string $mechanicToken;
    private string $ownerToken;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        $this->seed();

        $this->shopId     = (int) DB::table('shops')->value('shop_id');
        $activeStatus     = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        $mechanicRoleId   = (int) DB::table('roles')->where('role_name', 'Mechanic')->value('role_id');
        $ownerRoleId      = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');

        $this->ownerId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $ownerRoleId,
            'full_name'         => 'Portal Owner',
            'username'          => 'owner@portal.com',
            'email'             => 'owner@portal.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $this->mechanicUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $mechanicRoleId,
            'full_name'         => 'Jose Mechanic',
            'username'          => 'jose@mechanic.com',
            'email'             => 'jose@mechanic.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $mechanicStatus = (int) DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');
        $this->mechanicId = (int) DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'user_id_fk'            => $this->mechanicUserId,
            'full_name'             => 'Jose Mechanic',
            'mechanic_status_id_fk' => $mechanicStatus,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);

        $stStatusId = (int) DB::table('service_type_statuses')->where('status_code', 'active')->value('service_type_status_id');
        $this->serviceTypeId = (int) DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Oil Change',
            'labor_cost'                => 350.00,
            'service_type_status_id_fk' => $stStatusId,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);

        $this->mechanicToken = \App\Models\User::find($this->mechanicUserId)
            ->createToken('mechanic', [sprintf('tenant:%d', $this->shopId)])
            ->plainTextToken;

        $this->ownerToken = \App\Models\User::find($this->ownerId)
            ->createToken('owner', [sprintf('tenant:%d', $this->shopId)])
            ->plainTextToken;
    }

    public function test_mechanic_can_get_job_details(): void
    {
        $jobId = $this->createJobInStatus('booked_confirmed');
        $this->assignMechanic($jobId);

        $response = $this->withToken($this->mechanicToken)
            ->getJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}");

        $response->assertOk()
            ->assertJsonPath('data.id', (string) $jobId)
            ->assertJsonPath('data.motorcycleModel', 'Honda Click')
            ->assertJsonStructure(['data' => ['id', 'customerName', 'motorcycleModel', 'status', 'statusCode']]);
    }

    public function test_mechanic_cannot_get_details_of_unassigned_job(): void
    {
        $otherMechanicUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => (int) DB::table('roles')->where('role_name', 'Mechanic')->value('role_id'),
            'full_name'         => 'Other Mechanic',
            'username'          => 'other@mechanic.com',
            'email'             => 'other@mechanic.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $otherMechanicStatus  = (int) DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');
        $otherMechanicId = (int) DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'user_id_fk'            => $otherMechanicUserId,
            'full_name'             => 'Other Mechanic',
            'mechanic_status_id_fk' => $otherMechanicStatus,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);

        // Job assigned to otherMechanic, NOT to $this->mechanicId
        $jobId = $this->createJobInStatus('booked_confirmed');
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $otherMechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->getJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}")
            ->assertStatus(404);
    }

    public function test_owner_cannot_access_mechanic_routes(): void
    {
        $this->withToken($this->ownerToken)
            ->getJson('http://default.mospams.local/api/mechanic/jobs')
            ->assertStatus(403);
    }

    public function test_mechanic_dashboard_returns_stats(): void
    {
        $response = $this->withToken($this->mechanicToken)
            ->getJson('http://default.mospams.local/api/mechanic/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'mechanic_name',
                'stats' => [
                    'today_jobs',
                    'in_progress',
                    'completed_this_month',
                    'today_labor_revenue',
                    'avg_rating',
                ],
            ]);
    }

    public function test_mechanic_assigned_jobs_list_returns_only_their_jobs(): void
    {
        $jobId = $this->createJobInStatus('booked_confirmed');
        $this->assignMechanic($jobId);

        // Another job NOT assigned to this mechanic
        $this->createJobInStatus('pending');

        $response = $this->withToken($this->mechanicToken)
            ->getJson('http://default.mospams.local/api/mechanic/jobs');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $jobId);
    }

    private function createJobInStatus(string $statusCode): int
    {
        $customerId = (int) DB::table('customers')->insertGetId([
            'shop_id_fk' => $this->shopId,
            'full_name'  => 'Test Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $statusId = (int) DB::table('service_job_statuses')
            ->where('status_code', $statusCode)
            ->value('service_job_status_id');

        $jobId = (int) DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $this->ownerId,
            'service_job_status_id_fk' => $statusId,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda Click',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        DB::table('service_job_items')->insert([
            'job_id_fk'          => $jobId,
            'service_type_id_fk' => $this->serviceTypeId,
            'labor_cost'         => 350,
            'remarks'            => null,
        ]);

        return $jobId;
    }

    private function assignMechanic(int $jobId): void
    {
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);
    }
}
