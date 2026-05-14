# Database 5NF Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 3NF transitive dependencies, functional redundancies, and 5NF join-dependency violations from the MoSPAMS database schema — including duplicate identity columns inherited on the `users` table from before the `accounts` table was introduced.

**Architecture:** Each migration removes a specific violation; affected models and controllers are updated atomically in the same task. The shops table is decomposed into four focused tables (shops, shop_domains, shop_branding, shop_registrations), each representing exactly one factual concern. Derived columns are dropped and computed at query time instead.

**Tech Stack:** Laravel 11, MySQL, PHP 8.3, Eloquent ORM

---

## Normalization Audit

### What is violated and why

| Violation | Normal Form | Column(s) | Why it violates |
|---|---|---|---|
| `users.full_name`, `users.email`, `users.google_id`, `users.password_hash` | 3NF | full_name, email, google_id, password_hash | Transitively determined: users.account_id_fk → accounts.* — four identity columns duplicated from the accounts table |
| `service_job_parts.subtotal` = quantity × unit_price | 3NF | subtotal | Derived from non-key columns in the same row |
| `sale_items.subtotal` = quantity × unit_price | 3NF | subtotal | Derived from non-key columns in the same row |
| `sales.net_amount` = total_amount − discount | 3NF | net_amount | Derived from non-key columns in the same row |
| `service_job_mechanics.shop_id_fk` | 3NF | shop_id_fk | Transitively determined: job_id_fk → service_jobs.shop_id_fk |
| `subscription_payments.shop_id_fk` | 3NF | shop_id_fk | Transitively determined: shop_subscription_id_fk → shop_subscriptions.shop_id_fk |
| `subscription_invoices.shop_id_fk` | 3NF | shop_id_fk | Transitively determined: shop_subscription_id_fk → shop_subscriptions.shop_id_fk |
| `ratings.customer_id_fk` | 3NF | customer_id_fk | Transitively determined: service_job_id_fk → service_jobs.customer_id_fk |
| `ratings.shop_id_fk` | 3NF | shop_id_fk | Transitively determined: service_job_id_fk → service_jobs.shop_id_fk |
| `service_jobs.assigned_mechanic_id_fk` | Redundancy | assigned_mechanic_id_fk | Fully superseded by `service_job_mechanics` junction table; two sources of truth for the same fact |
| `shops` table mixing 4 concerns | 5NF | registration_*, domain_*, logo_url, primary_color, etc. | Table contains independent join dependencies: domain lifecycle, branding, and registration lifecycle are facts not implied by the shops PK alone |

### What is NOT violated (do not touch)
- All `shop_id_fk` tenant-scoping columns on domain tables (`customers`, `parts`, `service_jobs`, etc.) — these are required for multi-tenancy row-level isolation, not transitive dependencies
- `subscription_reconciliation_entries.shop_id_fk` — a reconciliation entry is a first-class shop-level financial event, not derivable without domain knowledge
- Status lookup tables (`user_statuses`, `part_statuses`, etc.) — separate tables are correct and provide FK-enforced referential integrity per entity type

---

## File Map

### Migrations (new files to create)
- `Backend/database/migrations/2026_05_14_000000_drop_duplicate_identity_columns_from_users.php`
- `Backend/database/migrations/2026_05_14_000001_drop_derived_subtotal_and_net_amount_columns.php`
- `Backend/database/migrations/2026_05_14_000002_drop_assigned_mechanic_from_service_jobs.php`
- `Backend/database/migrations/2026_05_14_000003_drop_transitive_shop_id_from_service_job_mechanics.php`
- `Backend/database/migrations/2026_05_14_000004_drop_transitive_shop_id_from_billing_tables.php`
- `Backend/database/migrations/2026_05_14_000005_drop_transitive_fks_from_ratings.php`
- `Backend/database/migrations/2026_05_14_000006_create_shop_domains_table.php`
- `Backend/database/migrations/2026_05_14_000007_create_shop_branding_table.php`
- `Backend/database/migrations/2026_05_14_000008_create_shop_registrations_table.php`
- `Backend/database/migrations/2026_05_14_000009_drop_decomposed_columns_from_shops.php`

### Models (modify)
- `Backend/app/Models/User.php` — remove full_name, email, google_id, password_hash from fillable/hidden; update getAuthPassword() to delegate to account
- `Backend/app/Models/ServiceJob.php` — remove assigned_mechanic_id_fk from fillable
- `Backend/app/Models/Sale.php` — remove net_amount from fillable
- `Backend/app/Models/CustomerRating.php` — remove customer_id_fk, shop_id_fk from fillable/visible/relations
- `Backend/app/Models/SubscriptionPayment.php` — remove shop_id_fk from fillable
- `Backend/app/Models/SubscriptionInvoice.php` — remove shop_id_fk from fillable
- `Backend/app/Models/Shop.php` — add hasOne for ShopDomain, ShopBranding, ShopRegistration; remove moved fillable fields

### Models (create new)
- `Backend/app/Models/ShopDomain.php`
- `Backend/app/Models/ShopBranding.php`
- `Backend/app/Models/ShopRegistration.php`

### Controllers (modify)
- `Backend/app/Http/Controllers/Api/MospamsController.php` — replace subtotal/net_amount literals with computed expressions throughout
- `Backend/app/Http/Controllers/Api/RatingController.php` — remove customer_id_fk/shop_id_fk inserts; derive from service_job
- `Backend/app/Http/Controllers/Api/ShopBrandingController.php` — read/write from shop_branding table
- `Backend/app/Http/Controllers/Api/DomainOnboardingController.php` — read/write from shop_domains table
- `Backend/app/Http/Controllers/Api/ShopRegistrationController.php` — read/write from shop_registrations table
- `Backend/app/Http/Controllers/Api/SuperAdminController.php` — update shop approval queries to use shop_registrations

### Seeders (modify)
- `Backend/database/seeders/WebTechDemoSeeder.php` — remove assigned_mechanic_id_fk from service_job inserts

---

## Task 0: Drop Duplicate Identity Columns from users ⚠️ NOT YET IMPLEMENTED

> **Status: PLANNED — do not implement until explicitly instructed.**

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000000_drop_duplicate_identity_columns_from_users.php`
- Modify: `Backend/app/Models/User.php`
- Modify: `Backend/app/Http/Controllers/Api/AuthController.php`
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/app/Http/Controllers/Api/GoogleAuthController.php`
- Modify: `Backend/database/seeders/WebTechDemoSeeder.php` (any user insert that sets email/password directly)

**Why:** The `users` table was the original identity table before the `accounts` table was introduced in migration `2026_05_09`. When `accounts` was added, `account_id_fk` was backfilled into `users` but the old columns (`full_name`, `email`, `google_id`, `password_hash`) were NOT removed. Now both tables store the same facts about the same person:

```
accounts.full_name     ← canonical
users.full_name        ← duplicate (3NF: transitively determined via account_id_fk → accounts.full_name)

accounts.email         ← canonical
users.email            ← duplicate

accounts.google_id     ← canonical
users.google_id        ← duplicate

accounts.password_hash ← canonical
users.password_hash    ← duplicate
```

The password reset currently writes to **both** tables (AuthController line 134). The auth response uses `$user->account?->email ?? $user->email` — a fallback that should not be necessary once the duplicate is removed.

**What `users` should own after this task:**
```
user_id, account_id_fk, shop_id_fk, role_id_fk, user_status_id_fk, username, created_at, updated_at
```

**What `accounts` owns (unchanged):**
```
account_id, full_name, email, password_hash, google_id, account_status_id_fk, email_verified_at
```

`username` stays on `users` because it is a shop-scoped display handle, not a global identity field.

---

- [ ] **Step 1: Audit all code that reads the duplicate columns from users**

Run these before touching anything:

```bash
grep -rn "users\.email\|->email\b\|user->email\|full_name\|google_id\|password_hash" \
  Backend/app/Http/Controllers Backend/app/Services Backend/app/Models/User.php
```

List every callsite. Each one must be redirected to use `$user->account->email`, `$user->account->full_name`, etc., or load via `$user->account`.

- [ ] **Step 2: Write the migration**

Create `Backend/database/migrations/2026_05_14_000000_drop_duplicate_identity_columns_from_users.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop unique indexes first, then the columns
            $table->dropIndex('users_email_unique'); // may already be dropped in a prior migration
            $table->dropColumn(['full_name', 'email', 'google_id', 'password_hash']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('full_name', 100)->after('account_id_fk')->default('');
            $table->string('email', 100)->nullable()->unique()->after('full_name');
            $table->string('google_id', 100)->nullable()->after('email');
            $table->string('password_hash')->nullable()->after('google_id');
        });
    }
};
```

> Note: Before running `up()`, verify that the `users_email_unique` index was already dropped by migration `2026_05_09_000001`. If it was, remove that `dropIndex` line.

- [ ] **Step 3: Update User model — remove duplicate fillable fields**

Replace the `$fillable`, `$hidden`, and `getAuthPassword()` in `Backend/app/Models/User.php`:

```php
protected $fillable = [
    'account_id_fk',
    'shop_id_fk',
    'role_id_fk',
    'username',
    'user_status_id_fk',
];

protected $hidden = [];

public function getAuthPassword(): string
{
    // Sanctum calls this for token verification — delegate to account
    return $this->account?->password_hash ?? '';
}
```

- [ ] **Step 4: Update AuthController — remove all fallback reads from users columns**

Every `$user->email` → `$user->account->email`
Every `$user->full_name` → `$user->account->full_name`
Every `$user->google_id` → `$user->account->google_id`

In `resetPassword()`, remove the line that updates `users.password_hash` directly — only the `accounts` update is needed:

```php
// Keep only this:
$user->account?->update(['password_hash' => $passwordHash]);

// Remove this line:
// User::query()->where('account_id_fk', $user->account_id_fk)->update(['password_hash' => $passwordHash, 'updated_at' => now()]);
```

In `userResource()`, update the fallback-free versions:

```php
'name'  => $user->account->full_name,
'email' => $user->account->email,
```

- [ ] **Step 5: Update GoogleAuthController — ensure it never writes email/password to users**

```bash
grep -n "email\|full_name\|google_id\|password" Backend/app/Http/Controllers/Api/GoogleAuthController.php
```

All Google identity data must go through `accounts` only. Remove any insert/update of those columns on `users`.

- [ ] **Step 6: Update MospamsController and any other controller that reads user identity from users table**

```bash
grep -n "->email\|->full_name\|->google_id" Backend/app/Http/Controllers/Api/MospamsController.php
```

Replace with `->account->email`, `->account->full_name`, etc. Ensure `account` is eager-loaded where needed.

- [ ] **Step 7: Update seeders — remove identity fields from user inserts**

In `WebTechDemoSeeder.php`, any `DB::table('users')->insert([...])` that sets `full_name`, `email`, `google_id`, or `password_hash` must have those keys removed. Those values should only be inserted into `accounts`.

- [ ] **Step 8: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000000_drop_duplicate_identity_columns_from_users.php
```

Expected: `Migrated`.

- [ ] **Step 9: Smoke test authentication**

```bash
php artisan tinker --execute="
\$user = App\Models\User::with('account')->first();
echo \$user->account->email . PHP_EOL;
echo \$user->account->full_name . PHP_EOL;
echo \$user->getAuthPassword() ? 'password ok' : 'no password' . PHP_EOL;
"
```

Expected: email and name print correctly; password ok.

- [ ] **Step 10: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000000_drop_duplicate_identity_columns_from_users.php \
        Backend/app/Models/User.php \
        Backend/app/Http/Controllers/Api/AuthController.php \
        Backend/app/Http/Controllers/Api/GoogleAuthController.php \
        Backend/app/Http/Controllers/Api/MospamsController.php \
        Backend/database/seeders/WebTechDemoSeeder.php
git commit -m "refactor(db): drop duplicate identity columns from users — owned by accounts (3NF)"
```

---

## Task 1: Drop Derived Columns (subtotal, net_amount)

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000001_drop_derived_subtotal_and_net_amount_columns.php`
- Modify: `Backend/app/Models/Sale.php`
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

**Why:** `subtotal` in `service_job_parts` and `sale_items` equals `quantity × unit_price`. `net_amount` in `sales` equals `total_amount − discount`. Storing computed values creates update anomalies.

**Impact on queries:** All `sum('net_amount')` become `DB::raw('SUM(total_amount - discount)')`. All `subtotal` inserts become computed at write time with `quantity * unit_price` (already done in code — just remove the DB column). SELECT queries using subtotal must use `(quantity * unit_price) AS subtotal`.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000001_drop_derived_subtotal_and_net_amount_columns.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_job_parts', function (Blueprint $table) {
            $table->dropColumn('subtotal');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn('subtotal');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('net_amount');
        });
    }

    public function down(): void
    {
        Schema::table('service_job_parts', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->after('unit_price');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->after('unit_price');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('net_amount', 10, 2)->after('discount');
        });
    }
};
```

- [ ] **Step 2: Run migration to verify it works**

```bash
cd Backend && php artisan migrate --path=database/migrations/2026_05_14_000001_drop_derived_subtotal_and_net_amount_columns.php
```

Expected: `Migrating: 2026_05_14_000001...` then `Migrated`.

- [ ] **Step 3: Remove net_amount from Sale model fillable**

In `Backend/app/Models/Sale.php`, remove `'net_amount'` from the `$fillable` array:

```php
protected $fillable = ['shop_id_fk', 'customer_id_fk', 'job_id_fk', 'processed_by_fk', 'sale_type', 'total_amount', 'discount', 'sale_date'];
```

- [ ] **Step 4: Update MospamsController — fix all net_amount references**

In `Backend/app/Http/Controllers/Api/MospamsController.php`, replace every `sum('net_amount')` and `SUM(net_amount)` with the computed form:

```php
// Before:
->sum('net_amount')
// After:
->selectRaw('SUM(total_amount - discount) as revenue')->value('revenue')

// For raw query blocks that use sum('net_amount') directly:
DB::table('sales')->where('shop_id_fk', $shopId)->selectRaw('SUM(total_amount - discount) as total')->value('total')

// In selectRaw that referenced net_amount:
->selectRaw('DATE(sale_date) as day, SUM(total_amount - discount) as amount')
```

Also find the sale INSERT that sets `net_amount` (around line 1058 and 1146) and remove that key:

```php
// Remove this line from the insert array:
// 'net_amount' => $total,
// The total_amount and discount columns already carry the raw values.
```

- [ ] **Step 5: Update MospamsController — fix subtotal inserts**

The code already computes subtotal before inserting (e.g. `'subtotal' => $part->unit_price * $data['quantity']`). Remove those keys from the insert arrays since the column no longer exists:

Search for `'subtotal'` in MospamsController and remove those insert array entries. The quantity and unit_price columns are sufficient.

- [ ] **Step 6: Update MospamsController — fix subtotal SELECTs**

Any query that SELECT/uses `subtotal` as a column name from `service_job_parts` or `sale_items` must be rewritten. Search for `subtotal` in MospamsController SELECT statements and replace:

```php
// If a query selects all columns and then uses ->subtotal in PHP:
// Use DB::raw('quantity * unit_price AS subtotal') in the select
->select('job_part_id', 'job_id_fk', 'part_id_fk', 'quantity', 'unit_price', DB::raw('quantity * unit_price AS subtotal'))
```

- [ ] **Step 7: Verify the app boots and dashboard loads**

```bash
php artisan route:list | head -20
```

Fix any compile errors. Then do a quick smoke test against a local or staging environment to confirm the dashboard revenue figures still return.

- [ ] **Step 8: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000001_drop_derived_subtotal_and_net_amount_columns.php \
        Backend/app/Models/Sale.php \
        Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "refactor(db): drop derived subtotal/net_amount columns (3NF)"
```

---

## Task 2: Drop assigned_mechanic_id_fk from service_jobs

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000002_drop_assigned_mechanic_from_service_jobs.php`
- Modify: `Backend/database/seeders/WebTechDemoSeeder.php`

**Why:** `service_jobs.assigned_mechanic_id_fk` is a single-FK column that was superseded by the `service_job_mechanics` junction table (which supports multiple mechanics per job). Having both creates two sources of truth that can diverge.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000002_drop_assigned_mechanic_from_service_jobs.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill service_job_mechanics for any job that has assigned_mechanic_id_fk
        // but no row in service_job_mechanics, to avoid losing data.
        DB::table('service_jobs')
            ->whereNotNull('assigned_mechanic_id_fk')
            ->get(['job_id', 'assigned_mechanic_id_fk', 'shop_id_fk'])
            ->each(function (object $job) {
                $exists = DB::table('service_job_mechanics')
                    ->where('job_id_fk', $job->job_id)
                    ->where('mechanic_id_fk', $job->assigned_mechanic_id_fk)
                    ->exists();

                if (! $exists) {
                    DB::table('service_job_mechanics')->insert([
                        'job_id_fk'     => $job->job_id,
                        'mechanic_id_fk' => $job->assigned_mechanic_id_fk,
                        'shop_id_fk'    => $job->shop_id_fk,
                        'assigned_at'   => now(),
                    ]);
                }
            });

        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropForeign(['assigned_mechanic_id_fk']);
            $table->dropColumn('assigned_mechanic_id_fk');
        });
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->foreignId('assigned_mechanic_id_fk')
                ->nullable()
                ->after('customer_id_fk')
                ->constrained('mechanics', 'mechanic_id')
                ->nullOnDelete();
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000002_drop_assigned_mechanic_from_service_jobs.php
```

Expected: `Migrated`.

- [ ] **Step 3: Remove from seeder**

In `Backend/database/seeders/WebTechDemoSeeder.php`, find every array entry containing `'assigned_mechanic_id_fk'` and remove that key. Search:

```bash
grep -n "assigned_mechanic_id_fk" database/seeders/WebTechDemoSeeder.php
```

Remove those array keys from all service_job insert arrays in the seeder.

- [ ] **Step 4: Verify seeder still runs**

```bash
php artisan db:seed --class=WebTechDemoSeeder 2>&1 | tail -20
```

Expected: seeder completes without error.

- [ ] **Step 5: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000002_drop_assigned_mechanic_from_service_jobs.php \
        Backend/database/seeders/WebTechDemoSeeder.php
git commit -m "refactor(db): drop assigned_mechanic_id_fk — superseded by service_job_mechanics"
```

---

## Task 3: Drop Transitive shop_id_fk from service_job_mechanics

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000003_drop_transitive_shop_id_from_service_job_mechanics.php`

**Why:** `service_job_mechanics.shop_id_fk` is transitively determined by `job_id_fk → service_jobs.shop_id_fk`. The mechanic's shop and the job's shop must always agree, making this column redundant.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000003_drop_transitive_shop_id_from_service_job_mechanics.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_job_mechanics', function (Blueprint $table) {
            $table->dropForeign(['shop_id_fk']);
            $table->dropColumn('shop_id_fk');
        });
    }

    public function down(): void
    {
        Schema::table('service_job_mechanics', function (Blueprint $table) {
            $table->foreignId('shop_id_fk')
                ->after('mechanic_id_fk')
                ->constrained('shops', 'shop_id')
                ->cascadeOnDelete();
        });
    }
};
```

- [ ] **Step 2: Find and remove all service_job_mechanics shop_id_fk inserts**

```bash
grep -rn "service_job_mechanics" Backend/app Backend/database/seeders
```

In every place that inserts into `service_job_mechanics`, remove `'shop_id_fk'` from the insert array. The main location is `MospamsController.php` around lines 639–700 (the mechanic assignment logic). Example fix:

```php
// Before:
DB::table('service_job_mechanics')->insert([
    'job_id_fk'      => $jobId,
    'mechanic_id_fk' => $mechId,
    'shop_id_fk'     => $this->shopId(),
    'assigned_at'    => now(),
]);
// After:
DB::table('service_job_mechanics')->insert([
    'job_id_fk'      => $jobId,
    'mechanic_id_fk' => $mechId,
    'assigned_at'    => now(),
]);
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000003_drop_transitive_shop_id_from_service_job_mechanics.php
```

Expected: `Migrated`.

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000003_drop_transitive_shop_id_from_service_job_mechanics.php \
        Backend/app/Http/Controllers/Api/MospamsController.php \
        Backend/database/seeders/WebTechDemoSeeder.php
git commit -m "refactor(db): drop transitive shop_id_fk from service_job_mechanics (3NF)"
```

---

## Task 4: Drop Transitive shop_id_fk from Billing Tables

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000004_drop_transitive_shop_id_from_billing_tables.php`
- Modify: `Backend/app/Models/SubscriptionPayment.php`
- Modify: `Backend/app/Models/SubscriptionInvoice.php`

**Why:** Both `subscription_payments.shop_id_fk` and `subscription_invoices.shop_id_fk` are transitively determined by `shop_subscription_id_fk → shop_subscriptions.shop_id_fk`. All billing queries that need the shop must JOIN through `shop_subscriptions`.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000004_drop_transitive_shop_id_from_billing_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropIndex('subscription_payments_shop_status_idx');
            $table->dropForeign(['shop_id_fk']);
            $table->dropColumn('shop_id_fk');
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropIndex('subscription_invoices_shop_status_idx');
            $table->dropForeign(['shop_id_fk']);
            $table->dropColumn('shop_id_fk');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->foreignId('shop_id_fk')
                ->after('shop_subscription_id_fk')
                ->constrained('shops', 'shop_id')
                ->cascadeOnDelete();
            $table->index(['shop_id_fk', 'payment_status'], 'subscription_payments_shop_status_idx');
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->foreignId('shop_id_fk')
                ->after('shop_subscription_id_fk')
                ->constrained('shops', 'shop_id')
                ->cascadeOnDelete();
            $table->index(['shop_id_fk', 'invoice_status'], 'subscription_invoices_shop_status_idx');
        });
    }
};
```

- [ ] **Step 2: Update SubscriptionPayment model**

In `Backend/app/Models/SubscriptionPayment.php`, remove `'shop_id_fk'` from `$fillable`. Any query that previously filtered by `shop_id_fk` on this table should now JOIN through `shop_subscriptions`:

```php
// To filter payments by shop, join:
DB::table('subscription_payments')
    ->join('shop_subscriptions', 'shop_subscriptions.shop_subscription_id', '=', 'subscription_payments.shop_subscription_id_fk')
    ->where('shop_subscriptions.shop_id_fk', $shopId)
    ->...
```

- [ ] **Step 3: Update SubscriptionInvoice model**

In `Backend/app/Models/SubscriptionInvoice.php`, remove `'shop_id_fk'` from `$fillable`. Same JOIN pattern as Step 2.

- [ ] **Step 4: Search for shop_id_fk usage in billing controllers**

```bash
grep -n "shop_id_fk" Backend/app/Http/Controllers/Api/SuperAdminController.php
grep -n "shop_id_fk" Backend/app/Http/Controllers/Api/BillingWebhookController.php
```

For any query on `subscription_payments` or `subscription_invoices` that filters by `shop_id_fk`, rewrite to JOIN through `shop_subscriptions`.

- [ ] **Step 5: Remove shop_id_fk from billing INSERTs**

```bash
grep -n "subscription_payments\|subscription_invoices" Backend/app/Http/Controllers/Api/SuperAdminController.php
```

Remove `'shop_id_fk'` from any insert arrays targeting those two tables.

- [ ] **Step 6: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000004_drop_transitive_shop_id_from_billing_tables.php
```

Expected: `Migrated`.

- [ ] **Step 7: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000004_drop_transitive_shop_id_from_billing_tables.php \
        Backend/app/Models/SubscriptionPayment.php \
        Backend/app/Models/SubscriptionInvoice.php \
        Backend/app/Http/Controllers/Api/SuperAdminController.php \
        Backend/app/Http/Controllers/Api/BillingWebhookController.php
git commit -m "refactor(db): drop transitive shop_id_fk from billing tables (3NF)"
```

---

## Task 5: Drop Transitive customer_id_fk and shop_id_fk from ratings

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000005_drop_transitive_fks_from_ratings.php`
- Modify: `Backend/app/Models/CustomerRating.php`
- Modify: `Backend/app/Http/Controllers/Api/RatingController.php`

**Why:** `ratings.service_job_id_fk` has a UNIQUE constraint (one rating per job). Because of that uniqueness, `service_job_id_fk → service_jobs.customer_id_fk` and `service_job_id_fk → service_jobs.shop_id_fk` are full functional dependencies — the customer and shop are already uniquely derivable from the job. Storing them separately violates 3NF.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000005_drop_transitive_fks_from_ratings.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropIndex(['shop_id_fk']);
            $table->dropForeign(['shop_id_fk']);
            $table->dropForeign(['customer_id_fk']);
            $table->dropColumn(['customer_id_fk', 'shop_id_fk']);
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->foreignId('customer_id_fk')
                ->after('mechanic_id_fk')
                ->constrained('customers', 'customer_id');
            $table->foreignId('shop_id_fk')
                ->after('customer_id_fk')
                ->constrained('shops', 'shop_id');
            $table->index('shop_id_fk');
        });
    }
};
```

- [ ] **Step 2: Update CustomerRating model**

Replace `Backend/app/Models/CustomerRating.php` contents:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerRating extends Model
{
    protected $table = 'ratings';

    protected $fillable = ['service_job_id_fk', 'mechanic_id_fk', 'rating', 'comment'];

    protected $casts = [
        'rating' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $visible = ['id', 'service_job_id_fk', 'mechanic_id_fk', 'rating', 'comment', 'created_at'];

    public function serviceJob(): BelongsTo
    {
        return $this->belongsTo(ServiceJob::class, 'service_job_id_fk', 'job_id');
    }

    public function mechanic(): BelongsTo
    {
        return $this->belongsTo(Mechanic::class, 'mechanic_id_fk', 'mechanic_id');
    }
}
```

- [ ] **Step 3: Update RatingController::store — remove redundant inserts**

In `Backend/app/Http/Controllers/Api/RatingController.php`, the insert currently writes `customer_id_fk` and `shop_id_fk`. Remove them:

```php
DB::table('ratings')->insert([
    'service_job_id_fk' => $job->job_id,
    'mechanic_id_fk'    => $mechanic->mechanic_id_fk,
    'rating'            => $validated['rating'],
    'comment'           => $validated['comment'] ?? null,
    'created_at'        => now(),
    'updated_at'        => now(),
]);
```

- [ ] **Step 4: Update RatingController::show — derive customer/shop via join when needed**

If any response from `show()` previously returned customer/shop data, JOIN through `service_jobs` to get it. The current `show()` just returns the raw rating row, which is fine — no join needed since we're not returning customer/shop.

- [ ] **Step 5: Search for other rating queries that filter by customer_id_fk or shop_id_fk**

```bash
grep -rn "ratings" Backend/app/Http/Controllers
```

For any query on `ratings` that filters by `shop_id_fk`, rewrite to JOIN through `service_jobs`:

```php
DB::table('ratings')
    ->join('service_jobs', 'service_jobs.job_id', '=', 'ratings.service_job_id_fk')
    ->where('service_jobs.shop_id_fk', $shopId)
    ->...
```

- [ ] **Step 6: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000005_drop_transitive_fks_from_ratings.php
```

Expected: `Migrated`.

- [ ] **Step 7: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000005_drop_transitive_fks_from_ratings.php \
        Backend/app/Models/CustomerRating.php \
        Backend/app/Http/Controllers/Api/RatingController.php
git commit -m "refactor(db): drop transitive customer_id_fk/shop_id_fk from ratings (3NF)"
```

---

## Task 6: Create shop_domains table

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000006_create_shop_domains_table.php`
- Create: `Backend/app/Models/ShopDomain.php`

**Why (5NF):** The `shops` table currently encodes four independent facts. A shop's custom-domain lifecycle (DNS verification state machine) is an independent factual relationship that should occupy its own table. It has its own lifecycle columns and is updated by a different set of controllers (DomainOnboardingController) than shop core data.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000006_create_shop_domains_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_domains', function (Blueprint $table) {
            $table->id('shop_domain_id');
            $table->foreignId('shop_id_fk')->unique()->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->string('custom_domain', 100)->nullable()->unique();
            $table->string('domain_status', 30)->default('UNVERIFIED');
            $table->string('verification_token', 80)->nullable()->unique();
            $table->dateTime('verified_at')->nullable();
            $table->dateTime('last_checked_at')->nullable();
            $table->timestamps();

            $table->index('domain_status', 'shop_domains_status_idx');
        });

        // Migrate existing data from shops table
        DB::table('shops')->get([
            'shop_id', 'custom_domain', 'domain_status', 'verification_token', 'verified_at', 'last_checked_at',
        ])->each(function (object $shop) {
            DB::table('shop_domains')->insert([
                'shop_id_fk'         => $shop->shop_id,
                'custom_domain'      => $shop->custom_domain,
                'domain_status'      => $shop->domain_status ?? 'UNVERIFIED',
                'verification_token' => $shop->verification_token,
                'verified_at'        => $shop->verified_at,
                'last_checked_at'    => $shop->last_checked_at,
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
        });
    }

    public function down(): void
    {
        // Restore data to shops before dropping
        DB::table('shop_domains')->get()->each(function (object $domain) {
            DB::table('shops')->where('shop_id', $domain->shop_id_fk)->update([
                'custom_domain'      => $domain->custom_domain,
                'domain_status'      => $domain->domain_status,
                'verification_token' => $domain->verification_token,
                'verified_at'        => $domain->verified_at,
                'last_checked_at'    => $domain->last_checked_at,
            ]);
        });

        Schema::dropIfExists('shop_domains');
    }
};
```

- [ ] **Step 2: Create ShopDomain model**

Create `Backend/app/Models/ShopDomain.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopDomain extends Model
{
    protected $primaryKey = 'shop_domain_id';

    protected $fillable = [
        'shop_id_fk',
        'custom_domain',
        'domain_status',
        'verification_token',
        'verified_at',
        'last_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'verified_at'     => 'datetime',
            'last_checked_at' => 'datetime',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'shop_id');
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000006_create_shop_domains_table.php
```

Expected: `Migrated`. Verify row count:

```bash
php artisan tinker --execute="echo DB::table('shop_domains')->count();"
```

Should equal the number of shops.

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000006_create_shop_domains_table.php \
        Backend/app/Models/ShopDomain.php
git commit -m "refactor(db): extract shop_domains from shops table (5NF)"
```

---

## Task 7: Create shop_branding table

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000007_create_shop_branding_table.php`
- Create: `Backend/app/Models/ShopBranding.php`

**Why (5NF):** Visual and social branding data (logo, colors, social URLs, business hours) is an independent factual relationship updated exclusively by `ShopBrandingController`. It has no dependency on domain lifecycle or registration state.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000007_create_shop_branding_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_branding', function (Blueprint $table) {
            $table->id('shop_branding_id');
            $table->foreignId('shop_id_fk')->unique()->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->string('logo_url', 255)->nullable();
            $table->string('primary_color', 7)->default('#3B82F6');
            $table->string('secondary_color', 7)->default('#10B981');
            $table->text('business_description')->nullable();
            $table->string('facebook_url', 255)->nullable();
            $table->string('instagram_url', 255)->nullable();
            $table->json('business_hours')->nullable();
            $table->timestamps();
        });

        DB::table('shops')->get([
            'shop_id', 'logo_url', 'primary_color', 'secondary_color',
            'business_description', 'facebook_url', 'instagram_url', 'business_hours',
        ])->each(function (object $shop) {
            DB::table('shop_branding')->insert([
                'shop_id_fk'           => $shop->shop_id,
                'logo_url'             => $shop->logo_url,
                'primary_color'        => $shop->primary_color ?? '#3B82F6',
                'secondary_color'      => $shop->secondary_color ?? '#10B981',
                'business_description' => $shop->business_description,
                'facebook_url'         => $shop->facebook_url,
                'instagram_url'        => $shop->instagram_url,
                'business_hours'       => $shop->business_hours,
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('shop_branding')->get()->each(function (object $branding) {
            DB::table('shops')->where('shop_id', $branding->shop_id_fk)->update([
                'logo_url'             => $branding->logo_url,
                'primary_color'        => $branding->primary_color,
                'secondary_color'      => $branding->secondary_color,
                'business_description' => $branding->business_description,
                'facebook_url'         => $branding->facebook_url,
                'instagram_url'        => $branding->instagram_url,
                'business_hours'       => $branding->business_hours,
            ]);
        });

        Schema::dropIfExists('shop_branding');
    }
};
```

- [ ] **Step 2: Create ShopBranding model**

Create `Backend/app/Models/ShopBranding.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopBranding extends Model
{
    protected $primaryKey = 'shop_branding_id';

    protected $fillable = [
        'shop_id_fk',
        'logo_url',
        'primary_color',
        'secondary_color',
        'business_description',
        'facebook_url',
        'instagram_url',
        'business_hours',
    ];

    protected function casts(): array
    {
        return ['business_hours' => 'array'];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'shop_id');
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000007_create_shop_branding_table.php
```

Expected: `Migrated`.

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000007_create_shop_branding_table.php \
        Backend/app/Models/ShopBranding.php
git commit -m "refactor(db): extract shop_branding from shops table (5NF)"
```

---

## Task 8: Create shop_registrations table

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000008_create_shop_registrations_table.php`
- Create: `Backend/app/Models/ShopRegistration.php`

**Why (5NF):** The registration lifecycle (owner name/email, approval/rejection timestamps, status) is an independent factual relationship managed by `ShopRegistrationController` and `SuperAdminController`. It has no intrinsic dependency on domain verification or branding.

- [ ] **Step 1: Write the migration**

Create `Backend/database/migrations/2026_05_14_000008_create_shop_registrations_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_registrations', function (Blueprint $table) {
            $table->id('shop_registration_id');
            $table->foreignId('shop_id_fk')->unique()->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->string('owner_name', 100)->nullable();
            $table->string('owner_email', 100)->nullable();
            $table->string('registration_status', 30)->default('SYSTEM_PROVISIONED');
            $table->text('rejection_reason')->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->timestamps();

            $table->index('registration_status', 'shop_registrations_status_idx');
        });

        DB::table('shops')->get([
            'shop_id',
            'registration_owner_name',
            'registration_owner_email',
            'registration_status',
            'registration_rejection_reason',
            'registration_approved_at',
            'registration_rejected_at',
        ])->each(function (object $shop) {
            DB::table('shop_registrations')->insert([
                'shop_id_fk'          => $shop->shop_id,
                'owner_name'          => $shop->registration_owner_name,
                'owner_email'         => $shop->registration_owner_email,
                'registration_status' => $shop->registration_status ?? 'SYSTEM_PROVISIONED',
                'rejection_reason'    => $shop->registration_rejection_reason,
                'approved_at'         => $shop->registration_approved_at,
                'rejected_at'         => $shop->registration_rejected_at,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        });
    }

    public function down(): void
    {
        DB::table('shop_registrations')->get()->each(function (object $reg) {
            DB::table('shops')->where('shop_id', $reg->shop_id_fk)->update([
                'registration_owner_name'      => $reg->owner_name,
                'registration_owner_email'     => $reg->owner_email,
                'registration_status'          => $reg->registration_status,
                'registration_rejection_reason' => $reg->rejection_reason,
                'registration_approved_at'     => $reg->approved_at,
                'registration_rejected_at'     => $reg->rejected_at,
            ]);
        });

        Schema::dropIfExists('shop_registrations');
    }
};
```

- [ ] **Step 2: Create ShopRegistration model**

Create `Backend/app/Models/ShopRegistration.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopRegistration extends Model
{
    protected $primaryKey = 'shop_registration_id';

    protected $fillable = [
        'shop_id_fk',
        'owner_name',
        'owner_email',
        'registration_status',
        'rejection_reason',
        'approved_at',
        'rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'shop_id');
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000008_create_shop_registrations_table.php
```

Expected: `Migrated`.

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000008_create_shop_registrations_table.php \
        Backend/app/Models/ShopRegistration.php
git commit -m "refactor(db): extract shop_registrations from shops table (5NF)"
```

---

## Task 9: Drop Decomposed Columns from shops and Wire up Models/Controllers

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000009_drop_decomposed_columns_from_shops.php`
- Modify: `Backend/app/Models/Shop.php`
- Modify: `Backend/app/Http/Controllers/Api/ShopBrandingController.php`
- Modify: `Backend/app/Http/Controllers/Api/DomainOnboardingController.php`
- Modify: `Backend/app/Http/Controllers/Api/ShopRegistrationController.php`
- Modify: `Backend/app/Http/Controllers/Api/SuperAdminController.php`

**Why:** After the data is safely copied to the three new tables (Tasks 6–8), the source columns on `shops` can be removed. This task also rewires all controllers to read/write the new tables.

- [ ] **Step 1: Write the drop migration**

Create `Backend/database/migrations/2026_05_14_000009_drop_decomposed_columns_from_shops.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            // Domain columns
            $table->dropUnique('shops_verification_token_unq');
            $table->dropIndex('shops_domain_status_idx');
            $table->dropUnique(['custom_domain']);
            $table->dropColumn(['custom_domain', 'domain_status', 'verification_token', 'verified_at', 'last_checked_at']);

            // Branding columns
            $table->dropColumn(['logo_url', 'primary_color', 'secondary_color', 'business_description', 'facebook_url', 'instagram_url', 'business_hours']);

            // Registration columns
            $table->dropIndex('shops_registration_status_idx');
            $table->dropColumn(['registration_owner_name', 'registration_owner_email', 'registration_status', 'registration_rejection_reason', 'registration_approved_at', 'registration_rejected_at']);
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            // Domain
            $table->string('custom_domain', 100)->nullable()->unique();
            $table->string('domain_status', 30)->default('UNVERIFIED');
            $table->string('verification_token', 80)->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->dateTime('last_checked_at')->nullable();
            $table->index('domain_status', 'shops_domain_status_idx');
            $table->unique('verification_token', 'shops_verification_token_unq');

            // Branding
            $table->string('logo_url', 255)->nullable();
            $table->string('primary_color', 7)->default('#3B82F6');
            $table->string('secondary_color', 7)->default('#10B981');
            $table->text('business_description')->nullable();
            $table->string('facebook_url', 255)->nullable();
            $table->string('instagram_url', 255)->nullable();
            $table->json('business_hours')->nullable();

            // Registration
            $table->string('registration_owner_name', 100)->nullable();
            $table->string('registration_owner_email', 100)->nullable();
            $table->string('registration_status', 30)->default('SYSTEM_PROVISIONED');
            $table->text('registration_rejection_reason')->nullable();
            $table->dateTime('registration_approved_at')->nullable();
            $table->dateTime('registration_rejected_at')->nullable();
            $table->index('registration_status', 'shops_registration_status_idx');
        });
    }
};
```

- [ ] **Step 2: Update Shop model — add relationships, remove moved fillable fields**

Replace `Backend/app/Models/Shop.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shop extends Model
{
    protected $primaryKey = 'shop_id';

    protected $fillable = [
        'shop_name',
        'shop_description',
        'phone',
        'address',
        'contact_email',
        'contact_phone',
        'invitation_code',
        'subdomain',
        'shop_status_id_fk',
    ];

    public function status(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(ShopStatus::class, 'shop_status_id_fk', 'shop_status_id');
    }

    public function domain(): HasOne
    {
        return $this->hasOne(ShopDomain::class, 'shop_id_fk', 'shop_id');
    }

    public function branding(): HasOne
    {
        return $this->hasOne(ShopBranding::class, 'shop_id_fk', 'shop_id');
    }

    public function registration(): HasOne
    {
        return $this->hasOne(ShopRegistration::class, 'shop_id_fk', 'shop_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'shop_id_fk', 'shop_id');
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
```

- [ ] **Step 3: Update ShopBrandingController to use shop_branding table**

In `Backend/app/Http/Controllers/Api/ShopBrandingController.php`, replace any reads/writes from the `shops` table for branding columns with reads/writes from `shop_branding`:

```php
// Reading branding:
$branding = DB::table('shop_branding')->where('shop_id_fk', $shopId)->first();

// Updating branding:
DB::table('shop_branding')->where('shop_id_fk', $shopId)->update([
    'logo_url'             => $data['logo_url'] ?? $branding->logo_url,
    'primary_color'        => $data['primary_color'] ?? $branding->primary_color,
    'secondary_color'      => $data['secondary_color'] ?? $branding->secondary_color,
    'business_description' => $data['business_description'] ?? $branding->business_description,
    'facebook_url'         => $data['facebook_url'] ?? $branding->facebook_url,
    'instagram_url'        => $data['instagram_url'] ?? $branding->instagram_url,
    'business_hours'       => isset($data['business_hours']) ? json_encode($data['business_hours']) : $branding->business_hours,
    'updated_at'           => now(),
]);
```

- [ ] **Step 4: Update DomainOnboardingController to use shop_domains table**

In `Backend/app/Http/Controllers/Api/DomainOnboardingController.php`, replace all reads/writes of domain-lifecycle columns on `shops` with `shop_domains`:

```php
// Reading:
$domain = DB::table('shop_domains')->where('shop_id_fk', $shopId)->first();

// Updating:
DB::table('shop_domains')->where('shop_id_fk', $shopId)->update([
    'custom_domain'      => $data['custom_domain'],
    'domain_status'      => 'PENDING_VERIFICATION',
    'verification_token' => Str::random(64),
    'updated_at'         => now(),
]);
```

- [ ] **Step 5: Update ShopRegistrationController to use shop_registrations table**

In `Backend/app/Http/Controllers/Api/ShopRegistrationController.php`, move all registration-related reads/writes from `shops` to `shop_registrations`. When creating a new shop registration, insert a row into `shop_registrations` after inserting into `shops`:

```php
$shopId = DB::table('shops')->insertGetId([...core fields only...]);
DB::table('shop_registrations')->insert([
    'shop_id_fk'          => $shopId,
    'owner_name'          => $data['owner_name'],
    'owner_email'         => $data['owner_email'],
    'registration_status' => 'PENDING',
    'created_at'          => now(),
    'updated_at'          => now(),
]);
// Also create domain and branding rows with defaults:
DB::table('shop_domains')->insert(['shop_id_fk' => $shopId, 'created_at' => now(), 'updated_at' => now()]);
DB::table('shop_branding')->insert(['shop_id_fk' => $shopId, 'created_at' => now(), 'updated_at' => now()]);
```

- [ ] **Step 6: Update SuperAdminController — registration approval queries**

In `Backend/app/Http/Controllers/Api/SuperAdminController.php`, find all queries that read or write `registration_status`, `registration_approved_at`, `registration_rejected_at`, `registration_rejection_reason`, `registration_owner_name`, `registration_owner_email` on the `shops` table and redirect them to `shop_registrations`:

```php
// Approval:
DB::table('shop_registrations')->where('shop_id_fk', $shopId)->update([
    'registration_status' => 'APPROVED',
    'approved_at'         => now(),
    'updated_at'          => now(),
]);

// Listing pending:
DB::table('shops')
    ->join('shop_registrations', 'shop_registrations.shop_id_fk', '=', 'shops.shop_id')
    ->where('shop_registrations.registration_status', 'PENDING')
    ->select('shops.*', 'shop_registrations.owner_name', 'shop_registrations.owner_email', 'shop_registrations.registration_status')
    ->get();
```

- [ ] **Step 7: Run the drop migration**

```bash
php artisan migrate --path=database/migrations/2026_05_14_000009_drop_decomposed_columns_from_shops.php
```

Expected: `Migrated`.

- [ ] **Step 8: Boot-test the application**

```bash
php artisan route:list 2>&1 | tail -5
php artisan tinker --execute="App\Models\Shop::with(['domain','branding','registration'])->first();"
```

Expected: Shop with loaded relationships, no null errors.

- [ ] **Step 9: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000009_drop_decomposed_columns_from_shops.php \
        Backend/app/Models/Shop.php \
        Backend/app/Http/Controllers/Api/ShopBrandingController.php \
        Backend/app/Http/Controllers/Api/DomainOnboardingController.php \
        Backend/app/Http/Controllers/Api/ShopRegistrationController.php \
        Backend/app/Http/Controllers/Api/SuperAdminController.php
git commit -m "refactor(db): drop decomposed columns from shops, wire models and controllers (5NF)"
```

---

## Task 10: Deploy and Verify

- [ ] **Step 1: Run full migration suite on staging**

```bash
php artisan migrate --force 2>&1
```

Expected: All migrations run without error.

- [ ] **Step 2: Verify key queries return correct results**

```bash
php artisan tinker --execute="
echo 'Ratings: ' . DB::table('ratings')->count() . PHP_EOL;
echo 'Shop domains: ' . DB::table('shop_domains')->count() . PHP_EOL;
echo 'Shop branding: ' . DB::table('shop_branding')->count() . PHP_EOL;
echo 'Shop registrations: ' . DB::table('shop_registrations')->count() . PHP_EOL;
echo 'SJM no shop col: ' . (Schema::hasColumn('service_job_mechanics','shop_id_fk') ? 'FAIL' : 'OK') . PHP_EOL;
echo 'No subtotal col: ' . (Schema::hasColumn('sale_items','subtotal') ? 'FAIL' : 'OK') . PHP_EOL;
"
```

All should show OK / matching counts.

- [ ] **Step 3: Deploy**

```bash
bash deploy.sh
```

---

## Self-Review

| Requirement | Covered by |
|---|---|
| Drop `users.full_name/email/google_id/password_hash` (duplicate identity) | Task 0 ⚠️ NOT YET IMPLEMENTED |
| Drop `service_job_parts.subtotal` | Task 1 |
| Drop `sale_items.subtotal` | Task 1 |
| Drop `sales.net_amount` | Task 1 |
| Drop `service_jobs.assigned_mechanic_id_fk` | Task 2 |
| Drop `service_job_mechanics.shop_id_fk` | Task 3 |
| Drop `subscription_payments.shop_id_fk` | Task 4 |
| Drop `subscription_invoices.shop_id_fk` | Task 4 |
| Drop `ratings.customer_id_fk` | Task 5 |
| Drop `ratings.shop_id_fk` | Task 5 |
| Extract shop_domains (5NF) | Tasks 6, 9 |
| Extract shop_branding (5NF) | Tasks 7, 9 |
| Extract shop_registrations (5NF) | Tasks 8, 9 |
| Deploy | Task 10 |
