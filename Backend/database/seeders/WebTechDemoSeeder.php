<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class WebTechDemoSeeder extends Seeder
{
    private int $shopId    = 3;  // WebTech Motorshop
    private int $ownerId   = 4;  // LONIE LABISIG user_id (preserved)

    // Lookup IDs (stable across environments after core seeder)
    private int $roleOwner    = 2;
    private int $roleStaff    = 3;
    private int $roleMechanic = 4;
    private int $roleCustomer = 5;

    private int $statusUserActive   = 1;
    private int $statusAccountActive = 1;
    private int $statusMemberActive = 1;
    private int $statusMechanicAvailable = 1;
    private int $statusCategoryActive    = 1;
    private int $statusPartInStock       = 1;
    private int $statusServiceTypeActive = 1;

    private int $jobStatusPending    = 1;
    private int $jobStatusInProgress = 2;
    private int $jobStatusCompleted  = 3;
    private int $jobStatusCancelled  = 4;

    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $this->clearShopData();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->command->info('Cleared existing data.');

        $categoryIds   = $this->seedCategories();
        $partIds       = $this->seedParts($categoryIds);
        $serviceTypeIds = $this->seedServiceTypes();
        $customerIds   = $this->seedCustomers();
        $staffUserId   = $this->seedStaff();
        $mechanicData  = $this->seedMechanics();
        $this->seedServiceJobs($customerIds, $staffUserId, $mechanicData, $partIds, $serviceTypeIds);

        $this->command->info('WebTech demo data seeded successfully.');
    }

    // ─── Clear ────────────────────────────────────────────────────────────────

    private function clearShopData(): void
    {
        // Clear all shops' transactional data except owners
        foreach ([1, 3] as $sid) {
            $jobIds = DB::table('service_jobs')->where('shop_id_fk', $sid)->pluck('job_id')->all();
            if ($jobIds) {
                DB::table('service_job_parts')->whereIn('job_id_fk', $jobIds)->delete();
                DB::table('service_job_items')->whereIn('job_id_fk', $jobIds)->delete();
            }
            DB::table('service_job_mechanics')->where('shop_id_fk', $sid)->delete();
            DB::table('service_jobs')->where('shop_id_fk', $sid)->delete();

            $saleIds = DB::table('sales')->where('shop_id_fk', $sid)->pluck('sale_id')->all();
            if ($saleIds) {
                DB::table('payments')->whereIn('sale_id_fk', $saleIds)->delete();
                DB::table('sale_items')->whereIn('sale_id_fk', $saleIds)->delete();
            }
            DB::table('sales')->where('shop_id_fk', $sid)->delete();
            DB::table('stock_movements')->where('shop_id_fk', $sid)->delete();
            DB::table('parts')->where('shop_id_fk', $sid)->delete();
            DB::table('categories')->where('shop_id_fk', $sid)->delete();
            DB::table('service_types')->where('shop_id_fk', $sid)->delete();
            DB::table('activity_logs')->where('shop_id_fk', $sid)->delete();
            DB::table('notifications')->where('shop_id_fk', $sid)->delete();

            // Delete non-owner mechanics
            $mechanicIds = DB::table('mechanics')->where('shop_id_fk', $sid)->pluck('mechanic_id')->all();
            $mechanicUserIds = DB::table('mechanics')->where('shop_id_fk', $sid)->whereNotNull('user_id_fk')->pluck('user_id_fk')->all();
            DB::table('mechanics')->where('shop_id_fk', $sid)->delete();

            // Delete non-owner customers
            DB::table('customers')->where('shop_id_fk', $sid)->delete();

            // Delete non-owner users (preserve owner)
            $ownerUserId = DB::table('users')
                ->where('shop_id_fk', $sid)
                ->where('role_id_fk', $this->roleOwner)
                ->value('user_id');

            $nonOwnerUserIds = DB::table('users')
                ->where('shop_id_fk', $sid)
                ->when($ownerUserId, fn ($q) => $q->where('user_id', '!=', $ownerUserId))
                ->pluck('user_id')->all();

            if ($nonOwnerUserIds) {
                $accountIds = DB::table('users')
                    ->whereIn('user_id', $nonOwnerUserIds)
                    ->whereNotNull('account_id_fk')
                    ->pluck('account_id_fk')->all();

                DB::table('shop_memberships')->whereIn('account_id_fk', $accountIds)->where('shop_id_fk', $sid)->delete();
                DB::table('users')->whereIn('user_id', $nonOwnerUserIds)->delete();

                // Delete orphan accounts (no remaining users or memberships)
                foreach ($accountIds as $aid) {
                    $hasUser = DB::table('users')->where('account_id_fk', $aid)->exists();
                    $hasMembership = DB::table('shop_memberships')->where('account_id_fk', $aid)->exists();
                    if (!$hasUser && !$hasMembership) {
                        DB::table('accounts')->where('account_id', $aid)->delete();
                    }
                }
            }
        }
    }

    // ─── Categories ──────────────────────────────────────────────────────────

    private function seedCategories(): array
    {
        $categories = [
            'Engine Parts', 'Brake System', 'Electrical Components',
            'Filters', 'Suspension', 'Transmission',
            'Body Parts', 'Cooling System', 'Fuel System', 'Lighting',
        ];

        $ids = [];
        foreach ($categories as $name) {
            $ids[$name] = DB::table('categories')->insertGetId([
                'category_name'          => $name,
                'description'            => null,
                'category_status_id_fk'  => $this->statusCategoryActive,
                'shop_id_fk'             => $this->shopId,
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);
        }
        return $ids;
    }

    // ─── Parts (100+) ────────────────────────────────────────────────────────

    private function seedParts(array $catIds): array
    {
        $catalog = [
            'Engine Parts' => [
                ['Piston Ring Set',        'PRG-001', 450.00,  30, 5],
                ['Crankshaft Bearing',      'CSB-002', 680.00,  15, 3],
                ['Valve Cover Gasket',      'VCG-003', 120.00,  40, 8],
                ['Camshaft Sprocket',        'CSS-004', 890.00,  10, 2],
                ['Oil Seal Kit',             'OSK-005', 195.00,  50, 10],
                ['Connecting Rod',           'CRD-006', 1250.00, 8,  2],
                ['Engine Mount Bolt Set',    'EMB-007', 85.00,   60, 10],
                ['Cylinder Head Gasket',     'CHG-008', 320.00,  25, 5],
                ['Timing Chain',             'TCH-009', 560.00,  18, 3],
                ['Rocker Arm Assembly',      'RAA-010', 740.00,  12, 2],
                ['Oil Pump',                 'OPP-011', 980.00,  7,  2],
                ['Engine Block Stud Kit',    'EBS-012', 140.00,  35, 5],
            ],
            'Brake System' => [
                ['Front Brake Pad Set',      'FBP-013', 350.00,  45, 8],
                ['Rear Brake Pad Set',       'RBP-014', 280.00,  40, 8],
                ['Brake Disc Rotor Front',   'BDR-015', 620.00,  20, 4],
                ['Brake Disc Rotor Rear',    'BDRR-016',520.00,  18, 4],
                ['Brake Caliper Piston',     'BCP-017', 180.00,  30, 5],
                ['Brake Fluid DOT4 500ml',   'BFD-018', 95.00,   60, 12],
                ['Brake Hose Assembly',      'BHA-019', 410.00,  15, 3],
                ['Master Cylinder Kit',      'MCK-020', 750.00,  10, 2],
                ['Brake Lever Set',          'BLS-021', 320.00,  25, 5],
                ['ABS Sensor Ring',          'ABR-022', 540.00,  12, 2],
            ],
            'Electrical Components' => [
                ['CDI Unit',                 'CDI-023', 890.00,  15, 3],
                ['Ignition Coil',            'IGC-024', 650.00,  20, 4],
                ['Spark Plug NGK CR7HSA',    'SPK-025', 85.00,   80, 15],
                ['Spark Plug NGK D8EA',      'SPK-026', 95.00,   70, 15],
                ['Voltage Regulator',        'VRG-027', 480.00,  18, 3],
                ['Starter Motor',            'STM-028', 1850.00, 8,  2],
                ['Wiring Harness',           'WHR-029', 1200.00, 5,  1],
                ['Turn Signal Relay',        'TSR-030', 165.00,  35, 6],
                ['Horn Assembly',            'HRN-031', 210.00,  25, 5],
                ['Kill Switch',              'KLS-032', 120.00,  30, 6],
                ['Electric Starter Button',  'ESB-033', 145.00,  28, 5],
            ],
            'Filters' => [
                ['Engine Oil Filter',        'EOF-034', 75.00,   100,20],
                ['Air Filter (Paper)',        'AFP-035', 120.00,  80, 15],
                ['Air Filter (Foam)',         'AFF-036', 95.00,   60, 12],
                ['Fuel Filter Inline',        'FFI-037', 85.00,   70, 15],
                ['Oil Filter Magnetic Drain', 'OFM-038', 180.00,  40, 8],
                ['Carburetor Fuel Filter',    'CFF-039', 45.00,   90, 18],
                ['Transmission Oil Filter',   'TOF-040', 110.00,  50, 10],
                ['Breather Filter',           'BRF-041', 65.00,   55, 11],
            ],
            'Suspension' => [
                ['Front Fork Oil Seal',       'FFS-042', 240.00,  30, 6],
                ['Rear Shock Absorber',       'RSA-043', 1450.00, 8,  2],
                ['Front Fork Spring',         'FFS-044', 680.00,  12, 2],
                ['Rear Suspension Linkage',   'RSL-045', 320.00,  15, 3],
                ['Front Fork Inner Tube',     'FFT-046', 950.00,  10, 2],
                ['Swing Arm Bearing Kit',     'SAB-047', 280.00,  20, 4],
                ['Steering Bearing Set',      'SBS-048', 350.00,  18, 4],
                ['Fork Oil 15W 500ml',        'FOL-049', 145.00,  40, 8],
                ['Front Axle Nut',            'FAN-050', 55.00,   50, 10],
            ],
            'Transmission' => [
                ['Clutch Plate Set',          'CPS-051', 780.00,  15, 3],
                ['Clutch Disc Kit',           'CDK-052', 520.00,  18, 3],
                ['Drive Chain 420H',          'DC4-053', 380.00,  25, 5],
                ['Drive Chain 428H',          'DC4-054', 420.00,  20, 4],
                ['Front Sprocket 14T',        'FSP-055', 280.00,  25, 5],
                ['Rear Sprocket 40T',         'RSP-056', 480.00,  20, 4],
                ['Gear Shift Drum',           'GSD-057', 650.00,  10, 2],
                ['Transmission Bearing Set',  'TBS-058', 340.00,  15, 3],
                ['Kickstart Lever',           'KSL-059', 420.00,  12, 2],
                ['Clutch Spring Set',         'CSS-060', 180.00,  35, 7],
            ],
            'Body Parts' => [
                ['Front Fender',              'FFD-061', 650.00,  10, 2],
                ['Rear Fender',               'RFD-062', 580.00,  10, 2],
                ['Side Cover Left',           'SCL-063', 480.00,  12, 2],
                ['Side Cover Right',          'SCR-064', 480.00,  12, 2],
                ['Headlight Fairing',         'HLF-065', 890.00,  8,  2],
                ['Fuel Tank Cover',           'FTC-066', 750.00,  8,  2],
                ['Seat Cover Replacement',    'SCR-067', 320.00,  20, 4],
                ['Frame Guard Set',           'FGS-068', 195.00,  25, 5],
                ['Rubber Foot Peg Set',       'RFP-069', 240.00,  20, 4],
                ['Mirror Pair Assembly',      'MPA-070', 380.00,  15, 3],
            ],
            'Cooling System' => [
                ['Radiator Cap',              'RAC-071', 95.00,   40, 8],
                ['Coolant Reservoir Hose',    'CRH-072', 145.00,  25, 5],
                ['Water Pump Seal',           'WPS-073', 180.00,  20, 4],
                ['Thermostat Valve',          'THV-074', 320.00,  15, 3],
                ['Radiator Fan Motor',        'RFM-075', 780.00,  10, 2],
                ['Coolant Honda Blue 1L',     'CHB-076', 165.00,  50, 10],
                ['Coolant Yamaha Blue 1L',    'CYB-077', 155.00,  45, 9],
                ['Radiator Lower Hose',       'RLH-078', 220.00,  18, 4],
            ],
            'Fuel System' => [
                ['Carburetor Complete',       'CAR-079', 1850.00, 8,  2],
                ['Carburetor Jet Kit',        'CJK-080', 320.00,  20, 4],
                ['Fuel Cock Petcock',         'FCP-081', 380.00,  15, 3],
                ['Fuel Pump Assembly',        'FPA-082', 1250.00, 8,  2],
                ['Throttle Cable',            'TCA-083', 185.00,  25, 5],
                ['Choke Cable',               'CCA-084', 145.00,  25, 5],
                ['Fuel Injector Yamaha',      'FIY-085', 1650.00, 6,  1],
                ['Fuel Injector Honda',       'FIH-086', 1580.00, 6,  1],
                ['Intake Manifold Gasket',    'IMG-087', 95.00,   40, 8],
                ['Air Box Assembly',          'ABA-088', 580.00,  12, 2],
            ],
            'Lighting' => [
                ['Headlight Bulb 12V 35W',    'HLB-089', 85.00,   60, 12],
                ['Headlight LED H4',          'HLD-090', 480.00,  20, 4],
                ['Tail Light Assembly',       'TLA-091', 380.00,  15, 3],
                ['Turn Signal Bulb 12V',      'TSB-092', 35.00,   80, 16],
                ['LED Turn Signal Set',       'LTS-093', 580.00,  15, 3],
                ['Instrument Light Bulb',     'ILB-094', 25.00,   100,20],
                ['Headlight Adjuster',        'HLA-095', 65.00,   40, 8],
                ['Brake Light Switch',        'BLS-096', 95.00,   35, 7],
                ['License Plate Light',       'LPL-097', 120.00,  30, 6],
                ['Dashboard LED Strip',       'DLS-098', 195.00,  25, 5],
                ['Xenon HID Kit 6000K',       'XHI-099', 850.00,  10, 2],
                ['LED Halo Ring Light',       'LHR-100', 650.00,  12, 2],
            ],
        ];

        $partIds = [];
        foreach ($catalog as $catName => $parts) {
            $catId = $catIds[$catName];
            foreach ($parts as [$name, $barcode, $price, $stock, $reorder]) {
                $id = DB::table('parts')->insertGetId([
                    'category_id_fk'      => $catId,
                    'part_name'           => $name,
                    'barcode'             => $barcode,
                    'description'         => null,
                    'unit_price'          => $price,
                    'stock_quantity'      => $stock,
                    'reorder_level'       => $reorder,
                    'part_status_id_fk'   => $this->statusPartInStock,
                    'shop_id_fk'          => $this->shopId,
                    'created_at'          => now(),
                    'updated_at'          => now(),
                ]);
                $partIds[] = ['id' => $id, 'name' => $name, 'price' => $price, 'stock' => $stock];
            }
        }
        return $partIds;
    }

    // ─── Service Types ────────────────────────────────────────────────────────

    private function seedServiceTypes(): array
    {
        $types = [
            ['Oil Change',               'Engine oil and filter replacement',              250.00],
            ['Brake Service',            'Brake pad and disc inspection/replacement',      450.00],
            ['Engine Tune-Up',           'Full engine tune-up and adjustment',             850.00],
            ['Chain & Sprocket Service', 'Chain lubrication, tension, sprocket check',    380.00],
            ['Carburetor Cleaning',      'Carburetor disassembly and ultrasonic clean',    520.00],
            ['Battery Service',          'Battery testing and terminal cleaning',          180.00],
            ['Tire Replacement',         'Front or rear tire removal and replacement',     320.00],
            ['Full Maintenance Check',   '50-point inspection and preventive maintenance', 1200.00],
            ['Electrical Diagnostic',    'Full electrical system check and repair',        650.00],
            ['Fork Oil Change',          'Front fork oil drain and refill',               420.00],
        ];

        $ids = [];
        foreach ($types as [$name, $desc, $cost]) {
            $ids[] = DB::table('service_types')->insertGetId([
                'service_name'              => $name,
                'description'               => $desc,
                'labor_cost'                => $cost,
                'estimated_duration'        => null,
                'service_type_status_id_fk' => $this->statusServiceTypeActive,
                'shop_id_fk'               => $this->shopId,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        }
        return $ids;
    }

    // ─── Customers ────────────────────────────────────────────────────────────

    private function seedCustomers(): array
    {
        $customers = [
            ['Juan Dela Cruz',    '09171234567', 'juan.delacruz@gmail.com',   '123 Magsaysay St, Quezon City'],
            ['Maria Santos',      '09281234567', 'maria.santos@yahoo.com',    '456 Rizal Ave, Manila'],
            ['Roberto Reyes',     '09391234567', 'r.reyes@outlook.com',       '789 Luna St, Makati'],
            ['Ana Mendoza',       '09471234567', 'ana.mendoza@gmail.com',     '321 Mabini St, Pasig'],
            ['Carlos Bautista',   '09561234567', 'carlos.b@gmail.com',        '654 Del Pilar St, Mandaluyong'],
        ];

        $ids = [];
        foreach ($customers as [$name, $phone, $email, $address]) {
            $ids[] = DB::table('customers')->insertGetId([
                'user_id_fk'   => null,
                'account_id_fk'=> null,
                'full_name'    => $name,
                'phone'        => $phone,
                'email'        => $email,
                'address'      => $address,
                'shop_id_fk'   => $this->shopId,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }
        return $ids;
    }

    // ─── Staff ────────────────────────────────────────────────────────────────

    private function seedStaff(): int
    {
        $accountId = DB::table('accounts')->insertGetId([
            'full_name'           => 'Liza Flores',
            'email'               => 'liza.flores@webtech.mospams.shop',
            'password_hash'       => Hash::make('password'),
            'google_id'           => null,
            'account_status_id_fk'=> $this->statusAccountActive,
            'email_verified_at'   => now(),
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        DB::table('shop_memberships')->insert([
            'account_id_fk'           => $accountId,
            'shop_id_fk'              => $this->shopId,
            'role_id_fk'              => $this->roleStaff,
            'membership_status_id_fk' => $this->statusMemberActive,
            'created_at'              => now(),
            'updated_at'              => now(),
        ]);

        $userId = DB::table('users')->insertGetId([
            'account_id_fk'       => $accountId,
            'role_id_fk'          => $this->roleStaff,
            'full_name'           => 'Liza Flores',
            'username'            => 'liza.flores',
            'password_hash'       => Hash::make('password'),
            'user_status_id_fk'   => $this->statusUserActive,
            'shop_id_fk'          => $this->shopId,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        return $userId;
    }

    // ─── Mechanics ────────────────────────────────────────────────────────────

    private function seedMechanics(): array
    {
        $mechanics = [
            ['Ronaldo Cruz',    '09611234567', 'ronaldo.cruz@webtech.mospams.shop',   'ronaldo.cruz'],
            ['Joey Marquez',    '09621234567', 'joey.marquez@webtech.mospams.shop',   'joey.marquez'],
            ['Mark Lim',        '09631234567', 'mark.lim@webtech.mospams.shop',       'mark.lim'],
            ['Peter Gomez',     '09641234567', 'peter.gomez@webtech.mospams.shop',    'peter.gomez'],
            ['Alex Torres',     '09651234567', 'alex.torres@webtech.mospams.shop',    'alex.torres'],
        ];

        $result = [];
        foreach ($mechanics as [$name, $phone, $email, $username]) {
            $accountId = DB::table('accounts')->insertGetId([
                'full_name'           => $name,
                'email'               => $email,
                'password_hash'       => Hash::make('password'),
                'google_id'           => null,
                'account_status_id_fk'=> $this->statusAccountActive,
                'email_verified_at'   => now(),
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);

            DB::table('shop_memberships')->insert([
                'account_id_fk'           => $accountId,
                'shop_id_fk'              => $this->shopId,
                'role_id_fk'              => $this->roleMechanic,
                'membership_status_id_fk' => $this->statusMemberActive,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]);

            $userId = DB::table('users')->insertGetId([
                'account_id_fk'     => $accountId,
                'role_id_fk'        => $this->roleMechanic,
                'full_name'         => $name,
                'username'          => $username,
                'password_hash'     => Hash::make('password'),
                'user_status_id_fk' => $this->statusUserActive,
                'shop_id_fk'        => $this->shopId,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            $mechanicId = DB::table('mechanics')->insertGetId([
                'user_id_fk'             => $userId,
                'account_id_fk'          => $accountId,
                'full_name'              => $name,
                'phone'                  => $phone,
                'email'                  => $email,
                'address'                => null,
                'mechanic_status_id_fk'  => $this->statusMechanicAvailable,
                'shop_id_fk'             => $this->shopId,
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);

            $result[] = ['mechanic_id' => $mechanicId, 'user_id' => $userId, 'name' => $name];
        }
        return $result;
    }

    // ─── Service Jobs (20) ────────────────────────────────────────────────────

    private function seedServiceJobs(
        array $customerIds,
        int   $staffUserId,
        array $mechanicData,
        array $partIds,
        array $serviceTypeIds
    ): void {
        $bikes = [
            'Honda Click 150i', 'Yamaha Mio i125', 'Honda Beat 110',
            'Kawasaki Barako 175', 'Suzuki Raider R150', 'Honda XRM 125',
            'Yamaha NMAX 155', 'Honda ADV 150', 'Kawasaki CT100B',
            'TVS Apache RTR 160', 'Honda TMX Supremo 150', 'Yamaha Sniper 150',
        ];

        $paymentStatuses = DB::table('payment_statuses')->pluck('payment_status_id', 'status_code');
        $paidStatusId    = $paymentStatuses['paid'] ?? $paymentStatuses->first();

        // 20 jobs: completed(8), in_progress(4), pending(5), cancelled(3)
        $jobs = [
            // Completed jobs — spread over past 90 days
            ['status' => 'completed',   'daysAgo' => 85, 'custIdx' => 0, 'mechIdx' => 0, 'stIdx' => 0, 'bikeIdx' => 0,  'parts' => [0,1],   'notes' => 'Customer requested quick turnaround.'],
            ['status' => 'completed',   'daysAgo' => 78, 'custIdx' => 1, 'mechIdx' => 1, 'stIdx' => 1, 'bikeIdx' => 1,  'parts' => [2],     'notes' => 'Replaced front brake pads.'],
            ['status' => 'completed',   'daysAgo' => 70, 'custIdx' => 2, 'mechIdx' => 2, 'stIdx' => 2, 'bikeIdx' => 2,  'parts' => [3,4],   'notes' => 'Full tune-up completed successfully.'],
            ['status' => 'completed',   'daysAgo' => 62, 'custIdx' => 3, 'mechIdx' => 0, 'stIdx' => 3, 'bikeIdx' => 3,  'parts' => [5],     'notes' => 'Chain and sprocket replaced.'],
            ['status' => 'completed',   'daysAgo' => 55, 'custIdx' => 4, 'mechIdx' => 3, 'stIdx' => 4, 'bikeIdx' => 4,  'parts' => [6,7],   'notes' => 'Carburetor ultrasonic cleaned.'],
            ['status' => 'completed',   'daysAgo' => 45, 'custIdx' => 0, 'mechIdx' => 1, 'stIdx' => 0, 'bikeIdx' => 5,  'parts' => [8],     'notes' => 'Battery terminals corroded, replaced battery.'],
            ['status' => 'completed',   'daysAgo' => 35, 'custIdx' => 1, 'mechIdx' => 4, 'stIdx' => 7, 'bikeIdx' => 6,  'parts' => [9,10],  'notes' => 'Full maintenance performed per 10,000km schedule.'],
            ['status' => 'completed',   'daysAgo' => 22, 'custIdx' => 2, 'mechIdx' => 2, 'stIdx' => 8, 'bikeIdx' => 7,  'parts' => [11],    'notes' => 'Electrical issue diagnosed and fixed.'],
            // In-progress jobs
            ['status' => 'in_progress', 'daysAgo' => 2,  'custIdx' => 3, 'mechIdx' => 0, 'stIdx' => 1, 'bikeIdx' => 8,  'parts' => [12],    'notes' => 'Waiting for brake disc delivery.'],
            ['status' => 'in_progress', 'daysAgo' => 1,  'custIdx' => 4, 'mechIdx' => 1, 'stIdx' => 2, 'bikeIdx' => 9,  'parts' => [],      'notes' => 'Engine disassembly in progress.'],
            ['status' => 'in_progress', 'daysAgo' => 1,  'custIdx' => 0, 'mechIdx' => 3, 'stIdx' => 5, 'bikeIdx' => 10, 'parts' => [13],    'notes' => 'Fork oil being drained.'],
            ['status' => 'in_progress', 'daysAgo' => 0,  'custIdx' => 1, 'mechIdx' => 4, 'stIdx' => 9, 'bikeIdx' => 11, 'parts' => [],      'notes' => 'Fork oil change started today.'],
            // Pending jobs
            ['status' => 'pending',     'daysAgo' => 0,  'custIdx' => 2, 'mechIdx' => -1, 'stIdx' => 0, 'bikeIdx' => 0, 'parts' => [],      'notes' => 'Walk-in, awaiting mechanic assignment.'],
            ['status' => 'pending',     'daysAgo' => 0,  'custIdx' => 3, 'mechIdx' => -1, 'stIdx' => 4, 'bikeIdx' => 2, 'parts' => [],      'notes' => 'Customer called ahead for tune-up.'],
            ['status' => 'pending',     'daysAgo' => 0,  'custIdx' => 4, 'mechIdx' => -1, 'stIdx' => 1, 'bikeIdx' => 3, 'parts' => [],      'notes' => 'Brake pads worn, needs replacement.'],
            ['status' => 'pending',     'daysAgo' => 0,  'custIdx' => 0, 'mechIdx' => -1, 'stIdx' => 7, 'bikeIdx' => 5, 'parts' => [],      'notes' => 'Scheduled full maintenance check.'],
            ['status' => 'pending',     'daysAgo' => 0,  'custIdx' => 1, 'mechIdx' => -1, 'stIdx' => 3, 'bikeIdx' => 1, 'parts' => [],      'notes' => 'Chain skipping, needs inspection.'],
            // Cancelled jobs
            ['status' => 'cancelled',   'daysAgo' => 50, 'custIdx' => 4, 'mechIdx' => -1, 'stIdx' => 6, 'bikeIdx' => 6, 'parts' => [],     'notes' => 'Customer did not show up.'],
            ['status' => 'cancelled',   'daysAgo' => 30, 'custIdx' => 3, 'mechIdx' => -1, 'stIdx' => 2, 'bikeIdx' => 4, 'parts' => [],     'notes' => 'Auto-cancelled after 12 hours.'],
            ['status' => 'cancelled',   'daysAgo' => 10, 'custIdx' => 2, 'mechIdx' => -1, 'stIdx' => 0, 'bikeIdx' => 7, 'parts' => [],     'notes' => 'Customer cancelled via phone.'],
        ];

        $statusMap = [
            'completed'   => $this->jobStatusCompleted,
            'in_progress' => $this->jobStatusInProgress,
            'pending'     => $this->jobStatusPending,
            'cancelled'   => $this->jobStatusCancelled,
        ];

        foreach ($jobs as $j) {
            $jobDate     = now()->subDays($j['daysAgo'])->toDateString();
            $isCompleted = $j['status'] === 'completed';
            $completionDate = $isCompleted ? $jobDate : null;
            $createdAt   = now()->subDays($j['daysAgo'])->subHours(rand(1, 8));
            $stId        = $serviceTypeIds[$j['stIdx']];
            $laborCost   = DB::table('service_types')->where('service_type_id', $stId)->value('labor_cost');

            $jobId = DB::table('service_jobs')->insertGetId([
                'customer_id_fk'           => $customerIds[$j['custIdx']],
                'assigned_mechanic_id_fk'  => null,
                'created_by_fk'            => $staffUserId,
                'service_job_status_id_fk' => $statusMap[$j['status']],
                'job_date'                 => $jobDate,
                'completion_date'          => $completionDate,
                'motorcycle_model'         => $bikes[$j['bikeIdx']],
                'notes'                    => $j['notes'],
                'shop_id_fk'               => $this->shopId,
                'created_at'               => $createdAt,
                'updated_at'               => $createdAt,
            ]);

            // service_job_items row
            DB::table('service_job_items')->insert([
                'job_id_fk'          => $jobId,
                'service_type_id_fk' => $stId,
                'labor_cost'         => $laborCost,
                'remarks'            => null,
            ]);

            // Assign mechanic for in_progress/completed
            $mechId = null;
            if ($j['mechIdx'] >= 0) {
                $mech   = $mechanicData[$j['mechIdx']];
                $mechId = $mech['mechanic_id'];
                DB::table('service_job_mechanics')->insert([
                    'job_id_fk'      => $jobId,
                    'mechanic_id_fk' => $mechId,
                    'shop_id_fk'     => $this->shopId,
                    'assigned_at'    => $createdAt,
                ]);
            }

            // Add confirmed parts for in_progress and completed
            $partsTotalCost = 0;
            if (!empty($j['parts']) && in_array($j['status'], ['in_progress', 'completed'])) {
                foreach ($j['parts'] as $pIdx) {
                    if (!isset($partIds[$pIdx])) continue;
                    $part = $partIds[$pIdx];
                    $qty  = rand(1, 2);
                    $sub  = $part['price'] * $qty;
                    $partsTotalCost += $sub;

                    DB::table('service_job_parts')->insert([
                        'job_id_fk'        => $jobId,
                        'part_id_fk'       => $part['id'],
                        'quantity'         => $qty,
                        'unit_price'       => $part['price'],
                        'subtotal'         => $sub,
                        'status'           => 'confirmed',
                        'requested_by_fk'  => null,
                    ]);

                    // Deduct stock
                    DB::table('parts')->where('part_id', $part['id'])
                        ->decrement('stock_quantity', $qty);
                }
            }

            // Create sale + payment for completed jobs
            if ($isCompleted) {
                $total   = $laborCost + $partsTotalCost;
                $saleId  = DB::table('sales')->insertGetId([
                    'customer_id_fk'  => $customerIds[$j['custIdx']],
                    'job_id_fk'       => $jobId,
                    'processed_by_fk' => $staffUserId,
                    'sale_type'       => 'service',
                    'total_amount'    => $total,
                    'discount'        => 0,
                    'net_amount'      => $total,
                    'sale_date'       => $createdAt,
                    'shop_id_fk'      => $this->shopId,
                    'created_at'      => $createdAt,
                    'updated_at'      => $createdAt,
                ]);

                if ($paidStatusId) {
                    DB::table('payments')->insert([
                        'sale_id_fk'       => $saleId,
                        'payment_method'   => (rand(0, 1) ? 'Cash' : 'GCash'),
                        'amount_paid'      => $total,
                        'payment_date'     => $createdAt,
                        'reference_number' => null,
                        'payment_status_id_fk' => $paidStatusId,
                    ]);
                }
            }
        }
    }
}
