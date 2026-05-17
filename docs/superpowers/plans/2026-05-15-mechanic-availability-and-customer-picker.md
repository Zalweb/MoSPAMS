# Mechanic Availability & Customer Mechanic Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-sync mechanic busy/available status as jobs move through the pipeline, and let customers browse mechanic availability + ratings and pick a preferred mechanic when booking.

**Architecture:** Three layers: (1) backend status sync hooks inside existing job status transition methods, (2) a new customer-facing `GET /api/customer/mechanics` endpoint returning availability + ratings aggregated from the `ratings` table, (3) a mechanic picker UI in `BookService.tsx` that shows availability badges and star ratings. The `service_jobs.assigned_mechanic_id_fk` column (already exists) stores the customer's preference, which the owner sees when confirming the booking.

**Tech Stack:** Laravel 11 / PHP 8.3, MySQL, React + TypeScript + Vite, Lucide icons, Tailwind CSS, existing `apiGet` / `apiMutation` helpers.

---

## Existing Code Context (read before touching anything)

### Status codes in the database
- `mechanic_statuses.status_code`: `available`, `busy`, `on_leave`
- `service_job_statuses.status_code`: `pending` → `booked_confirmed` → `in_progress` → `work_done` → `completed` | `cancelled`

### Status transition entry points
| Transition | File | Method |
|---|---|---|
| `pending` → `booked_confirmed` | `MospamsController` | `startService` |
| `booked_confirmed` → `in_progress` | `MechanicController` | `updateJobStatus` (action=start) |
| `in_progress` → `work_done` | `MechanicController` | `updateJobStatus` (action=complete) |
| `work_done` → `completed` | `MospamsController` | `billService` |
| any → `cancelled` | `MospamsController` | `cancelService` |

### Known bug to fix
`MospamsController::storeMechanic` (line ~2001) calls:
```php
DB::table('mechanic_statuses')->where('status_code', 'active')->value('mechanic_status_id')
```
But `active` does not exist — the seeder only inserts `available`, `busy`, `on_leave`. This returns `null`, so new mechanics are created with `mechanic_status_id_fk = NULL`. Fix: change `'active'` → `'available'`.

### Ratings table
```
ratings: id, service_job_id_fk, mechanic_id_fk, customer_id_fk, shop_id_fk, rating (1-5), comment, timestamps
```

### service_jobs table
Has `assigned_mechanic_id_fk` (nullable FK → mechanics). This is where we store the customer's preferred mechanic. The multi-mechanic junction is `service_job_mechanics` (used for actual assignment by owner). The customer preference goes in `assigned_mechanic_id_fk` so owner can see it at a glance.

---

## File Map

| File | Change |
|---|---|
| `Backend/app/Http/Controllers/Api/MechanicController.php` | Add busy/available sync in `updateJobStatus` |
| `Backend/app/Http/Controllers/Api/MospamsController.php` | Add available sync in `cancelService` + `billService`; fix `storeMechanic` bug |
| `Backend/app/Http/Controllers/Api/CustomerController.php` | Add `mechanics()` method; update `createService` to accept `preferred_mechanic_id` |
| `Backend/routes/api.php` | Add `GET /customer/mechanics` route |
| `Frontend/src/features/customers/pages/BookService.tsx` | Add mechanic picker UI |

---

## Task 1: Backend — Auto mechanic busy/available status sync

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MechanicController.php`
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Test: `Backend/tests/Feature/MechanicAvailabilityTest.php`

### Background

The `mechanics` table has a `mechanic_status_id_fk` that references `mechanic_statuses`. We need to:
1. Set all mechanics assigned to a job to **`busy`** when that job transitions to `in_progress`
2. For each mechanic on a job transitioning to `work_done`, `completed`, or `cancelled`: check if they still have **any other** `in_progress` jobs. If not, set them back to **`available`**. (If they do, leave them `busy`.)

We also fix the `storeMechanic` bug here because it's in the same file.

- [ ] **Step 1: Write the failing test**

Create `Backend/tests/Feature/MechanicAvailabilityTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MechanicAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private int $shopId;
    private int $mechId;
    private int $jobId;

    protected function setUp(): void
    {
        parent::setUp();
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        // Seed required lookup rows
        $availableId = DB::table('mechanic_statuses')->insertGetId(['status_code' => 'available', 'status_name' => 'Available']);
        $busyId      = DB::table('mechanic_statuses')->insertGetId(['status_code' => 'busy',      'status_name' => 'Busy']);
        $inProgId    = DB::table('service_job_statuses')->insertGetId(['status_code' => 'in_progress', 'status_name' => 'In Progress']);
        $workDoneId  = DB::table('service_job_statuses')->insertGetId(['status_code' => 'work_done',   'status_name' => 'Work Done']);
        $cancelledId = DB::table('service_job_statuses')->insertGetId(['status_code' => 'cancelled',   'status_name' => 'Cancelled']);
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->shopId = 1;
        $this->mechId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'             => $this->shopId,
            'full_name'              => 'Test Mechanic',
            'mechanic_status_id_fk'  => $availableId,
        ]);
        // job already in booked_confirmed to allow start action
        $confirmedId = DB::table('service_job_statuses')->insertGetId(['status_code' => 'booked_confirmed', 'status_name' => 'Booked & Confirmed']);
        $this->jobId = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => 1,
            'created_by_fk'            => 1,
            'service_job_status_id_fk' => $confirmedId,
            'job_date'                 => now()->toDateString(),
        ]);
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $this->jobId,
            'mechanic_id_fk' => $this->mechId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);
    }

    public function test_mechanic_becomes_busy_when_job_starts(): void
    {
        // Simulate what updateJobStatus(action=start) does
        $busyId = DB::table('mechanic_statuses')->where('status_code', 'busy')->value('mechanic_status_id');
        $inProgId = DB::table('service_job_statuses')->where('status_code', 'in_progress')->value('service_job_status_id');

        DB::table('service_jobs')->where('job_id', $this->jobId)->update(['service_job_status_id_fk' => $inProgId]);
        // Call the helper we will add
        \App\Support\MechanicStatusSync::markBusyForJob($this->jobId);

        $statusCode = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanic_id', $this->mechId)
            ->value('status_code');
        $this->assertEquals('busy', $statusCode);
    }

    public function test_mechanic_becomes_available_when_last_job_ends(): void
    {
        $busyId = DB::table('mechanic_statuses')->where('status_code', 'busy')->value('mechanic_status_id');
        DB::table('mechanics')->where('mechanic_id', $this->mechId)->update(['mechanic_status_id_fk' => $busyId]);

        // Call the helper we will add
        \App\Support\MechanicStatusSync::releaseForJob($this->jobId, $this->shopId);

        $statusCode = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanic_id', $this->mechId)
            ->value('status_code');
        $this->assertEquals('available', $statusCode);
    }

    public function test_mechanic_stays_busy_when_another_job_is_in_progress(): void
    {
        $busyId   = DB::table('mechanic_statuses')->where('status_code', 'busy')->value('mechanic_status_id');
        $inProgId = DB::table('service_job_statuses')->where('status_code', 'in_progress')->value('service_job_status_id');
        DB::table('mechanics')->where('mechanic_id', $this->mechId)->update(['mechanic_status_id_fk' => $busyId]);

        // Create a second in-progress job for this mechanic
        $job2 = DB::table('service_jobs')->insertGetId([
            'shop_id_fk'               => $this->shopId,
            'customer_id_fk'           => 1,
            'created_by_fk'            => 1,
            'service_job_status_id_fk' => $inProgId,
            'job_date'                 => now()->toDateString(),
        ]);
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $job2,
            'mechanic_id_fk' => $this->mechId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        // Try to release mechanic from the first job — should stay busy
        \App\Support\MechanicStatusSync::releaseForJob($this->jobId, $this->shopId);

        $statusCode = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanic_id', $this->mechId)
            ->value('status_code');
        $this->assertEquals('busy', $statusCode);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Backend && php artisan test tests/Feature/MechanicAvailabilityTest.php --stop-on-failure
```
Expected: FAIL — `App\Support\MechanicStatusSync` not found.

- [ ] **Step 3: Create the MechanicStatusSync helper class**

Create `Backend/app/Support/MechanicStatusSync.php`:

```php
<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class MechanicStatusSync
{
    public static function markBusyForJob(int $jobId): void
    {
        $busyId = DB::table('mechanic_statuses')
            ->where('status_code', 'busy')
            ->value('mechanic_status_id');

        if (! $busyId) return;

        $mechanicIds = DB::table('service_job_mechanics')
            ->where('job_id_fk', $jobId)
            ->pluck('mechanic_id_fk');

        if ($mechanicIds->isEmpty()) return;

        DB::table('mechanics')
            ->whereIn('mechanic_id', $mechanicIds)
            ->update(['mechanic_status_id_fk' => $busyId, 'updated_at' => now()]);
    }

    public static function releaseForJob(int $jobId, int $shopId): void
    {
        $availableId = DB::table('mechanic_statuses')
            ->where('status_code', 'available')
            ->value('mechanic_status_id');

        $inProgressStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'in_progress')
            ->value('service_job_status_id');

        if (! $availableId || ! $inProgressStatusId) return;

        $mechanicIds = DB::table('service_job_mechanics')
            ->where('job_id_fk', $jobId)
            ->pluck('mechanic_id_fk');

        foreach ($mechanicIds as $mechId) {
            // Check if this mechanic still has other in-progress jobs
            $stillBusy = DB::table('service_job_mechanics')
                ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
                ->where('service_job_mechanics.mechanic_id_fk', $mechId)
                ->where('service_jobs.shop_id_fk', $shopId)
                ->where('service_jobs.service_job_status_id_fk', $inProgressStatusId)
                ->where('service_jobs.job_id', '!=', $jobId)
                ->exists();

            if (! $stillBusy) {
                DB::table('mechanics')
                    ->where('mechanic_id', $mechId)
                    ->update(['mechanic_status_id_fk' => $availableId, 'updated_at' => now()]);
            }
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Backend && php artisan test tests/Feature/MechanicAvailabilityTest.php
```
Expected: 3 tests PASS.

- [ ] **Step 5: Hook MechanicStatusSync into MechanicController::updateJobStatus**

In `Backend/app/Http/Controllers/Api/MechanicController.php`, add the import at the top of the file after `use Illuminate\Support\Facades\DB;`:

```php
use App\Support\MechanicStatusSync;
```

In `updateJobStatus`, after the `DB::transaction` block for `action === 'start'` (around line 119), add a call after the transaction completes:

```php
// Inside the 'start' action block, AFTER the DB::transaction closure
DB::transaction(function () use ($job, $jobData, $inProgressId, $request) {
    DB::table('service_jobs')
        ->where('job_id', $job)
        ->update([
            'service_job_status_id_fk' => $inProgressId,
            'updated_at'               => now(),
        ]);
    // ... existing notification code ...
});

MechanicStatusSync::markBusyForJob($job);
```

In the `action === 'complete'` block, after the `DB::transaction` closure, add:

```php
MechanicStatusSync::releaseForJob($job, $jobData->shop_id_fk);
```

The exact edit is — find this block in `updateJobStatus`:

```php
        } elseif ($action === 'complete') {
            if ($jobData->status_code !== 'in_progress') {
                return response()->json(['message' => 'Only in-progress jobs can be completed.'], 422);
            }
```

After the `DB::transaction(function () use (...) { ... });` in the complete branch, before `return $this->jobDetails(...)`, add:

```php
            MechanicStatusSync::releaseForJob($job, $jobData->shop_id_fk);
```

- [ ] **Step 6: Hook MechanicStatusSync into MospamsController**

In `Backend/app/Http/Controllers/Api/MospamsController.php`, add the import (find the existing `use` block near the top):

```php
use App\Support\MechanicStatusSync;
```

In `cancelService`, after the `DB::transaction` closure completes (after line ~986), add:

```php
        MechanicStatusSync::releaseForJob($service, $this->shopId());
```

In `billService`, after the `DB::transaction` closure (after line ~1249), add:

```php
        MechanicStatusSync::releaseForJob($service, $this->shopId());
```

- [ ] **Step 7: Fix storeMechanic bug**

In `MospamsController::storeMechanic`, change the status lookup from `'active'` to `'available'` and update the returned statusCode:

Find (around line 2001):
```php
        $activeStatusId = DB::table('mechanic_statuses')->where('status_code', 'active')->value('mechanic_status_id');
```

Replace with:
```php
        $activeStatusId = DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');
```

Also fix the return value a few lines below — change `'statusCode' => 'active'` to `'statusCode' => 'available'` and `'status' => 'Active'` to `'status' => 'Available'`.

- [ ] **Step 8: Commit**

```bash
git add Backend/app/Support/MechanicStatusSync.php \
        Backend/app/Http/Controllers/Api/MechanicController.php \
        Backend/app/Http/Controllers/Api/MospamsController.php \
        Backend/tests/Feature/MechanicAvailabilityTest.php
git commit -m "feat: auto-sync mechanic busy/available status on job transitions"
```

---

## Task 2: Backend — Customer mechanic browsing endpoint + preferred mechanic on booking

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/CustomerController.php`
- Modify: `Backend/routes/api.php`
- Test: `Backend/tests/Feature/CustomerMechanicEndpointTest.php`

### Background

We need two things:
1. `GET /api/customer/mechanics` — returns all shop mechanics with availability, avg rating, and completed job count, so customers can make an informed pick.
2. `POST /api/customer/services` now accepts an optional `preferred_mechanic_id` (integer), validated to belong to the shop, stored in `service_jobs.assigned_mechanic_id_fk`.

The owner already sees `assigned_mechanic_id_fk` displayed in the service list (we'll add it to the services response shape in this task too so the owner can see the preference).

- [ ] **Step 1: Write the failing test**

Create `Backend/tests/Feature/CustomerMechanicEndpointTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerMechanicEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_browse_mechanics_with_availability_and_ratings(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $availableId = DB::table('mechanic_statuses')->insertGetId(['status_code' => 'available', 'status_name' => 'Available']);
        $shopId = DB::table('shops')->insertGetId(['shop_name' => 'Test Shop', 'subdomain' => 'test']);
        $mechId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $shopId,
            'full_name'             => 'Juan',
            'mechanic_status_id_fk' => $availableId,
        ]);
        // Insert a rating
        DB::table('ratings')->insert([
            'service_job_id_fk' => 1,
            'mechanic_id_fk'    => $mechId,
            'customer_id_fk'    => 1,
            'shop_id_fk'        => $shopId,
            'rating'            => 5,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Authenticate as a customer belonging to this shop
        $user = $this->createCustomerUser($shopId);
        $response = $this->actingAs($user)->getJson('/api/customer/mechanics');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'statusCode', 'statusName', 'avgRating', 'completedJobs']]]);

        $mechanic = collect($response->json('data'))->first();
        $this->assertEquals('available', $mechanic['statusCode']);
        $this->assertEquals(5.0, $mechanic['avgRating']);
    }

    public function test_create_service_accepts_preferred_mechanic_id(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        $availableId = DB::table('mechanic_statuses')->insertGetId(['status_code' => 'available', 'status_name' => 'Available']);
        $shopId = 1;
        $mechId = DB::table('mechanics')->insertGetId([
            'shop_id_fk'            => $shopId,
            'full_name'             => 'Preferred',
            'mechanic_status_id_fk' => $availableId,
        ]);
        $pendingId = DB::table('service_job_statuses')->insertGetId(['status_code' => 'pending', 'status_name' => 'Pending']);
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $user = $this->createCustomerUser($shopId);
        $response = $this->actingAs($user)->postJson('/api/customer/services', [
            'motorcycle_model'      => 'Honda Click 150i',
            'service_type'          => 'Oil Change',
            'preferred_mechanic_id' => $mechId,
        ]);

        $response->assertStatus(200);
        $jobId = $response->json('id');
        $this->assertEquals($mechId, DB::table('service_jobs')->where('job_id', $jobId)->value('assigned_mechanic_id_fk'));
    }

    private function createCustomerUser(int $shopId): object
    {
        // Minimal helper — returns a mock user; adjust to your actual auth setup
        return (object) ['user_id' => 1, 'shop_id_fk' => $shopId, 'account_id_fk' => 1];
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Backend && php artisan test tests/Feature/CustomerMechanicEndpointTest.php --stop-on-failure
```
Expected: FAIL — route `GET /api/customer/mechanics` not found.

- [ ] **Step 3: Add the mechanics() method to CustomerController**

In `Backend/app/Http/Controllers/Api/CustomerController.php`, add this method before `serviceTypes()`:

```php
    public function mechanics(Request $request): JsonResponse
    {
        $user   = auth()->user();
        $shopId = $user->shop_id_fk;

        $completedStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'completed')
            ->value('service_job_status_id');

        $mechanics = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanics.shop_id_fk', $shopId)
            ->orderBy('mechanics.full_name')
            ->select(
                'mechanics.mechanic_id',
                'mechanics.full_name',
                'mechanic_statuses.status_code',
                'mechanic_statuses.status_name'
            )
            ->get();

        $mechanicIds = $mechanics->pluck('mechanic_id');

        // Average rating per mechanic
        $ratings = DB::table('ratings')
            ->whereIn('mechanic_id_fk', $mechanicIds)
            ->where('shop_id_fk', $shopId)
            ->selectRaw('mechanic_id_fk, AVG(rating) as avg_rating, COUNT(*) as rating_count')
            ->groupBy('mechanic_id_fk')
            ->get()
            ->keyBy('mechanic_id_fk');

        // Completed jobs per mechanic
        $completedJobs = DB::table('service_job_mechanics')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
            ->whereIn('service_job_mechanics.mechanic_id_fk', $mechanicIds)
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_jobs.service_job_status_id_fk', $completedStatusId)
            ->selectRaw('mechanic_id_fk, COUNT(*) as completed')
            ->groupBy('mechanic_id_fk')
            ->get()
            ->keyBy('mechanic_id_fk');

        $data = $mechanics->map(function ($row) use ($ratings, $completedJobs) {
            $r = $ratings->get($row->mechanic_id);
            $c = $completedJobs->get($row->mechanic_id);
            return [
                'id'            => (string) $row->mechanic_id,
                'name'          => $row->full_name,
                'statusCode'    => $row->status_code,
                'statusName'    => $row->status_name,
                'avgRating'     => $r ? round((float) $r->avg_rating, 1) : null,
                'ratingCount'   => $r ? (int) $r->rating_count : 0,
                'completedJobs' => $c ? (int) $c->completed : 0,
            ];
        });

        return response()->json(['data' => $data]);
    }
```

- [ ] **Step 4: Update createService to accept preferred_mechanic_id**

In `CustomerController::createService`, update the validation rules from:

```php
        $request->validate([
            'motorcycle_model' => ['required', 'string', 'max:150'],
            'service_type'     => ['required', 'string', 'max:100'],
            'notes'            => ['nullable', 'string', 'max:500'],
            'vehicle_id'       => ['nullable', 'integer'],
        ]);
```

To:

```php
        $request->validate([
            'motorcycle_model'      => ['required', 'string', 'max:150'],
            'service_type'          => ['required', 'string', 'max:100'],
            'notes'                 => ['nullable', 'string', 'max:500'],
            'vehicle_id'            => ['nullable', 'integer'],
            'preferred_mechanic_id' => ['nullable', 'integer'],
        ]);
```

In the `DB::transaction` closure, validate shop ownership of the preferred mechanic and use it as `assigned_mechanic_id_fk`. Replace the `$jobId = DB::table('service_jobs')->insertGetId([...])` block with:

```php
            // Validate preferred mechanic belongs to this shop
            $preferredMechanicId = null;
            if ($request->preferred_mechanic_id) {
                $exists = DB::table('mechanics')
                    ->where('mechanic_id', (int) $request->preferred_mechanic_id)
                    ->where('shop_id_fk', $user->shop_id_fk)
                    ->exists();
                $preferredMechanicId = $exists ? (int) $request->preferred_mechanic_id : null;
            }

            $jobId = DB::table('service_jobs')->insertGetId([
                'shop_id_fk'               => $user->shop_id_fk,
                'customer_id_fk'           => $customer->customer_id,
                'vehicle_id_fk'            => $request->vehicle_id ?: null,
                'assigned_mechanic_id_fk'  => $preferredMechanicId,
                'created_by_fk'            => $user->user_id,
                'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id'),
                'job_date'                 => now()->toDateString(),
                'motorcycle_model'         => $request->motorcycle_model,
                'notes'                    => $request->notes,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
```

- [ ] **Step 5: Register the route**

In `Backend/routes/api.php`, add inside the `shop.active` / `tenant.user` / `tenant.token` group, after the existing customer routes (around line 190):

```php
        Route::get('/customer/mechanics', [CustomerController::class, 'mechanics']);
```

- [ ] **Step 6: Run tests**

```bash
cd Backend && php artisan test tests/Feature/CustomerMechanicEndpointTest.php
```
Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add Backend/app/Http/Controllers/Api/CustomerController.php \
        Backend/routes/api.php \
        Backend/tests/Feature/CustomerMechanicEndpointTest.php
git commit -m "feat: add customer mechanic browsing endpoint and preferred mechanic on booking"
```

---

## Task 3: Backend — Show preferred mechanic preference on owner's service list

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (the `serviceById` and `services` response shaping)

### Background

The owner needs to see which mechanic the customer preferred when they look at a pending booking. The `service_jobs.assigned_mechanic_id_fk` column stores this. We need to include `preferredMechanicName` in the service response so the owner can honour the request.

- [ ] **Step 1: Find the serviceById helper method**

```bash
cd Backend && grep -n "serviceById\|function serviceById" app/Http/Controllers/Api/MospamsController.php
```
Expected: finds the `serviceById` private method around line 2300+.

- [ ] **Step 2: Update serviceById to include preferredMechanicName**

Find the `serviceById` method. It contains a query that selects `service_jobs.*`. Add a LEFT JOIN for the preferred mechanic and include `preferredMechanicName` in the shape.

Find this part of `serviceById` (the main query building the response array):

```php
            'mechanics'       =>
```

Just before that line, the response array is assembled. Locate where `$row->job_id` is used and the full response is built. Find the query that fetches the job and add a left join to get the preferred mechanic name:

After the existing joins in `serviceById` query, add:

```php
            ->leftJoin('mechanics as preferred_mech', 'preferred_mech.mechanic_id', '=', 'service_jobs.assigned_mechanic_id_fk')
```

And in the response array, add after the `'notes'` field:

```php
            'preferredMechanic' => $row->preferred_mech_name ? [
                'id'   => (string) $row->assigned_mechanic_id_fk,
                'name' => $row->preferred_mech_name,
            ] : null,
```

And in the SELECT, add `'preferred_mech.full_name as preferred_mech_name'`.

> **Note:** The exact line numbers shift as the file grows. Use search to find the `serviceById` method, then add the join and field there. The `services()` paginated list method has a similar shape — apply the same join and field there too (search for the method that queries `service_jobs` for the paginated list response).

- [ ] **Step 3: Update ServiceRecord TypeScript type**

In `Frontend/src/shared/types/index.ts`, add to `ServiceRecord`:

```typescript
  preferredMechanic?: { id: string; name: string } | null;
```

- [ ] **Step 4: Show preferred mechanic in ServicesPage**

In `Frontend/src/features/services/pages/ServicesPage.tsx`, in the service card (where mechanic names are displayed around line 352), add after the mechanics display:

```tsx
                    {service.preferredMechanic && (service.mechanics ?? []).length === 0 && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        ★ Customer prefers: {service.preferredMechanic.name}
                      </p>
                    )}
```

This shows the preference only while no mechanic has been assigned yet (pending state), so staff can honour it when confirming.

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php \
        Frontend/src/shared/types/index.ts \
        Frontend/src/features/services/pages/ServicesPage.tsx
git commit -m "feat: show customer preferred mechanic on owner service list"
```

---

## Task 4: Frontend — Customer mechanic picker in BookService

**Files:**
- Modify: `Frontend/src/features/customers/pages/BookService.tsx`

### Background

The customer booking page needs a mechanic selection step. UI rules:
- Fetch `GET /api/customer/mechanics` on mount
- Show a "Who should work on your bike?" section
- First option is always **"Assign me anyone"** (default, sends `null`)
- Each mechanic card shows: name, availability badge (color-coded), star rating (or "No ratings yet"), completed jobs count
- Availability badge colors: `available` → green, `busy` → amber, `on_leave` → gray
- Only `available` mechanics are visually highlighted; `busy` and `on_leave` are dimmed but still selectable (customer may have a fav who's currently busy)
- On submit, pass `preferred_mechanic_id: selectedMechanicId` (integer or null)

- [ ] **Step 1: Add MechanicOption interface and state**

At the top of `BookService.tsx`, add the interface after the existing `Vehicle` interface:

```tsx
interface MechanicOption {
  id: string;
  name: string;
  statusCode: 'available' | 'busy' | 'on_leave';
  statusName: string;
  avgRating: number | null;
  ratingCount: number;
  completedJobs: number;
}
```

Inside the component, add state after `const [isOpen, setIsOpen] = useState(false);`:

```tsx
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null); // null = "anyone"
```

- [ ] **Step 2: Fetch mechanics on mount**

Inside the `useEffect` that already fetches service types and vehicles, add:

```tsx
    apiGet<{ data: MechanicOption[] }>('/api/customer/mechanics')
      .then(r => setMechanics(r.data))
      .catch(() => {});
```

- [ ] **Step 3: Pass preferred_mechanic_id on submit**

In `handleSubmit`, update the `apiMutation` call body from:

```tsx
      await apiMutation('/api/customer/services', 'POST', {
        motorcycle_model: motorcycleModel.trim(),
        service_type: serviceType,
        notes: notes.trim() || null,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
      });
```

To:

```tsx
      await apiMutation('/api/customer/services', 'POST', {
        motorcycle_model: motorcycleModel.trim(),
        service_type: serviceType,
        notes: notes.trim() || null,
        vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
        preferred_mechanic_id: selectedMechanicId ? parseInt(selectedMechanicId, 10) : null,
      });
```

- [ ] **Step 4: Add the mechanic picker section to the form**

In the JSX, after the Notes textarea and before the submit button, add the mechanic picker section:

```tsx
          {mechanics.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                Preferred Mechanic (optional)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {/* "Anyone" option */}
                <button
                  type="button"
                  onClick={() => setSelectedMechanicId(null)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedMechanicId === null
                      ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/10 ring-2 ring-[rgb(var(--color-primary-rgb))]/20'
                      : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">Assign me anyone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shop will assign the best available</p>
                </button>

                {mechanics.map(m => {
                  const badgeColor =
                    m.statusCode === 'available' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                    m.statusCode === 'busy'      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                                                   'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
                  const isSelected = selectedMechanicId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMechanicId(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/10 ring-2 ring-[rgb(var(--color-primary-rgb))]/20'
                          : m.statusCode !== 'available'
                            ? 'border-border/30 bg-muted/20 opacity-60 hover:opacity-80'
                            : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-semibold text-foreground leading-tight">{m.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${badgeColor}`}>
                          {m.statusName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.avgRating !== null ? (
                          <span className="text-xs text-amber-400 font-semibold">
                            {'★'.repeat(Math.round(m.avgRating))}{'☆'.repeat(5 - Math.round(m.avgRating))} {m.avgRating}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No ratings yet</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.completedJobs} jobs done</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
```

- [ ] **Step 5: Verify the UI renders correctly**

Manually check in browser (customer role):
1. `/dashboard/customer/book` shows the mechanic picker if any mechanics exist
2. "Assign me anyone" is selected by default (highlighted)
3. Available mechanics show a green badge; busy show amber
4. Clicking a mechanic card selects it (blue ring)
5. Submitting sends the booking — check network tab that `preferred_mechanic_id` is in the request body
6. On the owner's Services page, a pending booking with a preference shows "★ Customer prefers: [Name]"

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/features/customers/pages/BookService.tsx
git commit -m "feat: add mechanic availability picker to customer booking page"
```

---

## Task 5: Deploy

- [ ] **Step 1: Run all new tests**

```bash
cd Backend && php artisan test tests/Feature/MechanicAvailabilityTest.php tests/Feature/CustomerMechanicEndpointTest.php
```
Expected: 5 tests PASS.

- [ ] **Step 2: Deploy**

```bash
cd .. && bash deploy.sh
```

Expected: "Backend is live on api.mospams.shop"

---

## Self-Review

**Spec coverage check:**
- ✅ Mechanics can't implicitly be assigned when busy — auto-status sync marks them `busy` on job start
- ✅ Customers see availability (`available`/`busy`/`on_leave`) on mechanic cards
- ✅ Customers can choose a preferred mechanic when booking
- ✅ Customers see mechanic ratings on the picker
- ✅ "Assign me anyone" option is the default (null preference)
- ✅ Owner sees customer preference on pending service card
- ✅ `storeMechanic` bug fixed (was using non-existent `'active'` status code)

**Type consistency check:**
- `MechanicOption.id` is `string` in TS; `preferred_mechanic_id` is cast to `parseInt` before sending → backend receives integer ✅
- `MechanicStatusSync::releaseForJob(int $jobId, int $shopId)` — called everywhere with the correct shop ID from `$this->shopId()` or `$jobData->shop_id_fk` ✅
- `preferredMechanic` on `ServiceRecord` is `{ id: string; name: string } | null | undefined` — matches the nullable backend field ✅
