# MoSPAMS — SaaS Replan

## Vision

MoSPAMS evolves from a single-shop management tool into a **multi-tenant SaaS platform** for motorcycle repair shops. A single deployment serves many shops, each fully isolated from one another, managed by a platform-level SuperAdmin.

---

## Role Hierarchy

```
SuperAdmin  (platform owner)
  └── Shop (tenant)
        ├── Owner       (was "Admin" — manages their shop)
        ├── Staff       (operational access within their shop)
        ├── Mechanic    (assigned jobs within their shop)
        └── Customer    (self-service portal within their shop)
```

### Role Definitions

| Role | Scope | Access |
|------|-------|--------|
| SuperAdmin | Platform-wide | All shops, all data, platform settings, shop provisioning |
| Owner | Their shop only | Full shop access: users, inventory, services, sales, reports, audit logs |
| Staff | Their shop only | Inventory, service jobs, sales — no user management or reports |
| Mechanic | Their shop only | Assigned jobs only |
| Customer | Their shop only | Own service history, bookings, payments |

---

## Tenancy Model

**Shared database, `shop_id` column on every domain table.**

Every row in every domain table belongs to a shop via `shop_id_fk`. All queries are automatically scoped to the authenticated user's `shop_id`. SuperAdmin queries bypass shop scoping.

This is the standard approach for Laravel SaaS apps — simple, performant, and easy to reason about.

### Why not separate databases?
- Overkill for V2 scope
- Complex provisioning and migration management
- Hard to build cross-shop analytics for SuperAdmin
- Can be migrated to later if needed

---

## Data Model Changes

### New Tables

```sql
shops
  shop_id         PK
  shop_name       string(100)
  owner_name      string(100)
  email           string(100) unique
  phone           string(20) nullable
  address         text nullable
  shop_status_id_fk FK → shop_statuses
  created_at, updated_at

shop_statuses
  shop_status_id  PK
  status_code     string(30) unique   -- ACTIVE, INACTIVE, SUSPENDED
  status_name     string(50)
  description     text nullable
```

### Modified Tables

Every domain table gets a `shop_id_fk` column:

```
users             + shop_id_fk (nullable for SuperAdmin)
parts             + shop_id_fk
categories        + shop_id_fk
service_jobs      + shop_id_fk
service_types     + shop_id_fk
sales             + shop_id_fk
stock_movements   + shop_id_fk
activity_logs     + shop_id_fk
customers         + shop_id_fk
mechanics         + shop_id_fk
notifications     + shop_id_fk
```

### Roles Table Update

Add `SuperAdmin` and rename `Admin` → `Owner`:

```
roles: SuperAdmin | Owner | Staff | Mechanic | Customer
```

---

## Backend Implementation Plan

### Phase 1 — Schema & Migrations

1. Create migration: `create_shops_and_shop_statuses_tables`
2. Create migration: `add_shop_id_to_all_domain_tables`
   - Add `shop_id_fk` (nullable, no FK constraint initially for safety)
   - Add index on `shop_id_fk` for all tables
3. Update `RolesAndStatusesSeeder`:
   - Rename `Admin` → `Owner`
   - Add `SuperAdmin`
4. Create `ShopsSeeder` — seeds a default shop and assigns the existing admin user as Owner

### Phase 2 — Models & Middleware

5. Create `Shop` model with `hasMany` relationships to all domain models
6. Create `ShopStatus` model
7. Update `User` model: add `shop_id_fk`, add `shop()` belongsTo relationship
8. Create `EnsureShopActive` middleware — aborts 403 if user's shop is suspended
9. Update `RoleMiddleware` — SuperAdmin bypasses all role checks

### Phase 3 — Shop Scoping

10. Add `shopId()` private helper to `MospamsController`:
    ```php
    private function shopId(): int {
        return $this->numericId(request()->user()->shop_id_fk);
    }
    ```
11. Update ALL queries in `MospamsController` to add `->where('shop_id_fk', $this->shopId())`
12. Update all `store*` methods to inject `shop_id_fk` on insert
13. SuperAdmin routes skip shop scoping — they query across all shops

### Phase 4 — Shop Management (SuperAdmin)

14. Create `SuperAdminController` with:
    - `shops()` — list all shops with owner info and status
    - `storeShop()` — create shop + create Owner user in one transaction
    - `updateShop()` — update shop details
    - `suspendShop()` / `activateShop()` — toggle shop status
    - `deleteShop()` — soft delete or hard delete with cascade
    - `platformStats()` — total shops, total users, total revenue across all shops
15. Add SuperAdmin routes under a separate middleware group:
    ```php
    Route::middleware(['auth:sanctum', 'role:SuperAdmin'])->prefix('superadmin')->group(...)
    ```

### Phase 5 — Auth Updates

16. Update `AuthController::login()`:
    - Load `user->shop` relationship
    - Return `shop` object in the login response
    - SuperAdmin gets `shop: null`
17. Update `AuthController::userResource()`:
    - Include `shopId`, `shopName`, `shopStatus` in the response

### Phase 6 — Routes

18. Add new routes:
    ```
    GET    /api/superadmin/shops
    POST   /api/superadmin/shops
    PATCH  /api/superadmin/shops/{shop}
    DELETE /api/superadmin/shops/{shop}
    PATCH  /api/superadmin/shops/{shop}/suspend
    PATCH  /api/superadmin/shops/{shop}/activate
    GET    /api/superadmin/stats
    GET    /api/superadmin/users
    ```
19. Update existing role middleware references: `Admin` → `Owner`

---

## Frontend Implementation Plan

### Phase 1 — Types & Auth Context

1. Update `Role` type: `'SuperAdmin' | 'Owner' | 'Staff' | 'Mechanic' | 'Customer'`
2. Add `Shop` interface to `types/index.ts`
3. Update `User` interface: add `shopId`, `shopName`, `shopStatus`
4. Update `AuthContext`: store `shop` from login response, expose it

### Phase 2 — Routing & Guards

5. Add `RequireRole` variant for `SuperAdmin`
6. Add new route tree:
   ```
   /superadmin              → SuperAdminLayout
     /superadmin/shops      → ShopsPage
     /superadmin/stats      → PlatformStatsPage
     /superadmin/users      → AllUsersPage
   ```
7. Update `NAV_ACCESS` in `permissions.ts`:
   - Replace `Admin` → `Owner` for all existing entries
   - Add SuperAdmin entries for `/superadmin/*`

### Phase 3 — SuperAdmin UI

8. Create `SuperAdminLayout` — separate sidebar from `DashboardLayout`
9. Create `ShopsPage` — table of all shops, status badges, actions (suspend/activate/delete)
10. Create `CreateShopModal` — form: shop name, owner name, owner email, owner password
11. Create `PlatformStatsPage` — total shops, active shops, total users, platform revenue
12. Create `AllUsersPage` — all users across all shops with shop column

### Phase 4 — Owner/Shop Context

13. Update `DashboardLayout` — show shop name in sidebar header for Owner/Staff/Mechanic
14. Update `DataContext` — no changes needed (already scoped by token on backend)
15. Add shop suspension guard — if `user.shopStatus === 'Suspended'`, show a full-page "Shop Suspended" screen instead of the dashboard

### Phase 5 — Rename Admin → Owner

16. Update all UI labels: "Admin" → "Owner" where it refers to the role
17. Update `NAV_ACCESS` keys and `POLICY` in `permissions.ts`
18. Update any hardcoded role string checks across feature pages

---

## Migration Strategy (Existing Data)

Since the DB already has data:

1. Run `add_shop_id_to_all_domain_tables` migration — adds nullable `shop_id_fk`
2. Run a one-time data migration script:
   - Create a default shop: "Default Shop"
   - Assign all existing users, parts, services, etc. to `shop_id = 1`
3. Make `shop_id_fk` NOT NULL after backfill
4. Update existing `admin` role → `Owner`, add `SuperAdmin` role
5. Assign the existing admin user the `SuperAdmin` role OR create a new SuperAdmin user

---

## What Does NOT Change

- The core domain logic (inventory, services, sales, reports) stays the same
- The API contract shape stays the same — just every response is now shop-scoped
- The frontend feature pages (Inventory, Services, Sales, Reports) need zero changes
- Auth flow (Sanctum tokens) stays the same
- CORS, ngrok, deployment setup stays the same

---

## Future Considerations (Post-V2)

- **Billing** — per-shop subscription plans (Basic/Pro), Stripe integration
- **Subdomain routing** — `shopname.mospams.app` per tenant
- **Shop self-registration** — Owner signs up, SuperAdmin approves
- **Per-shop branding** — logo, color theme
- **Separate DB per shop** — for enterprise-tier isolation
- **Mobile APK** — Capacitor wrapping, shop context from stored token
