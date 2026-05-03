<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Get admin credentials from env or use defaults
        $username = config('app.admin_username', env('ADMIN_USERNAME', 'admin'));
        $email = config('app.admin_email', env('ADMIN_EMAIL', 'admin@mospams.com'));
        $password = config('app.admin_password', env('ADMIN_PASSWORD', 'admin123'));
        $fullName = config('app.admin_full_name', env('ADMIN_FULL_NAME', 'System Administrator'));

        // Get IDs
        $ownerRoleId    = DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        $shopId         = DB::table('shops')->value('shop_id');

        // Create owner user
        $adminUser = [
            'role_id_fk'          => $ownerRoleId,
            'shop_id_fk'          => $shopId,
            'full_name'           => $fullName,
            'username'            => $username,
            'email'               => $email,
            'password_hash'       => Hash::make($password),
            'user_status_id_fk'   => $activeStatusId,
            'created_at'          => now(),
            'updated_at'          => now(),
        ];

        DB::table('users')->updateOrInsert(
            ['username' => $username],
            $adminUser
        );

        if ($this->command) {
            $this->command->info('Admin user created successfully!');
            $this->command->info("Username: $username");
            $this->command->info("Email: $email");
            $this->command->info("Password: $password");
            $this->command->warn('Please change the default password after first login.');
        }
    }
}
