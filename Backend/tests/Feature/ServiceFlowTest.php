<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ServiceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private int $shopId;
    private int $adminId;
    private int $mechanicUserId;
    private int $mechanicId;
    private int $partId;
    private string $token;
    private string $mechanicToken;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);

        $this->seed();

        $this->shopId = (int) DB::table('shops')->value('shop_id');
        $ownerRoleId  = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeStatus = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        $this->adminId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $ownerRoleId,
            'full_name'         => 'Flow Admin',
            'username'          => 'flowadmin@test.com',
            'email'             => 'flowadmin@test.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $mechanicRoleId = (int) DB::table('roles')->where('role_name', 'Mechanic')->value('role_id');
        $this->mechanicUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $mechanicRoleId,
            'full_name'         => 'Pedro Santos',
            'username'          => 'pedro.mechanic@test.com',
            'email'             => 'pedro.mechanic@test.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $mechanicStatus = (int) DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');
        $this->mechanicId = (int) DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'user_id_fk'            => $this->mechanicUserId,
            'full_name'             => 'Pedro Santos',
            'phone'                 => null,
            'email'                 => null,
            'address'               => null,
            'mechanic_status_id_fk' => $mechanicStatus,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);

        $partStatus = (int) DB::table('part_statuses')->where('status_code', 'in_stock')->value('part_status_id');
        $catStatus  = (int) DB::table('category_statuses')->where('status_code', 'active')->value('category_status_id');
        $catId      = (int) DB::table('categories')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'category_name'         => 'Oil',
            'category_status_id_fk' => $catStatus,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $this->partId = (int) DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $catId,
            'part_name'         => 'Motul 10W-40',
            'barcode'           => '1234567890',
            'unit_price'        => 220.00,
            'stock_quantity'    => 10,
            'reorder_level'     => 2,
            'part_status_id_fk' => $partStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        DB::table('service_types')->insertOrIgnore([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Oil Change',
            'labor_cost'                => 350.00,
            'service_type_status_id_fk' => DB::table('service_type_statuses')->where('status_code', 'active')->value('service_type_status_id'),
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);

        $this->token = $this->login('flowadmin@test.com');
        $this->mechanicToken = $this->login('pedro.mechanic@test.com');
    }

    // --- storeService with mechanicIds ---

    public function test_store_service_assigns_mechanics(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/services', [
                'customerName'    => 'Juan Dela Cruz',
                'motorcycleModel' => 'Honda Click 150i',
                'serviceType'     => 'Oil Change',
                'laborCost'       => 350,
                'status'          => 'Pending',
                'mechanicIds'     => [(string) $this->mechanicId],
                'partsUsed'       => [],
                'notes'           => '',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.mechanics.0.name', 'Pedro Santos');

        $this->assertDatabaseHas('service_job_mechanics', [
            'mechanic_id_fk' => $this->mechanicId,
        ]);
    }

    public function test_store_service_records_named_parts(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/services', [
                'customerName'    => 'Maria Reyes',
                'motorcycleModel' => 'Yamaha Mio',
                'serviceType'     => 'Oil Change',
                'laborCost'       => 350,
                'status'          => 'Pending',
                'mechanicIds'     => [],
                'partsUsed'       => [['partId' => (string) $this->partId, 'quantity' => 1]],
                'notes'           => '',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.partsUsed.0.name', 'Motul 10W-40')
            ->assertJsonPath('data.partsUsed.0.quantity', 1);
    }

    // --- updateService mechanic sync ---

    public function test_update_service_syncs_mechanics(): void
    {
        $jobId = $this->createJob();

        $this->withToken($this->token)
            ->patchJson("http://default.mospams.local/api/services/{$jobId}", [
                'mechanicIds' => [(string) $this->mechanicId],
            ])
            ->assertOk()
            ->assertJsonPath('data.mechanics.0.id', (string) $this->mechanicId);

        // Remove by passing empty array
        $this->withToken($this->token)
            ->patchJson("http://default.mospams.local/api/services/{$jobId}", [
                'mechanicIds' => [],
            ])
            ->assertOk();

        $this->assertDatabaseMissing('service_job_mechanics', ['job_id_fk' => $jobId]);
    }

    // --- billService ---

    public function test_bill_service_creates_sale_without_deducting_stock_again(): void
    {
        $jobId = $this->createJobWithPart();
        $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

        $response = $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", [
                'paymentMethod' => 'Cash',
            ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'type', 'items', 'total', 'paymentMethod']]);

        $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
        $this->assertEquals($stockBefore, $stockAfter);

        $this->assertDatabaseHas('sales', ['job_id_fk' => $jobId]);
        $this->assertDatabaseHas('payments', ['payment_method' => 'Cash']);

        $statusCode = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $jobId)
            ->value('service_job_statuses.status_code');
        $this->assertEquals('completed', $statusCode);
    }

    public function test_bill_service_rejects_double_billing(): void
    {
        $jobId = $this->createJobWithPart();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", ['paymentMethod' => 'Cash'])
            ->assertCreated();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", ['paymentMethod' => 'Cash'])
            ->assertStatus(422);
    }

    public function test_mechanic_jobs_are_loaded_from_pivot_assignments(): void
    {
        $jobId = $this->createJob();

        DB::table('service_job_mechanics')->insert([
            'job_id_fk' => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk' => $this->shopId,
            'assigned_at' => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->getJson('http://default.mospams.local/api/mechanic/jobs')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $jobId)
            ->assertJsonPath('data.0.mechanics.0.id', (string) $this->mechanicId);
    }

    public function test_mechanic_status_update_creates_customer_notification(): void
    {
        $customerUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk' => $this->shopId,
            'role_id_fk' => (int) DB::table('roles')->where('role_name', 'Customer')->value('role_id'),
            'full_name' => 'Booked Customer',
            'username' => 'booked.customer@test.com',
            'email' => 'booked.customer@test.com',
            'password_hash' => Hash::make('password'),
            'user_status_id_fk' => (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $jobId = $this->createJob($customerUserId);

        DB::table('service_job_mechanics')->insert([
            'job_id_fk' => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk' => $this->shopId,
            'assigned_at' => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'status' => 'In Progress',
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id_fk' => $customerUserId,
            'notification_type' => 'job_status_update',
            'reference_type' => 'service_job',
            'reference_id' => $jobId,
        ]);
    }

    // --- assign / remove mechanic ---

    public function test_assign_mechanic_to_job(): void
    {
        $jobId = $this->createJob();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/mechanics", [
                'mechanicId' => (string) $this->mechanicId,
            ])
            ->assertOk()
            ->assertJsonPath('data.mechanics.0.name', 'Pedro Santos');
    }

    public function test_remove_mechanic_from_job(): void
    {
        $jobId = $this->createJob();
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->token)
            ->deleteJson("http://default.mospams.local/api/services/{$jobId}/mechanics/{$this->mechanicId}")
            ->assertOk();

        $this->assertDatabaseMissing('service_job_mechanics', [
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
        ]);
    }

    // --- part metadata ---

    public function test_service_resource_includes_part_metadata(): void
    {
        $jobId = $this->createJob();

        // Staff-add a confirmed part directly
        DB::table('service_job_parts')->insert([
            'job_id_fk'  => $jobId,
            'part_id_fk' => $this->partId,
            'quantity'   => 2,
            'unit_price' => 220.00,
            'subtotal'   => 440.00,
            'status'     => 'confirmed',
        ]);

        $response = $this->withToken($this->token)
            ->getJson("http://default.mospams.local/api/services/{$jobId}");

        $response->assertOk()
            ->assertJsonPath('data.partsUsed.0.status', 'confirmed')
            ->assertJsonPath('data.partsUsed.0.jobPartId', fn ($v) => is_string($v))
            ->assertJsonPath('data.partRequests', []);
    }

    // --- helpers ---

    private function createJob(?int $customerUserId = null): int
    {
        $customerId = (int) DB::table('customers')->insertGetId([
            'shop_id_fk' => $this->shopId,
            'user_id_fk' => $customerUserId,
            'full_name'  => 'Test Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $pendingStatus = (int) DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');
        $jobId = (int) DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $this->adminId,
            'service_job_status_id_fk' => $pendingStatus,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda Click',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $jobId,
            'service_type_id_fk' => DB::table('service_types')->where('service_name', 'Oil Change')->value('service_type_id'),
            'labor_cost'         => 350,
            'remarks'            => null,
        ]);
        return $jobId;
    }

    private function createJobWithPart(): int
    {
        $jobId = $this->createJob();
        DB::table('service_job_parts')->insert([
            'job_id_fk'  => $jobId,
            'part_id_fk' => $this->partId,
            'quantity'   => 1,
            'unit_price' => 220.00,
            'subtotal'   => 220.00,
        ]);
        DB::table('parts')->where('part_id', $this->partId)->update([
            'stock_quantity' => 9,
            'updated_at' => now(),
        ]);
        return $jobId;
    }

    private function login(string $email): string
    {
        return $this->postJson('http://default.mospams.local/api/login', [
            'email'    => $email,
            'password' => 'password',
        ])->assertOk()->json('token');
    }
}
