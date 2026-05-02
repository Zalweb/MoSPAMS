<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RolesAndStatusesSeeder extends Seeder
{
    public function run(): void
    {
        // Create roles
        $roles = [
            ['role_name' => 'admin'],
            ['role_name' => 'customer'],
            ['role_name' => 'mechanic'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['role_name' => $role['role_name']],
                $role
            );
        }

        // Create user statuses
        $statuses = [
            [
                'status_code' => 'active',
                'status_name' => 'Active',
                'description' => 'User account is active and can login',
            ],
            [
                'status_code' => 'inactive',
                'status_name' => 'Inactive',
                'description' => 'User account is inactive and cannot login',
            ],
            [
                'status_code' => 'pending',
                'status_name' => 'Pending',
                'description' => 'User account is pending approval',
            ],
        ];

        foreach ($statuses as $status) {
            DB::table('user_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create category statuses
        $categoryStatuses = [
            ['status_code' => 'active', 'status_name' => 'Active', 'description' => 'Category is active'],
            ['status_code' => 'inactive', 'status_name' => 'Inactive', 'description' => 'Category is inactive'],
        ];

        foreach ($categoryStatuses as $status) {
            DB::table('category_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create part statuses
        $partStatuses = [
            ['status_code' => 'in_stock', 'status_name' => 'In Stock', 'description' => 'Part is available'],
            ['status_code' => 'out_of_stock', 'status_name' => 'Out of Stock', 'description' => 'Part is not available'],
            ['status_code' => 'discontinued', 'status_name' => 'Discontinued', 'description' => 'Part is no longer available'],
        ];

        foreach ($partStatuses as $status) {
            DB::table('part_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create service job statuses
        $jobStatuses = [
            ['status_code' => 'pending', 'status_name' => 'Pending', 'description' => 'Service job is pending'],
            ['status_code' => 'in_progress', 'status_name' => 'In Progress', 'description' => 'Service job is in progress'],
            ['status_code' => 'completed', 'status_name' => 'Completed', 'description' => 'Service job is completed'],
            ['status_code' => 'cancelled', 'status_name' => 'Cancelled', 'description' => 'Service job was cancelled'],
        ];

        foreach ($jobStatuses as $status) {
            DB::table('service_job_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create service type statuses
        $serviceTypeStatuses = [
            ['status_code' => 'active', 'status_name' => 'Active', 'description' => 'Service type is active'],
            ['status_code' => 'inactive', 'status_name' => 'Inactive', 'description' => 'Service type is inactive'],
        ];

        foreach ($serviceTypeStatuses as $status) {
            DB::table('service_type_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create mechanic statuses
        $mechanicStatuses = [
            ['status_code' => 'available', 'status_name' => 'Available', 'description' => 'Mechanic is available'],
            ['status_code' => 'busy', 'status_name' => 'Busy', 'description' => 'Mechanic is currently working'],
            ['status_code' => 'on_leave', 'status_name' => 'On Leave', 'description' => 'Mechanic is on leave'],
        ];

        foreach ($mechanicStatuses as $status) {
            DB::table('mechanic_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        // Create payment statuses
        $paymentStatuses = [
            ['status_code' => 'pending', 'status_name' => 'Pending', 'description' => 'Payment is pending'],
            ['status_code' => 'paid', 'status_name' => 'Paid', 'description' => 'Payment has been made'],
            ['status_code' => 'partial', 'status_name' => 'Partial', 'description' => 'Partial payment has been made'],
            ['status_code' => 'refunded', 'status_name' => 'Refunded', 'description' => 'Payment has been refunded'],
        ];

        foreach ($paymentStatuses as $status) {
            DB::table('payment_statuses')->updateOrInsert(
                ['status_code' => $status['status_code']],
                $status
            );
        }

        $this->command->info('Roles and statuses seeded successfully!');
    }
}
