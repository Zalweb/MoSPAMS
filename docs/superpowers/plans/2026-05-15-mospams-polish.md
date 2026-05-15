# MoSPAMS Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 missing features: EXIF strip on image upload, PDF/print invoice, customer cancellation request for confirmed jobs, bulk CSV parts import, and vehicle-linked service history.

**Architecture:** All backend changes go into existing Laravel controllers (no new controllers needed). Frontend changes target existing pages/components. One DB migration for vehicle_id_fk on service_jobs.

**Tech Stack:** Laravel 11 + PHP 8.3 (GD for image re-encode), React + TypeScript + Vite, MySQL, Docker on AWS EC2.

---

## File Map

**Modified:**
- `Backend/app/Http/Controllers/Api/MospamsController.php` — EXIF strip in `uploadPartImage`, new `importPartsCsv` method
- `Backend/app/Http/Controllers/Api/CustomerController.php` — new `requestCancellation` method, `vehicle_id` in `createService`, vehicle filter in `services`
- `Backend/routes/api.php` — 2 new routes
- `Frontend/src/features/customers/components/InvoiceModal.tsx` — add print button
- `Frontend/src/features/customers/pages/ServiceHistory.tsx` — cancellation request button + vehicle filter
- `Frontend/src/features/customers/pages/BookService.tsx` — pass vehicle_id on submit
- `Frontend/src/features/inventory/pages/InventoryPage.tsx` — CSV import UI

**Created:**
- `Backend/database/migrations/2026_05_15_000001_add_vehicle_id_to_service_jobs.php`

---

## Task 1: EXIF Strip on Image Upload

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` (line 418–441, `uploadPartImage`)

- [ ] **Step 1: Replace the raw `store()` call with a GD re-encode**

  Find this block (around line 431):
  ```php
  $path = $request->file('image')->store('parts', 'public');
  ```

  Replace with:
  ```php
  $uploadedFile = $request->file('image');
  $ext = 'jpg';
  $filename = 'parts/' . uniqid('part_', true) . '.' . $ext;
  $tmpPath = $uploadedFile->getRealPath();
  $mime = mime_content_type($tmpPath);

  $src = match (true) {
      str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
      str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
      default                     => imagecreatefromjpeg($tmpPath),
  };

  ob_start();
  imagejpeg($src, null, 90);
  $imageData = ob_get_clean();
  imagedestroy($src);

  Storage::disk('public')->put($filename, $imageData);
  $path = $filename;
  ```

- [ ] **Step 2: Verify GD is available (it is — installed in Dockerfile)**

  Confirm in Dockerfile that `gd` is in `docker-php-ext-install`. (Already confirmed — no change needed.)

- [ ] **Step 3: Commit**

  ```bash
  git add Backend/app/Http/Controllers/Api/MospamsController.php
  git commit -m "feat: strip EXIF metadata on part image upload via GD re-encode"
  ```

- [ ] **Step 4: Deploy**

  ```bash
  bash deploy.sh
  ```

---

## Task 2: PDF/Print Invoice

**Files:**
- Modify: `Frontend/src/features/customers/components/InvoiceModal.tsx`

- [ ] **Step 1: Add a Print button to the invoice modal**

  Find the close button in the header (around line 93):
  ```tsx
  <button
    onClick={onClose}
    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
  >
    <X className="w-5 h-5" />
  </button>
  ```

  Replace with:
  ```tsx
  <div className="flex items-center gap-2">
    {details && (
      <button
        onClick={() => window.print()}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
        title="Print invoice"
      >
        <Printer className="w-5 h-5" />
      </button>
    )}
    <button
      onClick={onClose}
      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
  ```

- [ ] **Step 2: Add Printer to the import line**

  Find:
  ```tsx
  import { X, Receipt, Loader2 } from 'lucide-react';
  ```
  Replace with:
  ```tsx
  import { X, Receipt, Loader2, Printer } from 'lucide-react';
  ```

- [ ] **Step 3: Add print-only CSS to hide the modal backdrop when printing**

  In `Frontend/src/index.css` (or the global CSS file), add at the end:
  ```css
  @media print {
    body > *:not(.print-target) { display: none !important; }
    .print-target { display: block !important; }
  }
  ```

  Then add `print-target` class to the modal content div (line ~80):
  ```tsx
  className="relative w-full max-w-md bg-card dark:bg-zinc-950 rounded-[32px] border border-border shadow-2xl overflow-hidden print-target"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add Frontend/src/features/customers/components/InvoiceModal.tsx Frontend/src/index.css
  git commit -m "feat: add print button to invoice modal"
  ```

- [ ] **Step 5: Deploy**

  ```bash
  bash deploy.sh
  ```

---

## Task 3: Customer Cancellation Request for Confirmed Jobs

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/CustomerController.php` — add `requestCancellation` method
- Modify: `Backend/routes/api.php` — register new route
- Modify: `Frontend/src/features/customers/pages/ServiceHistory.tsx` — add button for `booked_confirmed` status

- [ ] **Step 1: Add `requestCancellation` method to CustomerController**

  In `CustomerController.php`, after the `cancelService` method (around line 210), add:
  ```php
  public function requestCancellation(Request $request, $jobId): JsonResponse
  {
      $user = auth()->user();
      $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

      if (!$customer) {
          return response()->json(['error' => 'Customer not found'], 404);
      }

      $job = $this->tenantTable('service_jobs')
          ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
          ->where('service_jobs.job_id', $jobId)
          ->where('service_jobs.customer_id_fk', $customer->customer_id)
          ->select('service_jobs.*', 'service_job_statuses.status_code')
          ->first();

      if (!$job) {
          return response()->json(['error' => 'Job not found'], 404);
      }

      if ($job->status_code !== 'booked_confirmed') {
          return response()->json(['error' => 'Only confirmed bookings can request cancellation'], 400);
      }

      // Notify shop owner
      $shopId = $user->shop_id_fk;
      $ownerId = DB::table('shop_memberships')
          ->join('roles', 'roles.role_id', '=', 'shop_memberships.role_id_fk')
          ->where('shop_memberships.shop_id_fk', $shopId)
          ->where('roles.role_name', 'Owner')
          ->value('shop_memberships.user_id_fk');

      if ($ownerId) {
          DB::table('notifications')->insert([
              'user_id_fk'        => $ownerId,
              'shop_id_fk'        => $shopId,
              'notification_type' => 'cancellation_request',
              'title'             => 'Cancellation Requested',
              'message'           => "{$customer->full_name} is requesting to cancel their confirmed service booking (Job #{$jobId}).",
              'reference_type'    => 'service_jobs',
              'reference_id'      => $jobId,
              'is_read'           => 0,
              'created_at'        => now(),
          ]);
      }

      return response()->json(['message' => 'Cancellation request sent to the shop.']);
  }
  ```

- [ ] **Step 2: Register the route in `api.php`**

  Find (around line 175):
  ```php
  Route::delete('/customer/services/{jobId}', [CustomerController::class, 'cancelService']);
  ```
  Add after it:
  ```php
  Route::post('/customer/services/{jobId}/cancel-request', [CustomerController::class, 'requestCancellation']);
  ```

- [ ] **Step 3: Add "Request Cancellation" button in ServiceHistory.tsx**

  Add state at the top of the component (after line 26):
  ```tsx
  const [requestingCancelId, setRequestingCancelId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  ```

  Add the handler (after `handleCancel` function, around line 54):
  ```tsx
  const handleRequestCancel = async (id: string) => {
    setRequestingCancelId(id);
    try {
      await apiMutation(`/api/customer/services/${id}/cancel-request`, 'POST');
      setRequestedIds(prev => new Set(prev).add(id));
      toast.success('Cancellation request sent to the shop.');
    } catch {
      toast.error('Failed to send cancellation request. Please try again.');
    } finally {
      setRequestingCancelId(null);
    }
  };
  ```

  In the service card, find the block that shows the Cancel button for `pending` status (around line 184):
  ```tsx
  {service.statusCode === 'pending' && (
    <button ...>Cancel Request</button>
  )}
  ```
  Add directly after it:
  ```tsx
  {service.statusCode === 'booked_confirmed' && (
    requestedIds.has(service.id) ? (
      <span className="mt-3 text-[11px] font-semibold text-amber-500 flex items-center gap-1.5 ml-auto">
        <CheckCircle2 className="w-3.5 h-3.5" /> Request Sent
      </span>
    ) : (
      <button
        onClick={() => handleRequestCancel(service.id)}
        disabled={requestingCancelId === service.id}
        className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-500 transition-colors flex items-center gap-1.5 bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/10 hover:border-amber-500/20 active:scale-95 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {requestingCancelId === service.id
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <XCircle className="w-3.5 h-3.5" />}
        {requestingCancelId === service.id ? 'Sending…' : 'Request Cancellation'}
      </button>
    )
  )}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add Backend/app/Http/Controllers/Api/CustomerController.php Backend/routes/api.php Frontend/src/features/customers/pages/ServiceHistory.tsx
  git commit -m "feat: allow customer to request cancellation of confirmed bookings"
  ```

- [ ] **Step 5: Deploy**

  ```bash
  bash deploy.sh
  ```

---

## Task 4: Bulk CSV Parts Import

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php` — add `importPartsCsv` method
- Modify: `Backend/routes/api.php` — register new route
- Modify: `Frontend/src/features/inventory/pages/InventoryPage.tsx` — add CSV import button + hidden file input

**CSV format expected:**
```
name,category,price,stock,reorder_level,description
Honda Oil Filter,Oil Filters,250,30,10,Genuine Honda part
```

- [ ] **Step 1: Add `importPartsCsv` method to MospamsController**

  Add before the closing brace of `MospamsController` class (before the last `}`):
  ```php
  public function importPartsCsv(Request $request): JsonResponse
  {
      $request->validate([
          'csv' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
      ]);

      $shopId = $this->shopId();
      $handle = fopen($request->file('csv')->getRealPath(), 'r');
      $header = fgetcsv($handle);
      $header = array_map('strtolower', array_map('trim', $header));

      $required = ['name', 'price'];
      foreach ($required as $col) {
          if (!in_array($col, $header)) {
              fclose($handle);
              return response()->json(['error' => "CSV missing required column: {$col}"], 422);
          }
      }

      $imported = 0;
      $skipped  = 0;
      $now = now();

      while (($row = fgetcsv($handle)) !== false) {
          if (count($row) < count($header)) { $skipped++; continue; }
          $data = array_combine($header, $row);

          $name = trim($data['name'] ?? '');
          if (!$name) { $skipped++; continue; }

          $price = (float) ($data['price'] ?? 0);
          $stock = (int) ($data['stock'] ?? 0);
          $reorder = (int) ($data['reorder_level'] ?? 5);
          $description = trim($data['description'] ?? '');

          // Resolve or create category
          $categoryName = trim($data['category'] ?? 'Uncategorized');
          $categoryId = DB::table('categories')
              ->where('shop_id_fk', $shopId)
              ->where('category_name', $categoryName)
              ->value('category_id');
          if (!$categoryId) {
              $categoryId = DB::table('categories')->insertGetId([
                  'shop_id_fk'    => $shopId,
                  'category_name' => $categoryName,
                  'created_at'    => $now,
                  'updated_at'    => $now,
              ]);
          }

          DB::table('parts')->insert([
              'shop_id_fk'     => $shopId,
              'category_id_fk' => $categoryId,
              'part_name'      => $name,
              'description'    => $description ?: null,
              'price'          => $price,
              'stock_quantity' => $stock,
              'reorder_level'  => $reorder,
              'created_at'     => $now,
              'updated_at'     => $now,
          ]);
          $imported++;
      }
      fclose($handle);

      $this->log($request, "Imported {$imported} parts via CSV", 'parts', null);

      return response()->json([
          'message'  => "Imported {$imported} part(s). Skipped {$skipped} row(s).",
          'imported' => $imported,
          'skipped'  => $skipped,
      ]);
  }
  ```

- [ ] **Step 2: Register the route in `api.php`**

  Find (around line 91):
  ```php
  Route::post('/parts/{part}/image', [MospamsController::class, 'uploadPartImage'])->middleware('role:Owner,Staff');
  ```
  Add before it:
  ```php
  Route::post('/parts/import-csv', [MospamsController::class, 'importPartsCsv'])->middleware('role:Owner,Staff');
  ```

- [ ] **Step 3: Add CSV import UI to InventoryPage.tsx**

  First find the existing imports at the top of `InventoryPage.tsx`. Add a `useRef` import if not already there:
  ```tsx
  import { useState, useMemo, useRef } from 'react';
  ```
  And add `Upload` to the lucide imports:
  ```tsx
  import { ..., Upload } from 'lucide-react';
  ```

  Add state and handler inside the component (near the other state declarations):
  ```tsx
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    const form = new FormData();
    form.append('csv', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/parts/import-csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: form,
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      toast.success(data.message ?? 'Import complete');
      // Refresh parts list
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };
  ```

  Note: `usePaginatedFetch` needs to expose a `refetch` function — check if it does. If not, use `window.location.reload()` as a fallback:
  ```tsx
  toast.success(data.message ?? 'Import complete');
  window.location.reload();
  ```

  Add the import button next to the "Add Part" button in the toolbar (find the existing "Add Part" button):
  ```tsx
  <>
    <input
      ref={csvInputRef}
      type="file"
      accept=".csv"
      className="sr-only"
      onChange={handleCsvImport}
    />
    <button
      onClick={() => csvInputRef.current?.click()}
      disabled={importing}
      className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
    >
      <Upload className="w-4 h-4" />
      {importing ? 'Importing…' : 'Import CSV'}
    </button>
  </>
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php Frontend/src/features/inventory/pages/InventoryPage.tsx
  git commit -m "feat: bulk CSV import for parts inventory"
  ```

- [ ] **Step 5: Deploy**

  ```bash
  bash deploy.sh
  ```

---

## Task 5: Vehicle-Linked Service History

**Files:**
- Create: `Backend/database/migrations/2026_05_15_000001_add_vehicle_id_to_service_jobs.php`
- Modify: `Backend/app/Http/Controllers/Api/CustomerController.php` — `createService` accepts `vehicle_id`, `services` returns `vehicleId`
- Modify: `Frontend/src/features/customers/pages/BookService.tsx` — pass `vehicle_id` on submit
- Modify: `Frontend/src/features/customers/pages/ServiceHistory.tsx` — vehicle filter dropdown

- [ ] **Step 1: Create the migration**

  Create file `Backend/database/migrations/2026_05_15_000001_add_vehicle_id_to_service_jobs.php`:
  ```php
  <?php

  use Illuminate\Database\Migrations\Migration;
  use Illuminate\Database\Schema\Blueprint;
  use Illuminate\Support\Facades\Schema;

  return new class extends Migration
  {
      public function up(): void
      {
          Schema::table('service_jobs', function (Blueprint $table) {
              $table->unsignedBigInteger('vehicle_id_fk')->nullable()->after('customer_id_fk');
          });
      }

      public function down(): void
      {
          Schema::table('service_jobs', function (Blueprint $table) {
              $table->dropColumn('vehicle_id_fk');
          });
      }
  };
  ```

- [ ] **Step 2: Update `createService` to accept and store `vehicle_id`**

  In `CustomerController::createService`, find the validation (around line 88):
  ```php
  $request->validate([
      'motorcycle_model' => ['required', 'string', 'max:150'],
      'service_type'     => ['required', 'string', 'max:100'],
      'notes'            => ['nullable', 'string', 'max:500'],
  ]);
  ```
  Replace with:
  ```php
  $request->validate([
      'motorcycle_model' => ['required', 'string', 'max:150'],
      'service_type'     => ['required', 'string', 'max:100'],
      'notes'            => ['nullable', 'string', 'max:500'],
      'vehicle_id'       => ['nullable', 'integer'],
  ]);
  ```

  Then find the `DB::table('service_jobs')->insertGetId(...)` call (around line 107) and add `vehicle_id_fk` to the insert array:
  ```php
  $jobId = DB::table('service_jobs')->insertGetId([
      'shop_id_fk'                => $user->shop_id_fk,
      'customer_id_fk'            => $customer->customer_id,
      'vehicle_id_fk'             => $request->vehicle_id ?: null,
      'created_by_fk'             => $user->user_id,
      'service_job_status_id_fk'  => DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id'),
      'job_date'                  => now()->toDateString(),
      'motorcycle_model'          => $request->motorcycle_model,
      'notes'                     => $request->notes,
      'created_at'                => now(),
      'updated_at'                => now(),
  ]);
  ```

- [ ] **Step 3: Expose `vehicleId` in `services` response**

  In `CustomerController::services`, find the map closure (around line 66):
  ```php
  $services = $rows->map(fn ($row) => [
      'id'               => (string) $row->job_id,
      ...
  ```
  Add `'vehicleId'` to the array:
  ```php
  'vehicleId'        => $row->vehicle_id_fk ? (string) $row->vehicle_id_fk : null,
  ```

- [ ] **Step 4: Update BookService.tsx to pass vehicle_id**

  Find the `handleSubmit` function's API call (around line 59):
  ```tsx
  await apiMutation('/api/customer/services', 'POST', {
    motorcycle_model: motorcycleModel.trim(),
    service_type: serviceType,
    notes: notes.trim() || null,
  });
  ```

  Add a `selectedVehicleId` state (near other state declarations):
  ```tsx
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  ```

  Update the vehicle `<select>` onChange to also track the id:
  ```tsx
  onChange={e => {
    setSelectedVehicleId(e.target.value);
    const v = vehicles.find(x => x.id === e.target.value);
    if (v) setMotorcycleModel(`${v.year ? v.year + ' ' : ''}${v.make} ${v.model}`.trim());
  }}
  ```

  Update the API call:
  ```tsx
  await apiMutation('/api/customer/services', 'POST', {
    motorcycle_model: motorcycleModel.trim(),
    service_type: serviceType,
    notes: notes.trim() || null,
    vehicle_id: selectedVehicleId ? parseInt(selectedVehicleId, 10) : null,
  });
  ```

- [ ] **Step 5: Add vehicle filter to ServiceHistory.tsx**

  Add `vehicleId` to the `CustomerService` type (in `Frontend/src/shared/types.ts`):
  Find the `CustomerService` interface and add:
  ```ts
  vehicleId?: string | null;
  ```

  In `ServiceHistory.tsx`, add vehicle state (near other state declarations):
  ```tsx
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  ```

  Derive vehicle list from services:
  ```tsx
  const vehicleIds = useMemo(() => {
    const seen = new Map<string, string>();
    services.forEach(s => {
      if (s.vehicleId) seen.set(s.vehicleId, s.motorcycleModel);
    });
    return seen;
  }, [services]);
  ```

  Update the `filtered` computation to include vehicle filter:
  ```tsx
  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.motorcycleModel.toLowerCase().includes(q) || s.serviceType.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || s.vehicleId === vehicleFilter;
    return matchesSearch && matchesStatus && matchesVehicle;
  });
  ```

  Add a vehicle filter dropdown after the search input (around line 114), only shown when there are vehicles:
  ```tsx
  {vehicleIds.size > 0 && (
    <motion.div {...fadeUp(0.25)} className="relative mb-6">
      <select
        value={vehicleFilter}
        onChange={e => setVehicleFilter(e.target.value)}
        className="w-full h-12 pl-5 pr-10 rounded-2xl bg-muted/50 border border-border/50 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
      >
        <option value="all">All Vehicles</option>
        {Array.from(vehicleIds.entries()).map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </motion.div>
  )}
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add Backend/database/migrations/2026_05_15_000001_add_vehicle_id_to_service_jobs.php
  git add Backend/app/Http/Controllers/Api/CustomerController.php
  git add Frontend/src/features/customers/pages/BookService.tsx
  git add Frontend/src/features/customers/pages/ServiceHistory.tsx
  git add Frontend/src/shared/types.ts
  git commit -m "feat: link service jobs to customer vehicles for filtered service history"
  ```

- [ ] **Step 7: Deploy (migration runs on startup)**

  ```bash
  bash deploy.sh
  ```

  The entrypoint.sh runs `php artisan migrate --force` on container start, so the `vehicle_id_fk` column will be added automatically.

---

## Self-Review

**Spec coverage:**
- EXIF strip ✓ Task 1
- PDF/print invoice ✓ Task 2
- Customer cancellation for confirmed jobs ✓ Task 3
- Bulk CSV import ✓ Task 4
- Service history per vehicle ✓ Task 5
- Low stock alerts: already implemented (no task needed)
- Mark as Paid: already implemented (no task needed)
- Service notifications: already implemented (no task needed)

**Notes:**
- The `importPartsCsv` route must be registered BEFORE the `parts/{part}/image` route, otherwise `import-csv` would be treated as a `{part}` ID.
- The `CustomerController` does not use `$this->shopId()` — it uses `$user->shop_id_fk` directly. The cancellation request notification follows that same pattern.
- The `usePaginatedFetch` hook likely does not expose `refetch` — use `window.location.reload()` as fallback for the CSV import success.
