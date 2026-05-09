<?php

namespace App\Http\Middleware;

use App\Support\Auth\AuthenticatedContext;
use App\Support\Tenancy\TenantAuditLogger;
use App\Support\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantUser
{
    public function __construct(
        private readonly TenantManager $tenantManager,
        private readonly TenantAuditLogger $audit,
        private readonly AuthenticatedContext $authContext,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $effectiveHostMode = strtolower((string) $request->attributes->get('effective_host_mode', 'tenant'));

        if ($this->authContext->isPlatformAdmin($request)) {
            abort(403, 'SuperAdmin must use dedicated platform endpoints.');
        }

        if (! in_array($effectiveHostMode, ['tenant', 'local'], true)) {
            abort(403, 'Tenant routes are only available from a tenant shop host.');
        }

        $membership = $this->authContext->membership($request);

        if (! $membership && $this->tenantManager->isResolved() && $user?->shop_id_fk && (int) $user->shop_id_fk !== $this->tenantManager->requireId()) {
            $this->audit->write('tenant_user_mismatch', 'warning', [
                'resolvedShopId' => $this->tenantManager->id(),
                'userShopId' => (int) $user->shop_id_fk,
            ]);

            abort(403, 'Tenant mismatch detected.');
        }

        if (! $membership) {
            abort(403, 'User has no tenant assignment.');
        }

        $token = $user->currentAccessToken();
        if ($token) {
            $requiredAbility = sprintf('tenant:%d', (int) $membership->shop_id_fk);
            if (! $token->can($requiredAbility)) {
                $this->audit->write('tenant_token_mismatch', 'warning', [
                    'requiredAbility' => $requiredAbility,
                    'tokenId' => $token->id,
                ]);

                abort(403, 'Tenant token does not match this shop.');
            }
        }

        if ($effectiveHostMode !== 'local' && $this->tenantManager->isResolved() && (int) $membership->shop_id_fk !== $this->tenantManager->requireId()) {
            $this->audit->write('tenant_user_mismatch', 'warning', [
                'resolvedShopId' => $this->tenantManager->id(),
                'membershipShopId' => (int) $membership->shop_id_fk,
            ]);

            $mode = strtolower((string) config('tenancy.enforcement_mode', 'off'));

            if ($mode === 'enforce') {
                abort(403, 'Tenant mismatch detected.');
            }
        }

        return $next($request);
    }
}
