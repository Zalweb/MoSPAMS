# Enterprise Account and Membership Auth (2026)

## Overview

MoSPAMS now supports an enterprise identity model while preserving the existing `users` table for phased compatibility.

- `accounts` is the global login identity.
- `shop_memberships` is the role and access record for one account inside one shop.
- `platform_admins` grants platform-level SuperAdmin access.
- Existing `users` rows remain as Sanctum-compatible token owners and foreign-key compatibility records.

This allows one person to use one email across shops while enforcing MoSPAMS role rules:

- `SuperAdmin` is platform-only through `platform_admins`
- `Owner`, `Staff`, and `Mechanic` are single-shop work roles
- `Customer` can exist in many shops
- the same account can be `Owner` in one shop and `Customer` in other shops

## Schema Changes

New tables:

- `account_statuses`
- `membership_statuses`
- `accounts`
- `shop_memberships`
- `platform_admins`

Compatibility columns:

- `users.account_id_fk`
- `customers.account_id_fk`
- `mechanics.account_id_fk`
- `role_requests.account_id_fk`
- `role_requests.membership_id_fk`
- `activity_logs.account_id_fk`

The migration backfills accounts from existing users, creates memberships for tenant users, creates platform admin records for SuperAdmins, and links customer/mechanic/audit rows where possible.

## Runtime Behavior

Password and Google login now resolve `accounts` first.

Role invariants are enforced centrally through the identity service layer:

- an account may have only one active work-role membership total
- a shop may have only one active active Owner membership
- Customer memberships may exist in many shops for the same account
- work-role promotions or provisioning that violate these rules return `422`

Tenant login:

- Request must resolve a tenant shop.
- Account must be active.
- If the account has an active membership for the resolved shop, login completes normally.
- If the account authenticates successfully but has no membership in that shop, the API returns:
  - `needs_membership: true`
  - `allowed_join_role: Customer`
  - `join_token`
  - current shop summary
- Token ability is `tenant:{shop_id}`.
- Response includes the existing `user` object plus `account` and `membership`.

Platform login:

- Request must come from the platform host.
- Account must have active `platform_admins` access.
- Token ability is `platform:*`.

Role checks now use the active shop membership. The old `users.role_id_fk` is kept in sync for compatibility.

## User and Shop Provisioning

Owner-managed `/api/users` now creates or reuses an account, then creates a membership in the current shop. Owners can create `Staff`, `Mechanic`, and `Customer` accounts for their own shop, but cannot create another `Owner`.

SuperAdmin shop creation and registration approval now create or reuse the owner account and then create an Owner membership. If the target account already has an active work role in another shop, provisioning is rejected.

Pending role-request approval also goes through the same membership guard. A `Customer` can be promoted to `Staff` or `Mechanic` only if the account has no other active work role in another shop.

## Join-Shop Flow

New endpoint:

- `POST /api/join-shop`

Behavior:

- accepts a short-lived `join_token`
- resolves the target tenant shop from the current tenant host or explicit `tenant_host`
- creates or reactivates a `Customer` membership for that account in that shop
- issues a normal tenant Sanctum token and returns the standard `user + account + membership` auth payload

This separates:

- `POST /api/register` for brand-new accounts only
- `POST /api/join-shop` for existing accounts joining another shop as `Customer`

## Password Reset

Password reset resolves by `accounts.email`.

For tenant-origin reset requests, the account must have a membership in that tenant shop. A successful reset updates the global account password and synchronizes compatibility `users.password_hash` values for that account.

## How to Test

1. Run migrations:
   - `cd backend`
   - `php artisan migrate`
2. Verify tenant login:
   - Existing tenant user can log in to their own shop.
   - Same email with membership in two shops can log in to each shop with that shop's role.
   - Account without membership in a shop receives the `needs_membership` join flow response.
   - `POST /api/join-shop` on that tenant host creates Customer membership and then logs the user in.
3. Verify role restrictions:
   - `Owner`, `Staff`, or `Mechanic` in Shop A can join Shop B only as `Customer`.
   - Owner-managed `/api/users` rejects assigning a work role to an account that already works in another shop.
   - SuperAdmin shop provisioning rejects selecting an owner account that already has a work role elsewhere.
   - Role-request approval rejects promoting an account that already has a work role in another shop.
3. Verify platform login:
   - SuperAdmin can log in only on the platform host.
   - Tenant users are rejected on the platform host.
4. Verify user management:
   - Owner creates a user with a new email.
   - Owner adds an existing account email to the current shop as `Customer`.
   - Changing role updates membership role and keeps the compatibility user row in sync.
5. Audit legacy data:
   - `cd Backend && php artisan identity:audit-memberships`
   - Resolve any reported multi-work-role accounts or multi-owner shops manually.
6. Verify builds/tests:
   - `cd backend && php artisan test`
   - `cd Frontend && npm run build`
