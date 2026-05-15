<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ShopRegistrationOtpMail;
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
            'planCode'   => ['required', 'in:BASIC,PREMIUM,ENTERPRISE'],
        ]);

        abort_unless(
            DB::table('subscription_plans')->where('plan_code', $data['planCode'])->exists(),
            422, 'Invalid subscription plan.'
        );

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
            'planCode'    => $data['planCode'],
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
        return response()->json(['message' => 'not implemented'], 501);
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
