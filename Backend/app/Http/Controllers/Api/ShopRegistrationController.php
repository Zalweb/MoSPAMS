<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ShopRegistrationController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopName' => ['required', 'string', 'max:100'],
            'subdomain' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:shops,subdomain'],
            'ownerName' => ['required', 'string', 'max:100'],
            'ownerEmail' => ['required', 'email', 'max:100', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'planCode' => ['required', 'in:BASIC,PREMIUM,ENTERPRISE'],
        ]);

        $activeShopStatusId = DB::table('shop_statuses')
            ->where('status_code', 'ACTIVE')
            ->value('shop_status_id');

        abort_unless($activeShopStatusId, 422, 'Shop status configuration missing.');

        $planId = DB::table('subscription_plans')
            ->where('plan_code', $data['planCode'])
            ->value('plan_id');

        abort_unless($planId, 422, 'Invalid subscription plan.');

        $ownerRoleId = DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        abort_unless($ownerRoleId && $activeUserStatusId, 422, 'Owner role/status configuration missing.');

        $trialDays = max(1, (int) config('tenancy.shop_trial_days', 14));

        return DB::transaction(function () use ($data, $activeShopStatusId, $planId, $ownerRoleId, $activeUserStatusId, $trialDays) {
            $invitationCode = strtoupper(Str::random(8));
            $trialEndsAt = now()->addDays($trialDays);
            $ownerEmail = strtolower($data['ownerEmail']);

            $shopId = DB::table('shops')->insertGetId([
                'shop_name' => $data['shopName'],
                'registration_owner_name' => $data['ownerName'],
                'registration_owner_email' => $ownerEmail,
                'subdomain' => strtolower($data['subdomain']),
                'invitation_code' => $invitationCode,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'shop_status_id_fk' => $activeShopStatusId,
                'registration_status' => 'APPROVED',
                'registration_rejection_reason' => null,
                'registration_approved_at' => now(),
                'registration_rejected_at' => null,
                'primary_color' => '#3B82F6',
                'secondary_color' => '#10B981',
                'business_hours' => json_encode([
                    'monday' => ['open' => '08:00', 'close' => '18:00'],
                    'tuesday' => ['open' => '08:00', 'close' => '18:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '18:00'],
                    'thursday' => ['open' => '08:00', 'close' => '18:00'],
                    'friday' => ['open' => '08:00', 'close' => '18:00'],
                    'saturday' => ['open' => '08:00', 'close' => '16:00'],
                    'sunday' => ['closed' => true],
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $temporaryPassword = Str::random(12);

            DB::table('users')->insert([
                'shop_id_fk' => $shopId,
                'role_id_fk' => $ownerRoleId,
                'full_name' => $data['ownerName'],
                'username' => $ownerEmail,
                'email' => $ownerEmail,
                'password_hash' => Hash::make($temporaryPassword),
                'user_status_id_fk' => $activeUserStatusId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('shop_subscriptions')->insert([
                'shop_id_fk' => $shopId,
                'plan_id_fk' => $planId,
                'subscription_status' => 'ACTIVE',
                'starts_at' => now(),
                'ends_at' => $trialEndsAt,
                'renews_at' => $trialEndsAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'shop_id_fk' => $shopId,
                'user_id_fk' => null,
                'action' => "Shop trial started: {$data['shopName']}",
                'table_name' => 'shops',
                'record_id' => $shopId,
                'log_date' => now(),
                'description' => "Auto-approved trial registration by {$data['ownerName']} ({$ownerEmail})",
            ]);

            return response()->json([
                'data' => [
                    'shopId' => $shopId,
                    'shopName' => $data['shopName'],
                    'subdomain' => $data['subdomain'],
                    'invitationCode' => $invitationCode,
                    'ownerName' => $data['ownerName'],
                    'ownerEmail' => $ownerEmail,
                    'temporaryPassword' => $temporaryPassword,
                    'status' => 'ACTIVE',
                    'trialDays' => $trialDays,
                    'trialEndsAt' => $trialEndsAt->toISOString(),
                    'message' => 'Your shop is ready! Sign in with your temporary password.',
                ],
            ], 201);
        });
    }
}
