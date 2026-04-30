<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->updateOrInsert(['role_name' => $role], ['role_name' => $role]);
        }

        $this->seedStatus('user_statuses', 'user_status_id', [
            ['ACTIVE', 'Active'],
            ['INACTIVE', 'Inactive'],
        ]);
        $this->seedStatus('category_statuses', 'category_status_id', [['ACTIVE', 'Active']]);
        $this->seedStatus('part_statuses', 'part_status_id', [['ACTIVE', 'Active'], ['INACTIVE', 'Inactive']]);
        $this->seedStatus('service_job_statuses', 'service_job_status_id', [
            ['PENDING', 'Pending'],
            ['ONGOING', 'Ongoing'],
            ['COMPLETED', 'Completed'],
        ]);
        $this->seedStatus('service_type_statuses', 'service_type_status_id', [['ACTIVE', 'Active']]);
        $this->seedStatus('mechanic_statuses', 'mechanic_status_id', [['ACTIVE', 'Active'], ['INACTIVE', 'Inactive']]);
        $this->seedStatus('payment_statuses', 'payment_status_id', [['PAID', 'Paid'], ['PARTIAL', 'Partial'], ['UNPAID', 'Unpaid']]);

        $roleIds = DB::table('roles')->pluck('role_id', 'role_name');
        $activeUserStatus = DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id');

        DB::table('users')->updateOrInsert(
            ['username' => 'admin@mospams.com'],
            [
                'role_id_fk' => $roleIds['Admin'],
                'full_name' => 'Admin User',
                'password_hash' => Hash::make('password'),
                'user_status_id_fk' => $activeUserStatus,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('users')->updateOrInsert(
            ['username' => 'staff@mospams.com'],
            [
                'role_id_fk' => $roleIds['Staff'],
                'full_name' => 'Staff User',
                'password_hash' => Hash::make('password'),
                'user_status_id_fk' => $activeUserStatus,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        $categoryStatus = DB::table('category_statuses')->where('status_code', 'ACTIVE')->value('category_status_id');
        foreach (['Braking', 'Fluids', 'Drivetrain', 'Filtration', 'Ignition', 'Controls', 'Wheels', 'Electrical', 'Engine', 'Body', 'Other'] as $name) {
            DB::table('categories')->updateOrInsert(
                ['category_name' => $name],
                ['description' => null, 'category_status_id_fk' => $categoryStatus, 'created_at' => $now, 'updated_at' => $now]
            );
        }

        $partStatus = DB::table('part_statuses')->where('status_code', 'ACTIVE')->value('part_status_id');
        $categories = DB::table('categories')->pluck('category_id', 'category_name');
        $parts = [
            ['Brake Pad Set - Honda', 'Braking', 15, 5, 850, 'BRK-HND-001'],
            ['Engine Oil 10W40 - Yamalube', 'Fluids', 8, 10, 450, 'OIL-YML-010'],
            ['Chain Sprocket Kit - KTM', 'Drivetrain', 22, 5, 1200, 'CHN-KTM-220'],
            ['Air Filter - NGK', 'Filtration', 3, 8, 350, 'AIR-NGK-003'],
            ['Spark Plug - Iridium', 'Ignition', 50, 10, 180, 'SPK-IRI-050'],
            ['Clutch Cable - Universal', 'Controls', 12, 5, 250, 'CLT-UNV-012'],
            ['Tire Inner Tube 70/90-17', 'Wheels', 20, 8, 320, 'TIR-7090-017'],
            ['Headlight Bulb LED - White', 'Electrical', 6, 5, 550, 'LED-WHT-006'],
        ];

        foreach ($parts as [$name, $category, $stock, $minimum, $price, $barcode]) {
            DB::table('parts')->updateOrInsert(
                ['barcode' => $barcode],
                [
                    'category_id_fk' => $categories[$category],
                    'part_name' => $name,
                    'description' => null,
                    'unit_price' => $price,
                    'stock_quantity' => $stock,
                    'reorder_level' => $minimum,
                    'part_status_id_fk' => $partStatus,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $serviceTypeStatus = DB::table('service_type_statuses')->where('status_code', 'ACTIVE')->value('service_type_status_id');
        foreach ([
            ['Oil Change', 350],
            ['Brake Repair', 500],
            ['Full Tune-up', 800],
            ['Chain Replacement', 450],
            ['Electrical Check', 400],
            ['Engine Overhaul', 2000],
        ] as [$name, $labor]) {
            DB::table('service_types')->updateOrInsert(
                ['service_name' => $name],
                [
                    'description' => null,
                    'labor_cost' => $labor,
                    'estimated_duration' => null,
                    'service_type_status_id_fk' => $serviceTypeStatus,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $mechanicStatus = DB::table('mechanic_statuses')->where('status_code', 'ACTIVE')->value('mechanic_status_id');
        DB::table('mechanics')->updateOrInsert(
            ['email' => 'mechanic@mospams.com'],
            [
                'full_name' => 'Default Mechanic',
                'phone' => null,
                'address' => null,
                'mechanic_status_id_fk' => $mechanicStatus,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    private function seedStatus(string $table, string $key, array $rows): void
    {
        foreach ($rows as [$code, $name]) {
            DB::table($table)->updateOrInsert(
                ['status_code' => $code],
                ['status_name' => $name, 'description' => null]
            );
        }
    }
}
