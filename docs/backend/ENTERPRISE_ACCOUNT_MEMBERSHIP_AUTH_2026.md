# Enterprise Account and Membership Auth (2026)

## Overview

MoSPAMS now supports an enterprise identity model while preserving the existing `users` table for phased compatibility.

- `accounts` is the global login identity.
- `shop_memberships` is the role and access record for one account inside one shop.
- `platform_admins` grants platform-level SuperAdmin access.
- Existing `users` rows remain as Sanctum-compatible token owners and foreign-key compatibility records.

This allows one person to use one email across shops with different roles, for example Owner in Shop A and Customer in Shop B.

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

Tenant login:

- Request must resolve a tenant shop.
- Account must be active.
- Account must have an active `shop_memberships` row for the resolved shop.
- Token ability is `tenant:{shop_id}`.
- Response includes the existing `user` object plus `account` and `membership`.

Platform login:

- Request must come from the platform host.
- Account must have active `platform_admins` access.
- Token ability is `platform:*`.

Role checks now use the active shop membership. The old `users.role_id_fk` is kept in sync for compatibility.

## User and Shop Provisioning

Owner-managed `/api/users` now creates or reuses an account, then creates a membership in the current shop. The response shape remains compatible with the frontend users page.

SuperAdmin shop creation and registration approval now create or reuse the owner account and then create an Owner membership. Existing accounts are reused without resetting their password; temporary passwords are returned only for newly created accounts.

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
   - Account without membership in a shop cannot log in through that shop.
3. Verify platform login:
   - SuperAdmin can log in only on the platform host.
   - Tenant users are rejected on the platform host.
4. Verify user management:
   - Owner creates a user with a new email.
   - Owner adds an existing account email to the current shop without duplicate-account failure.
   - Changing role updates membership role and keeps the compatibility user row in sync.
5. Verify builds/tests:
   - `cd backend && php artisan test`
   - `cd Frontend && npm run build`
