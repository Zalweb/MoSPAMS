# Service Job Flow Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-form status dropdown on service jobs with a strict button-driven state machine (Pending → In Progress → Completed/Cancelled) including mechanic part requests, staff confirmation, and 12-hour auto-cancel.

**Architecture:** New action endpoints handle status transitions; the existing `updateService` PATCH loses its `status` field. A new `status`/`requested_by_fk` column pair on `service_job_parts` distinguishes mechanic-requested parts from staff-confirmed ones. Frontend cards show contextual buttons per status instead of a dropdown.

**Tech Stack:** Laravel 11 (PHP), MySQL, React + TypeScript + Vite, Zod, react-hook-form, framer-motion

---

## File Map

**Backend — new files:**
- `Backend/database/migrations/YYYY_MM_DD_add_status_to_service_job_parts.php`
- `Backend/app/Console/Commands/CancelStalePendingServicesCommand.php`

**Backend — modified files:**
- `Backend/app/Http/Controllers/Api/MospamsController.php` — new action methods (`startService`, `cancelService`, `addPartToService`, `confirmServicePart`, `removeServicePart`); updated `serviceResource`, `billService`, `updateService`
- `Backend/app/Http/Controllers/Api/MechanicController.php` — `addPartToJob` changed to `requested` + no stock deduction
- `Backend/routes/api.php` — register five new service routes
- `Backend/routes/console.php` — register hourly schedule for `CancelStalePendingServicesCommand`

**Backend — test files:**
- `Backend/tests/Feature/ServiceFlowTest.php` — add new test methods

**Frontend — modified files:**
- `Frontend/src/shared/types/index.ts` — extend `ServiceRecord` with `partRequests`
- `Frontend/src/features/services/pages/ServicesPage.tsx` — replace status dropdown with action buttons, add Part Requests section, update BillingModal

**Frontend — new files:**
- `Frontend/src/features/services/components/StartServiceModal.tsx`

---

## Task 1: Migration — add `status` and `requested_by_fk` to `service_job_parts`

**Files:**
- Create: `Backend/database/migrations/2026_05_12_000001_add_status_and_requested_by_to_service_job_parts.php`

- [ ] **Step 1: Create the migration file**

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
            $table->enum('status', ['requested', 'confirmed'])->default('confirmed')->after('job_id_fk');
            $table->unsignedBigInteger('requested_by_fk')->nullable()->after('status');
            $table->foreign('requested_by_fk')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_job_parts', function (Blueprint $table) {
            $table->dropForeign(['requested_by_fk']);
            $table->dropColumn(['status', 'requested_by_fk']);
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected: `Migrating: 2026_05_12_000001_add_status_and_requested_by_to_service_job_parts` ... `Migrated`

- [ ] **Step 3: Verify the columns exist**

```bash
php artisan tinker --execute="print_r(Schema::getColumnListing('service_job_parts'));"
```

Expected output includes: `job_part_id`, `status`, `requested_by_fk`, `job_id_fk`, `part_id_fk`, `quantity`, `unit_price`, `subtotal`

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_12_000001_add_status_and_requested_by_to_service_job_parts.php
git commit -m "feat(db): add status and requested_by_fk to service_job_parts"
```

---

## Task 2: Update `serviceResource()` to expose part metadata

`serviceResource()` is in `MospamsController.php` around line 1804. It currently returns `partsUsed` without `jobPartId`, `status`, or `requestedBy`. We need to split parts into two arrays: `partsUsed` (confirmed) and `partRequests` (requested).

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (around line 1804)

- [ ] **Step 1: Replace the `$parts` query and the `partsUsed` key in `serviceResource()`**

Find this block (lines ~1806–1816):

```php
$parts = DB::table('service_job_parts')
    ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
    ->where('service_job_parts.job_id_fk', $row->job_id)
    ->get()
    ->map(fn ($p) => [
        'partId'    => (string) $p->part_id_fk,
        'name'      => $p->part_name,
        'quantity'  => (int) $p->quantity,
        'unitPrice' => (float) $p->unit_price,
    ])
    ->values();
```

Replace with:

```php
$allParts = DB::table('service_job_parts')
    ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
    ->leftJoin('users', 'users.user_id', '=', 'service_job_parts.requested_by_fk')
    ->where('service_job_parts.job_id_fk', $row->job_id)
    ->select(
        'service_job_parts.job_part_id',
        'service_job_parts.part_id_fk',
        'service_job_parts.quantity',
        'service_job_parts.unit_price',
        'service_job_parts.status',
        'service_job_parts.requested_by_fk',
        'parts.part_name',
        'users.full_name as requester_name',
    )
    ->get();

$partsUsed = $allParts
    ->where('status', 'confirmed')
    ->map(fn ($p) => [
        'jobPartId' => (string) $p->job_part_id,
        'partId'    => (string) $p->part_id_fk,
        'name'      => $p->part_name,
        'quantity'  => (int) $p->quantity,
        'unitPrice' => (float) $p->unit_price,
        'status'    => $p->status,
    ])
    ->values();

$partRequests = $allParts
    ->where('status', 'requested')
    ->map(fn ($p) => [
        'jobPartId'      => (string) $p->job_part_id,
        'partId'         => (string) $p->part_id_fk,
        'name'           => $p->part_name,
        'quantity'       => (int) $p->quantity,
        'unitPrice'      => (float) $p->unit_price,
        'requestedBy'    => $p->requester_name ?? 'Mechanic',
        'status'         => $p->status,
    ])
    ->values();
```

Then in the return array, replace `'partsUsed' => $parts,` with:

```php
'partsUsed'    => $partsUsed,
'partRequests' => $partRequests,
```

- [ ] **Step 2: Write a test to verify the new fields**

In `Backend/tests/Feature/ServiceFlowTest.php`, add after the existing helper methods:

```php
public function test_service_resource_includes_part_metadata(): void
{
    $jobId = $this->createJob();

    // Staff-add a confirmed part directly
    DB::table('service_job_parts')->insert([
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'quantity'   => 2,
        'unit_price' => 220.00,
        'subtotal'   => 440.00,
        'status'     => 'confirmed',
    ]);

    $response = $this->withToken($this->token)
        ->getJson("http://default.mospams.local/api/services/{$jobId}");

    $response->assertOk()
        ->assertJsonPath('data.partsUsed.0.status', 'confirmed')
        ->assertJsonPath('data.partsUsed.0.jobPartId', fn ($v) => is_string($v))
        ->assertJsonPath('data.partRequests', []);
}
```

- [ ] **Step 3: Run the test**

```bash
php artisan test --filter=test_service_resource_includes_part_metadata
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): expose jobPartId, status, partRequests in service resource"
```

---

## Task 3: `POST /services/{service}/start` endpoint

Staff starts a pending job — assigns mechanics and transitions status to `in_progress`.

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/routes/api.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing tests**

In `ServiceFlowTest.php`, add:

```php
public function test_start_service_transitions_to_in_progress(): void
{
    $jobId = $this->createJob(); // creates a Pending job

    $response = $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
            'mechanicIds' => [(string) $this->mechanicId],
        ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'Ongoing');

    $this->assertDatabaseHas('service_job_mechanics', ['job_id_fk' => $jobId, 'mechanic_id_fk' => $this->mechanicId]);

    $statusCode = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $jobId)
        ->value('service_job_statuses.status_code');
    $this->assertEquals('in_progress', $statusCode);
}

public function test_start_service_requires_at_least_one_mechanic(): void
{
    $jobId = $this->createJob();

    $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
            'mechanicIds' => [],
        ])
        ->assertStatus(422);
}

public function test_start_service_rejects_non_pending_job(): void
{
    $jobId = $this->createJob();
    // Manually set in_progress
    DB::table('service_jobs')->where('job_id', $jobId)->update([
        'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'in_progress'),
    ]);

    $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
            'mechanicIds' => [(string) $this->mechanicId],
        ])
        ->assertStatus(422);
}
```

- [ ] **Step 2: Run to verify failures**

```bash
php artisan test --filter="test_start_service"
```

Expected: all three FAIL with 404 (route not found)

- [ ] **Step 3: Add the `startService` method to `MospamsController`**

Add after `updateService()`:

```php
public function startService(Request $request, int $service): JsonResponse
{
    $data = $request->validate([
        'mechanicIds'   => ['required', 'array', 'min:1'],
        'mechanicIds.*' => ['string'],
    ]);

    $job = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $service)
        ->where('service_jobs.shop_id_fk', $this->shopId())
        ->first();

    abort_if(! $job, 404, 'Service job not found.');
    abort_if($job->status_code !== 'pending', 422, 'Only pending jobs can be started.');

    DB::transaction(function () use ($request, $service, $data) {
        DB::table('service_job_mechanics')->where('job_id_fk', $service)->delete();

        foreach ($data['mechanicIds'] as $rawId) {
            $mechId = $this->numericId($rawId);
            if (DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->exists()) {
                DB::table('service_job_mechanics')->insertOrIgnore([
                    'job_id_fk'      => $service,
                    'mechanic_id_fk' => $mechId,
                    'shop_id_fk'     => $this->shopId(),
                    'assigned_at'    => now(),
                ]);
            }
        }

        DB::table('service_jobs')->where('job_id', $service)->update([
            'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'in_progress'),
            'updated_at'               => now(),
        ]);

        $this->log($request, "Started service job #{$service}", 'service_jobs', $service);
    });

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 4: Register the route in `routes/api.php`**

After the existing `Route::post('/services/{service}/bill', ...)` line:

```php
Route::post('/services/{service}/start', [MospamsController::class, 'startService'])->middleware('role:Owner,Staff');
Route::post('/services/{service}/cancel', [MospamsController::class, 'cancelService'])->middleware('role:Owner,Staff');
Route::post('/services/{service}/parts', [MospamsController::class, 'addPartToService'])->middleware('role:Owner,Staff');
Route::patch('/services/{service}/parts/{jobPartId}/confirm', [MospamsController::class, 'confirmServicePart'])->middleware('role:Owner,Staff');
Route::delete('/services/{service}/parts/{jobPartId}', [MospamsController::class, 'removeServicePart'])->middleware('role:Owner,Staff');
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --filter="test_start_service"
```

Expected: all three PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): POST /services/{id}/start — assign mechanics and begin job"
```

---

## Task 4: `POST /services/{service}/cancel` endpoint

Staff cancels a pending job.

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_cancel_service_transitions_to_cancelled(): void
{
    $jobId = $this->createJob();

    $response = $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/cancel");

    $response->assertOk()
        ->assertJsonPath('data.status', 'Cancelled');

    $statusCode = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $jobId)
        ->value('service_job_statuses.status_code');
    $this->assertEquals('cancelled', $statusCode);
}

public function test_cancel_service_rejects_non_pending_job(): void
{
    $jobId = $this->createJob();
    DB::table('service_jobs')->where('job_id', $jobId)->update([
        'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'in_progress'),
    ]);

    $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/cancel")
        ->assertStatus(422);
}
```

- [ ] **Step 2: Run to verify failures**

```bash
php artisan test --filter="test_cancel_service"
```

Expected: FAIL (404 route not found — route was already added in Task 3, but method missing)

- [ ] **Step 3: Add the `cancelService` method to `MospamsController`**

Add after `startService()`:

```php
public function cancelService(Request $request, int $service): JsonResponse
{
    $job = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $service)
        ->where('service_jobs.shop_id_fk', $this->shopId())
        ->first();

    abort_if(! $job, 404, 'Service job not found.');
    abort_if($job->status_code !== 'pending', 422, 'Only pending jobs can be cancelled.');

    DB::table('service_jobs')->where('job_id', $service)->update([
        'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'cancelled'),
        'updated_at'               => now(),
    ]);

    $this->log($request, "Cancelled service job #{$service}", 'service_jobs', $service);

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 4: Also check `mapJobStatus()` includes 'Cancelled'**

In `MospamsController.php` around line 1843, verify the `mapJobStatus` method handles `'cancelled'`. Add if missing:

```php
private function mapJobStatus(string $statusName): string
{
    return match (strtolower($statusName)) {
        'in_progress', 'ongoing', 'in progress' => 'Ongoing',
        'pending'                                => 'Pending',
        'completed'                              => 'Completed',
        'cancelled'                              => 'Cancelled',
        default                                  => $statusName,
    };
}
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --filter="test_cancel_service"
```

Expected: both PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): POST /services/{id}/cancel — cancel pending job"
```

---

## Task 5: `POST /services/{service}/parts` — staff adds confirmed parts

Staff picks a part from inventory and adds it directly with `status = 'confirmed'`, deducting stock immediately.

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_staff_add_part_to_service_deducts_stock(): void
{
    $jobId = $this->createJob();
    $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

    $response = $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/parts", [
            'partId'   => $this->partId,
            'quantity' => 2,
        ]);

    $response->assertOk()
        ->assertJsonPath('data.partsUsed.0.status', 'confirmed')
        ->assertJsonPath('data.partsUsed.0.quantity', 2);

    $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
    $this->assertEquals($stockBefore - 2, $stockAfter);

    $this->assertDatabaseHas('service_job_parts', [
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'status'     => 'confirmed',
    ]);
}

public function test_staff_add_part_rejects_insufficient_stock(): void
{
    $jobId = $this->createJob();

    $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/parts", [
            'partId'   => $this->partId,
            'quantity' => 9999,
        ])
        ->assertStatus(422);
}
```

- [ ] **Step 2: Run to verify failures**

```bash
php artisan test --filter="test_staff_add_part"
```

Expected: FAIL (500 — method not found)

- [ ] **Step 3: Add `addPartToService()` method to `MospamsController`**

Add after `cancelService()`:

```php
public function addPartToService(Request $request, int $service): JsonResponse
{
    $data = $request->validate([
        'partId'   => ['required', 'integer'],
        'quantity' => ['required', 'integer', 'min:1'],
    ]);

    abort_unless(
        DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
        404,
        'Service job not found.'
    );

    DB::transaction(function () use ($request, $service, $data) {
        $part = DB::table('parts')
            ->where('part_id', $data['partId'])
            ->where('shop_id_fk', $this->shopId())
            ->lockForUpdate()
            ->first();

        abort_if(! $part, 404, 'Part not found.');
        abort_if($part->stock_quantity < $data['quantity'], 422, 'Insufficient stock.');

        DB::table('service_job_parts')->insert([
            'job_id_fk'  => $service,
            'part_id_fk' => $data['partId'],
            'quantity'   => $data['quantity'],
            'unit_price' => $part->unit_price,
            'subtotal'   => $part->unit_price * $data['quantity'],
            'status'     => 'confirmed',
        ]);

        DB::table('parts')->where('part_id', $data['partId'])->update([
            'stock_quantity' => DB::raw('stock_quantity - ' . $data['quantity']),
            'updated_at'     => now(),
        ]);

        DB::table('stock_movements')->insert([
            'part_id_fk'     => $data['partId'],
            'user_id_fk'     => $request->user()->user_id,
            'movement_type'  => 'out',
            'quantity'       => $data['quantity'],
            'reference_type' => 'service_job',
            'reference_id'   => $service,
            'movement_date'  => now(),
            'remarks'        => 'Staff-added to service job #' . $service,
        ]);

        $this->log($request, "Added part {$data['partId']} x{$data['quantity']} to service #{$service}", 'service_job_parts', $service);
    });

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 4: Run tests**

```bash
php artisan test --filter="test_staff_add_part"
```

Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): POST /services/{id}/parts — staff confirms part with stock deduction"
```

---

## Task 6: Confirm and remove service parts

Staff confirms a mechanic-requested part (deducts stock) or removes any part (restores stock if confirmed).

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing tests**

```php
public function test_confirm_part_request_deducts_stock(): void
{
    $jobId = $this->createJob();
    $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

    $jobPartId = (int) DB::table('service_job_parts')->insertGetId([
        'job_id_fk'          => $jobId,
        'part_id_fk'         => $this->partId,
        'quantity'           => 1,
        'unit_price'         => 220.00,
        'subtotal'           => 220.00,
        'status'             => 'requested',
        'requested_by_fk'    => $this->mechanicUserId,
    ]);

    $response = $this->withToken($this->token)
        ->patchJson("http://default.mospams.local/api/services/{$jobId}/parts/{$jobPartId}/confirm");

    $response->assertOk()
        ->assertJsonPath('data.partsUsed.0.status', 'confirmed');

    $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
    $this->assertEquals($stockBefore - 1, $stockAfter);

    $this->assertDatabaseHas('service_job_parts', ['job_part_id' => $jobPartId, 'status' => 'confirmed']);
}

public function test_remove_confirmed_part_restores_stock(): void
{
    $jobId = $this->createJob();

    $jobPartId = (int) DB::table('service_job_parts')->insertGetId([
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'quantity'   => 3,
        'unit_price' => 220.00,
        'subtotal'   => 660.00,
        'status'     => 'confirmed',
    ]);

    $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

    $this->withToken($this->token)
        ->deleteJson("http://default.mospams.local/api/services/{$jobId}/parts/{$jobPartId}")
        ->assertOk();

    $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
    $this->assertEquals($stockBefore + 3, $stockAfter);

    $this->assertDatabaseMissing('service_job_parts', ['job_part_id' => $jobPartId]);
}

public function test_remove_requested_part_does_not_restore_stock(): void
{
    $jobId = $this->createJob();
    $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

    $jobPartId = (int) DB::table('service_job_parts')->insertGetId([
        'job_id_fk'       => $jobId,
        'part_id_fk'      => $this->partId,
        'quantity'        => 2,
        'unit_price'      => 220.00,
        'subtotal'        => 440.00,
        'status'          => 'requested',
        'requested_by_fk' => $this->mechanicUserId,
    ]);

    $this->withToken($this->token)
        ->deleteJson("http://default.mospams.local/api/services/{$jobId}/parts/{$jobPartId}")
        ->assertOk();

    $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
    $this->assertEquals($stockBefore, $stockAfter); // unchanged
}
```

- [ ] **Step 2: Run to verify failures**

```bash
php artisan test --filter="test_confirm_part|test_remove_confirmed|test_remove_requested"
```

Expected: all FAIL (404 or 500)

- [ ] **Step 3: Add `confirmServicePart()` to `MospamsController`**

```php
public function confirmServicePart(Request $request, int $service, int $jobPartId): JsonResponse
{
    $part = DB::table('service_job_parts')
        ->where('job_part_id', $jobPartId)
        ->where('job_id_fk', $service)
        ->first();

    abort_if(! $part, 404, 'Part not found on this job.');
    abort_if($part->status !== 'requested', 422, 'Part is not in requested status.');

    DB::transaction(function () use ($request, $service, $jobPartId, $part) {
        $inventory = DB::table('parts')
            ->where('part_id', $part->part_id_fk)
            ->lockForUpdate()
            ->first();

        abort_if(! $inventory || $inventory->stock_quantity < $part->quantity, 422, 'Insufficient stock to confirm.');

        DB::table('service_job_parts')
            ->where('job_part_id', $jobPartId)
            ->update(['status' => 'confirmed', 'requested_by_fk' => $part->requested_by_fk]);

        DB::table('parts')->where('part_id', $part->part_id_fk)->update([
            'stock_quantity' => DB::raw('stock_quantity - ' . $part->quantity),
            'updated_at'     => now(),
        ]);

        DB::table('stock_movements')->insert([
            'part_id_fk'     => $part->part_id_fk,
            'user_id_fk'     => $request->user()->user_id,
            'movement_type'  => 'out',
            'quantity'       => $part->quantity,
            'reference_type' => 'service_job',
            'reference_id'   => $service,
            'movement_date'  => now(),
            'remarks'        => 'Confirmed mechanic request for service job #' . $service,
        ]);

        $this->log($request, "Confirmed part request #{$jobPartId} on service #{$service}", 'service_job_parts', $jobPartId);
    });

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 4: Add `removeServicePart()` to `MospamsController`**

```php
public function removeServicePart(Request $request, int $service, int $jobPartId): JsonResponse
{
    $part = DB::table('service_job_parts')
        ->where('job_part_id', $jobPartId)
        ->where('job_id_fk', $service)
        ->first();

    abort_if(! $part, 404, 'Part not found on this job.');

    DB::transaction(function () use ($request, $service, $jobPartId, $part) {
        DB::table('service_job_parts')->where('job_part_id', $jobPartId)->delete();

        if ($part->status === 'confirmed') {
            DB::table('parts')->where('part_id', $part->part_id_fk)->update([
                'stock_quantity' => DB::raw('stock_quantity + ' . $part->quantity),
                'updated_at'     => now(),
            ]);

            DB::table('stock_movements')->insert([
                'part_id_fk'     => $part->part_id_fk,
                'user_id_fk'     => $request->user()->user_id,
                'movement_type'  => 'in',
                'quantity'       => $part->quantity,
                'reference_type' => 'service_job',
                'reference_id'   => $service,
                'movement_date'  => now(),
                'remarks'        => 'Removed from service job #' . $service,
            ]);
        }

        $this->log($request, "Removed part #{$jobPartId} from service #{$service}", 'service_job_parts', $jobPartId);
    });

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --filter="test_confirm_part|test_remove_confirmed|test_remove_requested"
```

Expected: all three PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): confirm/remove service parts with correct stock adjustments"
```

---

## Task 7: Update `MechanicController::addPartToJob` — land as requested, no stock deduction

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MechanicController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_mechanic_add_part_lands_as_requested_no_stock_change(): void
{
    $jobId = $this->createJob();

    // Assign mechanic to the job
    DB::table('service_job_mechanics')->insert([
        'job_id_fk'      => $jobId,
        'mechanic_id_fk' => $this->mechanicId,
        'shop_id_fk'     => $this->shopId,
        'assigned_at'    => now(),
    ]);

    $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

    $response = $this->withToken($this->mechanicToken)
        ->postJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/parts", [
            'partId'   => $this->partId,
            'quantity' => 1,
        ]);

    $response->assertOk();

    $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
    $this->assertEquals($stockBefore, $stockAfter); // stock unchanged

    $this->assertDatabaseHas('service_job_parts', [
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'status'     => 'requested',
    ]);

    // Ensure no stock movement record was created
    $this->assertDatabaseMissing('stock_movements', [
        'reference_id'   => $jobId,
        'reference_type' => 'service_job',
        'movement_type'  => 'out',
    ]);
}
```

- [ ] **Step 2: Run to verify failure**

```bash
php artisan test --filter=test_mechanic_add_part_lands_as_requested
```

Expected: FAIL (stock gets decremented and status defaults to confirmed)

- [ ] **Step 3: Rewrite `addPartToJob` in `MechanicController.php`**

Find the entire `addPartToJob` method (lines 147–219) and replace the body of the `DB::transaction` closure:

```php
public function addPartToJob(Request $request, int $job): JsonResponse
{
    $mechanic = $this->findMechanicProfile($request);

    if (!$mechanic) {
        return response()->json(['message' => 'Mechanic profile not found'], 404);
    }

    if (! $this->mechanicHasJob((int) $mechanic->mechanic_id, $job)) {
        return response()->json(['message' => 'Job not found or not assigned to you'], 404);
    }

    $data = $request->validate([
        'partId'   => ['required', 'integer'],
        'quantity' => ['required', 'integer', 'min:1'],
    ]);

    DB::transaction(function () use ($job, $data, $request, $mechanic) {
        $part = DB::table('parts')
            ->where('part_id', $data['partId'])
            ->first();

        if (! $part) {
            abort(404, 'Part not found');
        }

        DB::table('service_job_parts')->insert([
            'job_id_fk'       => $job,
            'part_id_fk'      => $data['partId'],
            'quantity'        => $data['quantity'],
            'unit_price'      => $part->unit_price,
            'subtotal'        => $part->unit_price * $data['quantity'],
            'status'          => 'requested',
            'requested_by_fk' => $request->user()->user_id,
        ]);

        $this->logActivity(
            $request->user()->user_id,
            $request->user()->shop_id_fk,
            'Requested ' . $data['quantity'] . 'x ' . $part->part_name . ' for job #' . $job,
            'service_job_parts',
            $job,
            $request->user()->account_id_fk
        );
    });

    return $this->jobDetails($request, $job);
}
```

- [ ] **Step 4: Run tests**

```bash
php artisan test --filter=test_mechanic_add_part_lands_as_requested
```

Expected: PASS

- [ ] **Step 5: Also run the existing mechanic test to check for regressions**

```bash
php artisan test --filter=test_mechanic_jobs_are_loaded
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MechanicController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): mechanic part requests land as requested with no stock deduction"
```

---

## Task 8: Update `billService` — accept `labor_cost`, filter confirmed parts only

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_bill_service_uses_only_confirmed_parts_and_accepts_labor_cost(): void
{
    $jobId = $this->createJob();

    // Add one confirmed and one requested part
    DB::table('service_job_parts')->insert([
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'quantity'   => 1,
        'unit_price' => 220.00,
        'subtotal'   => 220.00,
        'status'     => 'confirmed',
    ]);
    DB::table('service_job_parts')->insert([
        'job_id_fk'       => $jobId,
        'part_id_fk'      => $this->partId,
        'quantity'        => 2,
        'unit_price'      => 220.00,
        'subtotal'        => 440.00,
        'status'          => 'requested',
        'requested_by_fk' => $this->mechanicUserId,
    ]);

    $response = $this->withToken($this->token)
        ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", [
            'paymentMethod' => 'Cash',
            'laborCost'     => 500,
        ]);

    $response->assertCreated();

    // Total = 500 (labor) + 220 (confirmed part) = 720 — NOT 720+440
    $sale = DB::table('sales')->where('job_id_fk', $jobId)->first();
    $this->assertEquals(720.00, (float) $sale->total_amount);

    // Labor cost should be updated on the job item
    $item = DB::table('service_job_items')->where('job_id_fk', $jobId)->first();
    $this->assertEquals(500.00, (float) $item->labor_cost);
}
```

- [ ] **Step 2: Run to verify failure**

```bash
php artisan test --filter=test_bill_service_uses_only_confirmed
```

Expected: FAIL (total includes requested part)

- [ ] **Step 3: Update `billService()` in `MospamsController`**

Find the `billService` method (line ~769). Make two changes:

**(a)** Update validation to accept optional `laborCost`:

```php
$data = $request->validate([
    'paymentMethod' => ['required', Rule::in(['Cash', 'GCash'])],
    'laborCost'     => ['sometimes', 'numeric', 'min:0'],
]);
```

**(b)** Inside the transaction, update the labor cost if provided and filter parts to confirmed-only:

After `$laborItem = DB::table('service_job_items')->where('job_id_fk', $service)->first();`, add:

```php
if (array_key_exists('laborCost', $data)) {
    DB::table('service_job_items')
        ->where('job_id_fk', $service)
        ->update(['labor_cost' => $data['laborCost']]);
    $laborCost = (float) $data['laborCost'];
} else {
    $laborCost = (float) ($laborItem?->labor_cost ?? 0);
}
```

Change:

```php
$parts = DB::table('service_job_parts')->where('job_id_fk', $service)->get();

$laborCost = (float) ($laborItem?->labor_cost ?? 0);
```

To:

```php
$parts = DB::table('service_job_parts')
    ->where('job_id_fk', $service)
    ->where('status', 'confirmed')
    ->get();
```

(Remove the `$laborCost` assignment from here since it's handled above.)

- [ ] **Step 4: Run tests — new and existing bill tests**

```bash
php artisan test --filter="test_bill_service"
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): billService accepts laborCost and filters to confirmed parts only"
```

---

## Task 9: Remove `status` from `updateService`

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_update_service_ignores_status_field(): void
{
    $jobId = $this->createJob(); // creates Pending

    $this->withToken($this->token)
        ->patchJson("http://default.mospams.local/api/services/{$jobId}", [
            'status' => 'Completed',
        ])
        ->assertOk();

    // Status should still be pending despite the PATCH
    $statusCode = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $jobId)
        ->value('service_job_statuses.status_code');
    $this->assertEquals('pending', $statusCode);
}
```

- [ ] **Step 2: Run to verify failure**

```bash
php artisan test --filter=test_update_service_ignores_status
```

Expected: FAIL (status gets set to completed)

- [ ] **Step 3: Remove `status` handling from `updateService()` in `MospamsController`**

Remove `'status' => ['sometimes', Rule::in(['Pending', 'Ongoing', 'Completed'])],` from the validation array (line ~660).

Remove lines 674–678:

```php
if (array_key_exists('status', $data)) {
    $statusCode = strtolower($data['status']);
    $patch['service_job_status_id_fk'] = $this->statusId('service_job_statuses', 'service_job_status_id', $statusCode);
    $patch['completion_date'] = $statusCode === 'completed' ? now()->toDateString() : null;
}
```

Remove the notification block after the transaction (lines ~713–727):

```php
if (($data['status'] ?? '') === 'Completed') {
    // ... notifyOwner block
}
```

- [ ] **Step 4: Run tests**

```bash
php artisan test --filter="test_update_service"
```

Expected: PASS (including the new test and existing sync test)

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): remove status from updateService — status changes via action endpoints only"
```

---

## Task 10: `CancelStalePendingServicesCommand` — auto-cancel after 12 hours

**Files:**
- Create: `Backend/app/Console/Commands/CancelStalePendingServicesCommand.php`
- Modify: `Backend/routes/console.php`
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

- [ ] **Step 1: Write the failing test**

```php
public function test_stale_pending_jobs_are_auto_cancelled(): void
{
    // Job created 13 hours ago
    $jobId = $this->createJob();
    DB::table('service_jobs')->where('job_id', $jobId)->update([
        'created_at' => now()->subHours(13),
    ]);

    // Recent pending job — should NOT be cancelled
    $recentJobId = $this->createJob();

    $this->artisan('services:cancel-stale')->assertSuccessful();

    $oldStatus = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $jobId)
        ->value('service_job_statuses.status_code');
    $this->assertEquals('cancelled', $oldStatus);

    $recentStatus = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_jobs.job_id', $recentJobId)
        ->value('service_job_statuses.status_code');
    $this->assertEquals('pending', $recentStatus);
}
```

- [ ] **Step 2: Run to verify failure**

```bash
php artisan test --filter=test_stale_pending_jobs
```

Expected: FAIL (command not found)

- [ ] **Step 3: Create the command**

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelStalePendingServicesCommand extends Command
{
    protected $signature   = 'services:cancel-stale';
    protected $description = 'Cancel pending service jobs older than 12 hours.';

    public function handle(): int
    {
        $pendingStatusId = (int) DB::table('service_job_statuses')
            ->where('status_code', 'pending')
            ->value('service_job_status_id');

        $cancelledStatusId = (int) DB::table('service_job_statuses')
            ->where('status_code', 'cancelled')
            ->value('service_job_status_id');

        $cutoff = now()->subHours(12);

        $stale = DB::table('service_jobs')
            ->where('service_job_status_id_fk', $pendingStatusId)
            ->where('created_at', '<', $cutoff)
            ->get(['job_id', 'customer_id_fk', 'shop_id_fk']);

        $count = 0;
        foreach ($stale as $job) {
            DB::table('service_jobs')
                ->where('job_id', $job->job_id)
                ->update([
                    'service_job_status_id_fk' => $cancelledStatusId,
                    'updated_at'               => now(),
                ]);

            if ($job->customer_id_fk) {
                DB::table('notifications')->insert([
                    'shop_id_fk'       => $job->shop_id_fk,
                    'customer_id_fk'   => $job->customer_id_fk,
                    'title'            => 'Service Booking Cancelled',
                    'message'          => 'Your service booking was automatically cancelled due to no response within 12 hours.',
                    'reference_type'   => 'service_jobs',
                    'reference_id'     => $job->job_id,
                    'is_read'          => 0,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
            }

            $count++;
        }

        $this->info("Cancelled {$count} stale pending service job(s).");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 4: Register the command as an hourly schedule in `console.php`**

Add at the end of `Backend/routes/console.php`:

```php
use App\Console\Commands\CancelStalePendingServicesCommand;

Schedule::command(CancelStalePendingServicesCommand::class)->hourly();
```

- [ ] **Step 5: Run the test**

```bash
php artisan test --filter=test_stale_pending_jobs
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Console/Commands/CancelStalePendingServicesCommand.php Backend/routes/console.php Backend/tests/Feature/ServiceFlowTest.php
git commit -m "feat(api): auto-cancel pending service jobs older than 12 hours"
```

---

## Task 11: Full backend regression run

Before touching the frontend, verify all backend tests pass.

- [ ] **Step 1: Run the full service flow test suite**

```bash
php artisan test --filter=ServiceFlowTest
```

Expected: all tests PASS, no failures

- [ ] **Step 2: Run the full test suite**

```bash
php artisan test
```

Expected: no regressions in other test files

---

## Task 12: Update `ServiceRecord` type and shared types

**Files:**
- Modify: `Frontend/src/shared/types/index.ts`

- [ ] **Step 1: Add `partRequests` to `ServiceRecord` and extend part shape**

Find the `ServiceRecord` interface (line ~26) and update it:

```ts
export interface ServiceRecord {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled';
  partsUsed: { jobPartId: string; partId: string; name?: string; quantity: number; unitPrice?: number; status: string }[];
  partRequests: { jobPartId: string; partId: string; name: string; quantity: number; unitPrice: number; requestedBy: string; status: string }[];
  mechanics: { id: string; name: string }[];
  notes: string;
  createdAt: string;
  completedAt?: string;
}
```

- [ ] **Step 2: Run TypeScript type-check**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: any type errors surface — fix them before proceeding

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/shared/types/index.ts
git commit -m "feat(types): extend ServiceRecord with partRequests and jobPartId on parts"
```

---

## Task 13: `StartServiceModal` component

**Files:**
- Create: `Frontend/src/features/services/components/StartServiceModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Mechanic { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (mechanicIds: string[]) => Promise<void>;
}

export function StartServiceModal({ open, onClose, onConfirm }: Props) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setSelected([]); return; }
    import('@/shared/lib/api').then(({ apiGet }) =>
      apiGet<{ data: Mechanic[] }>('/api/mechanics?limit=100')
        .then(r => setMechanics(r.data))
        .catch(() => {})
    );
  }, [open]);

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(selected);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">Start Service</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">Select at least one mechanic to assign.</p>
        {mechanics.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No mechanics available.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {mechanics.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  selected.includes(m.id)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={selected.length === 0 || loading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Starting…' : 'Confirm Start'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/services/components/StartServiceModal.tsx
git commit -m "feat(ui): StartServiceModal — mechanic picker for starting a job"
```

---

## Task 14: Update `ServicesPage.tsx` — contextual action buttons + Part Requests section

This is the largest frontend task. Replace the status dropdown with status-aware action buttons, add the Part Requests collapsible, and update the billing modal to accept labor cost.

**Files:**
- Modify: `Frontend/src/features/services/pages/ServicesPage.tsx`

- [ ] **Step 1: Add new state variables at the top of the `Services()` component**

After the existing state declarations, add:

```tsx
const [startJobTarget, setStartJobTarget] = useState<ServiceRecord | null>(null);
const [cancelConfirm, setCancelConfirm] = useState<string | null>(null); // service id
const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
const [billLaborCost, setBillLaborCost] = useState<number>(0);
```

- [ ] **Step 2: Add API action handlers**

After `handleBill`, add:

```tsx
const handleStartService = async (mechanicIds: string[]) => {
  if (!startJobTarget) return;
  const updated = await apiMutation<{ data: ServiceRecord }>(
    `/api/services/${startJobTarget.id}/start`, 'POST', { mechanicIds }
  ).then(r => r.data);
  updateItem(startJobTarget.id, 'id', updated);
  setStartJobTarget(null);
};

const handleCancelService = async (serviceId: string) => {
  const updated = await apiMutation<{ data: ServiceRecord }>(
    `/api/services/${serviceId}/cancel`, 'POST', {}
  ).then(r => r.data);
  updateItem(serviceId, 'id', updated);
  setCancelConfirm(null);
};

const handleConfirmPart = async (serviceId: string, jobPartId: string) => {
  const updated = await apiMutation<{ data: ServiceRecord }>(
    `/api/services/${serviceId}/parts/${jobPartId}/confirm`, 'PATCH', {}
  ).then(r => r.data);
  updateItem(serviceId, 'id', updated);
};

const handleRejectPart = async (serviceId: string, jobPartId: string) => {
  const updated = await apiMutation<{ data: ServiceRecord }>(
    `/api/services/${serviceId}/parts/${jobPartId}`, 'DELETE', {}
  ).then(r => r.data);
  updateItem(serviceId, 'id', updated);
};
```

- [ ] **Step 3: Update `handleBill` to pass `laborCost`**

Replace the existing `handleBill`:

```tsx
const handleBill = async () => {
  if (!billJob) return;
  setBilling(true);
  try {
    await apiMutation(`/api/services/${billJob.id}/bill`, 'POST', {
      paymentMethod: billPaymentMethod,
      laborCost: billLaborCost,
    });
    const updated = await apiGet<{ data: ServiceRecord }>(`/api/services/${billJob.id}`)
      .then(r => r.data)
      .catch(() => null);
    if (updated) updateItem(billJob.id, 'id', updated);
    setBillJob(null);
    setBillPaymentMethod('Cash');
    setBillLaborCost(0);
  } finally {
    setBilling(false);
  }
};
```

- [ ] **Step 4: Import `StartServiceModal` and update the billing modal open handler**

Add import at top of file:

```tsx
import { StartServiceModal } from '../components/StartServiceModal';
```

Update the `setBillJob` call sites to also set `setBillLaborCost`:

```tsx
// when opening billing modal:
setBillJob(service);
setBillLaborCost(service.laborCost);
```

- [ ] **Step 5: Replace the card action area (the `<div className="flex items-center gap-2">` block)**

Find the block that starts with `service.status === 'Cancelled' ? (` (around line 256) and replace the entire div with action buttons.

Replace:

```tsx
<div className="flex items-center gap-2">
  {service.status === 'Cancelled' ? (
    <span className={`inline-flex h-9 items-center px-3 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      Cancelled
    </span>
  ) : (
    <select value={service.status} onChange={e => handleStatusChange(service, e.target.value)} className={`h-9 px-3 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none ${style.bg} ${style.text} ${style.border}`}>
      <option value="Pending">Pending</option>
      <option value="Ongoing">Ongoing</option>
      <option value="Completed">Completed</option>
    </select>
  )}
  <button title="Bill this Job" disabled={service.status === 'Cancelled'} onClick={() => setBillJob(service)} className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground">
    <Receipt className="w-4 h-4" />
  </button>
  <button title="History" onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors">
    <History className="w-4 h-4" />
  </button>
  <button title="Edit" onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
  {canDeleteService && (
    <button title="Delete" onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
  )}
</div>
```

With:

```tsx
<div className="flex items-center gap-2 flex-wrap justify-end">
  {service.status === 'Pending' && (
    <>
      <Button size="sm" onClick={() => setStartJobTarget(service)}
        className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3">
        Start Service
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
        Cancel
      </Button>
    </>
  )}
  {service.status === 'Ongoing' && (
    <>
      <Button size="sm" variant="outline" onClick={() => openAddPartsModal(service)}
        className="h-8 rounded-xl border-border dark:border-zinc-700 text-muted-foreground hover:text-foreground text-xs px-3">
        Add Items
      </Button>
      <Button size="sm" onClick={() => { setBillJob(service); setBillLaborCost(service.laborCost); }}
        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3">
        Complete
      </Button>
    </>
  )}
  {(service.status === 'Completed' || service.status === 'Cancelled') && (
    <span className={`inline-flex h-8 items-center px-3 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {service.status}
    </span>
  )}
  <button title="History" onClick={() => setHistoryCustomer({ name: service.customerName, model: service.motorcycleModel })} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors">
    <History className="w-4 h-4" />
  </button>
  <button title="Edit" onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
  {canDeleteService && (
    <button title="Delete" onClick={() => setConfirmDelete(service.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
  )}
</div>
```

- [ ] **Step 6: Add `openAddPartsModal` state and handler**

Add state:

```tsx
const [addPartsTarget, setAddPartsTarget] = useState<ServiceRecord | null>(null);
const [addPartId, setAddPartId] = useState<string>('');
const [addPartQty, setAddPartQty] = useState<number>(1);
const [addingPart, setAddingPart] = useState(false);
```

Add handler:

```tsx
const openAddPartsModal = (service: ServiceRecord) => {
  setAddPartsTarget(service);
  setAddPartId('');
  setAddPartQty(1);
  void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setAvailableParts(r.data)).catch(() => {});
};

const handleAddPartToOngoing = async () => {
  if (!addPartsTarget || !addPartId) return;
  setAddingPart(true);
  try {
    const updated = await apiMutation<{ data: ServiceRecord }>(
      `/api/services/${addPartsTarget.id}/parts`, 'POST',
      { partId: Number(addPartId), quantity: addPartQty }
    ).then(r => r.data);
    updateItem(addPartsTarget.id, 'id', updated);
    setAddPartsTarget(null);
  } finally {
    setAddingPart(false);
  }
};
```

- [ ] **Step 7: Add Part Requests section below the card body**

After the existing `{service.partsUsed.length > 0 && (...)}` block (around line 279), add:

```tsx
{service.status === 'Ongoing' && (service.partRequests ?? []).length > 0 && (
  <div className="mt-3 pt-3 border-t border-border">
    <button
      onClick={() => setExpandedRequests(prev => {
        const next = new Set(prev);
        next.has(service.id) ? next.delete(service.id) : next.add(service.id);
        return next;
      })}
      className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
    >
      <Package className="w-3.5 h-3.5" />
      Part Requests ({service.partRequests.length})
    </button>
    {expandedRequests.has(service.id) && (
      <div className="mt-2 space-y-1.5">
        {service.partRequests.map(pr => (
          <div key={pr.jobPartId} className="flex items-center justify-between text-xs bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
            <span className="text-foreground font-medium">{pr.name} x{pr.quantity}</span>
            <span className="text-muted-foreground">by {pr.requestedBy}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleConfirmPart(service.id, pr.jobPartId)}
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleRejectPart(service.id, pr.jobPartId)}
                className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 8: Update the Billing modal to include labor cost input**

Find the billing dialog (the `{billJob && (...)` or similar block). Update it to show a labor cost input before the payment method selector:

Replace the billing dialog content (find `setBillJob(null)` dialog) — look for the `Dialog` with `billJob` state and update it to:

```tsx
{billJob && (
  <Dialog open={!!billJob} onOpenChange={() => { setBillJob(null); setBillLaborCost(0); }}>
    <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-foreground">Complete & Collect Payment</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Labor Cost (₱)</Label>
          <Input
            type="number"
            value={billLaborCost}
            onChange={e => setBillLaborCost(Number(e.target.value))}
            className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground"
          />
        </div>
        {billJob.partsUsed.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Confirmed Parts</p>
            <div className="space-y-1">
              {billJob.partsUsed.map(p => (
                <div key={p.jobPartId} className="flex justify-between text-xs text-muted-foreground">
                  <span>{p.name ?? `Part #${p.partId}`} x{p.quantity}</span>
                  <span>₱{((p.unitPrice ?? 0) * p.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-3">
          <span>Total</span>
          <span>₱{(billLaborCost + billJob.partsUsed.reduce((sum, p) => sum + (p.unitPrice ?? 0) * p.quantity, 0)).toLocaleString()}</span>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Payment Method</Label>
          <div className="flex gap-2 mt-1.5">
            {(['Cash', 'GCash'] as const).map(m => (
              <button
                key={m}
                onClick={() => setBillPaymentMethod(m)}
                className={`flex-1 h-10 rounded-xl text-sm font-medium border transition-colors ${
                  billPaymentMethod === m
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={handleBill}
          disabled={billing}
          className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          {billing ? 'Processing…' : 'Confirm Payment Received'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

- [ ] **Step 9: Add `StartServiceModal`, cancel confirm dialog, and add parts modal to the JSX return**

Before the closing `</div>` of the component return, add:

```tsx
<StartServiceModal
  open={!!startJobTarget}
  onClose={() => setStartJobTarget(null)}
  onConfirm={handleStartService}
/>

{cancelConfirm && (
  <Dialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
    <DialogContent className="sm:max-w-xs rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-foreground">Cancel Service?</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground mt-1 mb-4">This will mark the job as cancelled.</p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setCancelConfirm(null)} className="rounded-xl">Keep</Button>
        <Button size="sm" onClick={() => handleCancelService(cancelConfirm)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">Cancel Job</Button>
      </div>
    </DialogContent>
  </Dialog>
)}

{addPartsTarget && (
  <Dialog open={!!addPartsTarget} onOpenChange={() => setAddPartsTarget(null)}>
    <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-foreground">Add Items</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Part</Label>
          <select
            value={addPartId}
            onChange={e => setAddPartId(e.target.value)}
            className="w-full mt-1.5 h-10 px-3 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground"
          >
            <option value="">Select a part…</option>
            {availableParts.filter(p => p.stock > 0).map(p => (
              <option key={p.id} value={p.id}>{p.name} (stock: {p.stock}) — ₱{p.price}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min={1}
            value={addPartQty}
            onChange={e => setAddPartQty(Number(e.target.value))}
            className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setAddPartsTarget(null)} className="rounded-xl">Cancel</Button>
          <Button size="sm" onClick={handleAddPartToOngoing} disabled={!addPartId || addingPart}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
            {addingPart ? 'Adding…' : 'Add Part'}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
```

- [ ] **Step 10: Add `Package` to lucide-react imports at the top**

Check existing imports line 6. Add `Package` to the import if not already present:

```tsx
import { Plus, Pencil, Trash2, Search, Clock, Wrench, CheckCircle2, History, X, XCircle, Settings2, ChevronLeft, ChevronRight, Receipt, Package } from 'lucide-react';
```

- [ ] **Step 11: Also remove `handleStatusChange` since status is now action-only**

Delete the `handleStatusChange` function if nothing else references it. TypeScript will error if it's still referenced.

- [ ] **Step 12: Type-check**

```bash
cd Frontend && npx tsc --noEmit
```

Fix any errors before continuing.

- [ ] **Step 13: Start dev server and manually test the flow**

```bash
cd Frontend && npm run dev
```

Test path:
1. Create a new service — it should appear as Pending with "Start Service" + "Cancel" buttons
2. Click "Start Service" — select a mechanic, confirm — card shows "Ongoing" status with "Add Items" + "Complete" buttons
3. Click "Add Items" — pick a part, submit — part appears in confirmed list
4. Click "Complete" — billing modal opens with editable labor cost, confirmed parts listed, total calculated
5. Click "Confirm Payment Received" — job goes Completed, read-only badge shown
6. Create another job, click "Cancel" — confirm dialog, job goes Cancelled

- [ ] **Step 14: Commit**

```bash
git add Frontend/src/features/services/pages/ServicesPage.tsx Frontend/src/features/services/components/StartServiceModal.tsx
git commit -m "feat(ui): service job action buttons, part requests section, billing with labor cost"
```

---

## Task 15: Update `JobDetailsPage.tsx` — mechanic Request Parts button

**Files:**
- Modify: `Frontend/src/features/mechanic/pages/JobDetailsPage.tsx`

- [ ] **Step 1: Add Request Parts button and handler**

Read the current `JobDetailsPage.tsx` to find where the `[showAddPart]` state is used. The existing `AddPartDialog` currently calls `POST /mechanic/jobs/{job}/parts` — this is already the right endpoint. After Task 7, that endpoint now lands parts as `requested`.

The only change needed is to update the label to say "Request Parts" (not "Add Parts") and ensure the part list in the mechanic view shows a "Pending Approval" badge for requested parts.

In `JobDetailsPage.tsx`, find the `AddPartDialog` trigger button and update its label:

```tsx
// Find: "Add Parts" or "Add Part" button near showAddPart state
// Change to:
<button
  onClick={() => setShowAddPart(true)}
  className="..."
>
  <Plus className="w-4 h-4 mr-2" />
  Request Parts
</button>
```

- [ ] **Step 2: Update the parts list to show Pending Approval badge**

In the parts list rendering, check if the `JobPart` has a `status` field. The mechanic API returns parts via `jobDetails()` — verify it includes `status`. If not, the badge can be added later; for now just show the label change.

Update `JobPart` interface to include `status`:

```tsx
interface JobPart {
  id: string;
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status?: string;
}
```

In the parts list rendering, add a badge next to parts with `status === 'requested'`:

```tsx
{p.status === 'requested' && (
  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
    Pending Approval
  </span>
)}
```

- [ ] **Step 3: Check the mechanic `jobDetails` response in `MechanicController`**

Verify that `jobDetails()` in `MechanicController.php` includes the `status` field for parts. If not, add it:

```bash
grep -n "jobDetails\|parts_query\|job_part" Backend/app/Http/Controllers/Api/MechanicController.php | head -20
```

If `jobDetails()` builds a parts array without `status`, add `service_job_parts.status` to the select. Find the method and update the parts select to include `'service_job_parts.status'`.

- [ ] **Step 4: Type-check and test**

```bash
cd Frontend && npx tsc --noEmit
```

Test manually: log in as a mechanic, open a job, click "Request Parts", submit — part should appear with "Pending Approval" badge. Log in as staff, open the job card in ServicesPage — Part Requests section shows the requested part with Confirm/Reject buttons.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/mechanic/pages/JobDetailsPage.tsx Backend/app/Http/Controllers/Api/MechanicController.php
git commit -m "feat(ui): mechanic request parts flow with pending approval badge"
```

---

## Task 16: Final check — run full suite and deploy sanity

- [ ] **Step 1: Run all backend tests**

```bash
cd Backend && php artisan test
```

Expected: all PASS

- [ ] **Step 2: Run frontend type-check**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Manually test the complete happy path in the browser**

1. Staff creates service (Pending) → Staff starts service with mechanic → Mechanic requests parts → Staff confirms parts → Staff completes with billing → Sale created
2. Staff creates service → Auto-cancel test: `php artisan services:cancel-stale` (update a job's `created_at` to 13h ago first)
3. Staff creates service → Staff cancels (pending only) → Cannot be started after cancel

- [ ] **Step 4: Final commit tag**

```bash
git tag -a v-service-flow-redesign -m "Service job flow redesign complete"
```

---

## Helper methods referenced in tests

The test file uses `createJob()`, `createJobWithPart()`, `login()`, and `statusId()`. These are already in `ServiceFlowTest.php`. Verify they exist — if not, add:

```php
private function createJob(): int
{
    $pendingId = (int) DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');
    $stId = (int) DB::table('service_types')->where('shop_id_fk', $this->shopId)->value('service_type_id');
    return (int) DB::table('service_jobs')->insertGetId([
        'shop_id_fk'               => $this->shopId,
        'service_job_status_id_fk' => $pendingId,
        'customer_id_fk'           => null,
        'motorcycle_model'         => 'Honda Click 150i',
        'notes'                    => null,
        'completion_date'          => null,
        'created_at'               => now(),
        'updated_at'               => now(),
    ]);
    // Also insert a service_job_items row
    DB::table('service_job_items')->insert([
        'job_id_fk'           => $id,
        'service_type_id_fk'  => $stId,
        'labor_cost'          => 350.00,
        'remarks'             => null,
    ]);
    return $id; // fix: capture insertGetId result
}

private function createJobWithPart(): int
{
    $jobId = $this->createJob();
    DB::table('service_job_parts')->insert([
        'job_id_fk'  => $jobId,
        'part_id_fk' => $this->partId,
        'quantity'   => 1,
        'unit_price' => 220.00,
        'subtotal'   => 220.00,
        'status'     => 'confirmed',
    ]);
    DB::table('parts')->where('part_id', $this->partId)->update([
        'stock_quantity' => DB::raw('stock_quantity - 1'),
    ]);
    return $jobId;
}

private function login(string $email): string
{
    return $this->postJson('http://default.mospams.local/api/login', [
        'email'    => $email,
        'password' => 'password',
    ])->json('token');
}

private function statusId(string $table, string $key, string $code): int
{
    return (int) DB::table($table)->where('status_code', $code)->value($key);
}
```

**Note:** If these helpers already exist in the file, do NOT duplicate them — just use them as-is.
