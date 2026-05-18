<?php

namespace Tests\Feature;

use Tests\TestCase;

class ServiceTokenMiddlewareTest extends TestCase
{
    public function test_internal_route_rejects_missing_token(): void
    {
        $response = $this->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(401);
    }

    public function test_internal_route_rejects_wrong_token(): void
    {
        $response = $this->withToken('wrong-token')
                         ->getJson('/api/internal/parts/low-stock');
        $response->assertStatus(401);
    }
}
