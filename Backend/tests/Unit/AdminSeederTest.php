<?php

namespace Tests\Unit;

use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolesAndStatusesSeeder']);
        $this->artisan('db:seed', ['--class' => 'ShopsSeeder']);
    }

    public function test_admin_seeder_creates_user_with_email(): void
    {
        config(['app.admin_email' => 'admin@mospams.com']);
        
        $seeder = new AdminSeeder();
        $seeder->run();

        $admin = DB::table('users')->where('username', 'admin')->first();

        $this->assertNotNull($admin);
        $this->assertNotNull($admin->email);
        $this->assertEquals('admin@mospams.com', $admin->email);
    }

    public function test_admin_seeder_uses_env_variables(): void
    {
        config(['database.connections.mysql.database' => 'test_db']);

        $seeder = new AdminSeeder();
        $seeder->run();

        $admin = DB::table('users')->where('username', 'admin')->first();

        $this->assertNotNull($admin);
        $this->assertEquals('System Administrator', $admin->full_name);
    }
}
