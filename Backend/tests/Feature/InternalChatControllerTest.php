<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InternalChatControllerTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = 'test-secret-token';
        config(['services.ai.internal_token' => $this->token]);
    }

    public function test_low_stock_parts_returns_200(): void
    {
        $response = $this->withToken($this->token)
            ->withHeaders(['X-Shop-Id' => '1'])
            ->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(200)
                 ->assertJsonIsArray();
    }

    public function test_service_types_returns_200(): void
    {
        $response = $this->withToken($this->token)
            ->withHeaders(['X-Shop-Id' => '1'])
            ->getJson('/api/internal/service-types');
        $response->assertStatus(200);
    }
}
