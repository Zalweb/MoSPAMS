<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Domain\CloudflareDomainService;
use App\Support\Tenancy\TenantAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DomainOnboardingController extends Controller
{
    public function requestDomain(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = (int) $user->shop_id_fk;

        $data = $request->validate([
            'customDomain' => ['required', 'string', 'max:100', 'regex:/^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/', 'unique:shops,custom_domain'],
        ]);

        $domain = strtolower($data['customDomain']);
        $token = Str::random(48);

        DB::table('shops')->where('shop_id', $shopId)->update([
            'custom_domain' => $domain,
            'domain_status' => 'PENDING_VERIFICATION',
            'verification_token' => $token,
            'verified_at' => null,
            'last_checked_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'customDomain' => $domain,
                'domainStatus' => 'PENDING_VERIFICATION',
                'verificationToken' => $token,
            ],
        ]);
    }

    public function dnsInstructions(Request $request): JsonResponse
    {
        $shop = DB::table('shops')->where('shop_id', $request->user()->shop_id_fk)->first();

        abort_if(! $shop || ! $shop->custom_domain || ! $shop->verification_token, 422, 'Domain request not initialized.');

        return response()->json([
            'data' => [
                'recordType' => 'TXT',
                'recordName' => '_mospams-verify.'.$shop->custom_domain,
                'recordValue' => $shop->verification_token,
                'ttl' => config('tenancy.custom_domain_verification_ttl_minutes', 30) * 60,
            ],
        ]);
    }

    public function verifyDomain(Request $request, CloudflareDomainService $domainService, TenantAuditLogger $audit): JsonResponse
    {
        $shopId = (int) $request->user()->shop_id_fk;
        $shop = DB::table('shops')->where('shop_id', $shopId)->first();

        abort_if(! $shop || ! $shop->custom_domain || ! $shop->verification_token, 422, 'Domain request not initialized.');

        $verified = $domainService->verifyDomainOwnership((string) $shop->custom_domain, (string) $shop->verification_token);

        DB::table('shops')->where('shop_id', $shopId)->update([
            'domain_status' => $verified ? 'VERIFIED' : 'PENDING_VERIFICATION',
            'verified_at' => $verified ? now() : null,
            'last_checked_at' => now(),
            'updated_at' => now(),
        ]);

        if (! $verified) {
            $audit->write('domain_verify_failed', 'warning', ['shopId' => $shopId, 'customDomain' => $shop->custom_domain]);
        }

        return response()->json([
            'data' => [
                'customDomain' => $shop->custom_domain,
                'verified' => $verified,
                'domainStatus' => $verified ? 'VERIFIED' : 'PENDING_VERIFICATION',
            ],
        ]);
    }

    public function activateDomain(Request $request, CloudflareDomainService $domainService): JsonResponse
    {
        $shopId = (int) $request->user()->shop_id_fk;
        $shop = DB::table('shops')->where('shop_id', $shopId)->first();

        abort_if(! $shop || strtoupper((string) $shop->domain_status) !== 'VERIFIED', 422, 'Domain must be verified first.');

        $sslReady = $domainService->sslReady((string) $shop->custom_domain);

        DB::table('shops')->where('shop_id', $shopId)->update([
            'domain_status' => $sslReady ? 'ACTIVE' : 'VERIFIED',
            'last_checked_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'customDomain' => $shop->custom_domain,
                'domainStatus' => $sslReady ? 'ACTIVE' : 'VERIFIED',
                'sslReady' => $sslReady,
            ],
        ]);
    }
}
