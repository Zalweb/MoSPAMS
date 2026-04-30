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
