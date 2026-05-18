<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicPricingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        $this->seed();
    }

    public function test_plans_endpoint_returns_active_plans(): void
    {
        $response = $this->getJson('http://default.mospams.local/api/plans');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['planId', 'planCode', 'planName', 'monthlyPrice', 'description'],
                ],
            ]);

        $plans = $response->json('data');
        $this->assertNotEmpty($plans);

        foreach ($plans as $plan) {
            $isActive = DB::table('subscription_plans')
                ->where('plan_id', $plan['planId'])
                ->value('is_active');
            $this->assertEquals(1, $isActive, "Plan {$plan['planName']} should be active");
        }
    }

    public function test_inactive_plans_are_excluded(): void
    {
        DB::table('subscription_plans')
            ->where('plan_code', 'basic')
            ->update(['is_active' => 0]);

        $response = $this->getJson('http://default.mospams.local/api/plans');

        $response->assertOk();

        $planCodes = array_column($response->json('data'), 'planCode');
        $this->assertNotContains('basic', $planCodes);
    }

    public function test_plans_endpoint_requires_no_authentication(): void
    {
        $response = $this->getJson('http://default.mospams.local/api/plans');

        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_plans_are_ordered_by_price_ascending(): void
    {
        $response = $this->getJson('http://default.mospams.local/api/plans');

        $response->assertOk();

        $prices = array_column($response->json('data'), 'monthlyPrice');
        $sorted = $prices;
        sort($sorted);

        $this->assertEquals($sorted, $prices, 'Plans should be ordered by monthly price ascending');
    }
}
