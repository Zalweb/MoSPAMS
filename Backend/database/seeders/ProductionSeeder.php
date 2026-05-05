<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // ── Roles ────────────────────────────────────────────────────────────
        $roles = ['SuperAdmin', 'Owner', 'Staff', 'Mechanic', 'Customer'];
        foreach ($roles as $name) {
            DB::table('roles')->updateOrInsert(['role_name' => $name], ['role_name' => $name]);
        }

        // ── User statuses ────────────────────────────────────────────────────
        $userStatuses = [
            ['status_code' => 'active',   'status_name' => 'Active',   'description' => 'Account is active'],
            ['status_code' => 'inactive', 'status_name' => 'Inactive', 'description' => 'Account is inactive'],
            ['status_code' => 'pending',  'status_name' => 'Pending',  'description' => 'Account pending approval'],
        ];
        foreach ($userStatuses as $s) {
            DB::table('user_statuses')->updateOrInsert(['status_code' => $s['status_code']], $s);
        }

        // ── Category statuses ────────────────────────────────────────────────
        foreach ([['active','Active'],['inactive','Inactive']] as [$code, $name]) {
            DB::table('category_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => "$name category"]
            );
        }

        // ── Part statuses ────────────────────────────────────────────────────
        $partStatuses = [
            ['in_stock',     'In Stock',     'Part is available'],
            ['out_of_stock', 'Out of Stock', 'Part is not available'],
            ['discontinued', 'Discontinued', 'Part is no longer available'],
        ];
        foreach ($partStatuses as [$code, $name, $desc]) {
            DB::table('part_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => $desc]
            );
        }

        // ── Service job statuses ─────────────────────────────────────────────
        $jobStatuses = [
            ['pending',     'Pending',     'Job is pending'],
            ['in_progress', 'In Progress', 'Job is in progress'],
            ['completed',   'Completed',   'Job is completed'],
            ['cancelled',   'Cancelled',   'Job was cancelled'],
        ];
        foreach ($jobStatuses as [$code, $name, $desc]) {
            DB::table('service_job_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => $desc]
            );
        }

        // ── Service type statuses ────────────────────────────────────────────
        foreach ([['active','Active'],['inactive','Inactive']] as [$code, $name]) {
            DB::table('service_type_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => "$name service type"]
            );
        }

        // ── Mechanic statuses ────────────────────────────────────────────────
        $mechanicStatuses = [
            ['available', 'Available', 'Mechanic is available'],
            ['busy',      'Busy',      'Mechanic is currently working'],
            ['on_leave',  'On Leave',  'Mechanic is on leave'],
        ];
        foreach ($mechanicStatuses as [$code, $name, $desc]) {
            DB::table('mechanic_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => $desc]
            );
        }

        // ── Payment statuses ─────────────────────────────────────────────────
        $paymentStatuses = [
            ['pending',  'Pending',  'Payment is pending'],
            ['paid',     'Paid',     'Payment has been made'],
            ['partial',  'Partial',  'Partial payment has been made'],
            ['refunded', 'Refunded', 'Payment has been refunded'],
        ];
        foreach ($paymentStatuses as [$code, $name, $desc]) {
            DB::table('payment_statuses')->updateOrInsert(
                ['status_code' => $code],
                ['status_code' => $code, 'status_name' => $name, 'description' => $desc]
            );
        }

        // ── Shop statuses (for the shops table) ──────────────────────────────
        $shopStatuses = [
            ['ACTIVE',    'Active',    'Shop is active'],
            ['SUSPENDED', 'Suspended', 'Shop is suspended'],
            ['PENDING',   'Pending',   'Shop registration pending approval'],
            ['INACTIVE',  'Inactive',  'Shop is inactive'],
        ];
        if (DB::getSchemaBuilder()->hasTable('shop_statuses')) {
            foreach ($shopStatuses as [$code, $name, $desc]) {
                DB::table('shop_statuses')->updateOrInsert(
                    ['status_code' => $code],
                    ['status_code' => $code, 'status_name' => $name, 'description' => $desc]
                );
            }
        }

        // ── Subscription plans ───────────────────────────────────────────────
        if (DB::getSchemaBuilder()->hasTable('subscription_plans')) {
            $plans = [
                ['plan_code' => 'BASIC',    'plan_name' => 'Basic',       'monthly_price' => 499,  'description' => 'Basic plan for small shops',    'is_active' => true],
                ['plan_code' => 'PRO',      'plan_name' => 'Professional', 'monthly_price' => 999,  'description' => 'Pro plan for growing shops',     'is_active' => true],
                ['plan_code' => 'BUSINESS', 'plan_name' => 'Business',    'monthly_price' => 1999, 'description' => 'Business plan for large shops',  'is_active' => true],
            ];
            foreach ($plans as $plan) {
                DB::table('subscription_plans')->updateOrInsert(['plan_code' => $plan['plan_code']], $plan);
            }
        }

        // ── SuperAdmin account ───────────────────────────────────────────────
        $superAdminRoleId = DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');
        $activeStatusId   = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        DB::table('users')->updateOrInsert(
            ['email' => 'superadmin@mospams.shop'],
            [
                'role_id_fk'        => $superAdminRoleId,
                'shop_id_fk'        => null,
                'full_name'         => 'Super Admin',
                'email'             => 'superadmin@mospams.shop',
                'password_hash'     => Hash::make('Admin@1234'),
                'user_status_id_fk' => $activeStatusId,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );

        $this->command->info('✓ All lookup tables seeded.');
        $this->command->info('✓ SuperAdmin account ready:');
        $this->command->info('  Email:    superadmin@mospams.shop');
        $this->command->info('  Password: Admin@1234');
        $this->command->warn('  ⚠ Change the password after first login!');
    }
}
