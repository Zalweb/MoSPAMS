<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MospamsApiTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_admin_can_login_and_read_core_data(): void
    {
        $token = $this->login('admin@mospams.com');

        $this->withToken($token)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.role', 'Admin');

        $this->withToken($token)->getJson('/api/parts')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'category', 'stock', 'minStock', 'price', 'barcode', 'createdAt']]]);

        $this->assertDatabaseHas('roles', ['role_name' => 'Mechanic']);
        $this->assertDatabaseHas('roles', ['role_name' => 'Customer']);
    }

    public function test_public_stats_endpoint_returns_summary_and_charts_without_auth(): void
    {
        $adminId = DB::table('users')->where('username', 'admin@mospams.com')->value('user_id');
        $customerId = DB::table('customers')->insertGetId([
            'full_name' => 'Stats Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $serviceTypeId = DB::table('service_types')->where('service_name', 'Oil Change')->value('service_type_id');
        $completedStatusId = DB::table('service_job_statuses')->where('status_code', 'COMPLETED')->value('service_job_status_id');
        $pendingStatusId = DB::table('service_job_statuses')->where('status_code', 'PENDING')->value('service_job_status_id');
        $paidStatusId = DB::table('payment_statuses')->where('status_code', 'PAID')->value('payment_status_id');

        $completedJobId = DB::table('service_jobs')->insertGetId([
            'customer_id_fk' => $customerId,
            'created_by_fk' => $adminId,
            'service_job_status_id_fk' => $completedStatusId,
            'job_date' => now()->toDateString(),
            'completion_date' => now()->toDateString(),
            'motorcycle_model' => 'Honda Click',
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pendingJobId = DB::table('service_jobs')->insertGetId([
            'customer_id_fk' => $customerId,
            'created_by_fk' => $adminId,
            'service_job_status_id_fk' => $pendingStatusId,
            'job_date' => now()->toDateString(),
            'completion_date' => null,
            'motorcycle_model' => 'Yamaha Mio',
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([$completedJobId, $pendingJobId] as $jobId) {
            DB::table('service_job_items')->insert([
                'job_id_fk' => $jobId,
                'service_type_id_fk' => $serviceTypeId,
                'labor_cost' => 350,
                'remarks' => null,
            ]);
        }

        $saleId = DB::table('sales')->insertGetId([
            'customer_id_fk' => $customerId,
            'job_id_fk' => $completedJobId,
            'processed_by_fk' => $adminId,
            'sale_type' => 'service+parts',
            'total_amount' => 1200,
            'discount' => 0,
            'net_amount' => 1200,
            'sale_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('payments')->insert([
            'sale_id_fk' => $saleId,
            'payment_method' => 'Cash',
            'amount_paid' => 1200,
            'payment_date' => now(),
            'reference_number' => null,
            'payment_status_id_fk' => $paidStatusId,
        ]);

        $response = $this->getJson('/api/stats')
            ->assertOk()
            ->assertJsonStructure([
                'summary' => [
                    'total_jobs_completed',
                    'total_customers',
                    'total_revenue',
                    'total_parts',
                    'active_services',
                ],
                'charts' => [
                    'revenue_by_day',
                    'jobs_by_day',
                    'service_status',
                    'payment_methods',
                    'top_service_types',
                ],
            ])
            ->assertJsonPath('summary.total_jobs_completed', 1)
            ->assertJsonPath('summary.total_customers', 1)
            ->assertJsonPath('summary.total_revenue', 1200)
            ->assertJsonPath('summary.active_services', 1)
            ->assertJsonPath('charts.service_status.pending', 1)
            ->assertJsonPath('charts.service_status.completed', 1)
            ->assertJsonPath('charts.payment_methods.cash', 1200);

        $payload = $response->json();

        $this->assertCount(30, $payload['charts']['revenue_by_day']);
        $this->assertCount(30, $payload['charts']['jobs_by_day']);
        $this->assertSame('Oil Change', $payload['charts']['top_service_types'][0]['name']);
        $this->assertSame(2, $payload['charts']['top_service_types'][0]['count']);
    }

    public function test_staff_cannot_manage_users(): void
    {
        $token = $this->login('staff@mospams.com');

        $this->withToken($token)->getJson('/api/users')->assertForbidden();
    }

    public function test_inventory_stock_movement_and_transaction_flow(): void
    {
        $token = $this->login('admin@mospams.com');

        $partId = $this->withToken($token)->postJson('/api/parts', [
            'name' => 'Test Part',
            'category' => 'Other',
            'stock' => 10,
            'minStock' => 2,
            'price' => 100,
            'barcode' => 'TEST-PART-001',
        ])->assertCreated()->json('data.id');

        $this->withToken($token)->postJson('/api/stock-movements', [
            'partId' => $partId,
            'type' => 'out',
            'qty' => 2,
            'reason' => 'Manual test issue',
        ])->assertOk()->assertJsonPath('data.stock', 8);

        $this->withToken($token)->postJson('/api/transactions', [
            'type' => 'parts-only',
            'items' => [['partId' => $partId, 'name' => 'Test Part', 'quantity' => 1, 'price' => 100]],
            'paymentMethod' => 'Cash',
            'total' => 100,
        ])->assertCreated()->assertJsonPath('data.total', 100);

        $this->assertSame(7, (int) DB::table('parts')->where('part_id', $partId)->value('stock_quantity'));
        $this->assertDatabaseHas('payments', ['payment_method' => 'Cash', 'amount_paid' => 100]);
    }

    public function test_service_status_reports_and_logs_flow(): void
    {
        $token = $this->login('admin@mospams.com');

        $serviceId = $this->withToken($token)->postJson('/api/services', [
            'customerName' => 'Test Customer',
            'motorcycleModel' => 'Honda Click',
            'serviceType' => 'Oil Change',
            'laborCost' => 350,
            'status' => 'Pending',
            'partsUsed' => [],
            'notes' => 'Test service',
        ])->assertCreated()->json('data.id');

        $this->withToken($token)->patchJson('/api/services/'.$serviceId, [
            'status' => 'Completed',
        ])->assertOk()->assertJsonPath('data.status', 'Completed');

        $this->withToken($token)->getJson('/api/reports/services')->assertOk();
        $this->withToken($token)->getJson('/api/activity-logs')->assertOk();
    }

    private function login(string $email): string
    {
        return $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'password',
        ])->assertOk()->json('token');
    }
}
