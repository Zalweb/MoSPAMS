# Shop Service End-to-End Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Services → Mechanic Assignment → Billing → Stock Deduction → Customer Portal into one unbroken workflow.

**Architecture:** Add a `service_job_mechanics` junction table for multi-mechanic support. Extend the existing `serviceResource` helper to include named mechanics and parts. Add a `POST /services/{id}/bill` endpoint that converts a job's recorded parts + labor into a Sale/Payment record (reusing existing transaction logic). Wire the frontend to show mechanics on service cards, a "Bill this Job" modal, and enrich the customer portal with live mechanics/parts visibility.

**Tech Stack:** PHP 8.x / Laravel 11, MySQL, React 18 / TypeScript / Vite, Tailwind CSS, Framer Motion, Zod, React Hook Form

---

## File Map

### Created
- `Backend/database/migrations/2026_05_07_000001_create_service_job_mechanics_table.php`
- `Backend/tests/Feature/ServiceFlowTest.php`

### Modified
- `Backend/app/Http/Controllers/Api/MospamsController.php` — serviceResource helper, storeService, updateService, + 3 new methods
- `Backend/app/Http/Controllers/Api/CustomerController.php` — services() and payments() enrichment
- `Backend/routes/api.php` — 3 new routes
- `Frontend/src/shared/types/index.ts` — ServiceRecord type update
- `Frontend/src/features/services/pages/ServicesPage.tsx` — mechanic multi-select, named parts, Bill modal
- `Frontend/src/features/customers/pages/CustomerDashboard.tsx` — mechanics + parts on cards
- `Frontend/src/features/customers/pages/ServiceHistory.tsx` — mechanics + parts on cards

---

## Task 1: DB Migration — service_job_mechanics table

**Files:**
- Create: `Backend/database/migrations/2026_05_07_000001_create_service_job_mechanics_table.php`

- [ ] **Step 1: Create the migration file**

```php
<?php
// Backend/database/migrations/2026_05_07_000001_create_service_job_mechanics_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_job_mechanics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id_fk')->constrained('service_jobs', 'job_id')->cascadeOnDelete();
            $table->foreignId('mechanic_id_fk')->constrained('mechanics', 'mechanic_id')->cascadeOnDelete();
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->unique(['job_id_fk', 'mechanic_id_fk']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_job_mechanics');
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd Backend && php artisan migrate
```

Expected output includes: `2026_05_07_000001_create_service_job_mechanics_table ......... done`

- [ ] **Step 3: Verify the table exists**

```bash
php artisan db:show --json | grep service_job_mechanics
```

Expected: line containing `service_job_mechanics`

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_07_000001_create_service_job_mechanics_table.php
git commit -m "feat: add service_job_mechanics junction table for multi-mechanic assignment"
```

---

## Task 2: Write Feature Tests for new service flow endpoints

**Files:**
- Create: `Backend/tests/Feature/ServiceFlowTest.php`

These tests will FAIL until Tasks 3–7 are complete. Write them first so you have a red/green signal.

- [ ] **Step 1: Create the test file**

```php
<?php
// Backend/tests/Feature/ServiceFlowTest.php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ServiceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private int $shopId;
    private int $adminId;
    private int $mechanicId;
    private int $partId;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);

        $this->seed();

        $this->shopId = (int) DB::table('shops')->value('shop_id');
        $ownerRoleId  = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
        $activeStatus = (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        $this->adminId = (int) DB::table('users')->insertGetId([
            'shop_id_fk'        => $this->shopId,
            'role_id_fk'        => $ownerRoleId,
            'full_name'         => 'Flow Admin',
            'username'          => 'flowadmin@test.com',
            'email'             => 'flowadmin@test.com',
            'password_hash'     => Hash::make('password'),
            'user_status_id_fk' => $activeStatus,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $mechanicStatus = (int) DB::table('mechanic_statuses')->where('status_code', 'active')->value('mechanic_status_id');
        $this->mechanicId = (int) DB::table('mechanics')->insertGetId([
            'shop_id_fk'              => $this->shopId,
            'full_name'               => 'Pedro Santos',
            'phone'                   => null,
            'email'                   => null,
            'address'                 => null,
            'mechanic_status_id_fk'   => $mechanicStatus,
            'created_at'              => now(),
            'updated_at'              => now(),
        ]);

        $partStatus = (int) DB::table('part_statuses')->where('status_code', 'in_stock')->value('part_status_id');
        $catStatus  = (int) DB::table('category_statuses')->where('status_code', 'active')->value('category_status_id');
        $catId      = (int) DB::table('categories')->insertGetId([
            'shop_id_fk'                => $this->shopId,
            'category_name'             => 'Oil',
            'category_status_id_fk'     => $catStatus,
            'created_at'                => now(),
            'updated_at'                => now(),
        ]);
        $this->partId = (int) DB::table('parts')->insertGetId([
            'shop_id_fk'          => $this->shopId,
            'category_id_fk'      => $catId,
            'part_name'           => 'Motul 10W-40',
            'barcode'             => '1234567890',
            'unit_price'          => 220.00,
            'stock_quantity'      => 10,
            'reorder_level'       => 2,
            'part_status_id_fk'   => $partStatus,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        DB::table('service_types')->insertGetId([
            'shop_id_fk'                   => $this->shopId,
            'service_name'                 => 'Oil Change',
            'labor_cost'                   => 350.00,
            'service_type_status_id_fk'    => DB::table('service_type_statuses')->where('status_code', 'active')->value('service_type_status_id'),
            'created_at'                   => now(),
            'updated_at'                   => now(),
        ]);

        $this->token = $this->login('flowadmin@test.com');
    }

    // --- storeService with mechanicIds ---

    public function test_store_service_assigns_mechanics(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/services', [
                'customerName'    => 'Juan Dela Cruz',
                'motorcycleModel' => 'Honda Click 150i',
                'serviceType'     => 'Oil Change',
                'laborCost'       => 350,
                'status'          => 'Pending',
                'mechanicIds'     => [(string) $this->mechanicId],
                'partsUsed'       => [],
                'notes'           => '',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.mechanics.0.name', 'Pedro Santos');

        $this->assertDatabaseHas('service_job_mechanics', [
            'mechanic_id_fk' => $this->mechanicId,
        ]);
    }

    public function test_store_service_records_named_parts(): void
    {
        $response = $this->withToken($this->token)
            ->postJson('http://default.mospams.local/api/services', [
                'customerName'    => 'Maria Reyes',
                'motorcycleModel' => 'Yamaha Mio',
                'serviceType'     => 'Oil Change',
                'laborCost'       => 350,
                'status'          => 'Pending',
                'mechanicIds'     => [],
                'partsUsed'       => [['partId' => (string) $this->partId, 'quantity' => 1]],
                'notes'           => '',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.partsUsed.0.name', 'Motul 10W-40')
            ->assertJsonPath('data.partsUsed.0.quantity', 1);
    }

    // --- updateService mechanic sync ---

    public function test_update_service_syncs_mechanics(): void
    {
        $jobId = $this->createJob();

        $this->withToken($this->token)
            ->patchJson("http://default.mospams.local/api/services/{$jobId}", [
                'mechanicIds' => [(string) $this->mechanicId],
            ])
            ->assertOk()
            ->assertJsonPath('data.mechanics.0.id', (string) $this->mechanicId);

        // Remove by passing empty array
        $this->withToken($this->token)
            ->patchJson("http://default.mospams.local/api/services/{$jobId}", [
                'mechanicIds' => [],
            ])
            ->assertOk();

        $this->assertDatabaseMissing('service_job_mechanics', ['job_id_fk' => $jobId]);
    }

    // --- billService ---

    public function test_bill_service_creates_sale_and_deducts_stock(): void
    {
        $jobId = $this->createJobWithPart();
        $stockBefore = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');

        $response = $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", [
                'paymentMethod' => 'Cash',
            ]);

        $response->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'type', 'items', 'total', 'paymentMethod']]);

        $stockAfter = (int) DB::table('parts')->where('part_id', $this->partId)->value('stock_quantity');
        $this->assertEquals($stockBefore - 1, $stockAfter);

        $this->assertDatabaseHas('sales', ['job_id_fk' => $jobId]);
        $this->assertDatabaseHas('payments', ['payment_method' => 'Cash']);

        // Job marked completed
        $statusCode = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $jobId)
            ->value('service_job_statuses.status_code');
        $this->assertEquals('completed', $statusCode);
    }

    public function test_bill_service_rejects_double_billing(): void
    {
        $jobId = $this->createJobWithPart();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", ['paymentMethod' => 'Cash'])
            ->assertCreated();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/bill", ['paymentMethod' => 'Cash'])
            ->assertStatus(422);
    }

    // --- assign / remove mechanic ---

    public function test_assign_mechanic_to_job(): void
    {
        $jobId = $this->createJob();

        $this->withToken($this->token)
            ->postJson("http://default.mospams.local/api/services/{$jobId}/mechanics", [
                'mechanicId' => (string) $this->mechanicId,
            ])
            ->assertOk()
            ->assertJsonPath('data.mechanics.0.name', 'Pedro Santos');
    }

    public function test_remove_mechanic_from_job(): void
    {
        $jobId = $this->createJob();
        DB::table('service_job_mechanics')->insert([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
            'shop_id_fk'     => $this->shopId,
            'assigned_at'    => now(),
        ]);

        $this->withToken($this->token)
            ->deleteJson("http://default.mospams.local/api/services/{$jobId}/mechanics/{$this->mechanicId}")
            ->assertOk();

        $this->assertDatabaseMissing('service_job_mechanics', [
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $this->mechanicId,
        ]);
    }

    // --- helpers ---

    private function createJob(): int
    {
        $customerId = (int) DB::table('customers')->insertGetId([
            'shop_id_fk' => $this->shopId,
            'full_name'  => 'Test Customer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $pendingStatus = (int) DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');
        $jobId = (int) DB::table('service_jobs')->insertGetId([
            'shop_id_fk'                  => $this->shopId,
            'customer_id_fk'              => $customerId,
            'created_by_fk'               => $this->adminId,
            'service_job_status_id_fk'    => $pendingStatus,
            'job_date'                    => now()->toDateString(),
            'motorcycle_model'            => 'Honda Click',
            'created_at'                  => now(),
            'updated_at'                  => now(),
        ]);
        DB::table('service_job_items')->insert([
            'job_id_fk'          => $jobId,
            'service_type_id_fk' => DB::table('service_types')->where('service_name', 'Oil Change')->value('service_type_id'),
            'labor_cost'         => 350,
            'remarks'            => null,
        ]);
        return $jobId;
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
        ]);
        return $jobId;
    }

    private function login(string $email): string
    {
        return $this->postJson('http://default.mospams.local/api/login', [
            'email'    => $email,
            'password' => 'password',
        ])->assertOk()->json('token');
    }
}
```

- [ ] **Step 2: Run the tests and confirm they all FAIL**

```bash
cd Backend && php artisan test tests/Feature/ServiceFlowTest.php --colors
```

Expected: All tests FAIL (methods not yet implemented).

---

## Task 3: Update serviceResource helper — add mechanics[] and named parts

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (around line 1216 — the `serviceResource` private method)

The current `serviceResource` returns `partsUsed` with only `partId` and `quantity`. It does not include mechanic data. This task enriches both.

- [ ] **Step 1: Replace the `serviceResource` private method**

Find the existing method (line ~1216):
```php
private function serviceResource(object $row): array
{
    $parts = DB::table('service_job_parts')
        ->where('job_id_fk', $row->job_id)
        ->get()
        ->map(fn ($part) => ['partId' => (string) $part->part_id_fk, 'quantity' => (int) $part->quantity])
        ->values();

    return [
        'id' => (string) $row->job_id,
        ...
        'partsUsed' => $parts,
        ...
    ];
}
```

Replace with:
```php
private function serviceResource(object $row): array
{
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

    $mechanics = DB::table('service_job_mechanics')
        ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
        ->where('service_job_mechanics.job_id_fk', $row->job_id)
        ->get()
        ->map(fn ($m) => [
            'id'   => (string) $m->mechanic_id_fk,
            'name' => $m->full_name,
        ])
        ->values();

    return [
        'id'              => (string) $row->job_id,
        'customerName'    => $row->customer_name,
        'motorcycleModel' => $row->motorcycle_model ?? '',
        'serviceType'     => $row->service_name ?? 'General Service',
        'laborCost'       => (float) ($row->labor_cost ?? 0),
        'status'          => $row->status_name,
        'partsUsed'       => $parts,
        'mechanics'       => $mechanics,
        'notes'           => $row->notes ?? '',
        'createdAt'       => $this->iso($row->created_at),
        'completedAt'     => $row->completion_date ? $this->iso($row->completion_date) : null,
    ];
}
```

- [ ] **Step 2: Verify existing services endpoint still returns 200**

```bash
cd Backend && php artisan test tests/Feature/MospamsApiTest.php --colors
```

Expected: All existing tests still PASS.

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: enrich serviceResource with named parts and mechanics list"
```

---

## Task 4: Extend storeService and updateService to accept mechanicIds and partsUsed sync

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Extend validation in `storeService`**

In `storeService`, find the validation block (line ~535):
```php
$data = $request->validate([
    'customerName' => ...,
    ...
    'notes' => ['nullable', 'string'],
]);
```

Add `mechanicIds` to the validation:
```php
$data = $request->validate([
    'customerName'             => ['required', 'string', 'max:100'],
    'motorcycleModel'          => ['nullable', 'string', 'max:150'],
    'serviceType'              => ['required', 'string', 'max:100'],
    'laborCost'                => ['required', 'numeric', 'min:0'],
    'status'                   => ['nullable', Rule::in(['Pending', 'Ongoing', 'Completed'])],
    'partsUsed'                => ['array'],
    'partsUsed.*.partId'       => ['required'],
    'partsUsed.*.quantity'     => ['required', 'integer', 'min:1'],
    'mechanicIds'              => ['array'],
    'mechanicIds.*'            => ['string'],
    'notes'                    => ['nullable', 'string'],
]);
```

- [ ] **Step 2: Insert mechanic assignments inside the `storeService` transaction**

Inside the DB transaction in `storeService`, after the `service_job_parts` loop ends (line ~581), add:

```php
foreach ($data['mechanicIds'] ?? [] as $rawId) {
    $mechId = $this->numericId($rawId);
    if (DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->exists()) {
        DB::table('service_job_mechanics')->insertOrIgnore([
            'job_id_fk'      => $jobId,
            'mechanic_id_fk' => $mechId,
            'shop_id_fk'     => $this->shopId(),
            'assigned_at'    => now(),
        ]);
    }
}
```

- [ ] **Step 3: Extend validation in `updateService`**

In `updateService`, find the validation block (line ~593):
```php
$data = $request->validate([
    'customerName' => ...,
    ...
    'notes' => ['sometimes', 'nullable', 'string'],
]);
```

Add `mechanicIds` and `partsUsed`:
```php
$data = $request->validate([
    'customerName'         => ['sometimes', 'string', 'max:100'],
    'motorcycleModel'      => ['sometimes', 'nullable', 'string', 'max:150'],
    'serviceType'          => ['sometimes', 'string', 'max:100'],
    'laborCost'            => ['sometimes', 'numeric', 'min:0'],
    'status'               => ['sometimes', Rule::in(['Pending', 'Ongoing', 'Completed'])],
    'notes'                => ['sometimes', 'nullable', 'string'],
    'mechanicIds'          => ['sometimes', 'array'],
    'mechanicIds.*'        => ['string'],
    'partsUsed'            => ['sometimes', 'array'],
    'partsUsed.*.partId'   => ['required_with:partsUsed'],
    'partsUsed.*.quantity' => ['required_with:partsUsed', 'integer', 'min:1'],
]);
```

- [ ] **Step 4: Sync mechanics and parts inside the `updateService` transaction**

Inside the DB transaction in `updateService`, after the existing `service_job_items` upsert block, add:

```php
if (array_key_exists('mechanicIds', $data)) {
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
}

if (array_key_exists('partsUsed', $data)) {
    DB::table('service_job_parts')->where('job_id_fk', $service)->delete();
    foreach ($data['partsUsed'] as $used) {
        $part = DB::table('parts')
            ->where('part_id', $this->numericId($used['partId']))
            ->where('shop_id_fk', $this->shopId())
            ->first();
        if ($part) {
            DB::table('service_job_parts')->insert([
                'job_id_fk'  => $service,
                'part_id_fk' => $part->part_id,
                'quantity'   => $used['quantity'],
                'unit_price' => $part->unit_price,
                'subtotal'   => $part->unit_price * $used['quantity'],
            ]);
        }
    }
}
```

- [ ] **Step 5: Run the ServiceFlowTest for the two store/update tests**

```bash
cd Backend && php artisan test tests/Feature/ServiceFlowTest.php --filter="store_service_assigns_mechanics|store_service_records_named_parts|update_service_syncs_mechanics" --colors
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: extend storeService and updateService with mechanicIds and partsUsed sync"
```

---

## Task 5: Add assignMechanic and removeMechanic controller methods

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Add `assignMechanic` method**

Add after the `deleteService` method (line ~636):

```php
public function assignMechanic(Request $request, int $service): JsonResponse
{
    $data = $request->validate(['mechanicId' => ['required', 'string']]);

    $job = DB::table('service_jobs')
        ->where('job_id', $service)
        ->where('shop_id_fk', $this->shopId())
        ->first();
    abort_if(! $job, 404);

    $mechId = $this->numericId($data['mechanicId']);
    $mechanic = DB::table('mechanics')
        ->where('mechanic_id', $mechId)
        ->where('shop_id_fk', $this->shopId())
        ->first();
    abort_if(! $mechanic, 404);

    DB::table('service_job_mechanics')->insertOrIgnore([
        'job_id_fk'      => $service,
        'mechanic_id_fk' => $mechId,
        'shop_id_fk'     => $this->shopId(),
        'assigned_at'    => now(),
    ]);

    $this->log($request, 'Assigned mechanic '.$mechanic->full_name.' to job #'.$service, 'service_jobs', $service);

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 2: Add `removeMechanic` method**

Add directly after `assignMechanic`:

```php
public function removeMechanic(Request $request, int $service, int $mechanic): JsonResponse
{
    $job = DB::table('service_jobs')
        ->where('job_id', $service)
        ->where('shop_id_fk', $this->shopId())
        ->first();
    abort_if(! $job, 404);

    DB::table('service_job_mechanics')
        ->where('job_id_fk', $service)
        ->where('mechanic_id_fk', $mechanic)
        ->delete();

    $this->log($request, 'Removed mechanic #'.$mechanic.' from job #'.$service, 'service_jobs', $service);

    return response()->json(['data' => $this->serviceById($service)]);
}
```

- [ ] **Step 3: Run assign/remove tests**

```bash
cd Backend && php artisan test tests/Feature/ServiceFlowTest.php --filter="assign_mechanic|remove_mechanic" --colors
```

These still FAIL because the routes don't exist yet. Expected output: "Route [POST /services/{id}/mechanics] not found" or similar 404.

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: add assignMechanic and removeMechanic controller methods"
```

---

## Task 6: Add billService controller method

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Add `billService` method**

Add after `removeMechanic`:

```php
public function billService(Request $request, int $service): JsonResponse
{
    $data = $request->validate([
        'paymentMethod' => ['required', Rule::in(['Cash', 'GCash'])],
    ]);

    $job = DB::table('service_jobs')
        ->where('job_id', $service)
        ->where('shop_id_fk', $this->shopId())
        ->first();
    abort_if(! $job, 404);

    $alreadyBilled = DB::table('sales')->where('job_id_fk', $service)->exists();
    abort_if($alreadyBilled, 422, 'This job has already been billed.');

    $saleId = DB::transaction(function () use ($request, $job, $service, $data) {
        $jobParts = DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->where('service_job_parts.job_id_fk', $service)
            ->where('parts.shop_id_fk', $this->shopId())
            ->select('service_job_parts.*', 'parts.part_name', 'parts.stock_quantity')
            ->get();

        $laborCost  = (float) DB::table('service_job_items')
            ->where('job_id_fk', $service)
            ->sum('labor_cost');
        $partsTotal = $jobParts->sum(fn ($p) => $p->unit_price * $p->quantity);
        $total      = $partsTotal + $laborCost;

        $saleId = DB::table('sales')->insertGetId([
            'shop_id_fk'      => $this->shopId(),
            'customer_id_fk'  => $job->customer_id_fk,
            'job_id_fk'       => $service,
            'processed_by_fk' => $request->user()->user_id,
            'sale_type'       => 'service+parts',
            'total_amount'    => $total,
            'discount'        => 0,
            'net_amount'      => $total,
            'sale_date'       => now(),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        foreach ($jobParts as $p) {
            DB::table('sale_items')->insert([
                'sale_id_fk' => $saleId,
                'part_id_fk' => $p->part_id_fk,
                'quantity'   => $p->quantity,
                'unit_price' => $p->unit_price,
                'subtotal'   => $p->unit_price * $p->quantity,
            ]);
            DB::table('parts')->where('part_id', $p->part_id_fk)->update([
                'stock_quantity' => max(0, $p->stock_quantity - $p->quantity),
                'updated_at'     => now(),
            ]);
            $this->recordMovement(
                $p->part_id_fk,
                $request->user()->user_id,
                'out',
                $p->quantity,
                'Job #'.$service.' billing',
                'sale',
                $saleId
            );
        }

        DB::table('payments')->insert([
            'sale_id_fk'            => $saleId,
            'payment_method'        => $data['paymentMethod'],
            'amount_paid'           => $total,
            'payment_date'          => now(),
            'reference_number'      => null,
            'payment_status_id_fk'  => $this->statusId('payment_statuses', 'payment_status_id', 'paid'),
        ]);

        DB::table('service_jobs')->where('job_id', $service)->update([
            'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'completed'),
            'completion_date'          => now()->toDateString(),
            'updated_at'               => now(),
        ]);

        $this->log($request, 'Billed job #'.$service.' → sale #'.$saleId, 'sales', $saleId);

        return $saleId;
    });

    return response()->json(['data' => $this->transactionById($saleId)], 201);
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: add billService endpoint — converts job parts+labor into a sale"
```

---

## Task 7: Register new routes

**Files:**
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add three routes inside the shop middleware group**

In `api.php`, find the services routes block (lines ~82–90). After the existing `Route::delete('/services/{service}', ...)` line, add:

```php
Route::post('/services/{service}/mechanics', [MospamsController::class, 'assignMechanic'])->middleware('role:Owner,Staff');
Route::delete('/services/{service}/mechanics/{mechanic}', [MospamsController::class, 'removeMechanic'])->middleware('role:Owner,Staff');
Route::post('/services/{service}/bill', [MospamsController::class, 'billService'])->middleware('role:Owner,Staff');
```

- [ ] **Step 2: Run all ServiceFlowTest tests**

```bash
cd Backend && php artisan test tests/Feature/ServiceFlowTest.php --colors
```

Expected: All 7 tests PASS.

- [ ] **Step 3: Confirm existing tests still pass**

```bash
cd Backend && php artisan test --colors
```

Expected: All tests pass (no regressions).

- [ ] **Step 4: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: register mechanic assignment and bill-service routes"
```

---

## Task 8: Enrich CustomerController — mechanics + parts on service cards

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/CustomerController.php`

The current `services()` method returns services without mechanics or parts.

- [ ] **Step 1: Replace the `services()` method body**

Replace the entire `services()` method:

```php
public function services(Request $request): JsonResponse
{
    $user     = auth()->user();
    $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

    if (! $customer) {
        return response()->json(['data' => []]);
    }

    $serviceRows = $this->tenantTable('service_jobs')
        ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
        ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
        ->where('service_jobs.customer_id_fk', $customer->customer_id)
        ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
        ->orderByDesc('service_jobs.created_at')
        ->get();

    $jobIds = $serviceRows->pluck('job_id')->toArray();

    $mechanicsByJob = DB::table('service_job_mechanics')
        ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
        ->whereIn('service_job_mechanics.job_id_fk', $jobIds)
        ->select('service_job_mechanics.job_id_fk', 'mechanics.mechanic_id', 'mechanics.full_name')
        ->get()
        ->groupBy('job_id_fk');

    $partsByJob = DB::table('service_job_parts')
        ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
        ->whereIn('service_job_parts.job_id_fk', $jobIds)
        ->select('service_job_parts.job_id_fk', 'parts.part_name', 'service_job_parts.quantity')
        ->get()
        ->groupBy('job_id_fk');

    $services = $serviceRows->map(fn ($row) => [
        'id'              => (string) $row->job_id,
        'customerName'    => $row->customer_name,
        'motorcycleModel' => $row->motorcycle_model ?? '',
        'serviceType'     => $row->service_name ?? 'General Service',
        'laborCost'       => (float) ($row->labor_cost ?? 0),
        'status'          => $row->status_name,
        'notes'           => $row->notes ?? '',
        'mechanics'       => collect($mechanicsByJob[$row->job_id] ?? [])
                                ->map(fn ($m) => ['id' => (string) $m->mechanic_id, 'name' => $m->full_name])
                                ->values(),
        'parts'           => collect($partsByJob[$row->job_id] ?? [])
                                ->map(fn ($p) => ['name' => $p->part_name, 'quantity' => (int) $p->quantity])
                                ->values(),
        'createdAt'       => $row->created_at ? \Illuminate\Support\Carbon::parse($row->created_at)->toISOString() : null,
        'completedAt'     => $row->completion_date ? \Illuminate\Support\Carbon::parse($row->completion_date)->toISOString() : null,
    ]);

    return response()->json(['data' => $services]);
}
```

- [ ] **Step 2: Run existing customer controller tests**

```bash
cd Backend && php artisan test tests/Feature/CustomerControllerTest.php --colors
```

Expected: All existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/CustomerController.php
git commit -m "feat: enrich customer services API with mechanics and parts per job"
```

---

## Task 9: Update TypeScript ServiceRecord type

**Files:**
- Modify: `Frontend/src/shared/types/index.ts`

- [ ] **Step 1: Update `ServiceRecord` and add `CustomerService`**

Find `ServiceRecord` (line 26) and replace:
```typescript
export interface ServiceRecord {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  partsUsed: { partId: string; quantity: number }[];
  notes: string;
  createdAt: string;
  completedAt?: string;
}
```

With:
```typescript
export interface ServiceRecord {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  partsUsed: { partId: string; name: string; quantity: number; unitPrice: number }[];
  mechanics: { id: string; name: string }[];
  notes: string;
  createdAt: string;
  completedAt?: string;
}

export interface CustomerService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  notes: string | null;
  mechanics: { id: string; name: string }[];
  parts: { name: string; quantity: number }[];
  createdAt: string;
  completedAt: string | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: Errors for files that use the old `ServiceRecord.partsUsed` shape. Note them — they'll be fixed in Task 10.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/shared/types/index.ts
git commit -m "feat: update ServiceRecord type with named parts and mechanics; add CustomerService type"
```

---

## Task 10: Update ServicesPage — mechanic multi-select, named parts, Bill this Job

**Files:**
- Modify: `Frontend/src/features/services/pages/ServicesPage.tsx`

This is the largest frontend change. Three additions:
1. Mechanic multi-select in the create/edit modal
2. Part names on service cards (instead of raw Part IDs)
3. "Bill this Job" button + modal

- [ ] **Step 1: Add `Mechanic` interface and `billModalService` state**

At the top of `ServicesPage.tsx`, after the imports, add the `Mechanic` interface and expand the state:

```typescript
interface Mechanic { id: string; name: string; }
```

Inside the `Services` component, after the existing state declarations, add:

```typescript
const [availableMechanics, setAvailableMechanics] = useState<Mechanic[]>([]);
const [selectedMechanicIds, setSelectedMechanicIds] = useState<string[]>([]);
const [billModalService, setBillModalService] = useState<ServiceRecord | null>(null);
const [billPaymentMethod, setBillPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
const [billLoading, setBillLoading] = useState(false);
```

- [ ] **Step 2: Fetch mechanics when the modal opens**

In the existing `useEffect` that fetches parts when `modalOpen` changes, add mechanics fetch:

```typescript
useEffect(() => {
  if (!modalOpen) return;
  void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setAvailableParts(r.data)).catch(() => {});
  void apiGet<{ data: Mechanic[] }>('/api/mechanics').then(r => setAvailableMechanics(r.data)).catch(() => {});
}, [modalOpen]);
```

- [ ] **Step 3: Initialise `selectedMechanicIds` when editing**

In `openAdd`:
```typescript
const openAdd = () => {
  setEditing(null);
  form.reset({ customerName: '', motorcycleModel: '', serviceType: '', laborCost: 0, status: 'Pending', notes: '' });
  setPartsUsed([]);
  setSelectedMechanicIds([]);
  setModalOpen(true);
};
```

In `openEdit`:
```typescript
const openEdit = (s: ServiceRecord) => {
  setEditing(s);
  form.reset({ customerName: s.customerName, motorcycleModel: s.motorcycleModel, serviceType: s.serviceType, laborCost: s.laborCost, status: s.status, notes: s.notes });
  setPartsUsed(s.partsUsed);
  setSelectedMechanicIds(s.mechanics.map(m => m.id));
  setModalOpen(true);
};
```

- [ ] **Step 4: Pass mechanicIds in form submit**

In `onSubmit`, update the payload:
```typescript
const onSubmit = form.handleSubmit(async (values) => {
  const payload = { ...values, partsUsed, mechanicIds: selectedMechanicIds };
  if (editing) {
    const updated = await updateService(editing.id, payload);
    updateItem(editing.id, 'id', updated);
  } else {
    const created = await addService(payload);
    prependItem(created);
  }
  setModalOpen(false);
});
```

- [ ] **Step 5: Add mechanic multi-select inside the modal form**

In the form JSX, after the "Parts Used" section and before the submit buttons, add:

```tsx
<div>
  <Label className="text-xs font-medium text-zinc-400">Assign Mechanics</Label>
  <div className="mt-1.5 flex flex-wrap gap-2">
    {availableMechanics.map(m => (
      <button
        type="button"
        key={m.id}
        onClick={() =>
          setSelectedMechanicIds(prev =>
            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
          )
        }
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          selectedMechanicIds.includes(m.id)
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
        }`}
      >
        {selectedMechanicIds.includes(m.id) ? '✓ ' : ''}{m.name}
      </button>
    ))}
    {availableMechanics.length === 0 && (
      <p className="text-xs text-zinc-500">No mechanics registered</p>
    )}
  </div>
</div>
```

- [ ] **Step 6: Fix part names on service cards**

In the service card JSX, find the partsUsed badge section (around line 220):
```tsx
{service.partsUsed.map(pu => (
  <span key={pu.partId} className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-700">
    Part #{pu.partId} x{pu.quantity}
  </span>
))}
```

Replace with:
```tsx
{service.partsUsed.map(pu => (
  <span key={pu.partId} className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-700">
    {pu.name} x{pu.quantity}
  </span>
))}
```

- [ ] **Step 7: Add mechanic badges to service cards**

In the service card JSX, inside the bottom section (after the partsUsed chips), add mechanic badges:

```tsx
{service.mechanics.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {service.mechanics.map(m => (
      <span key={m.id} className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
        {m.name}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 8: Add "Bill this Job" button to service cards**

In the service card action buttons area (where Edit and Delete buttons are), add after the Edit button:

```tsx
<button
  title="Bill this Job"
  onClick={() => setBillModalService(service)}
  className="p-2 rounded-lg hover:bg-green-500/10 text-zinc-500 hover:text-green-400 transition-colors"
>
  <Receipt className="w-4 h-4" />
</button>
```

Also add `Receipt` to the lucide-react import at the top of the file (it's already imported in `SalesPage.tsx`, same package).

- [ ] **Step 9: Add the "Bill this Job" modal**

Add this Dialog component near the bottom of the JSX (before the closing `</div>`):

```tsx
<Dialog open={!!billModalService} onOpenChange={() => { setBillModalService(null); setBillPaymentMethod('Cash'); }}>
  <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-white">Bill this Job</DialogTitle>
    </DialogHeader>
    {billModalService && (
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Service Labor</span>
            <span className="text-white font-medium">₱{billModalService.laborCost.toLocaleString()}</span>
          </div>
          {billModalService.partsUsed.map(p => (
            <div key={p.partId} className="flex justify-between text-zinc-400">
              <span>{p.name} x{p.quantity}</span>
              <span className="text-white font-medium">₱{(p.unitPrice * p.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold text-white border-t border-zinc-700 pt-2">
            <span>Total</span>
            <span>
              ₱{(billModalService.laborCost + billModalService.partsUsed.reduce((s, p) => s + p.unitPrice * p.quantity, 0)).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setBillPaymentMethod('Cash')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${billPaymentMethod === 'Cash' ? 'bg-green-500 text-white' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'}`}
          >
            <Banknote className="w-4 h-4" /> Cash
          </button>
          <button
            onClick={() => setBillPaymentMethod('GCash')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${billPaymentMethod === 'GCash' ? 'bg-violet-500 text-white' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'}`}
          >
            <Smartphone className="w-4 h-4" /> GCash
          </button>
        </div>

        <Button
          disabled={billLoading}
          onClick={async () => {
            if (!billModalService) return;
            setBillLoading(true);
            try {
              await apiMutation(`/api/services/${billModalService.id}/bill`, 'POST', { paymentMethod: billPaymentMethod });
              updateItem(billModalService.id, 'id', { ...billModalService, status: 'Completed' as const });
              setBillModalService(null);
            } catch {
              // toast already shown by apiMutation
            } finally {
              setBillLoading(false);
            }
          }}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          {billLoading ? 'Processing…' : 'Confirm Payment'}
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>
```

Add the missing imports at the top of `ServicesPage.tsx`:
```typescript
import { apiMutation } from '@/shared/lib/api';
// Add to lucide-react imports: Receipt, Banknote, Smartphone
import { ..., Receipt, Banknote, Smartphone } from 'lucide-react';
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git add Frontend/src/features/services/pages/ServicesPage.tsx
git commit -m "feat: add mechanic multi-select, named parts, and Bill this Job modal to ServicesPage"
```

---

## Task 11: Update Customer portal — mechanics + parts on service cards

**Files:**
- Modify: `Frontend/src/features/customers/pages/CustomerDashboard.tsx`
- Modify: `Frontend/src/features/customers/pages/ServiceHistory.tsx`

Both pages use a local `CustomerService` interface. Replace them with the shared type and add mechanics/parts rendering.

- [ ] **Step 1: Update CustomerDashboard.tsx**

Replace the local `CustomerService` interface and the service card rendering:

At the top, replace the local interface:
```typescript
// Remove this local interface:
// interface CustomerService { ... }

// Add this import instead:
import type { CustomerService } from '@/shared/types';
```

In the `recentServices.map(...)` block, add mechanics and parts lines after the status badge:

```tsx
{service.mechanics.length > 0 && (
  <p className="text-[11px] text-[#A8A29E] mt-1">
    Mechanic: {service.mechanics.map(m => m.name).join(', ')}
  </p>
)}
{service.parts.length > 0 && (
  <p className="text-[11px] text-[#D6D3D1] mt-0.5">
    Parts: {service.parts.map(p => `${p.name} x${p.quantity}`).join(', ')}
  </p>
)}
```

- [ ] **Step 2: Update ServiceHistory.tsx**

Replace the local `CustomerService` interface:
```typescript
// Remove local CustomerService interface
import type { CustomerService } from '@/shared/types';
```

In the service card JSX, after the labor cost line and notes line, add:

```tsx
{service.mechanics.length > 0 && (
  <p className="text-[11px] text-[#A8A29E] mt-1">
    Mechanic: {service.mechanics.map(m => m.name).join(', ')}
  </p>
)}
{service.parts.length > 0 && (
  <p className="text-[11px] text-[#D6D3D1] mt-0.5">
    Parts: {service.parts.map(p => `${p.name} x${p.quantity}`).join(', ')}
  </p>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/features/customers/pages/CustomerDashboard.tsx Frontend/src/features/customers/pages/ServiceHistory.tsx
git commit -m "feat: show assigned mechanics and parts on customer service cards"
```

---

## Task 12: Run full test suite and smoke-test in browser

- [ ] **Step 1: Run all backend tests**

```bash
cd Backend && php artisan test --colors
```

Expected: All tests PASS, 0 failures.

- [ ] **Step 2: Start dev servers**

```bash
# Terminal 1
cd Backend && php artisan serve --port=8002

# Terminal 2
cd Frontend && npm run dev
```

- [ ] **Step 3: Smoke-test Owner flow**

1. Log in as an Owner
2. Go to **Services** → click **New Service**
   - Verify mechanic multi-select appears and selects correctly
3. Create a service with 1 mechanic and 1 part
   - Verify mechanic badge appears on the card
   - Verify part shows by name (e.g., "Motul 10W-40 x1") not "Part #7 x1"
4. Click the **Bill (receipt icon)** button on the service card
   - Verify the modal shows labor, parts with prices, and total
   - Select GCash, click Confirm Payment
   - Verify service status changes to Completed
   - Verify transaction appears in **Sales** page
5. Go to **Inventory** and verify the part's stock decreased by 1

- [ ] **Step 4: Smoke-test Customer flow**

1. Log in as a Customer user (create one if needed via Users page)
2. Go to **Customer Dashboard**
   - Verify the billed service shows the mechanic name and part
3. Go to **Service History** — same verification
4. Go to **Payments** — verify the payment record appears with the correct amount

- [ ] **Step 5: Final commit if any last-minute fixes were made**

```bash
git add -p
git commit -m "fix: address smoke-test findings"
```
