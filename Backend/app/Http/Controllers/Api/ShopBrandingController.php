<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Storage\TenantFileStorageService;
use App\Support\Tenancy\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ShopBrandingController extends Controller
{
    public function __construct(
        private readonly TenantManager $tenantManager,
        private readonly TenantFileStorageService $tenantStorage,
    ) {
    }

    /**
     * Get public shop information (no auth required)
     * Used by frontend to display shop branding
     */
    public function publicShopInfo(Request $request): JsonResponse
    {
        $shop = $this->tenantManager->current() ?? $request->attributes->get('shop');

        if (!$shop) {
            return response()->json([
                'error' => 'Shop not found',
                'message' => 'This domain is not associated with any shop. Please check the URL or contact support.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'shopId' => (int) $shop->shop_id,
                'shopName' => $shop->shop_name,
                'subdomain' => $shop->subdomain,
                'customDomain' => $shop->custom_domain,
                'domainStatus' => $shop->domain_status ?? null,
                'logoUrl' => $shop->logo_url,
                'primaryColor' => $shop->primary_color,
                'secondaryColor' => $shop->secondary_color,
                'phone' => $shop->phone,
                'address' => $shop->address,
                'description' => $shop->business_description,
                'socialMedia' => [
                    'facebook' => $shop->facebook_url,
                    'instagram' => $shop->instagram_url,
                ],
                'businessHours' => $this->decodeBusinessHours($shop->business_hours ?? null),
            ],
        ]);
    }

    /**
     * Update shop branding (Owner only)
     */
    public function updateBranding(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;

        abort_if(!$shopId, 403, 'No shop assigned');

        $data = $request->validate([
            'shopName' => ['sometimes', 'string', 'max:100'],
            'subdomain' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('shops', 'subdomain')->ignore($shopId, 'shop_id')],
            'customDomain' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('shops', 'custom_domain')->ignore($shopId, 'shop_id')],
            'primaryColor' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondaryColor' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'facebookUrl' => ['sometimes', 'nullable', 'url', 'max:255'],
            'instagramUrl' => ['sometimes', 'nullable', 'url', 'max:255'],
            'businessHours' => ['sometimes', 'nullable', 'array'],
        ]);

        $patch = ['updated_at' => now()];
        if (array_key_exists('shopName', $data)) $patch['shop_name'] = $data['shopName'];
        if (array_key_exists('subdomain', $data)) $patch['subdomain'] = strtolower($data['subdomain']);
        if (array_key_exists('customDomain', $data)) $patch['custom_domain'] = $data['customDomain'];
        if (array_key_exists('primaryColor', $data)) $patch['primary_color'] = $data['primaryColor'];
        if (array_key_exists('secondaryColor', $data)) $patch['secondary_color'] = $data['secondaryColor'];
        if (array_key_exists('phone', $data)) $patch['phone'] = $data['phone'];
        if (array_key_exists('address', $data)) $patch['address'] = $data['address'];
        if (array_key_exists('description', $data)) $patch['business_description'] = $data['description'];
        if (array_key_exists('facebookUrl', $data)) $patch['facebook_url'] = $data['facebookUrl'];
        if (array_key_exists('instagramUrl', $data)) $patch['instagram_url'] = $data['instagramUrl'];
        if (array_key_exists('businessHours', $data)) $patch['business_hours'] = json_encode($data['businessHours']);

        DB::table('shops')->where('shop_id', $shopId)->update($patch);

        $this->log($user->user_id, $shopId, 'Updated shop branding', 'shops', $shopId);

        $updated = DB::table('shops')->where('shop_id', $shopId)->first();

        return response()->json([
            'data' => [
                'shopId' => (int) $updated->shop_id,
                'shopName' => $updated->shop_name,
                'subdomain' => $updated->subdomain,
                'customDomain' => $updated->custom_domain,
                'logoUrl' => $updated->logo_url,
                'domainStatus' => $updated->domain_status ?? null,
                'primaryColor' => $updated->primary_color,
                'secondaryColor' => $updated->secondary_color,
                'phone' => $updated->phone,
                'address' => $updated->address,
                'description' => $updated->business_description,
                'socialMedia' => [
                    'facebook' => $updated->facebook_url,
                    'instagram' => $updated->instagram_url,
                ],
                'businessHours' => $this->decodeBusinessHours($updated->business_hours ?? null),
            ],
        ]);
    }

    /**
     * Upload shop logo (Owner only)
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;

        abort_if(!$shopId, 403, 'No shop assigned');

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,svg', 'max:2048'], // 2MB max
        ]);

        $file = $request->file('logo');
        $url = $this->tenantStorage->storeLogo($file, $shopId);

        // Delete old logo if exists
        $oldLogo = DB::table('shops')->where('shop_id', $shopId)->value('logo_url');
        $this->tenantStorage->deleteByPublicUrl($oldLogo);

        DB::table('shops')->where('shop_id', $shopId)->update([
            'logo_url' => $url,
            'updated_at' => now(),
        ]);

        $this->log($user->user_id, $shopId, 'Uploaded shop logo', 'shops', $shopId);

        return response()->json([
            'data' => [
                'logoUrl' => $url,
            ],
        ]);
    }

    /**
     * Delete shop logo (Owner only)
     */
    public function deleteLogo(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;

        abort_if(!$shopId, 403, 'No shop assigned');

        $logoUrl = DB::table('shops')->where('shop_id', $shopId)->value('logo_url');
        $this->tenantStorage->deleteByPublicUrl($logoUrl);

        DB::table('shops')->where('shop_id', $shopId)->update([
            'logo_url' => null,
            'updated_at' => now(),
        ]);

        $this->log($user->user_id, $shopId, 'Deleted shop logo', 'shops', $shopId);

        return response()->json(['message' => 'Logo deleted successfully']);
    }

    /**
     * Get shop branding (Owner only)
     */
    public function getBranding(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;

        abort_if(!$shopId, 403, 'No shop assigned');

        $shop = DB::table('shops')->where('shop_id', $shopId)->first();

        return response()->json([
            'data' => [
                'shopId' => (int) $shop->shop_id,
                'shopName' => $shop->shop_name,
                'subdomain' => $shop->subdomain,
                'customDomain' => $shop->custom_domain,
                'domainStatus' => $shop->domain_status ?? null,
                'invitationCode' => $shop->invitation_code,
                'logoUrl' => $shop->logo_url,
                'primaryColor' => $shop->primary_color,
                'secondaryColor' => $shop->secondary_color,
                'phone' => $shop->phone,
                'address' => $shop->address,
                'description' => $shop->business_description,
                'socialMedia' => [
                    'facebook' => $shop->facebook_url,
                    'instagram' => $shop->instagram_url,
                ],
                'businessHours' => $this->decodeBusinessHours($shop->business_hours ?? null),
            ],
        ]);
    }

    /**
     * Regenerate invitation code (Owner only)
     */
    public function regenerateInvitationCode(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;

        abort_if(!$shopId, 403, 'No shop assigned');

        $newCode = strtoupper(Str::random(8));

        DB::table('shops')->where('shop_id', $shopId)->update([
            'invitation_code' => $newCode,
            'updated_at' => now(),
        ]);

        $this->log($user->user_id, $shopId, 'Regenerated invitation code', 'shops', $shopId);

        return response()->json([
            'data' => [
                'invitationCode' => $newCode,
            ],
        ]);
    }

    private function log(int $userId, ?int $shopId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $userId,
            'action' => mb_substr($action, 0, 100),
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }

    private function decodeBusinessHours(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}
