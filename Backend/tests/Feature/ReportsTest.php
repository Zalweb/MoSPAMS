<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    private int $shopId;
    private int $ownerId;
    private string $token;

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

        $this->ownerId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $ownerRoleId,
            'full_name'         => 'Report Owner',
            'username'          => 'owner@report.com',
            'email'             => 'owner@report.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $this->token = \App\Models\User::find($this->ownerId)
            ->createToken('test', [sprintf('tenant:%d', $this->shopId)])
            ->plainTextToken;
    }

    public function test_sales_report_returns_totals_without_date_filter(): void
    {
        $this->insertSale(500.00, now()->subDays(30)->toDateTimeString());
        $this->insertSale(300.00, now()->toDateTimeString());

        $response = $this->withToken($this->token)
            ->getJson('http://default.mospams.local/api/reports/sales');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals(800, $data['totalRevenue']);
        $this->assertEquals(2, $data['transactions']);
    }

    public function test_sales_report_filters_by_date_range(): void
    {
        $this->insertSale(500.00, now()->subDays(30)->toDateTimeString());
        $this->insertSale(300.00, now()->toDateTimeString());

        $yesterday = now()->subDay()->toDateString();
        $tomorrow  = now()->addDay()->toDateString();

        $response = $this->withToken($this->token)
            ->getJson("http://default.mospams.local/api/reports/sales?date_from={$yesterday}&date_to={$tomorrow}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals(300, $data['totalRevenue']);
        $this->assertEquals(1, $data['transactions']);
    }

    public function test_services_report_filters_by_date_range(): void
    {
        $customerId = $this->insertCustomer();
        $pendingId  = (int) DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');

        DB::table('service_jobs')->insert([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $this->ownerId,
            'service_job_status_id_fk' => $pendingId,
            'job_date'                 => now()->subDays(30)->toDateString(),
            'motorcycle_model'         => 'Old Bike',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        DB::table('service_jobs')->insert([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $this->ownerId,
            'service_job_status_id_fk' => $pendingId,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'New Bike',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $yesterday = now()->subDay()->toDateString();

        $response = $this->withToken($this->token)
            ->getJson("http://default.mospams.local/api/reports/services?date_from={$yesterday}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals(1, array_sum($data));
    }

    public function test_income_report_total_includes_sales_and_labor(): void
    {
        $customerId    = $this->insertCustomer();
        $serviceTypeId = $this->insertServiceType();

        $jobId = (int) DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $customerId,
            'created_by_fk'            => $this->ownerId,
            'service_job_status_id_fk' => (int) DB::table('service_job_statuses')->where('status_code', 'completed')->value('service_job_status_id'),
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda',
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        DB::table('service_job_items')->insert([
            'job_id_fk'          => $jobId,
            'service_type_id_fk' => $serviceTypeId,
            'labor_cost'         => 300.00,
            'remarks'            => null,
        ]);

        $this->insertSale(500.00, now()->toDateTimeString());

        $response = $this->withToken($this->token)
            ->getJson('http://default.mospams.local/api/reports/income');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals(500, $data['sales']);
        $this->assertEquals(300, $data['labor']);
        $this->assertEquals(800, $data['total']);
    }

    public function test_income_report_filters_by_date_range(): void
    {
        $this->insertSale(1000.00, now()->subDays(30)->toDateTimeString());
        $this->insertSale(200.00, now()->toDateTimeString());

        $yesterday = now()->subDay()->toDateString();

        $response = $this->withToken($this->token)
            ->getJson("http://default.mospams.local/api/reports/income?date_from={$yesterday}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals(200, $data['sales']);
        $this->assertEquals(200, $data['total']);
    }

    private function insertSale(float $amount, string $saleDate): int
    {
        return (int) DB::table('sales')->insertGetId([
            'shop_id_fk'     => $this->shopId,
            'processed_by_fk' => $this->ownerId,
            'sale_type'      => 'service',
            'total_amount'   => $amount,
            'discount'       => 0,
            'net_amount'     => $amount,
            'sale_date'      => $saleDate,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    private function insertCustomer(): int
    {
        return (int) DB::table('customers')->insertGetId([
            'shop_id_fk' => $this->shopId,
            'full_name'  => 'Test Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function insertServiceType(): int
    {
        $statusId = (int) DB::table('service_type_statuses')->where('status_code', 'active')->value('service_type_status_id');
        return (int) DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Oil Change',
            'labor_cost'                => 300.00,
            'service_type_status_id_fk' => $statusId,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
    }
}
