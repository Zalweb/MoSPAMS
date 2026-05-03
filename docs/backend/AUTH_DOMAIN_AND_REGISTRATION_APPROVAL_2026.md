# Auth Domain Enforcement and Registration Approval (2026)

## Overview

This update resolves three platform conflicts:

1. SuperAdmin portal host separation (`admin.*` platform host)
2. Domain-aware auth enforcement for both password and Google login
3. Complete pending shop registration lifecycle (approve/reject + owner provisioning + trial activation)

## Configuration Changes

Added/used environment variables:

- `TENANCY_PLATFORM_HOSTS` (CSV, backend)
  - Example local: `admin.mospams.local`
  - Example production: `admin.mospams.shop`
- `TENANCY_PUBLIC_HOSTS` (CSV, backend)
  - Example local: `mospams.local`
  - Example production: `mospams.shop`
- `TENANCY_API_HOSTS` (CSV, backend)
  - Example local: `api.mospams.local`
  - Example production: `api.mospams.shop`
- `SHOP_TRIAL_DAYS` (backend)
  - Default: `14`
- `VITE_PLATFORM_ADMIN_HOSTS` (CSV, frontend)
  - Example local: `admin.mospams.local`
  - Example production: `admin.mospams.shop`
- `VITE_PUBLIC_HOSTS` (CSV, frontend)
  - Example local: `mospams.local`
  - Example production: `mospams.shop`

## Runtime Behavior

### Host classification and tenant resolver

- `ResolveTenantContext` now:
  - Classifies request host mode as `platform`, `public`, `api`, `tenant`, or `local`.
  - Stores `effective_host` and `effective_host_mode` request attributes for downstream auth checks.
  - Allows `platform` and `public` host requests without tenant resolution.
  - Rejects `/api/superadmin/*` unless the effective host mode is `platform`.
  - Resolves tenant context for `tenant`/`local` effective host modes.

### API host tenant context contract

- When calling tenant-scoped endpoints through `api.*`, clients must send:
  - `X-Tenant-Host: <browser-host>`
- Missing header on tenant-scoped API-host requests returns:
  - `400 Tenant host header required`
- `X-Tenant-Host` is also used to derive effective host mode for auth host rules on `api.*`.

Examples:

- Tenant app request:
  - `Host: api.mospams.shop`
  - `X-Tenant-Host: motoworks.mospams.shop`
- SuperAdmin request:
  - `Host: api.mospams.shop`
  - `X-Tenant-Host: admin.mospams.shop`

### Login host rules

- `POST /api/login`
- `POST /api/auth/google`

Rules:

- `SuperAdmin` accounts must log in from platform hosts only.
- Non-SuperAdmin users must log in from tenant shop hosts only.
- Non-SuperAdmin users must match resolved tenant (`user.shop_id_fk === resolved shop_id`).
- Blocked attempts are written to `tenant_audit_events`.

## Registration Lifecycle Changes

### New persisted shop registration fields

- `registration_owner_name`
- `registration_owner_email`
- `registration_status`
- `registration_rejection_reason`
- `registration_approved_at`
- `registration_rejected_at`

Migration: `2026_05_03_000010_add_registration_lifecycle_to_shops.php`

### Public registration

- `POST /api/shop-registration` now stores applicant identity in durable shop fields.
- New shops are created with `registration_status = PENDING_APPROVAL`.

### SuperAdmin approval/rejection endpoints

- `POST /api/superadmin/shops/{shop}/approve-registration`
  - Provisions Owner account from stored applicant details.
  - Generates temporary password.
  - Activates shop subscription trial:
    - `starts_at = now()`
    - `ends_at = now() + SHOP_TRIAL_DAYS`
    - `subscription_status = ACTIVE`
  - Sets shop status to `ACTIVE`.
  - Sets `registration_status = APPROVED`.

- `POST /api/superadmin/shops/{shop}/reject-registration`
  - Sets `registration_status = REJECTED` with optional reason.
  - Sets shop status to `INACTIVE`.

### SuperAdmin payload extensions

- `GET /api/superadmin/shops` now includes:
  - `applicant`
  - `registration`
- `GET /api/superadmin/shops/{shop}/diagnostics` now includes:
  - `applicant`
  - `registration`

## How to Test

1. Run migrations:
   - `cd Backend`
   - `php artisan migrate`
2. Verify auth domain enforcement:
   - Owner login on `admin.*` returns validation error.
   - SuperAdmin login on tenant domain returns validation error.
3. Verify API host tenant-context contract:
   - `POST /api/login` on `api.*` **without** `X-Tenant-Host` returns `400`.
   - `POST /api/login` on `api.*` **with** `X-Tenant-Host: admin.*` allows SuperAdmin login.
   - `GET /api/shop/info` on `api.*` with `X-Tenant-Host: {shop}.*` returns tenant branding.
4. Verify registration workflow:
   - Submit `/api/shop-registration`.
   - Approve via `/api/superadmin/shops/{shop}/approve-registration`.
   - Confirm Owner user exists and subscription becomes `ACTIVE`.
5. Verify rejection flow:
   - Reject via `/api/superadmin/shops/{shop}/reject-registration`.
   - Confirm registration status is `REJECTED` and shop is `INACTIVE`.
