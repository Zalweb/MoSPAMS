# Mechanic-Staff Service Handshake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full 7-step service handshake workflow — adding `booked_confirmed` and `work_done` statuses so Staff confirms bookings, Mechanics start/complete jobs, and Staff finalizes payment.

**Architecture:** Two new status codes (`booked_confirmed`, `work_done`) are inserted via migration. Backend controllers are updated to enforce the new state machine. The frontend ServicesPage, mechanic pages, and customer ServiceHistory all reflect the new actions and statuses.

**Tech Stack:** PHP 8.3 + Laravel 11, MySQL, React + TypeScript + Vite, Sonner toast, Framer Motion.

---

## Status State Machine (reference)

```
pending → booked_confirmed → in_progress → work_done → completed
                  ↓                ↓              ↓         (terminal)
              cancelled         cancelled      cancelled
     ↑
(customer can cancel here only; staff can cancel any active state)
```

---

## File Map

| File | Change |
|------|--------|
| `Backend/database/migrations/2026_05_13_000001_add_booked_confirmed_work_done_statuses.php` | Create — insert 2 new `service_job_statuses` rows |
| `Backend/app/Http/Controllers/Api/MospamsController.php` | Modify — `serviceResource`, `mapJobStatus`, `startService`, `cancelService`, `billService` |
| `Backend/app/Http/Controllers/Api/MechanicController.php` | Modify — `updateJobStatus` (new transitions + labor cost + notification) |
| `Backend/tests/Feature/ServiceFlowTest.php` | Modify — update broken tests, add new handshake flow tests |
| `Frontend/src/shared/types/index.ts` | Modify — `ServiceRecord` new statuses + `statusCode`, `CustomerService` |
| `Frontend/src/features/services/pages/ServicesPage.tsx` | Modify — STATUS_STYLES, filters, action buttons, pulse indicators |
| `Frontend/src/features/services/components/StartServiceModal.tsx` | Modify — rename label to "Confirm Booking" |
| `Frontend/src/features/mechanic/components/StatusUpdateDialog.tsx` | Modify — replace generic picker with action-specific UI |
| `Frontend/src/features/mechanic/pages/AssignedJobsPage.tsx` | Modify — add `booked_confirmed` status colour |
| `Frontend/src/features/customers/pages/ServiceHistory.tsx` | Modify — new status display, cancel guard, work_done invoice view |

---

## Task 1: Migration — Insert new status codes

**Files:**
- Create: `Backend/database/migrations/2026_05_13_000001_add_booked_confirmed_work_done_statuses.php`

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('service_job_statuses')->insertOrIgnore([
            ['status_code' => 'booked_confirmed', 'status_name' => 'Booked & Confirmed', 'description' => 'Booking confirmed by staff, mechanic(s) assigned'],
            ['status_code' => 'work_done',        'status_name' => 'Work Done',           'description' => 'Mechanic completed work, awaiting staff payment confirmation'],
        ]);
    }

    public function down(): void
    {
        DB::table('service_job_statuses')->whereIn('status_code', ['booked_confirmed', 'work_done'])->delete();
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `cd Backend && php artisan migrate`
Expected: `Migrating: 2026_05_13_000001_add_booked_confirmed_work_done_statuses`  
Then: `Migrated: 2026_05_13_000001_add_booked_confirmed_work_done_statuses`

- [ ] **Step 3: Verify rows exist**

Run: `php artisan tinker --execute="DB::table('service_job_statuses')->pluck('status_code');"`
Expected: array contains `booked_confirmed` and `work_done`

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_13_000001_add_booked_confirmed_work_done_statuses.php
git commit -m "feat: add booked_confirmed and work_done service job statuses"
```

---

## Task 2: Backend — Add `statusCode` to service resource and update status map

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (methods: `services`, `serviceById`, `serviceResource`, `mapJobStatus`)

- [ ] **Step 1: Add `status_code` to the select in `services()` (line ~576)**

Find this in `services()`:
```php
->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
```
Replace with:
```php
->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost')
```

- [ ] **Step 2: Add `status_code` to the select in `serviceById()` (line ~1965)**

Find this in `serviceById()`:
```php
->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
```
Replace with:
```php
->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost')
```

- [ ] **Step 3: Add `statusCode` to `serviceResource()` return array (after `'status'` key)**

Find:
```php
            'status'          => $this->mapJobStatus($row->status_name),
```
Replace with:
```php
            'status'          => $this->mapJobStatus($row->status_name),
            'statusCode'      => $row->status_code ?? '',
```

- [ ] **Step 4: Update `mapJobStatus()` with new entries**

Find:
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
Replace with:
```php
    private function mapJobStatus(string $statusName): string
    {
        return match (strtolower($statusName)) {
            'in_progress', 'ongoing', 'in progress' => 'Ongoing',
            'pending'                                => 'Pending',
            'booked_confirmed', 'booked & confirmed' => 'Confirmed',
            'work_done', 'work done'                 => 'Work Done',
            'completed'                              => 'Completed',
            'cancelled'                              => 'Cancelled',
            default                                  => $statusName,
        };
    }
```

- [ ] **Step 5: Verify `serviceById` returns statusCode via tinker**

Run:
```
php artisan tinker --execute="
\$job = DB::table('service_jobs')->value('job_id');
if (\$job) {
    \$row = DB::table('service_jobs')
        ->join('service_job_statuses','service_job_statuses.service_job_status_id','=','service_jobs.service_job_status_id_fk')
        ->where('job_id', \$job)
        ->select('service_job_statuses.status_code')
        ->first();
    dump(\$row);
}
"
```
Expected: object with `status_code` field.

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: expose statusCode in service resource and map new statuses"
```

---

## Task 3: Backend — `startService`: pending → booked_confirmed + customer notification

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (method: `startService`)

- [ ] **Step 1: Update `startService` to transition to `booked_confirmed` and notify customer**

Find `startService` (around line 714). Replace the inner `DB::transaction` block — specifically the `abort_if` status check and the final `DB::table('service_jobs')->update(...)` — with the full replacement below:

```php
    public function startService(Request $request, int $service): JsonResponse
    {
        $data = $request->validate([
            'mechanicIds'   => ['required', 'array', 'min:1'],
            'mechanicIds.*' => ['string'],
        ]);

        abort_unless(
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Service job not found.'
        );

        DB::transaction(function () use ($request, $service, $data) {
            $job = DB::table('service_jobs')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
                ->where('service_jobs.job_id', $service)
                ->where('service_jobs.shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->select('service_jobs.*', 'service_job_statuses.status_code', 'customers.user_id_fk as customer_user_id', 'customers.full_name as customer_name')
                ->first();

            abort_if(! $job, 404, 'Service job not found.');
            abort_if($job->status_code !== 'pending', 422, 'Only pending jobs can be confirmed.');

            DB::table('service_job_mechanics')->where('job_id_fk', $service)->delete();

            $inserted = 0;
            $mechanicNames = [];
            foreach ($data['mechanicIds'] as $rawId) {
                $mechId = $this->numericId($rawId);
                $mech = DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->first();
                if ($mech) {
                    DB::table('service_job_mechanics')->insertOrIgnore([
                        'job_id_fk'      => $service,
                        'mechanic_id_fk' => $mechId,
                        'shop_id_fk'     => $this->shopId(),
                        'assigned_at'    => now(),
                    ]);
                    $inserted++;
                    $mechanicNames[] = $mech->full_name;
                }
            }

            abort_if($inserted === 0, 422, 'No valid mechanics found for this shop.');

            DB::table('service_jobs')->where('job_id', $service)->update([
                'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'booked_confirmed'),
                'updated_at'               => now(),
            ]);

            if ($job->customer_user_id) {
                $namesStr = implode(', ', $mechanicNames);
                DB::table('notifications')->insert([
                    'user_id_fk'        => $job->customer_user_id,
                    'notification_type' => 'job_status_update',
                    'title'             => 'Booking Confirmed!',
                    'message'           => "Your booking for {$job->motorcycle_model} is confirmed. You can head to the shop now. Mechanic(s): {$namesStr}.",
                    'reference_type'    => 'service_job',
                    'reference_id'      => $service,
                    'is_read'           => false,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            $this->log($request, "Confirmed booking for job #{$service}", 'service_jobs', $service);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: startService transitions to booked_confirmed and notifies customer"
```

---

## Task 4: Backend — `cancelService`: allow any active status

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (method: `cancelService`)

- [ ] **Step 1: Update `cancelService` to allow cancelling any non-terminal status**

Find the inner `abort_if` in `cancelService` (around line 783–784):
```php
            abort_if(! $job, 404, 'Service job not found.');
            abort_if($job->status_code !== 'pending', 422, 'Only pending jobs can be cancelled.');
```
Replace with:
```php
            abort_if(! $job, 404, 'Service job not found.');
            abort_if(
                in_array($job->status_code, ['completed', 'cancelled']),
                422,
                'Completed or already-cancelled jobs cannot be cancelled.'
            );
```

Also find the `lockForUpdate()` query in `cancelService` (same area) and verify it selects `status_code`. The existing query joins `service_job_statuses` and calls `->first()` without a select — so `$job->status_code` is already available via the wildcard from `service_jobs` plus the join. But to be safe, add a select:

Find:
```php
        DB::transaction(function () use ($request, $service) {
            $job = DB::table('service_jobs')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->where('service_jobs.job_id', $service)
                ->where('service_jobs.shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->first();
```
Replace with:
```php
        DB::transaction(function () use ($request, $service) {
            $job = DB::table('service_jobs')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->where('service_jobs.job_id', $service)
                ->where('service_jobs.shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->select('service_jobs.*', 'service_job_statuses.status_code')
                ->first();
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: cancelService allows cancelling any active job status"
```

---

## Task 5: Backend — `billService`: enforce `work_done` pre-condition

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (method: `billService`)

- [ ] **Step 1: Add status check after the `$alreadyBilled` check**

Find in `billService` (around line 981–983):
```php
        $alreadyBilled = DB::table('sales')->where('job_id_fk', $service)->exists();
        abort_if($alreadyBilled, 422, 'This job has already been billed.');

        $saleId = DB::transaction(function () use ($request, $service, $data) {
```
Replace with:
```php
        $alreadyBilled = DB::table('sales')->where('job_id_fk', $service)->exists();
        abort_if($alreadyBilled, 422, 'This job has already been billed.');

        $currentStatusCode = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $service)
            ->where('service_jobs.shop_id_fk', $this->shopId())
            ->value('service_job_statuses.status_code');
        abort_if($currentStatusCode !== 'work_done', 422, 'Only jobs with Work Done status can be billed.');

        $saleId = DB::transaction(function () use ($request, $service, $data) {
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: billService enforces work_done status pre-condition"
```

---

## Task 6: Backend — `MechanicController::updateJobStatus`: new transitions + work_done notification

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MechanicController.php` (method: `updateJobStatus`)

The mechanic now has two actions:
- **Start Service**: `booked_confirmed` → `in_progress`
- **Complete**: `in_progress` → `work_done` (requires `laborCost`, updates `service_job_items`)

Customer is notified on `work_done` with the total bill amount.

- [ ] **Step 1: Replace `updateJobStatus` entirely**

```php
    public function updateJobStatus(Request $request, int $job): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $data = $request->validate([
            'action'    => ['required', \Illuminate\Validation\Rule::in(['start', 'complete'])],
            'laborCost' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $jobData = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', $mechanic->mechanic_id)
            ->where('service_jobs.job_id', $job)
            ->select(
                'service_jobs.*',
                'service_job_statuses.status_code',
                'customers.user_id_fk as customer_user_id',
                'customers.full_name as customer_name'
            )
            ->first();

        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        if ($data['action'] === 'start') {
            abort_if($jobData->status_code !== 'booked_confirmed', 422, 'Job must be in Booked & Confirmed status to start.');

            DB::transaction(function () use ($job, $jobData, $request) {
                DB::table('service_jobs')->where('job_id', $job)->update([
                    'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'in_progress')->value('service_job_status_id'),
                    'updated_at'               => now(),
                ]);

                $this->logActivity(
                    $request->user()->user_id,
                    $jobData->shop_id_fk,
                    'Started service job #' . $job,
                    'service_jobs',
                    $job,
                    $request->user()->account_id_fk
                );

                if ($jobData->customer_user_id) {
                    DB::table('notifications')->insert([
                        'user_id_fk'        => $jobData->customer_user_id,
                        'notification_type' => 'job_status_update',
                        'title'             => 'Service Started',
                        'message'           => "Your {$jobData->motorcycle_model} service has started. A mechanic is now working on it.",
                        'reference_type'    => 'service_job',
                        'reference_id'      => $job,
                        'is_read'           => false,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }
            });
        } elseif ($data['action'] === 'complete') {
            abort_if($jobData->status_code !== 'in_progress', 422, 'Job must be In Progress to complete.');
            abort_unless(isset($data['laborCost']), 422, 'Labor cost is required to complete a job.');

            DB::transaction(function () use ($job, $jobData, $data, $request) {
                DB::table('service_job_items')->where('job_id_fk', $job)->update([
                    'labor_cost' => $data['laborCost'],
                ]);

                DB::table('service_jobs')->where('job_id', $job)->update([
                    'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'work_done')->value('service_job_status_id'),
                    'updated_at'               => now(),
                ]);

                $this->logActivity(
                    $request->user()->user_id,
                    $jobData->shop_id_fk,
                    'Completed work on job #' . $job . ' — labor ₱' . $data['laborCost'],
                    'service_jobs',
                    $job,
                    $request->user()->account_id_fk
                );

                if ($jobData->customer_user_id) {
                    $partsCost = DB::table('service_job_parts')
                        ->where('job_id_fk', $job)
                        ->where('status', 'confirmed')
                        ->sum(DB::raw('unit_price * quantity'));
                    $total = (float) $data['laborCost'] + (float) $partsCost;

                    DB::table('notifications')->insert([
                        'user_id_fk'        => $jobData->customer_user_id,
                        'notification_type' => 'job_status_update',
                        'title'             => 'Service Complete — Ready for Payment',
                        'message'           => "Your {$jobData->motorcycle_model} service is done! Total Bill: ₱" . number_format($total, 2) . ". Please proceed to the counter for payment.",
                        'reference_type'    => 'service_job',
                        'reference_id'      => $job,
                        'is_read'           => false,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }
            });
        }

        return $this->jobDetails($request, $job);
    }
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MechanicController.php
git commit -m "feat: mechanic updateJobStatus uses action-based transitions with work_done notification"
```

---

## Task 7: Backend — Update `ServiceFlowTest.php`

**Files:**
- Modify: `Backend/tests/Feature/ServiceFlowTest.php`

The following existing tests break because of the new state machine:
- `test_start_service_transitions_to_in_progress` → now expects `booked_confirmed`
- `test_cancel_service_rejects_non_pending_job` → non-pending is now cancellable
- `test_bill_service_creates_sale_without_deducting_stock_again` → requires `work_done`
- `test_bill_service_uses_only_confirmed_parts_and_accepts_labor_cost` → requires `work_done`
- `test_mechanic_status_update_creates_customer_notification` → uses old `status` string

- [ ] **Step 1: Add `createJobInStatus` helper to the test class (in `// --- helpers ---` section)**

```php
    private function createJobInStatus(string $statusCode, ?int $customerUserId = null): int
    {
        $jobId = $this->createJob($customerUserId);
        DB::table('service_jobs')->where('job_id', $jobId)->update([
            'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', $statusCode),
        ]);
        return $jobId;
    }
```

- [ ] **Step 2: Update `test_start_service_transitions_to_in_progress`**

Replace:
```php
    public function test_start_service_transitions_to_in_progress(): void
    {
        $jobId = $this->createJob();

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
```
With:
```php
    public function test_start_service_transitions_to_booked_confirmed(): void
    {
        $jobId = $this->createJob();

        $response = $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
                'mechanicIds' => [(string) $this->mechanicId],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'Confirmed')
            ->assertJsonPath('data.statusCode', 'booked_confirmed');

        $this->assertDatabaseHas('service_job_mechanics', ['job_id_fk' => $jobId, 'mechanic_id_fk' => $this->mechanicId]);

        $statusCode = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $jobId)
            ->value('service_job_statuses.status_code');
        $this->assertEquals('booked_confirmed', $statusCode);
    }
```

- [ ] **Step 3: Update `test_cancel_service_rejects_non_pending_job` → now tests terminal states are rejected**

Replace:
```php
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
With:
```php
    public function test_cancel_service_rejects_terminal_states(): void
    {
        foreach (['completed', 'cancelled'] as $terminalCode) {
            $jobId = $this->createJobInStatus($terminalCode);
            $this->withToken($this->token)
                ->postJson("http://default.mospams.local/api/services/{$jobId}/cancel")
                ->assertStatus(422);
        }
    }

    public function test_cancel_service_allows_active_states(): void
    {
        foreach (['booked_confirmed', 'in_progress', 'work_done'] as $activeCode) {
            $jobId = $this->createJobInStatus($activeCode);
            $this->withToken($this->token)
                ->postJson("http://default.mospams.local/api/services/{$jobId}/cancel")
                ->assertOk()
                ->assertJsonPath('data.statusCode', 'cancelled');
        }
    }
```

- [ ] **Step 4: Update `test_bill_service_creates_sale_without_deducting_stock_again`**

Find `$jobId = $this->createJobWithPart();` in this test, change to:
```php
        $jobId = $this->createJobWithPart();
        // Transition to work_done (prerequisite for billing)
        DB::table('service_jobs')->where('job_id', $jobId)->update([
            'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'work_done'),
        ]);
```

- [ ] **Step 5: Update `test_bill_service_uses_only_confirmed_parts_and_accepts_labor_cost`**

Add the `work_done` transition after `$jobId = $this->createJob();`:
```php
        $jobId = $this->createJob();
        // Transition to work_done
        DB::table('service_jobs')->where('job_id', $jobId)->update([
            'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'work_done'),
        ]);
```

- [ ] **Step 6: Update `test_mechanic_status_update_creates_customer_notification`**

Replace the PATCH call body from `['status' => 'In Progress']` to use new action-based API.

Find:
```php
        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'status' => 'In Progress',
            ])
            ->assertOk();
```
With:
```php
        // First confirm the booking (staff action) to get to booked_confirmed
        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
                'mechanicIds' => [(string) $this->mechanicId],
            ])
            ->assertOk();

        // Mechanic starts the service
        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'action' => 'start',
            ])
            ->assertOk();
```

- [ ] **Step 7: Add new tests for the complete handshake flow**

Add these test methods before the `// --- helpers ---` section:

```php
    // --- Full handshake flow ---

    public function test_confirm_booking_notifies_customer(): void
    {
        $customerUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => (int) DB::table('roles')->where('role_name', 'Customer')->value('role_id'),
            'full_name'         => 'Notify Customer',
            'username'          => 'notify.customer@test.com',
            'email'             => 'notify.customer@test.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $jobId = $this->createJob($customerUserId);

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/start", [
                'mechanicIds' => [(string) $this->mechanicId],
            ])
            ->assertOk()
            ->assertJsonPath('data.statusCode', 'booked_confirmed');

        $this->assertDatabaseHas('notifications', [
            'user_id_fk'        => $customerUserId,
            'notification_type' => 'job_status_update',
            'reference_id'      => $jobId,
        ]);
    }

    public function test_mechanic_start_action_transitions_booked_confirmed_to_in_progress(): void
    {
        $jobId = $this->createJobInStatus('booked_confirmed');
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'action' => 'start',
            ])
            ->assertOk()
            ->assertJsonPath('data.statusCode', 'in_progress');
    }

    public function test_mechanic_complete_action_transitions_in_progress_to_work_done(): void
    {
        $jobId = $this->createJobInStatus('in_progress');
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'action'    => 'complete',
                'laborCost' => 500,
            ])
            ->assertOk()
            ->assertJsonPath('data.statusCode', 'work_done');

        $laborCost = DB::table('service_job_items')->where('job_id_fk', $jobId)->value('labor_cost');
        $this->assertEquals(500.0, (float) $laborCost);
    }

    public function test_mechanic_complete_requires_labor_cost(): void
    {
        $jobId = $this->createJobInStatus('in_progress');
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'action' => 'complete',
            ])
            ->assertStatus(422);
    }

    public function test_bill_service_rejects_non_work_done_job(): void
    {
        $jobId = $this->createJobInStatus('in_progress');

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", [
                'paymentMethod' => 'Cash',
            ])
            ->assertStatus(422);
    }

    public function test_work_done_notifies_customer_with_total(): void
    {
        $customerUserId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => (int) DB::table('roles')->where('role_name', 'Customer')->value('role_id'),
            'full_name'         => 'Bill Customer',
            'username'          => 'bill.customer@test.com',
            'email'             => 'bill.customer@test.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id'),
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
        $jobId = $this->createJobInStatus('in_progress', $customerUserId);
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->mechanicToken)
            ->patchJson("http://default.mospams.local/api/mechanic/jobs/{$jobId}/status", [
                'action'    => 'complete',
                'laborCost' => 350,
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id_fk'        => $customerUserId,
            'notification_type' => 'job_status_update',
            'title'             => 'Service Complete — Ready for Payment',
            'reference_id'      => $jobId,
        ]);
    }
```

- [ ] **Step 8: Run all tests**

Run: `cd Backend && php artisan test tests/Feature/ServiceFlowTest.php --stop-on-failure`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add Backend/tests/Feature/ServiceFlowTest.php
git commit -m "test: update ServiceFlowTest for new handshake state machine"
```

---

## Task 8: Frontend — Update shared types

**Files:**
- Modify: `Frontend/src/shared/types/index.ts`

- [ ] **Step 1: Update `ServiceRecord` interface**

Find:
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
Replace with:
```ts
export interface ServiceRecord {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Confirmed' | 'Ongoing' | 'Work Done' | 'Completed' | 'Cancelled';
  statusCode: string;
  partsUsed: { jobPartId: string; partId: string; name?: string; quantity: number; unitPrice?: number; status: string }[];
  partRequests: { jobPartId: string; partId: string; name: string; quantity: number; unitPrice: number; requestedBy: string; status: string }[];
  mechanics: { id: string; name: string }[];
  notes: string;
  createdAt: string;
  completedAt?: string;
}
```

- [ ] **Step 2: Update `CustomerService` interface**

Find:
```ts
export interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  notes: string;
  mechanics: { name: string }[];
  partsUsed: { name: string; quantity: number }[];
  createdAt: string;
  completedAt?: string;
}
```
Replace with:
```ts
export interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  statusCode: string;
  notes: string;
  mechanics: { name: string }[];
  partsUsed: { name: string; quantity: number }[];
  totalBill?: number;
  createdAt: string;
  completedAt?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/shared/types/index.ts
git commit -m "feat: add new statuses and statusCode to ServiceRecord and CustomerService types"
```

---

## Task 9: Frontend — Update ServicesPage (Staff view)

**Files:**
- Modify: `Frontend/src/features/services/pages/ServicesPage.tsx`
- Modify: `Frontend/src/features/services/components/StartServiceModal.tsx`

The new action layout per job status:

| Status (display) | statusCode | Staff Actions |
|---|---|---|
| Pending | pending | **[Confirm Booking]** (opens mechanic picker), [Cancel] |
| Confirmed | booked_confirmed | [Cancel] |
| Ongoing | in_progress | [Add Items], [Cancel] |
| Work Done | work_done | **[Confirm Payment]** (opens bill dialog), [Cancel] |
| Completed | completed | badge only |
| Cancelled | cancelled | badge only |

Pulse indicators in the header: count of `work_done` jobs (Ready for Payment) and total pending part requests.

- [ ] **Step 1: Update `STATUS_STYLES` to add Confirmed and Work Done**

Find:
```ts
const STATUS_STYLES = {
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock },
  Ongoing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: Wrench },
  Completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: CheckCircle2 },
  Cancelled: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
};
```
Replace with:
```ts
const STATUS_STYLES = {
  Pending:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  icon: Clock },
  Confirmed: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', icon: Users },
  Ongoing:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   icon: Wrench },
  'Work Done': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: CheckCircle2 },
  Completed: { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  icon: CheckCircle2 },
  Cancelled: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    icon: XCircle },
};
```

- [ ] **Step 2: Update `StatusFilter` type and filter bar**

Find:
```ts
type StatusFilter = 'All' | 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled';
```
Replace with:
```ts
type StatusFilter = 'All' | 'Pending' | 'Confirmed' | 'Ongoing' | 'Work Done' | 'Completed' | 'Cancelled';
```

Find the `statusCounts` memo:
```ts
  const statusCounts = useMemo(() => ({
    All: services.length,
    Pending: services.filter(s => s.status === 'Pending').length,
    Ongoing: services.filter(s => s.status === 'Ongoing').length,
    Completed: services.filter(s => s.status === 'Completed').length,
    Cancelled: services.filter(s => s.status === 'Cancelled').length,
  }), [services]);
```
Replace with:
```ts
  const statusCounts = useMemo(() => ({
    All:        services.length,
    Pending:    services.filter(s => s.status === 'Pending').length,
    Confirmed:  services.filter(s => s.status === 'Confirmed').length,
    Ongoing:    services.filter(s => s.status === 'Ongoing').length,
    'Work Done': services.filter(s => s.status === 'Work Done').length,
    Completed:  services.filter(s => s.status === 'Completed').length,
    Cancelled:  services.filter(s => s.status === 'Cancelled').length,
  }), [services]);
```

Find the filter button loop:
```tsx
        {(['All', 'Pending', 'Ongoing', 'Completed', 'Cancelled'] as StatusFilter[]).map(s => (
```
Replace with:
```tsx
        {(['All', 'Pending', 'Confirmed', 'Ongoing', 'Work Done', 'Completed', 'Cancelled'] as StatusFilter[]).map(s => (
```

- [ ] **Step 3: Add pulse indicators computed values**

After `const statusCounts = useMemo(...)`, add:
```ts
  const workDoneCount = useMemo(() => services.filter(s => s.statusCode === 'work_done').length, [services]);
  const pendingRequestsCount = useMemo(() => services.reduce((sum, s) => sum + (s.partRequests?.length ?? 0), 0), [services]);
```

- [ ] **Step 4: Add pulse indicator badges to the page header**

Find the main heading section that contains "Services" (or the motion.div with the title and Add button). It looks like:
```tsx
      <motion.div {...fadeUp()} className="flex items-center justify-between flex-wrap gap-3">
```

After the title (which is something like `<h1 className="...">Services</h1>`), add pulse indicators. Find the title text line in that header div and, after the title, add:
```tsx
          <div className="flex items-center gap-3 flex-wrap">
            {workDoneCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {workDoneCount} Ready for Payment
              </span>
            )}
            {pendingRequestsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {pendingRequestsCount} Part Request{pendingRequestsCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
```

- [ ] **Step 5: Update action buttons per status**

Find the action buttons section (lines 335–364 area):
```tsx
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
```
Replace with:
```tsx
                  {service.statusCode === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => setStartJobTarget(service)}
                        className="h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3">
                        Confirm Booking
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {service.statusCode === 'booked_confirmed' && (
                    <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                      className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                      Cancel
                    </Button>
                  )}
                  {service.statusCode === 'in_progress' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAddPartsModal(service)}
                        className="h-8 rounded-xl border-border dark:border-zinc-700 text-muted-foreground hover:text-foreground text-xs px-3">
                        Add Items
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {service.statusCode === 'work_done' && (
                    <>
                      <Button size="sm" onClick={() => { setBillJob(service); setBillLaborCost(service.laborCost); }}
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3">
                        Confirm Payment
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCancelConfirm(service.id)}
                        className="h-8 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs px-3">
                        Cancel
                      </Button>
                    </>
                  )}
                  {(service.statusCode === 'completed' || service.statusCode === 'cancelled') && (
                    <span className={`inline-flex h-8 items-center px-3 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                      {service.status}
                    </span>
                  )}
```

Also update the part-requests visibility (currently `service.status === 'Ongoing'`):
Find:
```tsx
              {service.status === 'Ongoing' && pendingRequests > 0 && (
```
Replace with:
```tsx
              {service.statusCode === 'in_progress' && pendingRequests > 0 && (
```

- [ ] **Step 6: Update `StartServiceModal` label to "Confirm Booking"**

In `Frontend/src/features/services/components/StartServiceModal.tsx`, find:
```tsx
          <DialogTitle className="text-base font-semibold text-foreground">Start Service</DialogTitle>
```
Replace with:
```tsx
          <DialogTitle className="text-base font-semibold text-foreground">Confirm Booking</DialogTitle>
```

And find:
```tsx
            {loading ? 'Starting…' : 'Confirm Start'}
```
Replace with:
```tsx
            {loading ? 'Confirming…' : 'Confirm Booking'}
```

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/features/services/pages/ServicesPage.tsx Frontend/src/features/services/components/StartServiceModal.tsx
git commit -m "feat: ServicesPage new status styles, action buttons, and pulse indicators"
```

---

## Task 10: Frontend — Update `StatusUpdateDialog` (Mechanic)

**Files:**
- Modify: `Frontend/src/features/mechanic/components/StatusUpdateDialog.tsx`

Replace the generic status picker with context-aware action buttons. The mechanic only ever has one next action:
- If `statusCode === 'booked_confirmed'` → show **[Start Service]** button (calls `action: 'start'`)
- If `statusCode === 'in_progress'` → show **[Mark as Complete]** with a labor cost input (calls `action: 'complete'`)

- [ ] **Step 1: Replace the full `StatusUpdateDialog.tsx` file**

```tsx
import { useState } from 'react';
import { X, Wrench, CheckCircle2, DollarSign } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface StatusUpdateDialogProps {
  jobId: string;
  statusCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusUpdateDialog({ jobId, statusCode, onClose, onSuccess }: StatusUpdateDialogProps) {
  const [laborCost, setLaborCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canStart    = statusCode === 'booked_confirmed';
  const canComplete = statusCode === 'in_progress';

  if (!canStart && !canComplete) return null;

  async function handleAction(action: 'start' | 'complete') {
    if (action === 'complete' && (laborCost === '' || isNaN(Number(laborCost)))) {
      toast.error('Please enter a valid labor cost.');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'complete') body.laborCost = Number(laborCost);
      await apiMutation(`/api/mechanic/jobs/${jobId}/status`, 'PATCH', body);
      toast.success(action === 'start' ? 'Service started!' : 'Work marked as complete!');
      onSuccess();
    } catch {
      toast.error('Failed to update job status.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-muted border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {canStart ? 'Start Service' : 'Complete Work'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {canStart && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <Wrench className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">
                Tap <strong>Start Service</strong> when the customer arrives and you begin working on the motorcycle.
              </p>
            </div>
          )}

          {canComplete && (
            <>
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-300">
                  Enter the final labor cost for this job. The customer will be notified with the total bill.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1 text-muted-foreground" />
                  Final Labor Cost (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborCost}
                  onChange={e => setLaborCost(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-colors">
            Cancel
          </button>
          {canStart && (
            <button
              onClick={() => handleAction('start')}
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Starting…' : 'Start Service'}
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => handleAction('complete')}
              disabled={submitting || laborCost === ''}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Completing…' : 'Mark as Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update callers of `StatusUpdateDialog` in `JobDetailsPage.tsx`**

The `StatusUpdateDialog` now takes `statusCode` instead of `currentStatus`. Find in `JobDetailsPage.tsx`:
```tsx
      {showStatusUpdate && job && (
        <StatusUpdateDialog
          jobId={job.id}
          currentStatus={job.statusCode}
          onClose={() => setShowStatusUpdate(false)}
          onSuccess={() => { setShowStatusUpdate(false); void loadJobDetails(); }}
        />
      )}
```
Replace with:
```tsx
      {showStatusUpdate && job && (
        <StatusUpdateDialog
          jobId={job.id}
          statusCode={job.statusCode}
          onClose={() => setShowStatusUpdate(false)}
          onSuccess={() => { setShowStatusUpdate(false); void loadJobDetails(); }}
        />
      )}
```

Also check that the "Update Status" button in `JobDetailsPage.tsx` is only shown when the action is available (i.e. `statusCode` is `booked_confirmed` or `in_progress`). Find the button that opens `setShowStatusUpdate(true)` and add a condition. Replace:
```tsx
            <button onClick={() => setShowStatusUpdate(true)} ...>
              Update Status
            </button>
```
With:
```tsx
            {(job.statusCode === 'booked_confirmed' || job.statusCode === 'in_progress') && (
              <button onClick={() => setShowStatusUpdate(true)} ...>
                {job.statusCode === 'booked_confirmed' ? 'Start Service' : 'Mark as Complete'}
              </button>
            )}
```
(Exact surrounding JSX may vary — preserve all existing className/styling attributes.)

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/mechanic/components/StatusUpdateDialog.tsx Frontend/src/features/mechanic/pages/JobDetailsPage.tsx
git commit -m "feat: mechanic StatusUpdateDialog replaced with action-specific start/complete UI"
```

---

## Task 11: Frontend — Update `AssignedJobsPage.tsx` (Mechanic job list)

**Files:**
- Modify: `Frontend/src/features/mechanic/pages/AssignedJobsPage.tsx`

- [ ] **Step 1: Add `booked_confirmed` and `work_done` to `getStatusColor` and `getStatusIcon`**

Find `getStatusColor`:
```ts
  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20';
    }
  };
```
Replace with:
```ts
  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'booked_confirmed':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'work_done':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20';
    }
  };
```

Find `getStatusIcon`:
```ts
  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return Wrench;
      case 'completed':
        return CheckCircle2;
      default:
        return AlertCircle;
    }
  };
```
Replace with:
```ts
  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'pending':          return Clock;
      case 'booked_confirmed': return Users;
      case 'in_progress':      return Wrench;
      case 'work_done':        return CheckCircle2;
      case 'completed':        return CheckCircle2;
      default:                 return AlertCircle;
    }
  };
```

Also add `Users` to the imports at the top of `AssignedJobsPage.tsx`:

Find:
```ts
import { Wrench, Search, Clock, CheckCircle2, AlertCircle, ArrowRight, Users, Package } from 'lucide-react';
```
`Users` is already imported — no change needed.

- [ ] **Step 2: Add `booked_confirmed` and `work_done` to the status filter `<select>`**

The status filter is a `<select>` element. Find:
```tsx
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-700"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
```
Replace with:
```tsx
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-700"
        >
          <option value="all">All Status</option>
          <option value="booked_confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="work_done">Work Done</option>
          <option value="completed">Completed</option>
        </select>
```

- [ ] **Step 3: Update status label display in job cards**

Find where `job.status` (the display name) or `job.statusCode` is used to display the status label in the card. Ensure `booked_confirmed` renders as "Confirmed" and `work_done` renders as "Work Done".

Add a helper function after the `getStatusColor` function:
```ts
  const getStatusLabel = (statusCode: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      booked_confirmed: 'Confirmed',
      in_progress: 'In Progress',
      work_done: 'Work Done',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[statusCode] ?? statusCode;
  };
```

Replace any `{job.status}` in the card body with `{getStatusLabel(job.statusCode)}`.

- [ ] **Step 4: Add action indicator badge on card (e.g. arrow icon for actionable jobs)**

In the job list card, after the status badge, add a visual cue for actionable jobs. Find where each job card renders (the `filteredJobs.map(job => ...)` block) and add after the `<ArrowRight>` button:

```tsx
              {(job.statusCode === 'booked_confirmed' || job.statusCode === 'in_progress') && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  job.statusCode === 'booked_confirmed'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {job.statusCode === 'booked_confirmed' ? '▶ Start' : '✓ Complete'}
                </span>
              )}
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/mechanic/pages/AssignedJobsPage.tsx
git commit -m "feat: AssignedJobsPage shows booked_confirmed/work_done statuses and action cues"
```

---

## Task 12: Frontend — Update `ServiceHistory.tsx` (Customer view)

**Files:**
- Modify: `Frontend/src/features/customers/pages/ServiceHistory.tsx`

Changes:
- Show new status labels for `booked_confirmed` and `work_done`
- Show a total bill preview when status is `work_done`
- Cancel button already only works for `pending` (backend guards it); but hide it for non-pending on the frontend too

- [ ] **Step 1: Add status style map for new statuses**

In `ServiceHistory.tsx`, find the section that uses `s.status` to apply colours/icons. Add colour entries for the new statuses. Look for any conditional className based on status and add:

If there's a helper function like `getStatusStyle(status)`, add:
```ts
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':    return { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  label: 'Pending' };
      case 'confirmed':
      case 'booked & confirmed': return { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', label: 'Confirmed' };
      case 'ongoing':
      case 'in progress': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'In Progress' };
      case 'work done':  return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Work Done' };
      case 'completed':  return { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  label: 'Completed' };
      case 'cancelled':  return { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    label: 'Cancelled' };
      default:           return { bg: 'bg-muted',         text: 'text-muted-foreground', border: 'border-border', label: status };
    }
  };
```

- [ ] **Step 2: Hide Cancel button for non-pending jobs**

Find the cancel button render. It currently shows for jobs not `Completed` or `Cancelled`. Change to show only for `Pending`:

Find (approximate):
```tsx
              {s.status !== 'Completed' && s.status !== 'Cancelled' && (
```
Or whatever condition guards the cancel button — change to:
```tsx
              {s.status === 'Pending' && (
```

- [ ] **Step 3: Show bill preview for `Work Done` jobs**

After the status badge in each service card, add a bill preview section for `work_done` jobs. First find the card body and add:

```tsx
              {s.status === 'Work Done' && (
                <div className="mt-3 pt-3 border-t border-border bg-orange-500/5 rounded-xl p-3">
                  <p className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Service complete — awaiting payment
                  </p>
                  {s.partsUsed.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {s.partsUsed.map((p, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{p.name} × {p.quantity}</p>
                      ))}
                    </div>
                  )}
                  {s.laborCost > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Labor: ₱{s.laborCost.toLocaleString()}</p>
                  )}
                </div>
              )}
```

- [ ] **Step 4: Update status filter to include new statuses**

Find the `StatusFilter` type and filter bar in ServiceHistory. Add `'Confirmed' | 'Work Done'` to the type and add filter chips for them.

- [ ] **Step 5: Also update `CustomerController` to return `statusCode` in customer service response**

In `Backend/app/Http/Controllers/Api/CustomerController.php`, find the `services()` method map (around line 51):
```php
            'status'           => match ($row->status_name) { 'In Progress' => 'Ongoing', default => $row->status_name },
```
Replace with:
```php
            'status'           => match ($row->status_name) {
                'In Progress'      => 'Ongoing',
                'Booked & Confirmed' => 'Confirmed',
                'Work Done'        => 'Work Done',
                default            => $row->status_name,
            },
            'statusCode'       => $row->status_code ?? '',
```

And update the query that fetches service jobs to include `status_code`:

Find in CustomerController `services()`:
```php
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
```
Replace with:
```php
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost')
```

- [ ] **Step 6: Commit all**

```bash
git add Frontend/src/features/customers/pages/ServiceHistory.tsx Backend/app/Http/Controllers/Api/CustomerController.php
git commit -m "feat: ServiceHistory shows new statuses, hides cancel for confirmed+, shows work_done bill preview"
```

---

## Task 13: Deploy

- [ ] **Step 1: Run full test suite**

Run: `cd Backend && php artisan test`
Expected: All tests pass (no failures).

- [ ] **Step 2: Run frontend build check**

Run: `cd Frontend && npm run build`
Expected: Build completes with 0 TypeScript errors.

- [ ] **Step 3: Deploy**

```bash
bash deploy.sh
```
Expected: git push + AWS Docker container rebuilt and restarted.
