# Tenant Core Security and Bootstrap (2026)

## What changed

### Tenant context lifecycle
- Added `ResolveTenantContext` middleware and registered it at API-group start.
- Host mode classification is now explicit:
  - `platform` (`TENANCY_PLATFORM_HOSTS`)
  - `public` (`TENANCY_PUBLIC_HOSTS`)
  - `api` (`TENANCY_API_HOSTS`)
  - `tenant` / `local`
- Tenant resolution order:
  1. Verified/active `custom_domain`
  2. `{subdomain}.TENANCY_BASE_DOMAIN`
  3. Localhost/IP fallback to `DEFAULT_SHOP_SUBDOMAIN` (if enabled)
- For `api` host requests, tenant-scoped endpoints require `X-Tenant-Host`.
- Middleware now returns:
  - `400` for missing `X-Tenant-Host` on tenant-scoped `api.*` requests
  - `404` for unknown domain
  - `503` for inactive shop

### Tenant source of truth
- Added `App\\Support\\Tenancy\\TenantManager` (request-scoped service):
  - `current()`
  - `id()`
  - `requireId()`
  - `isResolved()`
  - `isSuperAdmin()`

### Tenant-user consistency enforcement
- Extended `EnsureTenantUser` to check `user.shop_id_fk` against resolved tenant context.
- Enforces tenant token ability (`tenant:{shop_id}`) when a Sanctum token is present.
- Controlled by `TENANCY_ENFORCEMENT_MODE`:
  - `off`: no blocking
  - `shadow`: log mismatch only
  - `enforce`: block with `403`

### Tenant audit events
- Added `tenant_audit_events` table.
- Added `TenantAuditLogger` service for structured logs and DB event records.

### Query safety helpers
- Added base controller helpers:
  - `tenantTable('table_name')`
  - `tenantCacheKey('key')`
- Added `TenantQuery` helper for tenant-filtered query builder and cache key namespace.
- Added optional Eloquent tenant trait `BelongsToTenant` (applied to tenant-domain models such as `Part`, `Category`, `ServiceJob`, `RoleRequest`, etc.).

### Frontend tenant bootstrap contract
- Added `TenantBrandingProvider` that fetches `/api/shop/info` before app render.
- Frontend now sends `X-Tenant-Host` for API requests so `api.*` can resolve tenant context.
- App rendering is blocked until tenant bootstrap completes.
- Added startup failure screen handling for `404` and `503` cases.

## Updated public/backend routes
- `GET /api/shop/info` (throttled)
- `POST /api/webhooks/paymongo` (public webhook, throttled)
- Owner domain onboarding:
  - `POST /api/shop/domain/request`
  - `GET /api/shop/domain/dns-instructions`
  - `POST /api/shop/domain/verify`
  - `POST /api/shop/domain/activate`

## Config keys
- `config/tenancy.php`
- `.env`/`.env.example` additions:
  - `TENANCY_ENFORCEMENT_MODE`
  - `TENANCY_BASE_DOMAIN`
  - `TENANCY_PLATFORM_HOSTS`
  - `TENANCY_PUBLIC_HOSTS`
  - `TENANCY_API_HOSTS`
  - `TENANCY_ALLOW_LOCALHOST_FALLBACK`
  - `TENANCY_AUDIT_CHANNEL`
  - `TENANCY_CACHE_PREFIX`

## How to test

### Backend tests
```bash
cd Backend
php artisan test --filter=TenantResolutionTest
php artisan test --filter=DomainOnboardingTest
```

### Manual checks
1. Call `GET /api/shop/info` with known subdomain host header and confirm `200` + branding payload.
2. Call same route with unknown host and confirm `404`.
3. Set `TENANCY_ENFORCEMENT_MODE=enforce` and hit a tenant route with mismatched user/shop domain; confirm `403`.
4. Confirm `tenant_audit_events` receives mismatch and not-found events.
