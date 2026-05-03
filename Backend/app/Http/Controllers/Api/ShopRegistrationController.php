<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $pendingStatusId = DB::table('shop_statuses')
            ->where('status_code', 'PENDING')
            ->value('shop_status_id');

        abort_unless($pendingStatusId, 422, 'Shop status configuration missing.');

        $planId = DB::table('subscription_plans')
            ->where('plan_code', $data['planCode'])
            ->value('plan_id');

        abort_unless($planId, 422, 'Invalid subscription plan.');

        return DB::transaction(function () use ($data, $pendingStatusId, $planId) {
            $invitationCode = strtoupper(Str::random(8));

            $shopId = DB::table('shops')->insertGetId([
                'shop_name' => $data['shopName'],
                'registration_owner_name' => $data['ownerName'],
                'registration_owner_email' => strtolower($data['ownerEmail']),
                'subdomain' => strtolower($data['subdomain']),
                'invitation_code' => $invitationCode,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'shop_status_id_fk' => $pendingStatusId,
                'registration_status' => 'PENDING_APPROVAL',
                'registration_rejection_reason' => null,
                'registration_approved_at' => null,
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

            DB::table('shop_subscriptions')->insert([
                'shop_id_fk' => $shopId,
                'plan_id_fk' => $planId,
                'subscription_status' => 'PENDING',
                'starts_at' => null,
                'ends_at' => null,
                'renews_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('activity_logs')->insert([
                'shop_id_fk' => $shopId,
                'user_id_fk' => null,
                'action' => "Shop registration submitted: {$data['shopName']}",
                'table_name' => 'shops',
                'record_id' => $shopId,
                'log_date' => now(),
                'description' => "Public registration by {$data['ownerName']} ({$data['ownerEmail']})",
            ]);

            return response()->json([
                'data' => [
                    'shopId' => $shopId,
                    'shopName' => $data['shopName'],
                    'subdomain' => $data['subdomain'],
                    'invitationCode' => $invitationCode,
                    'ownerName' => $data['ownerName'],
                    'ownerEmail' => $data['ownerEmail'],
                    'status' => 'PENDING',
                    'message' => 'Registration submitted successfully. You will receive an email once your shop is approved.',
                ],
            ], 201);
        });
    }
}
