<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ShopRegistrationOtpMail;
use App\Services\Identity\AccountProvisioner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ShopRegistrationController extends Controller
{
    public function initiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopName'   => ['required', 'string', 'max:100'],
            'subdomain'  => ['required', 'string', 'max:50', 'alpha_dash', 'unique:shops,subdomain'],
            'ownerName'  => ['required', 'string', 'max:100'],
            'ownerEmail' => ['required', 'email', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'address'    => ['nullable', 'string', 'max:500'],
        ]);

        $ownerEmail = strtolower($data['ownerEmail']);

        $alreadyUsedTrial = DB::table('shops as s')
            ->join('shop_subscriptions as ss', 'ss.shop_id_fk', '=', 's.shop_id')
            ->whereRaw('LOWER(s.registration_owner_email) = ?', [$ownerEmail])
            ->whereIn('ss.subscription_status', ['ACTIVE', 'EXPIRED', 'CANCELLED'])
            ->exists();

        if ($alreadyUsedTrial) {
            return response()->json([
                'message' => 'This email has already been used for a shop trial. Each email address can only register one shop.',
            ], 422);
        }

        $this->sendShopOtp($ownerEmail, $data['ownerName'], $data['shopName']);

        $pendingToken = encrypt([
            'shopName'    => $data['shopName'],
            'subdomain'   => strtolower($data['subdomain']),
            'ownerName'   => $data['ownerName'],
            'ownerEmail'  => $ownerEmail,
            'phone'       => $data['phone'] ?? null,
            'address'     => $data['address'] ?? null,
            'initiatedAt' => now()->unix(),
        ]);

        return response()->json([
            'requiresVerification' => true,
            'email'        => $ownerEmail,
            'shopName'     => $data['shopName'],
            'pendingToken' => $pendingToken,
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'        => ['required', 'email'],
            'pendingToken' => ['required', 'string'],
        ]);

        try {
            $pending = decrypt($data['pendingToken']);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid session. Please start again.'], 422);
        }

        if (strtolower($pending['ownerEmail'] ?? '') !== strtolower($data['email'])) {
            return response()->json(['message' => 'Invalid session.'], 422);
        }

        $last = DB::table('email_otp_verifications')
            ->where('email', strtolower($data['email']))
            ->orderByDesc('created_at')
            ->first();

        if ($last && now()->diffInSeconds($last->created_at) < 60) {
            return response()->json(['message' => 'Please wait before requesting another code.'], 429);
        }

        $this->sendShopOtp(strtolower($data['email']), $pending['ownerName'], $pending['shopName']);

        return response()->json(['message' => 'A new verification code has been sent to your email.']);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'        => ['required', 'email'],
            'code'         => ['required', 'string', 'size:6'],
            'pendingToken' => ['required', 'string'],
        ]);

        $email = strtolower($data['email']);

        $otp = DB::table('email_otp_verifications')
            ->where('email', $email)
            ->where('otp_code', $data['code'])
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (! $otp) {
            return response()->json([
                'message' => 'Invalid or expired verification code.',
                'errors'  => ['code' => ['Invalid or expired verification code.']],
            ], 422);
        }

        try {
            $pending = decrypt($data['pendingToken']);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid session. Please start the registration again.'], 422);
        }

        if ((now()->unix() - (int) ($pending['initiatedAt'] ?? 0)) > 1800) {
            return response()->json(['message' => 'Registration session expired. Please start again.'], 422);
        }

        if (strtolower($pending['ownerEmail'] ?? '') !== $email) {
            return response()->json(['message' => 'Invalid session. Please start again.'], 422);
        }

        // Mark OTP used before the transaction so it cannot be replayed on DB rollback
        DB::table('email_otp_verifications')->where('id', $otp->id)->update(['used' => true]);

        $trialDays      = max(1, (int) config('tenancy.shop_trial_days', 14));
        $ownerRoleId    = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeStatusId = (int) DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
        $planId         = (int) DB::table('subscription_plans')->orderBy('plan_id')->value('plan_id');

        abort_unless($ownerRoleId && $activeStatusId && $planId, 422, 'Configuration error. Please try again.');

        return DB::transaction(function () use ($pending, $email, $trialDays, $ownerRoleId, $activeStatusId, $planId) {
            abort_if(
                DB::table('shops')->where('subdomain', $pending['subdomain'])->lockForUpdate()->exists(),
                422,
                'This subdomain was just taken by another registration. Please start again and choose a different subdomain.'
            );

            $invitationCode = strtoupper(Str::random(8));

            $shopId = DB::table('shops')->insertGetId([
                'shop_name'                     => $pending['shopName'],
                'registration_owner_name'       => $pending['ownerName'],
                'registration_owner_email'      => $email,
                'subdomain'                     => $pending['subdomain'],
                'invitation_code'               => $invitationCode,
                'phone'                         => $pending['phone'] ?? null,
                'address'                       => $pending['address'] ?? null,
                'shop_status_id_fk'             => $activeStatusId,
                'registration_status'           => 'APPROVED',
                'registration_rejection_reason' => null,
                'registration_approved_at'      => now(),
                'registration_rejected_at'      => null,
                'primary_color'                 => '#3B82F6',
                'secondary_color'               => '#10B981',
                'business_hours'                => json_encode([
                    'monday'    => ['open' => '08:00', 'close' => '18:00'],
                    'tuesday'   => ['open' => '08:00', 'close' => '18:00'],
                    'wednesday' => ['open' => '08:00', 'close' => '18:00'],
                    'thursday'  => ['open' => '08:00', 'close' => '18:00'],
                    'friday'    => ['open' => '08:00', 'close' => '18:00'],
                    'saturday'  => ['open' => '08:00', 'close' => '16:00'],
                    'sunday'    => ['closed' => true],
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $endsAt = now()->addDays($trialDays);
            DB::table('shop_subscriptions')->insert([
                'shop_id_fk'          => $shopId,
                'plan_id_fk'          => $planId,
                'subscription_status' => 'ACTIVE',
                'starts_at'           => now(),
                'ends_at'             => $endsAt,
                'renews_at'           => $endsAt,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);

            $temporaryPassword = Str::random(12);
            /** @var \App\Services\Identity\AccountProvisioner $provisioner */
            $provisioner     = app(\App\Services\Identity\AccountProvisioner::class);
            $existingAccount = $provisioner->findAccountByLogin($email);
            $account         = $provisioner->createOrUpdateAccount(
                $pending['ownerName'], $email, $temporaryPassword, null, ! $existingAccount
            );

            DB::table('accounts')
                ->where('account_id', $account->account_id)
                ->update(['email_verified_at' => now(), 'updated_at' => now()]);

            abort_if($provisioner->membership($account, $shopId), 422, 'Account already has a membership in this shop.');
            $provisioner->createOrUpdateMembership($account, $shopId, $ownerRoleId);
            $owner = $provisioner->ensureTenantUser($account, $shopId, $ownerRoleId, $temporaryPassword);

            DB::table('activity_logs')->insert([
                'shop_id_fk'  => $shopId,
                'user_id_fk'  => $owner->user_id,
                'action'      => "Shop registered and trial activated: {$pending['shopName']}",
                'table_name'  => 'shops',
                'record_id'   => $shopId,
                'log_date'    => now(),
                'description' => "Self-service registration by {$pending['ownerName']} ({$email})",
            ]);

            return response()->json([
                'data' => [
                    'shopId'            => $shopId,
                    'shopName'          => $pending['shopName'],
                    'subdomain'         => $pending['subdomain'],
                    'invitationCode'    => $invitationCode,
                    'ownerEmail'        => $email,
                    'temporaryPassword' => $existingAccount ? null : $temporaryPassword,
                    'trialDays'         => $trialDays,
                    'trialEndsAt'       => $endsAt->toISOString(),
                ],
            ], 201);
        });
    }

    private function sendShopOtp(string $email, string $ownerName, string $shopName): void
    {
        DB::table('email_otp_verifications')
            ->where('email', $email)
            ->where('used', false)
            ->update(['used' => true]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('email_otp_verifications')->insert([
            'email'      => $email,
            'otp_code'   => $code,
            'expires_at' => now()->addMinutes(15),
            'used'       => false,
            'created_at' => now(),
        ]);

        Mail::to($email)->send(new ShopRegistrationOtpMail($ownerName, $code, $shopName));
    }
}
