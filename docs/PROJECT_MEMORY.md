# MoSPAMS Project Memory

MoSPAMS is a **multi-tenant SaaS platform** for motorcycle repair shops and parts retailers. A single deployment serves many shops, each fully isolated, managed by a platform-level SuperAdmin.

## Product Direction

- The app is web-based and may later be wrapped with Capacitor to produce an APK.
- Production data is shared through a backend database — no browser persistence for domain data.
- Required stack: PHP + Laravel + MySQL (backend), React + TypeScript + Vite (frontend).
- Tenancy model: shared database with `shop_id_fk` on every domain table.
- V2 scope: SuperAdmin + Owner (shop admin) + Staff + Mechanic + Customer.

## Role Direction

| Role | Scope | Access |
|------|-------|--------|
| SuperAdmin | Platform-wide | All shops, platform stats, shop provisioning, suspend/activate shops |
| Owner | Their shop only | Full shop access: users, inventory, services, sales, reports, audit logs |
| Staff | Their shop only | Inventory, service jobs, sales — no user management |
| Mechanic | Their shop only | Assigned jobs only (future) |
| Customer | Their shop only | Own service history, bookings, payments (future) |

- SuperAdmin is the platform owner — there is typically one.
- Owner is what was previously called "Admin" — one per shop.
- Staff, Mechanic, Customer are scoped entirely within their shop.

## Implementation Defaults

- Backend lives in `Backend/`.
- MySQL database name is `mospams_db`.
- Local MySQL runs through XAMPP (port 3306, user root, no password).
- Laravel runs locally through PHP/Artisan on port 8002.
- Frontend dev server runs on port 3000.
- Frontend calls the Laravel API and avoids browser persistence for production data.

## Key Architecture Decisions

- Shared DB tenancy: every domain table has `shop_id_fk`
- SuperAdmin queries bypass shop scoping
- All other roles are scoped to their shop via the auth token
- Shop context (shopId, shopName, shopStatus) is returned in the login response
- If a shop is suspended, a full-page block screen is shown instead of the dashboard

## See Also

- `docs/SAAS_REPLAN.md` — full brainstorm, data model changes, and implementation plan
- `docs/DEVELOPMENT.md` — local dev setup and commands
