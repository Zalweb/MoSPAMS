<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    /**
     * Resolve the current shop/tenant based on subdomain or custom domain.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();
        $baseDomain = config('tenancy.base_domain', 'mospams.shop');
        
        $shop = null;
        
        // Try subdomain resolution first (e.g., shop1.mospams.shop)
        if (str_ends_with($host, '.' . $baseDomain)) {
            $subdomain = substr($host, 0, -strlen('.' . $baseDomain));
            
            $shop = DB::table('shops')
                ->join('shop_statuses', 'shop_statuses.shop_status_id', '=', 'shops.shop_status_id_fk')
                ->where('shops.subdomain', $subdomain)
                ->select('shops.*', 'shop_statuses.status_code')
                ->first();
        }
        
        // Try custom domain resolution (e.g., myshop.com)
        if (!$shop && $host !== $baseDomain && !str_contains($host, 'localhost')) {
            $shop = DB::table('shops')
                ->join('shop_statuses', 'shop_statuses.shop_status_id', '=', 'shops.shop_status_id_fk')
                ->where('shops.custom_domain', $host)
                ->select('shops.*', 'shop_statuses.status_code')
                ->first();
        }
        
        // Attach shop to request
        if ($shop) {
            $request->attributes->set('tenant_shop', $shop);
            $request->attributes->set('tenant_shop_id', $shop->shop_id);
        }
        
        return $next($request);
    }
}
