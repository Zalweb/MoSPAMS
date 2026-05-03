<?php

namespace App\Http\Middleware;

use App\Models\Shop;
use App\Models\User;
use App\Support\Tenancy\TenantAuditLogger;
use App\Support\Tenancy\TenantManager;
use App\Support\Tenancy\PlatformHostResolver;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    public function __construct(
        private readonly TenantManager $tenantManager,
        private readonly TenantAuditLogger $audit,
        private readonly PlatformHostResolver $platformHosts,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $requestHost = $this->platformHosts->normalizeHost((string) $request->getHost());
        $requestMode = $this->platformHosts->modeForHost($requestHost);
        $contextHost = $this->platformHosts->contextHost($request);
        $effectiveHost = $requestHost;
        $effectiveMode = $requestMode;

        if (in_array($requestMode, [PlatformHostResolver::MODE_API, PlatformHostResolver::MODE_PUBLIC], true) && $contextHost) {
            $effectiveHost = $contextHost;
            $effectiveMode = $this->platformHosts->modeForHost($contextHost);
        }

        $request->attributes->set('request_host', $requestHost);
        $request->attributes->set('request_host_mode', $requestMode);
        $request->attributes->set('context_host', $contextHost);
        $request->attributes->set('effective_host', $effectiveHost);
        $request->attributes->set('effective_host_mode', $effectiveMode);
        $request->attributes->set('is_platform_host', $effectiveMode === PlatformHostResolver::MODE_PLATFORM);
        $request->attributes->set('is_public_host', $effectiveMode === PlatformHostResolver::MODE_PUBLIC);

        if ($request->is('api/superadmin/*') && $effectiveMode !== PlatformHostResolver::MODE_PLATFORM) {
            return $this->jsonError('Platform host required', 'SuperAdmin endpoints are only available on the platform admin host.', 403);
        }

        if ($this->isPublicOnlyRoute($request) && ! in_array($effectiveMode, [PlatformHostResolver::MODE_PUBLIC, PlatformHostResolver::MODE_LOCAL], true)) {
            return $this->jsonError('Public host required', 'This endpoint is only available from the public platform host.', 403);
        }

        if ($requestMode === PlatformHostResolver::MODE_API && $this->requiresTenantContextHeader($request) && ! $contextHost) {
            return $this->jsonError('Tenant host header required', 'Tenant-scoped API requests on the API host must include X-Tenant-Host.', 400);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        if ($effectiveMode === PlatformHostResolver::MODE_PLATFORM || $effectiveMode === PlatformHostResolver::MODE_PUBLIC) {
            return $next($request);
        }

        $shop = $this->resolveShop($request, $effectiveHost, $effectiveMode);

        if (! $shop) {
            $this->audit->write('tenant_not_found', 'warning', ['host' => $effectiveHost]);

            return $this->jsonError('Shop not found', 'This domain is not associated with any shop.', 404);
        }

        if (! $this->isShopActive($shop)) {
            $this->audit->write('tenant_inactive', 'notice', ['host' => $effectiveHost, 'shopId' => $shop->shop_id]);

            return $this->jsonError('Shop unavailable', 'This shop is currently not accepting requests.', 503);
        }

        $this->tenantManager->setCurrent($shop);
        $request->attributes->set('shop', $shop);
        $request->attributes->set('shop_id', (int) $shop->shop_id);

        return $next($request);
    }

    private function isExempt(Request $request): bool
    {
        return $request->is('api/superadmin/*')
            || $request->is('api/me')
            || $request->is('api/logout')
            || $request->is('api/webhooks/*')
            || $request->is('api/stats')
            || $request->is('api/shop-registration');
    }

    private function requiresTenantContextHeader(Request $request): bool
    {
        if ($request->is('api/superadmin/*') || $request->is('api/webhooks/*') || $request->is('api/stats') || $request->is('api/shop-registration')) {
            return false;
        }

        return true;
    }

    private function isPublicOnlyRoute(Request $request): bool
    {
        return $request->is('api/stats') || $request->is('api/shop-registration');
    }

    private function resolveShop(Request $request, string $host, string $hostMode): ?Shop
    {
        if ($hostMode === PlatformHostResolver::MODE_LOCAL || $host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            if (! (bool) config('tenancy.allow_localhost_fallback', true)) {
                return null;
            }

            $tokenUser = $this->resolveUserFromRequest($request);
            if ($tokenUser?->shop_id_fk) {
                return Shop::query()->find((int) $tokenUser->shop_id_fk);
            }

            return Shop::query()->where('subdomain', (string) config('tenancy.default_local_subdomain', 'default'))->first();
        }

        $customDomain = $this->shopByCustomDomain($host);
        if ($customDomain) {
            return $customDomain;
        }

        $subdomain = $this->extractSubdomain($host);
        if (! $subdomain) {
            return null;
        }

        return Shop::query()->where('subdomain', $subdomain)->first();
    }

    private function resolveUserFromRequest(Request $request): ?User
    {
        $resolved = $request->user();
        if ($resolved instanceof User) {
            return $resolved;
        }

        $guardUser = Auth::user();
        if ($guardUser instanceof User) {
            return $guardUser;
        }

        $bearer = $request->bearerToken();
        if (! $bearer) {
            return null;
        }

        $token = PersonalAccessToken::findToken($bearer);
        $tokenable = $token?->tokenable;

        return $tokenable instanceof User ? $tokenable : null;
    }

    private function shopByCustomDomain(string $host): ?Shop
    {
        $query = Shop::query()->where('custom_domain', $host);

        if (Schema::hasColumn('shops', 'domain_status')) {
            $query->whereIn(DB::raw('UPPER(domain_status)'), ['VERIFIED', 'ACTIVE']);
        }

        return $query->first();
    }

    private function extractSubdomain(string $host): ?string
    {
        $baseDomain = strtolower((string) config('tenancy.base_domain', 'mospams.app'));

        if (! str_ends_with($host, '.'.$baseDomain)) {
            return null;
        }

        $subdomain = substr($host, 0, -strlen('.'.$baseDomain));

        if ($subdomain === '' || $subdomain === 'www') {
            return null;
        }

        return $subdomain;
    }

    private function isShopActive(Shop $shop): bool
    {
        $statusCode = strtoupper((string) $shop->status?->status_code);

        return $statusCode === 'ACTIVE';
    }

    private function jsonError(string $error, string $message, int $status): JsonResponse
    {
        return response()->json([
            'error' => $error,
            'message' => $message,
        ], $status);
    }
}
