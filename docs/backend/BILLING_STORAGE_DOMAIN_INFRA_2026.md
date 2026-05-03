# Billing, Storage, Domain, and Infra Hardening (2026)

## What changed

### Tenant storage isolation
- Added `TenantFileStorageService`.
- Shop logo uploads now write to:
  - `storage/app/public/shops/{shop_id}/logos/...`
- Legacy logo cleanup/backfill utilities:
  - Command: `php artisan tenant:backfill-logos [--dry-run]`
  - Scheduled orphan cleanup job: `CleanupOrphanedTenantMediaJob`

### Billing automation foundation (PayMongo first)
- Added provider interface:
  - `BillingProviderInterface`
- Added PayMongo provider implementation:
  - `PayMongoBillingProvider`
- Added webhook processing service:
  - `BillingWebhookService`
- Added subscription lifecycle service:
  - `SubscriptionLifecycleService`

### Billing data model additions
- `billing_webhook_events` (idempotency + processing state)
- `subscription_invoices` (invoice generation)
- `subscription_reconciliation_entries` (payment/invoice linkage)

### Domain lifecycle and verification
- Added fields to `shops`:
  - `domain_status`
  - `verification_token`
  - `verified_at`
  - `last_checked_at`
- Added owner domain onboarding API.
- Resolver only accepts `custom_domain` when domain status is `VERIFIED` or `ACTIVE`.
- Added domain health monitor job (`DomainHealthCheckJob`) to downgrade unhealthy domains.

### Redis/queues/rate limiting/scheduling
- Added rate limiters:
  - `auth`
  - `shop-info`
  - `billing-webhooks`
- Added scheduled jobs in `routes/console.php`:
  - `RunSubscriptionRenewalSweepJob` (every 15 minutes)
  - `CleanupOrphanedTenantMediaJob` (daily 02:00)
  - `DomainHealthCheckJob` (hourly)
- `.env.example` updated to Redis-first defaults for cache/queue.

## Service credentials and config
- `config/services.php` now includes:
  - `paymongo.secret_key`
  - `paymongo.public_key`
  - `paymongo.webhook_secret`
  - `cloudflare.api_token`
  - `cloudflare.zone_id`

## How to test

### Backend tests
```bash
cd Backend
php artisan test --filter=BillingWebhookTest
```

### Manual checks
1. Run migrations and seeders.
2. Trigger `POST /api/webhooks/paymongo` with valid signature and metadata `shop_subscription_id`; confirm:
   - webhook event persisted once
   - payment recorded
   - subscription status transition applied
3. Upload a logo via owner route and verify tenant-scoped path under `shops/{shop_id}/logos`.
4. Run `php artisan tenant:backfill-logos --dry-run` then real run.
5. Request and verify custom domain via owner endpoints.
6. Run scheduler/queue worker and confirm scheduled jobs execute.

## Backup/restore operational notes
- Database: use MySQL logical backups (`mysqldump`) on a recurring schedule.
- Storage: snapshot `storage/app/public/shops` together with DB backups.
- Restore order: DB first, then storage snapshot, then run domain health check and subscription sweep jobs.
