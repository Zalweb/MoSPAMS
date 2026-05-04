<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SuperAdminController extends Controller
{
    private string $timezone = 'Asia/Manila';

    public function analytics(Request $request): JsonResponse
    {
        $this->syncExpiredSubscriptions();

        $period = $request->query('period', 'day');
        abort_unless(in_array($period, ['day', 'week', 'month'], true), 422, 'Invalid period filter.');

        $platformSalesRevenue = (float) DB::table('sales')->sum('net_amount');
        $subscriptionRevenue = (float) DB::table('subscription_payments')
            ->whereRaw('UPPER(payment_status) = ?', ['PAID'])
            ->sum('amount');

        $statusCounts = DB::table('shops')
            ->join('shop_statuses', 'shop_statuses.shop_status_id', '=', 'shops.shop_status_id_fk')
            ->selectRaw('UPPER(shop_statuses.status_code) as status_code, COUNT(*) as total')
            ->groupByRaw('UPPER(shop_statuses.status_code)')
            ->pluck('total', 'status_code');

        $shopGrowth = $this->buildGrowthSeries($period);

        return response()->json([
            'summary' => [
                'platformSalesRevenue' => $platformSalesRevenue,
                'subscriptionRevenue' => $subscriptionRevenue,
                'totalRevenue' => $platformSalesRevenue + $subscriptionRevenue,
                'totalShops' => (int) DB::table('shops')->count(),
                'totalPlatformAdmins' => (int) $this->superAdminQuery()->count(),
            ],
            'shopHealth' => [
                'active' => (int) ($statusCounts['ACTIVE'] ?? 0),
                'suspended' => (int) ($statusCounts['SUSPENDED'] ?? 0),
                'pending' => (int) ($statusCounts['PENDING'] ?? 0),
                'inactive' => (int) ($statusCounts['INACTIVE'] ?? 0),
            ],
            'growth' => [
                'period' => $period,
                'series' => $shopGrowth,
                'total' => array_sum(array_column($shopGrowth, 'count')),
            ],
        ]);
    }

    public function shops(Request $request): JsonResponse
    {
        $this->syncExpiredSubscriptions();

        $query = DB::table('shops as s')
            ->join('shop_statuses as st', 'st.shop_status_id', '=', 's.shop_status_id_fk')
            ->leftJoin('users as owner', function ($join) {
                $join->on('owner.shop_id_fk', '=', 's.shop_id')
                    ->where('owner.role_id_fk', '=', DB::raw("(SELECT role_id FROM roles WHERE role_name = 'Owner' LIMIT 1)"));
            })
            ->select([
                's.shop_id',
                's.shop_name',
                's.invitation_code',
                's.phone',
                's.address',
                's.created_at',
                's.registration_owner_name',
                's.registration_owner_email',
                's.registration_status',
                's.registration_rejection_reason',
                's.registration_approved_at',
                's.registration_rejected_at',
                'st.status_code',
                'st.status_name',
                'owner.user_id as owner_user_id',
                'owner.full_name as owner_name',
                'owner.email as owner_email',
            ])
            ->orderByDesc('s.created_at');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('s.shop_name', 'like', "%{$search}%")
                    ->orWhere('owner.full_name', 'like', "%{$search}%")
                    ->orWhere('owner.email', 'like', "%{$search}%")
                    ->orWhere('s.registration_owner_name', 'like', "%{$search}%")
                    ->orWhere('s.registration_owner_email', 'like', "%{$search}%");
            });
        }

        $rows = $query->get();
        $shopIds = $rows->pluck('shop_id')->all();

        $subscriptionRows = collect();
        if (!empty($shopIds)) {
            $subscriptionRows = DB::table('shop_subscriptions as ss')
                ->leftJoin('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
                ->whereIn('ss.shop_id_fk', $shopIds)
                ->orderByDesc('ss.shop_subscription_id')
                ->get([
                    'ss.shop_subscription_id',
                    'ss.shop_id_fk',
                    'ss.subscription_status',
                    'ss.starts_at',
                    'ss.ends_at',
                    'ss.renews_at',
                    'sp.plan_id',
                    'sp.plan_code',
                    'sp.plan_name',
                    'sp.monthly_price',
                ])
                ->groupBy('shop_id_fk')
                ->map(fn ($items) => $items->first());
        }

        $data = $rows->map(function ($row) use ($subscriptionRows) {
            $subscription = $subscriptionRows->get($row->shop_id);

            return [
                'shopId' => (int) $row->shop_id,
                'shopName' => $row->shop_name,
                'invitationCode' => $row->invitation_code,
                'phone' => $row->phone,
                'address' => $row->address,
                'statusCode' => strtoupper((string) $row->status_code),
                'statusName' => $row->status_name,
                'owner' => [
                    'userId' => $row->owner_user_id ? (int) $row->owner_user_id : null,
                    'name' => $row->owner_name,
                    'email' => $row->owner_email,
                ],
                'applicant' => [
                    'name' => $row->registration_owner_name,
                    'email' => $row->registration_owner_email,
                ],
                'registration' => [
                    'status' => strtoupper((string) ($row->registration_status ?? 'SYSTEM_PROVISIONED')),
                    'rejectionReason' => $row->registration_rejection_reason,
                    'approvedAt' => $this->iso($row->registration_approved_at),
                    'rejectedAt' => $this->iso($row->registration_rejected_at),
                ],
                'subscription' => $subscription ? [
                    'shopSubscriptionId' => (int) $subscription->shop_subscription_id,
                    'status' => strtoupper((string) $subscription->subscription_status),
                    'startsAt' => $this->iso($subscription->starts_at),
                    'endsAt' => $this->iso($subscription->ends_at),
                    'renewsAt' => $this->iso($subscription->renews_at),
                    'plan' => [
                        'planId' => (int) $subscription->plan_id,
                        'planCode' => $subscription->plan_code,
                        'planName' => $subscription->plan_name,
                        'monthlyPrice' => (float) $subscription->monthly_price,
                    ],
                ] : null,
                'createdAt' => $this->iso($row->created_at),
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    public function storeShop(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopName' => ['required', 'string', 'max:100'],
            'subdomain' => ['sometimes', 'nullable', 'string', 'max:50', 'alpha_dash', 'unique:shops,subdomain'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'ownerName' => ['required', 'string', 'max:100'],
            'ownerEmail' => ['required', 'email', 'max:100', 'unique:users,email'],
        ]);

        $pendingStatusId = $this->shopStatusId('PENDING');
        $ownerRoleId = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        $basicPlanId = (int) DB::table('subscription_plans')->where('plan_code', 'BASIC')->value('plan_id');

        abort_unless($pendingStatusId && $ownerRoleId && $activeUserStatusId, 422, 'Missing required platform seed data.');

        $tempPassword = Str::random(12);

        $payload = DB::transaction(function () use ($data, $request, $pendingStatusId, $ownerRoleId, $activeUserStatusId, $basicPlanId, $tempPassword) {
            $subdomain = $this->ensureUniqueSubdomain((string) ($data['subdomain'] ?? ''), (string) $data['shopName']);

            $shopId = DB::table('shops')->insertGetId([
                'shop_name' => $data['shopName'],
                'registration_owner_name' => $data['ownerName'],
                'registration_owner_email' => strtolower($data['ownerEmail']),
                'invitation_code' => strtoupper(\Illuminate\Support\Str::random(8)),
                'subdomain' => $subdomain,
                'custom_domain' => null,
                'registration_status' => 'SYSTEM_PROVISIONED',
                'registration_rejection_reason' => null,
                'registration_approved_at' => now(),
                'registration_rejected_at' => null,
                'logo_url' => null,
                'primary_color' => '#3B82F6',
                'secondary_color' => '#10B981',
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'business_description' => null,
                'facebook_url' => null,
                'instagram_url' => null,
                'business_hours' => json_encode([
                    'monday' => ['open' => '08:00', 'close' => '18:00'],
                    'tuesday' => ['open' => '08:00', 'close' => '18:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '18:00'],
                    'thursday' => ['open' => '08:00', 'close' => '18:00'],
                    'friday' => ['open' => '08:00', 'close' => '18:00'],
                    'saturday' => ['open' => '08:00', 'close' => '16:00'],
                    'sunday' => ['open' => 'closed', 'close' => 'closed'],
                ]),
                'shop_status_id_fk' => $pendingStatusId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $ownerId = DB::table('users')->insertGetId([
                'shop_id_fk' => $shopId,
                'role_id_fk' => $ownerRoleId,
                'full_name' => $data['ownerName'],
                'username' => $data['ownerEmail'],
                'email' => $data['ownerEmail'],
                'password_hash' => Hash::make($tempPassword),
                'user_status_id_fk' => $activeUserStatusId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $shopSubscriptionId = null;
            if ($basicPlanId) {
                $shopSubscriptionId = DB::table('shop_subscriptions')->insertGetId([
                    'shop_id_fk' => $shopId,
                    'plan_id_fk' => $basicPlanId,
                    'subscription_status' => 'PENDING',
                    'starts_at' => null,
                    'ends_at' => null,
                    'renews_at' => null,
                    'created_by_fk' => $request->user()?->user_id,
                    'updated_by_fk' => $request->user()?->user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->logPlatformAction(
                $request,
                "Provisioned shop {$data['shopName']} with Owner {$data['ownerEmail']}",
                'shops',
                $shopId,
                $shopId
            );

            return [
                'shopId' => $shopId,
                'ownerId' => $ownerId,
                'shopSubscriptionId' => $shopSubscriptionId,
            ];
        });

        $shop = DB::table('shops as s')
            ->join('shop_statuses as st', 'st.shop_status_id', '=', 's.shop_status_id_fk')
            ->where('s.shop_id', $payload['shopId'])
            ->select('s.*', 'st.status_code', 'st.status_name')
            ->first();

        return response()->json([
            'data' => [
                'shopId' => (int) $shop->shop_id,
                'shopName' => $shop->shop_name,
                'phone' => $shop->phone,
                'address' => $shop->address,
                'statusCode' => strtoupper((string) $shop->status_code),
                'statusName' => $shop->status_name,
                'ownerUserId' => (int) $payload['ownerId'],
                'shopSubscriptionId' => $payload['shopSubscriptionId'] ? (int) $payload['shopSubscriptionId'] : null,
                'temporaryPassword' => $tempPassword,
                'passwordPolicy' => 'manual_reset',
            ],
        ], 201);
    }

    public function updateShop(Request $request, int $shop): JsonResponse
    {
        $existing = DB::table('shops')->where('shop_id', $shop)->first();
        abort_if(!$existing, 404, 'Shop not found.');

        $data = $request->validate([
            'shopName' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (!$data) {
            return response()->json(['data' => $existing]);
        }

        $patch = ['updated_at' => now()];
        if (array_key_exists('shopName', $data)) $patch['shop_name'] = $data['shopName'];
        if (array_key_exists('phone', $data)) $patch['phone'] = $data['phone'];
        if (array_key_exists('address', $data)) $patch['address'] = $data['address'];

        DB::table('shops')->where('shop_id', $shop)->update($patch);

        $this->logPlatformAction($request, "Updated shop #{$shop}", 'shops', $shop, $shop);

        $updated = DB::table('shops as s')
            ->join('shop_statuses as st', 'st.shop_status_id', '=', 's.shop_status_id_fk')
            ->where('s.shop_id', $shop)
            ->select('s.*', 'st.status_code', 'st.status_name')
            ->first();

        return response()->json([
            'data' => [
                'shopId' => (int) $updated->shop_id,
                'shopName' => $updated->shop_name,
                'phone' => $updated->phone,
                'address' => $updated->address,
                'statusCode' => strtoupper((string) $updated->status_code),
                'statusName' => $updated->status_name,
            ],
        ]);
    }

    public function suspendShop(Request $request, int $shop): JsonResponse
    {
        $this->setShopStatus($shop, 'SUSPENDED');

        $this->logPlatformAction($request, "Suspended shop #{$shop}", 'shops', $shop, $shop);

        return response()->json(['message' => 'Shop suspended.']);
    }

    public function activateShop(Request $request, int $shop): JsonResponse
    {
        $this->setShopStatus($shop, 'ACTIVE');

        $this->logPlatformAction($request, "Activated shop #{$shop}", 'shops', $shop, $shop);

        return response()->json(['message' => 'Shop activated.']);
    }

    public function approveRegistration(Request $request, int $shop): JsonResponse
    {
        $trialDays = max(1, (int) config('tenancy.shop_trial_days', 14));
        $ownerRoleId = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeUserStatusId = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        abort_unless($ownerRoleId && $activeUserStatusId, 422, 'Owner role/status configuration missing.');

        $payload = DB::transaction(function () use ($request, $shop, $trialDays, $ownerRoleId, $activeUserStatusId) {
            $shopRow = DB::table('shops')->where('shop_id', $shop)->lockForUpdate()->first();
            abort_if(! $shopRow, 404, 'Shop not found.');

            $registrationStatus = strtoupper((string) ($shopRow->registration_status ?? 'SYSTEM_PROVISIONED'));
            abort_if($registrationStatus === 'REJECTED', 422, 'Rejected registrations cannot be approved.');

            // Idempotency guard — safe to call multiple times
            if ($registrationStatus === 'APPROVED') {
                $existingOwnerId = DB::table('users as u')
                    ->join('roles as r', 'r.role_id', '=', 'u.role_id_fk')
                    ->where('u.shop_id_fk', $shop)
                    ->where('r.role_name', 'Owner')
                    ->value('u.user_id');

                return [
                    'ownerId' => $existingOwnerId ? (int) $existingOwnerId : null,
                    'temporaryPassword' => null,
                    'trialDays' => $trialDays,
                    'trialEndsAt' => null,
                    'alreadyApproved' => true,
                ];
            }

            abort_if(
                empty($shopRow->registration_owner_email) || empty($shopRow->registration_owner_name),
                422,
                'Registration applicant details are incomplete.'
            );

            [$ownerId, $temporaryPassword] = $this->createOwnerIfMissing($shop, $shopRow, $ownerRoleId, $activeUserStatusId);

            $this->setShopStatus($shop, 'ACTIVE');

            $endsAt = $this->activateShopSubscription($shop, $trialDays, $request);

            DB::table('shops')->where('shop_id', $shop)->update([
                'registration_status' => 'APPROVED',
                'registration_rejection_reason' => null,
                'registration_approved_at' => now(),
                'registration_rejected_at' => null,
                'updated_at' => now(),
            ]);

            $this->logPlatformAction($request, "Approved registration for shop #{$shop}", 'shops', $shop, $shop);

            return [
                'ownerId' => $ownerId,
                'temporaryPassword' => $temporaryPassword,
                'trialDays' => $trialDays,
                'trialEndsAt' => $endsAt->toISOString(),
            ];
        });

        $alreadyApproved = $payload['alreadyApproved'] ?? false;

        return response()->json([
            'message' => $alreadyApproved ? 'Shop already approved.' : 'Shop approved successfully.',
            'data' => [
                'ownerId' => $payload['ownerId'],
                'temporaryPassword' => $payload['temporaryPassword'],
                'trialDays' => $payload['trialDays'],
                'trialEndsAt' => $payload['trialEndsAt'],
            ],
        ]);
    }

    private function createOwnerIfMissing(int $shop, object $shopRow, int $ownerRoleId, int $activeUserStatusId): array
    {
        $existingOwner = DB::table('users as u')
            ->join('roles as r', 'r.role_id', '=', 'u.role_id_fk')
            ->where('u.shop_id_fk', $shop)
            ->where('r.role_name', 'Owner')
            ->select('u.user_id', 'u.email')
            ->first();

        if ($existingOwner) {
            Log::warning("Shop #{$shop} approval: reusing existing Owner (user_id: {$existingOwner->user_id}). Recovering from inconsistent state.");
            return [(int) $existingOwner->user_id, null];
        }

        $ownerEmail = strtolower((string) $shopRow->registration_owner_email);
        $emailTaken = DB::table('users')->whereRaw('LOWER(email) = ?', [$ownerEmail])->exists();
        abort_if($emailTaken, 422, 'Registration owner email is already used by another account.');

        $temporaryPassword = Str::random(12);

        $ownerId = DB::table('users')->insertGetId([
            'shop_id_fk' => $shop,
            'role_id_fk' => $ownerRoleId,
            'full_name' => (string) $shopRow->registration_owner_name,
            'username' => $ownerEmail,
            'email' => $ownerEmail,
            'password_hash' => Hash::make($temporaryPassword),
            'user_status_id_fk' => $activeUserStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [(int) $ownerId, $temporaryPassword];
    }

    private function activateShopSubscription(int $shop, int $trialDays, Request $request): Carbon
    {
        $endsAt = now()->addDays($trialDays);

        $subscription = DB::table('shop_subscriptions')
            ->where('shop_id_fk', $shop)
            ->orderByDesc('shop_subscription_id')
            ->first();

        if ($subscription) {
            DB::table('shop_subscriptions')
                ->where('shop_subscription_id', $subscription->shop_subscription_id)
                ->update([
                    'subscription_status' => 'ACTIVE',
                    'starts_at' => now(),
                    'ends_at' => $endsAt,
                    'renews_at' => $endsAt,
                    'updated_by_fk' => $request->user()?->user_id,
                    'updated_at' => now(),
                ]);
        } else {
            $fallbackPlanId = (int) DB::table('subscription_plans')
                ->where('is_active', true)
                ->orderBy('plan_id')
                ->value('plan_id');

            abort_unless($fallbackPlanId > 0, 422, 'No active subscription plan available for trial activation.');

            DB::table('shop_subscriptions')->insert([
                'shop_id_fk' => $shop,
                'plan_id_fk' => $fallbackPlanId,
                'subscription_status' => 'ACTIVE',
                'starts_at' => now(),
                'ends_at' => $endsAt,
                'renews_at' => $endsAt,
                'created_by_fk' => $request->user()?->user_id,
                'updated_by_fk' => $request->user()?->user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $endsAt;
    }

    public function rejectRegistration(Request $request, int $shop): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $shop, $data) {
            $shopRow = DB::table('shops')->where('shop_id', $shop)->lockForUpdate()->first();
            abort_if(! $shopRow, 404, 'Shop not found.');

            DB::table('shops')->where('shop_id', $shop)->update([
                'registration_status' => 'REJECTED',
                'registration_rejection_reason' => $data['reason'] ?? null,
                'registration_rejected_at' => now(),
                'registration_approved_at' => null,
                'updated_at' => now(),
            ]);

            $this->setShopStatus($shop, 'INACTIVE');
            $this->logPlatformAction($request, "Rejected registration for shop #{$shop}", 'shops', $shop, $shop);
        });

        return response()->json(['message' => 'Shop registration rejected.']);
    }

    public function shopDiagnostics(int $shop): JsonResponse
    {
        $shopRow = DB::table('shops as s')
            ->join('shop_statuses as st', 'st.shop_status_id', '=', 's.shop_status_id_fk')
            ->where('s.shop_id', $shop)
            ->select('s.*', 'st.status_code', 'st.status_name')
            ->first();
        abort_if(!$shopRow, 404, 'Shop not found.');

        $owner = DB::table('users as u')
            ->join('roles as r', 'r.role_id', '=', 'u.role_id_fk')
            ->where('u.shop_id_fk', $shop)
            ->where('r.role_name', 'Owner')
            ->select('u.user_id', 'u.full_name', 'u.email', 'u.username')
            ->first();

        $latestSubscription = DB::table('shop_subscriptions as ss')
            ->leftJoin('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
            ->where('ss.shop_id_fk', $shop)
            ->orderByDesc('ss.shop_subscription_id')
            ->select('ss.*', 'sp.plan_code', 'sp.plan_name', 'sp.monthly_price')
            ->first();

        $recentLogs = DB::table('activity_logs as al')
            ->leftJoin('users as u', 'u.user_id', '=', 'al.user_id_fk')
            ->where('al.shop_id_fk', $shop)
            ->orderByDesc('al.log_date')
            ->limit(20)
            ->get([
                'al.log_id',
                'al.action',
                'al.description',
                'al.log_date',
                'u.full_name as actor_name',
            ])
            ->map(fn ($row) => [
                'id' => (int) $row->log_id,
                'action' => $row->action,
                'description' => $row->description,
                'actorName' => $row->actor_name,
                'loggedAt' => $this->iso($row->log_date),
            ])
            ->values();

        return response()->json([
            'data' => [
                'shop' => [
                    'shopId' => (int) $shopRow->shop_id,
                    'shopName' => $shopRow->shop_name,
                    'phone' => $shopRow->phone,
                    'address' => $shopRow->address,
                    'statusCode' => strtoupper((string) $shopRow->status_code),
                    'statusName' => $shopRow->status_name,
                    'createdAt' => $this->iso($shopRow->created_at),
                ],
                'owner' => $owner ? [
                    'userId' => (int) $owner->user_id,
                    'name' => $owner->full_name,
                    'email' => $owner->email ?? $owner->username,
                ] : null,
                'applicant' => [
                    'name' => $shopRow->registration_owner_name,
                    'email' => $shopRow->registration_owner_email,
                ],
                'registration' => [
                    'status' => strtoupper((string) ($shopRow->registration_status ?? 'SYSTEM_PROVISIONED')),
                    'rejectionReason' => $shopRow->registration_rejection_reason,
                    'approvedAt' => $this->iso($shopRow->registration_approved_at),
                    'rejectedAt' => $this->iso($shopRow->registration_rejected_at),
                ],
                'subscription' => $latestSubscription ? [
                    'shopSubscriptionId' => (int) $latestSubscription->shop_subscription_id,
                    'status' => strtoupper((string) $latestSubscription->subscription_status),
                    'startsAt' => $this->iso($latestSubscription->starts_at),
                    'endsAt' => $this->iso($latestSubscription->ends_at),
                    'renewsAt' => $this->iso($latestSubscription->renews_at),
                    'planCode' => $latestSubscription->plan_code,
                    'planName' => $latestSubscription->plan_name,
                    'monthlyPrice' => $latestSubscription->monthly_price ? (float) $latestSubscription->monthly_price : null,
                ] : null,
                'metrics' => [
                    'users' => (int) DB::table('users')->where('shop_id_fk', $shop)->count(),
                    'parts' => (int) DB::table('parts')->where('shop_id_fk', $shop)->count(),
                    'serviceJobs' => (int) DB::table('service_jobs')->where('shop_id_fk', $shop)->count(),
                    'sales' => (int) DB::table('sales')->where('shop_id_fk', $shop)->count(),
                    'revenue' => (float) DB::table('sales')->where('shop_id_fk', $shop)->sum('net_amount'),
                    'pendingJobs' => (int) DB::table('service_jobs')
                        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                        ->where('service_jobs.shop_id_fk', $shop)
                        ->where('service_job_statuses.status_code', 'pending')
                        ->count(),
                ],
                'recentLogs' => $recentLogs,
            ],
        ]);
    }

    public function subscriptionPlans(): JsonResponse
    {
        $data = DB::table('subscription_plans')
            ->orderBy('monthly_price')
            ->get()
            ->map(fn ($row) => [
                'planId' => (int) $row->plan_id,
                'planCode' => $row->plan_code,
                'planName' => $row->plan_name,
                'monthlyPrice' => (float) $row->monthly_price,
                'description' => $row->description,
                'isActive' => (bool) $row->is_active,
                'createdAt' => $this->iso($row->created_at),
                'updatedAt' => $this->iso($row->updated_at),
            ])->values();

        return response()->json(['data' => $data]);
    }

    public function storeSubscriptionPlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'planCode' => ['required', 'string', 'max:30', 'alpha_dash', 'unique:subscription_plans,plan_code'],
            'planName' => ['required', 'string', 'max:100'],
            'monthlyPrice' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'isActive' => ['nullable', 'boolean'],
        ]);

        $planId = DB::table('subscription_plans')->insertGetId([
            'plan_code' => strtoupper($data['planCode']),
            'plan_name' => $data['planName'],
            'monthly_price' => $data['monthlyPrice'],
            'description' => $data['description'] ?? null,
            'is_active' => array_key_exists('isActive', $data) ? (bool) $data['isActive'] : true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logPlatformAction($request, "Created subscription plan {$data['planCode']}", 'subscription_plans', $planId);

        return response()->json(['data' => $this->planResource($planId)], 201);
    }

    public function updateSubscriptionPlan(Request $request, int $plan): JsonResponse
    {
        abort_if(!DB::table('subscription_plans')->where('plan_id', $plan)->exists(), 404, 'Plan not found.');

        $data = $request->validate([
            'planCode' => ['sometimes', 'string', 'max:30', 'alpha_dash', Rule::unique('subscription_plans', 'plan_code')->ignore($plan, 'plan_id')],
            'planName' => ['sometimes', 'string', 'max:100'],
            'monthlyPrice' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $patch = ['updated_at' => now()];
        if (array_key_exists('planCode', $data)) $patch['plan_code'] = strtoupper($data['planCode']);
        if (array_key_exists('planName', $data)) $patch['plan_name'] = $data['planName'];
        if (array_key_exists('monthlyPrice', $data)) $patch['monthly_price'] = $data['monthlyPrice'];
        if (array_key_exists('description', $data)) $patch['description'] = $data['description'];
        if (array_key_exists('isActive', $data)) $patch['is_active'] = (bool) $data['isActive'];

        DB::table('subscription_plans')->where('plan_id', $plan)->update($patch);

        $this->logPlatformAction($request, "Updated subscription plan #{$plan}", 'subscription_plans', $plan);

        return response()->json(['data' => $this->planResource($plan)]);
    }

    public function shopSubscriptions(Request $request): JsonResponse
    {
        $this->syncExpiredSubscriptions();

        $query = DB::table('shop_subscriptions as ss')
            ->join('shops as s', 's.shop_id', '=', 'ss.shop_id_fk')
            ->join('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
            ->select([
                'ss.shop_subscription_id',
                'ss.shop_id_fk',
                'ss.plan_id_fk',
                'ss.subscription_status',
                'ss.starts_at',
                'ss.ends_at',
                'ss.renews_at',
                'ss.created_at',
                'ss.updated_at',
                's.shop_name',
                'sp.plan_code',
                'sp.plan_name',
                'sp.monthly_price',
            ])
            ->orderByDesc('ss.created_at');

        if ($shopId = $request->query('shopId')) {
            $query->where('ss.shop_id_fk', (int) $shopId);
        }

        if ($status = $request->query('status')) {
            $query->whereRaw('UPPER(ss.subscription_status) = ?', [strtoupper((string) $status)]);
        }

        $data = $query->get()->map(fn ($row) => [
            'shopSubscriptionId' => (int) $row->shop_subscription_id,
            'shopId' => (int) $row->shop_id_fk,
            'shopName' => $row->shop_name,
            'planId' => (int) $row->plan_id_fk,
            'planCode' => $row->plan_code,
            'planName' => $row->plan_name,
            'monthlyPrice' => (float) $row->monthly_price,
            'status' => strtoupper((string) $row->subscription_status),
            'startsAt' => $this->iso($row->starts_at),
            'endsAt' => $this->iso($row->ends_at),
            'renewsAt' => $this->iso($row->renews_at),
            'createdAt' => $this->iso($row->created_at),
            'updatedAt' => $this->iso($row->updated_at),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function storeShopSubscription(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopId' => ['required', 'integer', 'exists:shops,shop_id'],
            'planId' => ['required', 'integer', 'exists:subscription_plans,plan_id'],
            'status' => ['required', Rule::in(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'])],
            'startsAt' => ['nullable', 'date'],
            'endsAt' => ['nullable', 'date'],
            'renewsAt' => ['nullable', 'date'],
        ]);

        $status = strtoupper($data['status']);

        $id = DB::table('shop_subscriptions')->insertGetId([
            'shop_id_fk' => (int) $data['shopId'],
            'plan_id_fk' => (int) $data['planId'],
            'subscription_status' => $status,
            'starts_at' => $this->dateOrNow($data['startsAt'] ?? null, $status === 'ACTIVE'),
            'ends_at' => $data['endsAt'] ?? null,
            'renews_at' => $data['renewsAt'] ?? null,
            'created_by_fk' => $request->user()?->user_id,
            'updated_by_fk' => $request->user()?->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->applySubscriptionStatusToShop((int) $data['shopId'], $status);
        $this->logPlatformAction($request, "Created subscription #{$id} for shop {$data['shopId']}", 'shop_subscriptions', $id, (int) $data['shopId']);

        return response()->json(['data' => $this->shopSubscriptionResource($id)], 201);
    }

    public function updateShopSubscription(Request $request, int $shopSubscription): JsonResponse
    {
        $existing = DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscription)->first();
        abort_if(!$existing, 404, 'Shop subscription not found.');

        $data = $request->validate([
            'planId' => ['sometimes', 'integer', 'exists:subscription_plans,plan_id'],
            'status' => ['sometimes', Rule::in(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'])],
            'startsAt' => ['sometimes', 'nullable', 'date'],
            'endsAt' => ['sometimes', 'nullable', 'date'],
            'renewsAt' => ['sometimes', 'nullable', 'date'],
        ]);

        $patch = [
            'updated_by_fk' => $request->user()?->user_id,
            'updated_at' => now(),
        ];

        if (array_key_exists('planId', $data)) $patch['plan_id_fk'] = (int) $data['planId'];
        if (array_key_exists('status', $data)) $patch['subscription_status'] = strtoupper((string) $data['status']);
        if (array_key_exists('startsAt', $data)) $patch['starts_at'] = $data['startsAt'];
        if (array_key_exists('endsAt', $data)) $patch['ends_at'] = $data['endsAt'];
        if (array_key_exists('renewsAt', $data)) $patch['renews_at'] = $data['renewsAt'];

        DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscription)->update($patch);

        $latest = DB::table('shop_subscriptions')->where('shop_subscription_id', $shopSubscription)->first();
        $status = strtoupper((string) $latest->subscription_status);
        $this->applySubscriptionStatusToShop((int) $latest->shop_id_fk, $status);

        $this->logPlatformAction($request, "Updated subscription #{$shopSubscription}", 'shop_subscriptions', $shopSubscription, (int) $latest->shop_id_fk);

        return response()->json(['data' => $this->shopSubscriptionResource($shopSubscription)]);
    }

    public function subscriptionPayments(Request $request): JsonResponse
    {
        $query = DB::table('subscription_payments as p')
            ->join('shop_subscriptions as ss', 'ss.shop_subscription_id', '=', 'p.shop_subscription_id_fk')
            ->join('shops as s', 's.shop_id', '=', 'p.shop_id_fk')
            ->join('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
            ->select([
                'p.subscription_payment_id',
                'p.shop_subscription_id_fk',
                'p.shop_id_fk',
                'p.payment_status',
                'p.amount',
                'p.payment_method',
                'p.due_at',
                'p.paid_at',
                'p.reference_number',
                'p.notes',
                'p.created_at',
                's.shop_name',
                'sp.plan_name',
            ])
            ->orderByDesc('p.created_at');

        if ($shopId = $request->query('shopId')) {
            $query->where('p.shop_id_fk', (int) $shopId);
        }

        $data = $query->get()->map(fn ($row) => [
            'subscriptionPaymentId' => (int) $row->subscription_payment_id,
            'shopSubscriptionId' => (int) $row->shop_subscription_id_fk,
            'shopId' => (int) $row->shop_id_fk,
            'shopName' => $row->shop_name,
            'planName' => $row->plan_name,
            'paymentStatus' => strtoupper((string) $row->payment_status),
            'amount' => (float) $row->amount,
            'paymentMethod' => $row->payment_method,
            'dueAt' => $this->iso($row->due_at),
            'paidAt' => $this->iso($row->paid_at),
            'referenceNumber' => $row->reference_number,
            'notes' => $row->notes,
            'createdAt' => $this->iso($row->created_at),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function storeSubscriptionPayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopSubscriptionId' => ['required', 'integer', 'exists:shop_subscriptions,shop_subscription_id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'paymentStatus' => ['required', Rule::in(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])],
            'paymentMethod' => ['nullable', 'string', 'max:50'],
            'dueAt' => ['nullable', 'date'],
            'paidAt' => ['nullable', 'date'],
            'referenceNumber' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $subscription = DB::table('shop_subscriptions')->where('shop_subscription_id', (int) $data['shopSubscriptionId'])->first();
        abort_if(!$subscription, 404, 'Shop subscription not found.');

        $status = strtoupper((string) $data['paymentStatus']);

        $paymentId = DB::table('subscription_payments')->insertGetId([
            'shop_subscription_id_fk' => (int) $data['shopSubscriptionId'],
            'shop_id_fk' => (int) $subscription->shop_id_fk,
            'payment_status' => $status,
            'amount' => $data['amount'],
            'payment_method' => $data['paymentMethod'] ?? null,
            'due_at' => $data['dueAt'] ?? null,
            'paid_at' => $data['paidAt'] ?? null,
            'reference_number' => $data['referenceNumber'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_by_fk' => $request->user()?->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($status === 'PAID') {
            DB::table('shop_subscriptions')->where('shop_subscription_id', (int) $data['shopSubscriptionId'])->update([
                'subscription_status' => 'ACTIVE',
                'starts_at' => $subscription->starts_at ?? now(),
                'updated_by_fk' => $request->user()?->user_id,
                'updated_at' => now(),
            ]);

            $this->setShopStatus((int) $subscription->shop_id_fk, 'ACTIVE');
        }

        $this->logPlatformAction($request, "Recorded subscription payment #{$paymentId}", 'subscription_payments', $paymentId, (int) $subscription->shop_id_fk);

        return response()->json(['data' => ['subscriptionPaymentId' => (int) $paymentId]], 201);
    }

    public function expiringSubscriptions(Request $request): JsonResponse
    {
        $this->syncExpiredSubscriptions();

        $days = max(1, min(90, (int) $request->query('days', 7)));
        $now = Carbon::now($this->timezone);
        $cutoff = $now->copy()->addDays($days);

        $rows = DB::table('shop_subscriptions as ss')
            ->join('shops as s', 's.shop_id', '=', 'ss.shop_id_fk')
            ->join('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
            ->whereRaw('UPPER(ss.subscription_status) = ?', ['ACTIVE'])
            ->whereNotNull('ss.ends_at')
            ->whereBetween('ss.ends_at', [$now->toDateTimeString(), $cutoff->toDateTimeString()])
            ->orderBy('ss.ends_at')
            ->get([
                'ss.shop_subscription_id',
                'ss.shop_id_fk',
                'ss.ends_at',
                's.shop_name',
                'sp.plan_name',
            ])
            ->map(fn ($row) => [
                'shopSubscriptionId' => (int) $row->shop_subscription_id,
                'shopId' => (int) $row->shop_id_fk,
                'shopName' => $row->shop_name,
                'planName' => $row->plan_name,
                'endsAt' => $this->iso($row->ends_at),
                'daysRemaining' => max(0, Carbon::parse($row->ends_at, $this->timezone)->diffInDays($now, false) * -1),
            ])
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function platformAdmins(): JsonResponse
    {
        $data = $this->superAdminQuery()
            ->orderBy('users.full_name')
            ->get([
                'users.user_id',
                'users.full_name',
                'users.username',
                'users.email',
                'users.updated_at',
                'user_statuses.status_name',
                'user_statuses.status_code',
            ])
            ->map(fn ($row) => [
                'userId' => (int) $row->user_id,
                'name' => $row->full_name,
                'email' => $row->email ?? $row->username,
                'status' => $row->status_name,
                'statusCode' => strtolower((string) $row->status_code),
                'lastActive' => $this->iso($row->updated_at),
            ])
            ->values();

        return response()->json(['data' => $data]);
    }

    public function storePlatformAdmin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $superAdminRoleId = (int) DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');
        $activeStatusId = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
        abort_unless($superAdminRoleId && $activeStatusId, 422, 'Missing required role or status seed data.');

        $generatedPassword = $data['password'] ?? Str::random(12);

        $userId = DB::table('users')->insertGetId([
            'shop_id_fk' => null,
            'role_id_fk' => $superAdminRoleId,
            'full_name' => $data['name'],
            'username' => $data['email'],
            'email' => $data['email'],
            'password_hash' => Hash::make($generatedPassword),
            'user_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->logPlatformAction($request, "Created platform admin {$data['email']}", 'users', $userId);

        return response()->json([
            'data' => [
                'userId' => (int) $userId,
                'name' => $data['name'],
                'email' => $data['email'],
                'temporaryPassword' => array_key_exists('password', $data) ? null : $generatedPassword,
            ],
        ], 201);
    }

    public function updatePlatformAdminStatus(Request $request, int $user): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $admin = $this->superAdminQuery()->where('users.user_id', $user)->first();
        abort_if(!$admin, 404, 'Platform admin not found.');

        $targetStatusCode = strtolower((string) $data['status']);

        if ($targetStatusCode === 'inactive') {
            $activeCount = (int) $this->superAdminQuery()->where('user_statuses.status_code', 'active')->count();
            abort_if($activeCount <= 1, 422, 'At least one active SuperAdmin is required.');
        }

        $statusId = (int) DB::table('user_statuses')->where('status_code', $targetStatusCode)->value('user_status_id');
        abort_unless($statusId, 422, 'Invalid user status configuration.');

        DB::table('users')->where('user_id', $user)->update([
            'user_status_id_fk' => $statusId,
            'updated_at' => now(),
        ]);

        $this->logPlatformAction($request, "Set platform admin #{$user} status to {$targetStatusCode}", 'users', $user);

        return response()->json(['message' => 'Platform admin status updated.']);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $limit = max(20, min(500, (int) $request->query('limit', 100)));

        $data = DB::table('activity_logs as al')
            ->leftJoin('users as u', 'u.user_id', '=', 'al.user_id_fk')
            ->leftJoin('shops as s', 's.shop_id', '=', 'al.shop_id_fk')
            ->orderByDesc('al.log_date')
            ->limit($limit)
            ->get([
                'al.log_id',
                'al.shop_id_fk',
                'al.user_id_fk',
                'al.action',
                'al.table_name',
                'al.record_id',
                'al.description',
                'al.log_date',
                'u.full_name as actor_name',
                's.shop_name',
            ])
            ->map(fn ($row) => [
                'logId' => (int) $row->log_id,
                'shopId' => $row->shop_id_fk ? (int) $row->shop_id_fk : null,
                'shopName' => $row->shop_name,
                'userId' => $row->user_id_fk ? (int) $row->user_id_fk : null,
                'actorName' => $row->actor_name,
                'action' => $row->action,
                'tableName' => $row->table_name,
                'recordId' => $row->record_id ? (int) $row->record_id : null,
                'description' => $row->description,
                'loggedAt' => $this->iso($row->log_date),
            ])
            ->values();

        return response()->json(['data' => $data]);
    }

    public function settings(): JsonResponse
    {
        $rows = DB::table('platform_settings')->get()->keyBy('setting_key');

        return response()->json([
            'data' => [
                'maintenanceMode' => $this->settingBool($rows, 'maintenance_mode', false),
                'weatherApiKey' => $this->settingValue($rows, 'weather_api_key'),
                'smsApiKey' => $this->settingValue($rows, 'sms_api_key'),
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'maintenanceMode' => ['sometimes', 'boolean'],
            'weatherApiKey' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smsApiKey' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('maintenanceMode', $data)) {
            $this->writeSetting('maintenance_mode', $data['maintenanceMode'] ? '1' : '0', false, $request->user()?->user_id);
        }

        if (array_key_exists('weatherApiKey', $data)) {
            $this->writeSetting('weather_api_key', $data['weatherApiKey'], true, $request->user()?->user_id);
        }

        if (array_key_exists('smsApiKey', $data)) {
            $this->writeSetting('sms_api_key', $data['smsApiKey'], true, $request->user()?->user_id);
        }

        $this->logPlatformAction($request, 'Updated platform settings', 'platform_settings');

        return $this->settings();
    }

    public function systemHealth(): JsonResponse
    {
        $dbOk = true;
        $dbMessage = 'connected';

        try {
            DB::select('select 1 as healthy');
        } catch (\Throwable $e) {
            $dbOk = false;
            $dbMessage = $e->getMessage();
        }

        $pendingShops = DB::table('shops')
            ->join('shop_statuses', 'shop_statuses.shop_status_id', '=', 'shops.shop_status_id_fk')
            ->where('shop_statuses.status_code', 'PENDING')
            ->count();

        return response()->json([
            'data' => [
                'database' => [
                    'ok' => $dbOk,
                    'message' => $dbMessage,
                ],
                'counts' => [
                    'shops' => (int) DB::table('shops')->count(),
                    'users' => (int) DB::table('users')->count(),
                    'pendingShops' => (int) $pendingShops,
                    'activeSubscriptions' => (int) DB::table('shop_subscriptions')->whereRaw('UPPER(subscription_status) = ?', ['ACTIVE'])->count(),
                ],
                'version' => config('app.version', env('APP_VERSION', 'V2')),
                'generatedAt' => now($this->timezone)->toISOString(),
            ],
        ]);
    }

    private function buildGrowthSeries(string $period): array
    {
        $now = Carbon::now($this->timezone);

        if ($period === 'day') {
            $start = $now->copy()->subHours(23)->startOfHour();
            $labels = [];
            for ($point = $start->copy(); $point <= $now; $point->addHour()) {
                $labels[$point->format('Y-m-d H:00')] = ['label' => $point->format('H:00'), 'count' => 0];
            }
        } elseif ($period === 'week') {
            $start = $now->copy()->subDays(6)->startOfDay();
            $labels = [];
            for ($point = $start->copy(); $point <= $now; $point->addDay()) {
                $labels[$point->format('Y-m-d')] = ['label' => $point->format('M d'), 'count' => 0];
            }
        } else {
            $start = $now->copy()->subDays(29)->startOfDay();
            $labels = [];
            for ($point = $start->copy(); $point <= $now; $point->addDay()) {
                $labels[$point->format('Y-m-d')] = ['label' => $point->format('M d'), 'count' => 0];
            }
        }

        $shops = DB::table('shops')
            ->where('created_at', '>=', $start->toDateTimeString())
            ->pluck('created_at');

        foreach ($shops as $createdAt) {
            $moment = Carbon::parse($createdAt)->setTimezone($this->timezone);
            $bucket = $period === 'day'
                ? $moment->format('Y-m-d H:00')
                : $moment->format('Y-m-d');

            if (array_key_exists($bucket, $labels)) {
                $labels[$bucket]['count']++;
            }
        }

        return array_values($labels);
    }

    private function planResource(int $planId): array
    {
        $row = DB::table('subscription_plans')->where('plan_id', $planId)->first();

        return [
            'planId' => (int) $row->plan_id,
            'planCode' => $row->plan_code,
            'planName' => $row->plan_name,
            'monthlyPrice' => (float) $row->monthly_price,
            'description' => $row->description,
            'isActive' => (bool) $row->is_active,
            'createdAt' => $this->iso($row->created_at),
            'updatedAt' => $this->iso($row->updated_at),
        ];
    }

    private function shopSubscriptionResource(int $id): array
    {
        $row = DB::table('shop_subscriptions as ss')
            ->join('shops as s', 's.shop_id', '=', 'ss.shop_id_fk')
            ->join('subscription_plans as sp', 'sp.plan_id', '=', 'ss.plan_id_fk')
            ->where('ss.shop_subscription_id', $id)
            ->first([
                'ss.shop_subscription_id',
                'ss.shop_id_fk',
                'ss.subscription_status',
                'ss.starts_at',
                'ss.ends_at',
                'ss.renews_at',
                'ss.created_at',
                'ss.updated_at',
                's.shop_name',
                'sp.plan_id',
                'sp.plan_code',
                'sp.plan_name',
                'sp.monthly_price',
            ]);

        return [
            'shopSubscriptionId' => (int) $row->shop_subscription_id,
            'shopId' => (int) $row->shop_id_fk,
            'shopName' => $row->shop_name,
            'status' => strtoupper((string) $row->subscription_status),
            'startsAt' => $this->iso($row->starts_at),
            'endsAt' => $this->iso($row->ends_at),
            'renewsAt' => $this->iso($row->renews_at),
            'plan' => [
                'planId' => (int) $row->plan_id,
                'planCode' => $row->plan_code,
                'planName' => $row->plan_name,
                'monthlyPrice' => (float) $row->monthly_price,
            ],
            'createdAt' => $this->iso($row->created_at),
            'updatedAt' => $this->iso($row->updated_at),
        ];
    }

    private function superAdminQuery()
    {
        return DB::table('users')
            ->join('roles', 'roles.role_id', '=', 'users.role_id_fk')
            ->join('user_statuses', 'user_statuses.user_status_id', '=', 'users.user_status_id_fk')
            ->where('roles.role_name', 'SuperAdmin');
    }

    private function shopStatusId(string $code): int
    {
        return (int) DB::table('shop_statuses')->where('status_code', strtoupper($code))->value('shop_status_id');
    }

    private function setShopStatus(int $shopId, string $statusCode): void
    {
        $statusId = $this->shopStatusId($statusCode);
        abort_unless($statusId, 422, 'Invalid shop status configuration.');

        $updated = DB::table('shops')->where('shop_id', $shopId)->update([
            'shop_status_id_fk' => $statusId,
            'updated_at' => now(),
        ]);

        abort_if($updated === 0, 404, 'Shop not found.');
    }

    private function applySubscriptionStatusToShop(int $shopId, string $subscriptionStatus): void
    {
        $normalized = strtoupper($subscriptionStatus);

        if ($normalized === 'ACTIVE') {
            $this->setShopStatus($shopId, 'ACTIVE');
            return;
        }

        if (in_array($normalized, ['PENDING', 'EXPIRED', 'CANCELLED'], true)) {
            $this->setShopStatus($shopId, 'PENDING');
        }
    }

    private function syncExpiredSubscriptions(): void
    {
        $expired = DB::table('shop_subscriptions')
            ->whereRaw('UPPER(subscription_status) = ?', ['ACTIVE'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', now()->toDateTimeString())
            ->get(['shop_subscription_id', 'shop_id_fk']);

        if ($expired->isEmpty()) {
            return;
        }

        $subscriptionIds = $expired->pluck('shop_subscription_id')->all();
        $shopIds = $expired->pluck('shop_id_fk')->unique()->all();

        DB::table('shop_subscriptions')
            ->whereIn('shop_subscription_id', $subscriptionIds)
            ->update([
                'subscription_status' => 'EXPIRED',
                'updated_at' => now(),
            ]);

        $pendingStatusId = $this->shopStatusId('PENDING');
        if ($pendingStatusId) {
            DB::table('shops')
                ->whereIn('shop_id', $shopIds)
                ->update([
                    'shop_status_id_fk' => $pendingStatusId,
                    'updated_at' => now(),
                ]);
        }
    }

    private function dateOrNow(?string $value, bool $fallbackNow): ?string
    {
        if ($value) {
            return Carbon::parse($value)->toDateTimeString();
        }

        return $fallbackNow ? now()->toDateTimeString() : null;
    }

    private function settingBool($rows, string $key, bool $fallback): bool
    {
        $value = $this->settingValue($rows, $key);
        if ($value === null) return $fallback;

        return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
    }

    private function settingValue($rows, string $key): ?string
    {
        $row = $rows->get($key);
        if (!$row) return null;

        if ((bool) $row->is_encrypted && $row->setting_value !== null && $row->setting_value !== '') {
            try {
                return Crypt::decryptString($row->setting_value);
            } catch (\Throwable) {
                return null;
            }
        }

        return $row->setting_value;
    }

    private function writeSetting(string $key, ?string $value, bool $encrypted, ?int $updatedBy): void
    {
        $storedValue = $value;
        if ($encrypted && $value !== null && $value !== '') {
            $storedValue = Crypt::encryptString($value);
        }

        DB::table('platform_settings')->updateOrInsert(
            ['setting_key' => $key],
            [
                'setting_value' => $storedValue,
                'is_encrypted' => $encrypted,
                'updated_by_fk' => $updatedBy,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function logPlatformAction(Request $request, string $action, ?string $table = null, ?int $recordId = null, ?int $shopId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $request->user()?->user_id,
            'action' => mb_substr($action, 0, 100),
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }

    private function ensureUniqueSubdomain(string $requested, string $shopName): string
    {
        $base = strtolower(trim($requested));
        if ($base === '') {
            $base = Str::slug($shopName);
        }

        $base = trim($base, '-');
        if ($base === '') {
            $base = 'shop';
        }

        $candidate = $base;
        $suffix = 2;

        while (DB::table('shops')->where('subdomain', $candidate)->exists()) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function iso(mixed $value): ?string
    {
        return $value ? Carbon::parse($value)->toISOString() : null;
    }
}
