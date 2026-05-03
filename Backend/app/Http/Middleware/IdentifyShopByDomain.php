<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class IdentifyShopByDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();
        
        // Skip shop context for SuperAdmin routes
        if ($request->is('api/superadmin/*')) {
            return $next($request);
        }

        // For login/register/auth routes, identify shop but don't block if not found
        // (SuperAdmin can log in without shop context)
        $isAuthRoute = $request->is('api/login') || 
                       $request->is('api/register') ||
                       $request->is('api/auth/*');

        // Extract subdomain or check custom domain
        $shop = $this->identifyShop($host);

        if (!$shop && !$isAuthRoute) {
            return response()->json([
                'error' => 'Shop not found',
                'message' => 'This domain is not associated with any shop.',
            ], 404);
        }

        // If shop found, validate it's active (except for auth routes)
        if ($shop) {
            $shopStatus = DB::table('shop_statuses')
                ->where('shop_status_id', $shop->shop_status_id_fk)
                ->value('status_code');

            if (strtoupper($shopStatus) !== 'ACTIVE' && !$isAuthRoute) {
                return response()->json([
                    'error' => 'Shop unavailable',
                    'message' => 'This shop is currently not accepting requests.',
                ], 503);
            }

            // Attach shop to request for later use
            $request->attributes->set('shop', $shop);
            $request->attributes->set('shop_id', $shop->shop_id);
        }

        return $next($request);
    }

    private function identifyShop(string $host): ?object
    {
        // Check if it's a custom domain first
        $shop = DB::table('shops')
            ->where('custom_domain', $host)
            ->first();

        if ($shop) {
            return $shop;
        }

        // Extract subdomain from host
        // Example: motoworks.mospams.app -> motoworks
        $parts = explode('.', $host);
        
        // If localhost or IP, use default shop or first active shop
        if ($host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            // Try default shop first
            $shop = DB::table('shops')->where('subdomain', 'default')->first();
            
            // Fallback to first active shop for development
            if (!$shop) {
                $activeStatusId = DB::table('shop_statuses')
                    ->where('status_code', 'active')
                    ->value('shop_status_id');
                    
                $shop = DB::table('shops')
                    ->where('shop_status_id_fk', $activeStatusId)
                    ->first();
            }
            
            return $shop;
        }

        // If we have at least 3 parts (subdomain.domain.tld)
        if (count($parts) >= 3) {
            $subdomain = $parts[0];
            
            // Skip 'www' subdomain
            if ($subdomain === 'www') {
                return null;
            }

            return DB::table('shops')
                ->where('subdomain', $subdomain)
                ->first();
        }

        return null;
    }
}
