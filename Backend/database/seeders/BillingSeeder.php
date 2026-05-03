<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BillingSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'plan_code' => 'BASIC',
                'plan_name' => 'Basic',
                'monthly_price' => 499,
                'description' => 'Starter plan for small shops',
                'is_active' => true,
            ],
            [
                'plan_code' => 'PREMIUM',
                'plan_name' => 'Premium',
                'monthly_price' => 999,
                'description' => 'Expanded operations and reporting',
                'is_active' => true,
            ],
            [
                'plan_code' => 'ENTERPRISE',
                'plan_name' => 'Enterprise',
                'monthly_price' => 1999,
                'description' => 'High-volume multi-branch operations',
                'is_active' => true,
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('subscription_plans')->updateOrInsert(
                ['plan_code' => $plan['plan_code']],
                array_merge($plan, ['updated_at' => now(), 'created_at' => now()])
            );
        }

        DB::table('platform_settings')->updateOrInsert(
            ['setting_key' => 'maintenance_mode'],
            [
                'setting_value' => '0',
                'is_encrypted' => false,
                'updated_by_fk' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        DB::table('platform_settings')->updateOrInsert(
            ['setting_key' => 'weather_api_key'],
            [
                'setting_value' => null,
                'is_encrypted' => true,
                'updated_by_fk' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        DB::table('platform_settings')->updateOrInsert(
            ['setting_key' => 'sms_api_key'],
            [
                'setting_value' => null,
                'is_encrypted' => true,
                'updated_by_fk' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        DB::table('platform_settings')->updateOrInsert(
            ['setting_key' => 'subscription_grace_days'],
            [
                'setting_value' => '7',
                'is_encrypted' => false,
                'updated_by_fk' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $basicPlanId = DB::table('subscription_plans')->where('plan_code', 'BASIC')->value('plan_id');
        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');

        if (! $basicPlanId || ! $activeStatusId) {
            return;
        }

        $shopIds = DB::table('shops')
            ->where('shop_status_id_fk', $activeStatusId)
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))
                    ->from('shop_subscriptions')
                    ->whereColumn('shop_subscriptions.shop_id_fk', 'shops.shop_id');
            })
            ->pluck('shop_id');

        foreach ($shopIds as $shopId) {
            DB::table('shop_subscriptions')->insert([
                'shop_id_fk' => $shopId,
                'plan_id_fk' => $basicPlanId,
                'subscription_status' => 'ACTIVE',
                'starts_at' => now(),
                'ends_at' => null,
                'renews_at' => null,
                'created_by_fk' => null,
                'updated_by_fk' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
