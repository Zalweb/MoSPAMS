<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
    }

    public function test_chat_requires_authentication(): void
    {
        $response = $this->postJson('/api/chat', [
            'message' => 'Hello', 'session_id' => 'abc123'
        ]);
        $response->assertStatus(401);
    }

    public function test_chat_validates_message_required(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)
            ->postJson('/api/chat', ['session_id' => 'abc123']);
        $response->assertStatus(422);
    }
}
