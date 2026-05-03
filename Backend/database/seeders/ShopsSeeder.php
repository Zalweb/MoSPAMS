<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ShopsSeeder extends Seeder
{
    public function run(): void
    {
        // Seed shop statuses
        $shopStatuses = [
            ['status_code' => 'ACTIVE',    'status_name' => 'Active',    'description' => 'Shop is active and operational'],
            ['status_code' => 'INACTIVE',  'status_name' => 'Inactive',  'description' => 'Shop is inactive'],
            ['status_code' => 'PENDING',   'status_name' => 'Pending',   'description' => 'Shop is pending subscription activation'],
            ['status_code' => 'SUSPENDED', 'status_name' => 'Suspended', 'description' => 'Shop is suspended by SuperAdmin'],
        ];

        foreach ($shopStatuses as $status) {
            DB::table('shop_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');

        // Seed default shop
        DB::table('shops')->updateOrInsert(
            ['shop_name' => env('DEFAULT_SHOP_NAME', 'Default Shop')],
            [
                'shop_name'         => env('DEFAULT_SHOP_NAME', 'Default Shop'),
                'invitation_code'   => env('DEFAULT_SHOP_CODE', 'SHOP001'),
                'subdomain'         => env('DEFAULT_SHOP_SUBDOMAIN', 'default'),
                'custom_domain'     => null,
                'logo_url'          => null,
                'primary_color'     => '#3B82F6',
                'secondary_color'   => '#10B981',
                'phone'             => null,
                'address'           => null,
                'business_description' => null,
                'facebook_url'      => null,
                'instagram_url'     => null,
                'business_hours'    => json_encode([
                    'monday' => ['open' => '08:00', 'close' => '18:00'],
                    'tuesday' => ['open' => '08:00', 'close' => '18:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '18:00'],
                    'thursday' => ['open' => '08:00', 'close' => '18:00'],
                    'friday' => ['open' => '08:00', 'close' => '18:00'],
                    'saturday' => ['open' => '08:00', 'close' => '16:00'],
                    'sunday' => ['open' => 'closed', 'close' => 'closed'],
                ]),
                'shop_status_id_fk' => $activeStatusId,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );
        
        $shopId = DB::table('shops')->where('shop_name', env('DEFAULT_SHOP_NAME', 'Default Shop'))->value('shop_id');

        // Seed SuperAdmin user (platform owner, no shop)
        $superAdminRoleId  = DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        DB::table('users')->updateOrInsert(
            ['username' => env('SUPERADMIN_USERNAME', 'superadmin')],
            [
                'role_id_fk'          => $superAdminRoleId,
                'shop_id_fk'          => null,
                'full_name'           => env('SUPERADMIN_FULL_NAME', 'Super Administrator'),
                'username'            => env('SUPERADMIN_USERNAME', 'superadmin'),
                'email'               => env('SUPERADMIN_EMAIL', 'superadmin@mospams.com'),
                'password_hash'       => Hash::make(env('SUPERADMIN_PASSWORD', 'superadmin123')),
                'user_status_id_fk'   => $activeUserStatusId,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]
        );

        if ($this->command) {
            $this->command->info("Default shop ensured (shop_id: {$shopId})");
            $this->command->info('SuperAdmin user ensured: ' . env('SUPERADMIN_USERNAME', 'superadmin'));
        }
    }
}
