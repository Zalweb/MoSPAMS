<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class WebTechSampleDataSeeder extends Seeder
{
    private int $shopId = 3;
    private int $ownerId = 4; // LONIE LABISIG

    // Status IDs (from production lookup tables)
    private int $activeUserStatus    = 1;
    private int $availableMechanic   = 1;
    private int $busyMechanic        = 2;
    private int $activeCategory      = 1;
    private int $inStockPart         = 1;
    private int $activeServiceType   = 1;
    private int $pendingJob          = 1;
    private int $inProgressJob       = 2;
    private int $completedJob        = 3;
    private int $paidPayment         = 2;
    private int $staffRole           = 3;
    private int $customerRole        = 5;

    public function run(): void
    {
        // ── 1. Staff user ──────────────────────────────────────────────
        $staffId = DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $this->staffRole,
            'full_name'         => 'Liza Mercado',
            'username'          => 'liza.staff@webtech.com',
            'email'             => 'liza.staff@webtech.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $this->activeUserStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // ── 2. Customer user accounts ──────────────────────────────────
        $customerUserIds = [];
        foreach ([
            ['Carlos Ramos',    'carlos.ramos@gmail.com'],
            ['Maria Reyes',     'maria.reyes@gmail.com'],
            ['Jose Dela Cruz',  'jose.delacruz@gmail.com'],
            ['Anna Soriano',    'anna.soriano@gmail.com'],
        ] as [$name, $email]) {
            $customerUserIds[$name] = DB::table('users')->insertGetId([
                'shop_id_fk'        => $this->shopId,
                'role_id_fk'        => $this->customerRole,
                'full_name'         => $name,
                'username'          => $email,
                'email'             => $email,
                'password_hash'     => Hash::make('password'),
                'user_status_id_fk' => $this->activeUserStatus,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }

        // ── 3. Mechanics ───────────────────────────────────────────────
        $pedroId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'full_name'             => 'Pedro Santos',
            'phone'                 => '09171234567',
            'email'                 => 'pedro.santos@webtech.com',
            'address'               => 'Brgy. San Jose, Quezon City',
            'mechanic_status_id_fk' => $this->availableMechanic,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $juanId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'full_name'             => 'Juan Macaraeg',
            'phone'                 => '09281234567',
            'email'                 => null,
            'address'               => 'Brgy. Sta. Cruz, Marikina',
            'mechanic_status_id_fk' => $this->availableMechanic,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $anaId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'full_name'             => 'Ana Domingo',
            'phone'                 => '09391234567',
            'email'                 => null,
            'address'               => null,
            'mechanic_status_id_fk' => $this->busyMechanic,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);

        // ── 4. Categories ──────────────────────────────────────────────
        $oilsCatId = DB::table('categories')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'category_name'         => 'Oils & Lubricants',
            'category_status_id_fk' => $this->activeCategory,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $filtersCatId = DB::table('categories')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'category_name'         => 'Filters',
            'category_status_id_fk' => $this->activeCategory,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $brakeCatId = DB::table('categories')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'category_name'         => 'Brake Parts',
            'category_status_id_fk' => $this->activeCategory,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        $engineCatId = DB::table('categories')->insertGetId([
            'shop_id_fk'            => $this->shopId,
            'category_name'         => 'Engine Parts',
            'category_status_id_fk' => $this->activeCategory,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);

        // ── 5. Parts (Inventory) ───────────────────────────────────────
        $motulId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $oilsCatId,
            'part_name'         => 'Motul 10W-40',
            'barcode'           => 'WTM-001',
            'unit_price'        => 220.00,
            'stock_quantity'    => 20,
            'reorder_level'     => 5,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $yamalubeId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $oilsCatId,
            'part_name'         => 'Yamalube 10W-40',
            'barcode'           => 'WTM-002',
            'unit_price'        => 180.00,
            'stock_quantity'    => 15,
            'reorder_level'     => 5,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $chainLubId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $oilsCatId,
            'part_name'         => 'Chain Lubricant',
            'barcode'           => 'WTM-003',
            'unit_price'        => 75.00,
            'stock_quantity'    => 20,
            'reorder_level'     => 5,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $oilFilterId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $filtersCatId,
            'part_name'         => 'Oil Filter Genuine',
            'barcode'           => 'WTM-004',
            'unit_price'        => 85.00,
            'stock_quantity'    => 25,
            'reorder_level'     => 5,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $airFilterId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $filtersCatId,
            'part_name'         => 'Air Filter Honda',
            'barcode'           => 'WTM-005',
            'unit_price'        => 120.00,
            'stock_quantity'    => 12,
            'reorder_level'     => 3,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $brakePadId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $brakeCatId,
            'part_name'         => 'Front Brake Pad',
            'barcode'           => 'WTM-006',
            'unit_price'        => 350.00,
            'stock_quantity'    => 8,
            'reorder_level'     => 2,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $sparkPlugId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $engineCatId,
            'part_name'         => 'Spark Plug NGK',
            'barcode'           => 'WTM-007',
            'unit_price'        => 95.00,
            'stock_quantity'    => 30,
            'reorder_level'     => 5,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $driveBeltId = DB::table('parts')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'category_id_fk'    => $engineCatId,
            'part_name'         => 'Drive Belt',
            'barcode'           => 'WTM-008',
            'unit_price'        => 450.00,
            'stock_quantity'    => 5,
            'reorder_level'     => 2,
            'part_status_id_fk' => $this->inStockPart,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // ── 6. Service Types ───────────────────────────────────────────
        $oilChangeTypeId = DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Oil Change',
            'labor_cost'                => 350.00,
            'service_type_status_id_fk' => $this->activeServiceType,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
        $brakeTypeId = DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Brake Inspection',
            'labor_cost'                => 500.00,
            'service_type_status_id_fk' => $this->activeServiceType,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
        $pmsTypeId = DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'General PMS',
            'labor_cost'                => 200.00,
            'service_type_status_id_fk' => $this->activeServiceType,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
        $tuneUpTypeId = DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Engine Tune-up',
            'labor_cost'                => 800.00,
            'service_type_status_id_fk' => $this->activeServiceType,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
        $chainTypeId = DB::table('service_types')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'service_name'              => 'Chain & Sprocket Service',
            'labor_cost'                => 400.00,
            'service_type_status_id_fk' => $this->activeServiceType,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);

        // ── 7. Customers ───────────────────────────────────────────────
        $carlosId = DB::table('customers')->insertGetId([
            'shop_id_fk'    => $this->shopId,
            'full_name'     => 'Carlos Ramos',
            'phone'         => '09171112222',
            'email'         => 'carlos.ramos@gmail.com',
            'address'       => 'Brgy. Bagong Silang, Caloocan',
            'user_id_fk'    => $customerUserIds['Carlos Ramos'],
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        $mariaId = DB::table('customers')->insertGetId([
            'shop_id_fk'    => $this->shopId,
            'full_name'     => 'Maria Reyes',
            'phone'         => '09281112222',
            'email'         => 'maria.reyes@gmail.com',
            'address'       => 'Brgy. Tandang Sora, Quezon City',
            'user_id_fk'    => $customerUserIds['Maria Reyes'],
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        $joseId = DB::table('customers')->insertGetId([
            'shop_id_fk'    => $this->shopId,
            'full_name'     => 'Jose Dela Cruz',
            'phone'         => '09391112222',
            'email'         => 'jose.delacruz@gmail.com',
            'address'       => 'Brgy. San Isidro, Novaliches',
            'user_id_fk'    => $customerUserIds['Jose Dela Cruz'],
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        $annaId = DB::table('customers')->insertGetId([
            'shop_id_fk'    => $this->shopId,
            'full_name'     => 'Anna Soriano',
            'phone'         => '09501112222',
            'email'         => 'anna.soriano@gmail.com',
            'address'       => 'Brgy. Sta. Lucia, Pasig',
            'user_id_fk'    => $customerUserIds['Anna Soriano'],
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        // ── 8. Service Jobs ────────────────────────────────────────────

        // Job 1 — COMPLETED: Carlos / Honda Click 150i / Oil Change / Pedro
        // Parts: Motul x2 + Oil Filter x1 | Labor: 350
        $job1Id = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $carlosId,
            'created_by_fk'            => $staffId,
            'service_job_status_id_fk' => $this->completedJob,
            'job_date'                 => now()->subDays(5)->toDateString(),
            'motorcycle_model'         => 'Honda Click 150i',
            'notes'                    => 'Customer requested full oil flush.',
            'completion_date'          => now()->subDays(5)->toDateString(),
            'created_at'               => now()->subDays(5),
            'updated_at'               => now()->subDays(5),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $job1Id,
            'service_type_id_fk' => $oilChangeTypeId,
            'labor_cost'         => 350.00,
            'remarks'            => null,
        ]);
        DB::table('service_job_mechanics')->insert([
            ['job_id_fk' => $job1Id, 'mechanic_id_fk' => $pedroId, 'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subDays(5)],
        ]);
        DB::table('service_job_parts')->insert([
            ['job_id_fk' => $job1Id, 'part_id_fk' => $motulId,    'quantity' => 2, 'unit_price' => 220.00, 'subtotal' => 440.00],
            ['job_id_fk' => $job1Id, 'part_id_fk' => $oilFilterId,'quantity' => 1, 'unit_price' =>  85.00, 'subtotal' =>  85.00],
        ]);
        // Sale for Job 1 — Cash — total: 350+440+85=875
        $sale1Id = DB::table('sales')->insertGetId([
            'shop_id_fk'      => $this->shopId,
            'customer_id_fk'  => $carlosId,
            'job_id_fk'       => $job1Id,
            'processed_by_fk' => $staffId,
            'sale_type'       => 'service+parts',
            'total_amount'    => 875.00,
            'discount'        => 0,
            'net_amount'      => 875.00,
            'sale_date'       => now()->subDays(5),
            'created_at'      => now()->subDays(5),
            'updated_at'      => now()->subDays(5),
        ]);
        DB::table('sale_items')->insert([
            ['sale_id_fk' => $sale1Id, 'part_id_fk' => $motulId,    'quantity' => 2, 'unit_price' => 220.00, 'subtotal' => 440.00],
            ['sale_id_fk' => $sale1Id, 'part_id_fk' => $oilFilterId,'quantity' => 1, 'unit_price' =>  85.00, 'subtotal' =>  85.00],
        ]);
        DB::table('payments')->insert([
            'sale_id_fk'           => $sale1Id,
            'payment_method'       => 'Cash',
            'amount_paid'          => 875.00,
            'payment_date'         => now()->subDays(5),
            'reference_number'     => null,
            'payment_status_id_fk' => $this->paidPayment,
        ]);
        // Deduct stock
        DB::table('parts')->where('part_id', $motulId)->decrement('stock_quantity', 2);
        DB::table('parts')->where('part_id', $oilFilterId)->decrement('stock_quantity', 1);

        // Job 2 — COMPLETED: Maria / Yamaha Mio i 125 / Brake Inspection / Juan
        // Parts: Front Brake Pad x1 | Labor: 500
        $job2Id = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $mariaId,
            'created_by_fk'            => $staffId,
            'service_job_status_id_fk' => $this->completedJob,
            'job_date'                 => now()->subDays(3)->toDateString(),
            'motorcycle_model'         => 'Yamaha Mio i 125',
            'notes'                    => 'Replaced front brake pads, pads were worn below limit.',
            'completion_date'          => now()->subDays(3)->toDateString(),
            'created_at'               => now()->subDays(3),
            'updated_at'               => now()->subDays(3),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $job2Id,
            'service_type_id_fk' => $brakeTypeId,
            'labor_cost'         => 500.00,
            'remarks'            => null,
        ]);
        DB::table('service_job_mechanics')->insert([
            ['job_id_fk' => $job2Id, 'mechanic_id_fk' => $juanId, 'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subDays(3)],
        ]);
        DB::table('service_job_parts')->insert([
            ['job_id_fk' => $job2Id, 'part_id_fk' => $brakePadId, 'quantity' => 1, 'unit_price' => 350.00, 'subtotal' => 350.00],
        ]);
        // Sale for Job 2 — GCash — total: 500+350=850
        $sale2Id = DB::table('sales')->insertGetId([
            'shop_id_fk'      => $this->shopId,
            'customer_id_fk'  => $mariaId,
            'job_id_fk'       => $job2Id,
            'processed_by_fk' => $staffId,
            'sale_type'       => 'service+parts',
            'total_amount'    => 850.00,
            'discount'        => 0,
            'net_amount'      => 850.00,
            'sale_date'       => now()->subDays(3),
            'created_at'      => now()->subDays(3),
            'updated_at'      => now()->subDays(3),
        ]);
        DB::table('sale_items')->insert([
            ['sale_id_fk' => $sale2Id, 'part_id_fk' => $brakePadId, 'quantity' => 1, 'unit_price' => 350.00, 'subtotal' => 350.00],
        ]);
        DB::table('payments')->insert([
            'sale_id_fk'           => $sale2Id,
            'payment_method'       => 'GCash',
            'amount_paid'          => 850.00,
            'payment_date'         => now()->subDays(3),
            'reference_number'     => 'GC-20260505-88234',
            'payment_status_id_fk' => $this->paidPayment,
        ]);
        DB::table('parts')->where('part_id', $brakePadId)->decrement('stock_quantity', 1);

        // Job 3 — IN PROGRESS: Jose / Honda Beat Fi / General PMS / Ana
        // Parts: Air Filter x1 + Spark Plug x1 | Labor: 200
        $job3Id = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $joseId,
            'created_by_fk'            => $staffId,
            'service_job_status_id_fk' => $this->inProgressJob,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda Beat Fi',
            'notes'                    => 'Regular PMS. Customer will wait.',
            'completion_date'          => null,
            'created_at'               => now()->subHours(2),
            'updated_at'               => now()->subHours(2),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $job3Id,
            'service_type_id_fk' => $pmsTypeId,
            'labor_cost'         => 200.00,
            'remarks'            => null,
        ]);
        DB::table('service_job_mechanics')->insert([
            ['job_id_fk' => $job3Id, 'mechanic_id_fk' => $anaId, 'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subHours(2)],
        ]);
        DB::table('service_job_parts')->insert([
            ['job_id_fk' => $job3Id, 'part_id_fk' => $airFilterId, 'quantity' => 1, 'unit_price' => 120.00, 'subtotal' => 120.00],
            ['job_id_fk' => $job3Id, 'part_id_fk' => $sparkPlugId, 'quantity' => 1, 'unit_price' =>  95.00, 'subtotal' =>  95.00],
        ]);

        // Job 4 — PENDING: Anna / Yamaha NMAX / Engine Tune-up / Pedro + Juan
        // Parts: Spark Plug x2 + Chain Lubricant x1 | Labor: 800
        $job4Id = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $annaId,
            'created_by_fk'            => $staffId,
            'service_job_status_id_fk' => $this->pendingJob,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Yamaha NMAX 155',
            'notes'                    => 'Engine misfiring at high RPM.',
            'completion_date'          => null,
            'created_at'               => now()->subHour(),
            'updated_at'               => now()->subHour(),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $job4Id,
            'service_type_id_fk' => $tuneUpTypeId,
            'labor_cost'         => 800.00,
            'remarks'            => null,
        ]);
        DB::table('service_job_mechanics')->insert([
            ['job_id_fk' => $job4Id, 'mechanic_id_fk' => $pedroId, 'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subHour()],
            ['job_id_fk' => $job4Id, 'mechanic_id_fk' => $juanId,  'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subHour()],
        ]);
        DB::table('service_job_parts')->insert([
            ['job_id_fk' => $job4Id, 'part_id_fk' => $sparkPlugId, 'quantity' => 2, 'unit_price' =>  95.00, 'subtotal' => 190.00],
            ['job_id_fk' => $job4Id, 'part_id_fk' => $chainLubId,  'quantity' => 1, 'unit_price' =>  75.00, 'subtotal' =>  75.00],
        ]);

        // Job 5 — PENDING: Carlos / Honda Click 150i / Chain & Sprocket / Juan
        // Parts: Drive Belt x1 | Labor: 400
        $job5Id = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => $carlosId,
            'created_by_fk'            => $staffId,
            'service_job_status_id_fk' => $this->pendingJob,
            'job_date'                 => now()->toDateString(),
            'motorcycle_model'         => 'Honda Click 150i',
            'notes'                    => 'Drive belt slipping, customer noticed vibration.',
            'completion_date'          => null,
            'created_at'               => now()->subMinutes(30),
            'updated_at'               => now()->subMinutes(30),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $job5Id,
            'service_type_id_fk' => $chainTypeId,
            'labor_cost'         => 400.00,
            'remarks'            => null,
        ]);
        DB::table('service_job_mechanics')->insert([
            ['job_id_fk' => $job5Id, 'mechanic_id_fk' => $juanId, 'shop_id_fk' => $this->shopId, 'assigned_at' => now()->subMinutes(30)],
        ]);
        DB::table('service_job_parts')->insert([
            ['job_id_fk' => $job5Id, 'part_id_fk' => $driveBeltId, 'quantity' => 1, 'unit_price' => 450.00, 'subtotal' => 450.00],
        ]);

        // ── 9. Walk-in parts-only sale ─────────────────────────────────
        $sale3Id = DB::table('sales')->insertGetId([
            'shop_id_fk'      => $this->shopId,
            'customer_id_fk'  => null,
            'job_id_fk'       => null,
            'processed_by_fk' => $staffId,
            'sale_type'       => 'parts-only',
            'total_amount'    => 180.00,
            'discount'        => 0,
            'net_amount'      => 180.00,
            'sale_date'       => now()->subDay(),
            'created_at'      => now()->subDay(),
            'updated_at'      => now()->subDay(),
        ]);
        DB::table('sale_items')->insert([
            ['sale_id_fk' => $sale3Id, 'part_id_fk' => $yamalubeId, 'quantity' => 1, 'unit_price' => 180.00, 'subtotal' => 180.00],
        ]);
        DB::table('payments')->insert([
            'sale_id_fk'           => $sale3Id,
            'payment_method'       => 'Cash',
            'amount_paid'          => 180.00,
            'payment_date'         => now()->subDay(),
            'reference_number'     => null,
            'payment_status_id_fk' => $this->paidPayment,
        ]);
        DB::table('parts')->where('part_id', $yamalubeId)->decrement('stock_quantity', 1);

        $this->command->info('WebTech sample data seeded successfully.');
        $this->command->info('  Staff login:    liza.staff@webtech.com / password');
        $this->command->info('  Customer logins: carlos.ramos@gmail.com, maria.reyes@gmail.com, jose.delacruz@gmail.com, anna.soriano@gmail.com / password');
        $this->command->info('  Mechanics: Pedro Santos, Juan Macaraeg, Ana Domingo');
        $this->command->info('  Jobs: 2 completed (with sales), 1 in-progress, 2 pending');
    }
}
