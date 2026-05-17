<?php

namespace Tests\Feature;

use App\Services\Identity\AccountProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerVehicleTest extends TestCase
{
    use RefreshDatabase;

    private int $shopId;
    private string $token;
    private int $userId;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        $this->seed();

        $this->shopId = (int) DB::table('shops')->value('shop_id');
        $provisioner  = app(AccountProvisioner::class);
        $account      = $provisioner->createOrUpdateAccount('Test Customer', 'customer@test.com', 'password');
        $account->update(['email_verified_at' => now()]);
        $provisioner->createOrUpdateMembership($account, $this->shopId, 'Customer');
        $user         = $provisioner->ensureTenantUser($account, $this->shopId, 'Customer', 'password');
        $this->userId = $user->user_id;

        $this->token = $this->postJson('http://default.mospams.local/api/login', [
            'email'    => 'customer@test.com',
            'password' => 'password',
        ])->assertOk()->json('token');
    }

    public function test_customer_can_add_vehicle_without_pre_existing_customers_row(): void
    {
        // Confirm no customers row exists for this user yet
        $this->assertDatabaseMissing('customers', ['user_id_fk' => $this->userId]);

        $response = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/customer/vehicles', [
                'make'  => 'Honda',
                'model' => 'Click 160',
                'year'  => '2023',
                'color' => 'Red',
            ]);

        $response->assertCreated()
            ->assertJsonPath('make', 'Honda')
            ->assertJsonPath('model', 'Click 160');

        // resolveCustomer should have auto-created the customers row
        $this->assertDatabaseHas('customers', ['user_id_fk' => $this->userId]);
        $this->assertDatabaseHas('customer_vehicles', ['make' => 'Honda', 'model' => 'Click 160']);
    }

    public function test_customer_can_list_their_vehicles(): void
    {
        $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/customer/vehicles', [
                'make' => 'Yamaha', 'model' => 'Mio',
            ])->assertCreated();

        $response = $this->withToken($this->token)
            ->getJson('http://default.mospams.local/api/customer/vehicles');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.make', 'Yamaha');
    }

    public function test_customer_can_update_their_vehicle(): void
    {
        $vehicle = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/customer/vehicles', [
                'make' => 'Suzuki', 'model' => 'Raider',
            ])->assertCreated()->json();

        $this->withToken($this->token)
            ->patchJson("http://default.mospams.local/api/customer/vehicles/{$vehicle['id']}", [
                'make'  => 'Suzuki',
                'model' => 'Raider R150',
                'color' => 'Blue',
            ])->assertOk();

        $this->assertDatabaseHas('customer_vehicles', ['vehicle_id' => $vehicle['id'], 'model' => 'Raider R150']);
    }

    public function test_customer_can_delete_their_vehicle(): void
    {
        $vehicle = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/customer/vehicles', [
                'make' => 'Kawasaki', 'model' => 'Barako',
            ])->assertCreated()->json();

        $this->withToken($this->token)
            ->deleteJson("http://default.mospams.local/api/customer/vehicles/{$vehicle['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('customer_vehicles', ['vehicle_id' => $vehicle['id']]);
    }

    public function test_customer_cannot_delete_another_customers_vehicle(): void
    {
        $provisioner = app(AccountProvisioner::class);
        $other       = $provisioner->createOrUpdateAccount('Other', 'other@test.com', 'password');
        $other->update(['email_verified_at' => now()]);
        $provisioner->createOrUpdateMembership($other, $this->shopId, 'Customer');
        $provisioner->ensureTenantUser($other, $this->shopId, 'Customer', 'password');

        // Reset Sanctum guard cache so the next login resolves a fresh user
        auth()->forgetGuards();

        $otherToken = $this->postJson('http://default.mospams.local/api/login', [
            'email' => 'other@test.com', 'password' => 'password',
        ])->assertOk()->json('token');

        $vehicle = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/customer/vehicles', [
                'make' => 'Honda', 'model' => 'CBR',
            ])->assertCreated()->json();

        // Reset guard again before Customer 2's request so it re-authenticates fresh
        auth()->forgetGuards();

        $this->withToken($otherToken)
            ->deleteJson("http://default.mospams.local/api/customer/vehicles/{$vehicle['id']}")
            ->assertStatus(404);

        $this->assertDatabaseHas('customer_vehicles', ['vehicle_id' => $vehicle['id']]);
    }
}
