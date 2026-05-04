<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ShopBrandingController extends Controller
{
    /**
     * Get current shop branding (public endpoint - no auth required)
     */
    public function publicShopInfo(Request $request): JsonResponse
    {
        $shop = $request->attributes->get('tenant_shop');
        
        // If no shop found (localhost/development), return default branding
        if (!$shop) {
            return response()->json([
                'data' => [
                    'shopName' => 'MoSPAMS',
                    'logoUrl' => null,
                    'primaryColor' => '#ef4444',
                    'secondaryColor' => '#f97316',
                ]
            ]);
        }
        
        return response()->json([
            'data' => [
                'shopName' => $shop->shop_name,
                'logoUrl' => $shop->logo_url,
                'primaryColor' => $shop->primary_color ?? '#ef4444',
                'secondaryColor' => $shop->secondary_color ?? '#f97316',
            ]
        ]);
    }
    
    /**
     * Get shop branding for authenticated owner
     */
    public function getBranding(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;
        
        $shop = DB::table('shops')
            ->where('shop_id', $shopId)
            ->first();
        
        if (!$shop) {
            return response()->json(['error' => 'Shop not found'], 404);
        }
        
        return response()->json([
            'data' => [
                'shopId' => (string) $shop->shop_id,
                'shopName' => $shop->shop_name,
                'shopDescription' => $shop->shop_description ?? '',
                'contactEmail' => $shop->contact_email ?? '',
                'contactPhone' => $shop->contact_phone ?? '',
                'address' => $shop->address ?? '',
                'subdomain' => $shop->subdomain,
                'customDomain' => $shop->custom_domain,
                'domainStatus' => $shop->domain_status ?? 'NONE',
                'logoUrl' => $shop->logo_url,
                'primaryColor' => $shop->primary_color ?? '#ef4444',
                'secondaryColor' => $shop->secondary_color ?? '#f97316',
                'invitationCode' => $shop->invitation_code,
            ]
        ]);
    }
    
    /**
     * Update shop branding
     */
    public function updateBranding(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;
        
        $data = $request->validate([
            'shopName' => ['sometimes', 'string', 'max:100'],
            'shopDescription' => ['sometimes', 'nullable', 'string', 'max:500'],
            'contactEmail' => ['sometimes', 'nullable', 'email', 'max:100'],
            'contactPhone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'primaryColor' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondaryColor' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logoUrl' => ['sometimes', 'nullable', 'string', 'max:500', 'url'],
        ]);
        
        $update = [];
        
        if (isset($data['shopName'])) {
            $update['shop_name'] = $data['shopName'];
        }
        
        if (array_key_exists('shopDescription', $data)) {
            $update['shop_description'] = $data['shopDescription'];
        }
        
        if (array_key_exists('contactEmail', $data)) {
            $update['contact_email'] = $data['contactEmail'];
        }
        
        if (array_key_exists('contactPhone', $data)) {
            $update['contact_phone'] = $data['contactPhone'];
        }
        
        if (array_key_exists('address', $data)) {
            $update['address'] = $data['address'];
        }
        
        if (isset($data['primaryColor'])) {
            $update['primary_color'] = strtolower($data['primaryColor']);
        }
        
        if (isset($data['secondaryColor'])) {
            $update['secondary_color'] = strtolower($data['secondaryColor']);
        }
        
        if (array_key_exists('logoUrl', $data)) {
            $update['logo_url'] = $data['logoUrl'];
        }
        
        if (!empty($update)) {
            $update['updated_at'] = now();
            DB::table('shops')->where('shop_id', $shopId)->update($update);
        }
        
        // Log activity
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $user->user_id,
            'action' => 'Updated shop branding',
            'table_name' => 'shops',
            'record_id' => $shopId,
            'log_date' => now(),
            'description' => 'Updated shop branding settings',
        ]);
        
        // Return updated branding
        return $this->getBranding($request);
    }
    
    /**
     * Upload shop logo
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;
        
        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,svg', 'max:2048'], // 2MB max
        ]);
        
        $file = $request->file('logo');
        
        // Delete old logo if exists
        $oldLogo = DB::table('shops')->where('shop_id', $shopId)->value('logo_url');
        if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
            Storage::disk('public')->delete($oldLogo);
        }
        
        // Store new logo
        $path = $file->store('shop-logos', 'public');
        $url = Storage::disk('public')->url($path);
        
        // Update database
        DB::table('shops')->where('shop_id', $shopId)->update([
            'logo_url' => $url,
            'updated_at' => now(),
        ]);
        
        // Log activity
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $user->user_id,
            'action' => 'Uploaded shop logo',
            'table_name' => 'shops',
            'record_id' => $shopId,
            'log_date' => now(),
            'description' => 'Uploaded new shop logo',
        ]);
        
        return response()->json([
            'data' => [
                'logoUrl' => $url,
                'message' => 'Logo uploaded successfully',
            ]
        ]);
    }
    
    /**
     * Delete shop logo
     */
    public function deleteLogo(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;
        
        $oldLogo = DB::table('shops')->where('shop_id', $shopId)->value('logo_url');
        
        if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
            Storage::disk('public')->delete($oldLogo);
        }
        
        DB::table('shops')->where('shop_id', $shopId)->update([
            'logo_url' => null,
            'updated_at' => now(),
        ]);
        
        // Log activity
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $user->user_id,
            'action' => 'Deleted shop logo',
            'table_name' => 'shops',
            'record_id' => $shopId,
            'log_date' => now(),
            'description' => 'Deleted shop logo',
        ]);
        
        return response()->json([
            'message' => 'Logo deleted successfully',
        ]);
    }
    
    /**
     * Regenerate invitation code
     */
    public function regenerateInvitationCode(Request $request): JsonResponse
    {
        $user = $request->user();
        $shopId = $user->shop_id_fk;
        
        $newCode = strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
        
        DB::table('shops')->where('shop_id', $shopId)->update([
            'invitation_code' => $newCode,
            'updated_at' => now(),
        ]);
        
        // Log activity
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $user->user_id,
            'action' => 'Regenerated invitation code',
            'table_name' => 'shops',
            'record_id' => $shopId,
            'log_date' => now(),
            'description' => 'Regenerated shop invitation code',
        ]);
        
        return response()->json([
            'data' => [
                'invitationCode' => $newCode,
                'message' => 'Invitation code regenerated successfully',
            ]
        ]);
    }
}
