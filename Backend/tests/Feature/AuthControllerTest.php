<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndStatusesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndStatusesSeeder::class);
    }

    public function test_login_returns_user_with_email(): void
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password_hash' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('user.email', 'test@example.com');
    }

    public function test_me_returns_user_with_email(): void
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/me');

        $response->assertStatus(200);
        $response->assertJsonPath('user.email', 'test@example.com');
    }
}
