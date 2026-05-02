<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CreateAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $username = $this->command->ask('Enter admin username', 'admin');
        $password = $this->command->secret('Enter admin password');
        $fullName = $this->command->ask('Enter full name', 'System Administrator');

        if (empty($password)) {
            $this->command->error('Password cannot be empty!');
            return;
        }

        // Get IDs
        $adminRoleId = DB::table('roles')->where('role_name', 'admin')->value('role_id');
        $activeStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        if (!$adminRoleId) {
            $this->command->error('Admin role not found! Please run RolesAndStatusesSeeder first.');
            return;
        }

        if (!$activeStatusId) {
            $this->command->error('Active status not found! Please run RolesAndStatusesSeeder first.');
            return;
        }

        // Check if user already exists
        $existingUser = DB::table('users')->where('username', $username)->first();

        if ($existingUser) {
            if ($this->command->confirm("User '$username' already exists. Update password?", true)) {
                DB::table('users')
                    ->where('username', $username)
                    ->update([
                        'password_hash' => Hash::make($password),
                        'full_name' => $fullName,
                        'updated_at' => now(),
                    ]);
                $this->command->info("User '$username' updated successfully!");
            } else {
                $this->command->info('Operation cancelled.');
            }
        } else {
            // Create new admin user
            DB::table('users')->insert([
                'role_id_fk' => $adminRoleId,
                'full_name' => $fullName,
                'username' => $username,
                'password_hash' => Hash::make($password),
                'user_status_id_fk' => $activeStatusId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info('Admin user created successfully!');
            $this->command->info("Username: $username");
        }
    }
}
