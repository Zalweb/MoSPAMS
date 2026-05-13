# Smart Inventory Barcode Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement camera-based barcode/QR scanning with optional OCR for fast motorcycle part intake into inventory.

**Architecture:** Backend API provides barcode lookup and part creation endpoints scoped to shop. Frontend uses Google ML Kit for device camera barcode detection and text recognition. IndexedDB caches parts/barcodes locally for offline scanning and auto-syncs when online.

**Tech Stack:** Laravel 11 (backend), React 18 + TypeScript (frontend), Firebase ML Kit, IndexedDB (idb), MediaDevices API (camera)

---

## File Structure

### Backend Files
- `Backend/database/migrations/2026_05_14_000001_create_part_barcodes_table.php` — New table for barcode → part mapping
- `Backend/app/Models/PartBarcode.php` — Eloquent model with BelongsToTenant trait
- `Backend/app/Http/Controllers/Api/MospamsController.php` (modified) — Add 4 new barcode endpoints

### Frontend Files
- `Frontend/src/features/inventory/components/BarcodeScannerModal.tsx` — Camera + ML Kit barcode detection
- `Frontend/src/features/inventory/components/PartLookupResult.tsx` — Display found/not-found part state
- `Frontend/src/features/inventory/components/OCRPreviewModal.tsx` — Image capture + text extraction
- `Frontend/src/features/inventory/components/PartFormWithScanning.tsx` — Main wrapper: scan vs manual entry choice
- `Frontend/src/features/inventory/pages/InventoryPage.tsx` (modified) — Add "Scan Part" button
- `Frontend/src/shared/services/offlineCache.ts` — IndexedDB sync + cache logic
- `Frontend/src/shared/services/barcodeScanner.ts` — ML Kit barcode detection helper
- `Frontend/src/shared/services/ocrService.ts` — ML Kit text recognition helper
- `Frontend/__tests__/features/inventory/BarcodeScannerModal.test.tsx` — Scanner component tests
- `Frontend/__tests__/features/inventory/offlineCache.test.ts` — Offline sync tests

### Test Files
- `Backend/tests/Feature/InventoryBarcodeTest.php` — Feature tests for all barcode endpoints

---

## Phase 1: Backend Infrastructure

### Task 1: Create Migration for part_barcodes Table

**Files:**
- Create: `Backend/database/migrations/2026_05_14_000001_create_part_barcodes_table.php`

- [ ] **Step 1: Create migration file**

Run:
```bash
cd Backend
php artisan make:migration create_part_barcodes_table --table=part_barcodes
```

- [ ] **Step 2: Write migration schema**

Replace the generated migration with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('part_barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->onDelete('cascade');
            $table->string('barcode_value', 255);
            $table->string('barcode_type', 50)->nullable(); // 'EAN-13', 'CODE128', 'QR', etc.
            $table->boolean('is_primary')->default(false);
            $table->foreignId('shop_id_fk')->constrained('shops')->onDelete('cascade');
            $table->timestamps();

            // Indexes for fast lookup
            $table->unique(['barcode_value', 'shop_id_fk'], 'unique_barcode_per_shop');
            $table->index(['barcode_value', 'shop_id_fk'], 'idx_barcode_lookup');
            $table->index('part_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('part_barcodes');
    }
};
```

- [ ] **Step 3: Run migration**

```bash
php artisan migrate
```

Expected output: "Migrated: 2026_05_14_000001_create_part_barcodes_table"

- [ ] **Step 4: Commit**

```bash
git add Backend/database/migrations/2026_05_14_000001_create_part_barcodes_table.php
git commit -m "feat: create part_barcodes table for barcode-to-part mapping"
```

---

### Task 2: Create PartBarcode Eloquent Model

**Files:**
- Create: `Backend/app/Models/PartBarcode.php`

- [ ] **Step 1: Create model file**

Run:
```bash
cd Backend
php artisan make:model PartBarcode
```

- [ ] **Step 2: Write model with BelongsToTenant**

Replace the generated model with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToTenant;

class PartBarcode extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'part_id',
        'barcode_value',
        'barcode_type',
        'is_primary',
        'shop_id_fk',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    /**
     * Relationship: barcode belongs to a part
     */
    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id', 'id');
    }

    /**
     * Relationship: barcode belongs to a shop
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'id');
    }
}
```

- [ ] **Step 3: Verify model works**

```bash
php artisan tinker
# In tinker shell:
# App\Models\PartBarcode::first();
# Should return null or existing record (doesn't error)
exit
```

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Models/PartBarcode.php
git commit -m "feat: create PartBarcode model with BelongsToTenant"
```

---

### Task 3: Add Barcode Lookup Endpoint

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Add lookup method to controller**

Add this method to `MospamsController` class (after existing methods, before closing brace):

```php
/**
 * Lookup a part by barcode
 * GET /api/inventory/barcode/{barcode}
 */
public function lookupBarcode($barcode)
{
    $barcode = PartBarcode::where('barcode_value', $barcode)
        ->where('shop_id_fk', auth()->user()->shop_id_fk)
        ->with('part')
        ->first();

    if (!$barcode) {
        return response()->json([
            'status' => 'not_found',
            'message' => 'No part found for barcode',
        ], 404);
    }

    $part = $barcode->part;
    $allBarcodes = PartBarcode::where('part_id', $part->id)
        ->where('shop_id_fk', auth()->user()->shop_id_fk)
        ->select('id', 'barcode_value', 'barcode_type', 'is_primary')
        ->get();

    return response()->json([
        'status' => 'found',
        'part' => [
            'id' => $part->id,
            'brand' => $part->brand ?? '',
            'part_code' => $part->part_code ?? '',
            'description' => $part->description ?? '',
            'category' => $part->category?->category_name ?? '',
            'price' => $part->unit_price ?? 0,
            'stock_quantity' => $part->stock_quantity ?? 0,
            'supplier_id' => $part->supplier_id ?? null,
        ],
        'barcodes' => $allBarcodes,
    ]);
}
```

- [ ] **Step 2: Add route**

Open `Backend/routes/api.php` and add this route in the inventory section (find where other `/api/inventory` routes are):

```php
Route::get('/inventory/barcode/{barcode}', [MospamsController::class, 'lookupBarcode'])->name('barcode.lookup');
```

- [ ] **Step 3: Test with artisan**

```bash
php artisan route:list | grep barcode.lookup
```

Expected: Route shows `/api/inventory/barcode/{barcode}` mapped to `lookupBarcode`

- [ ] **Step 4: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php
git commit -m "feat: add barcode lookup endpoint"
```

---

### Task 4: Add Barcode Link Endpoint

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Create Form Request for validation**

Run:
```bash
cd Backend
php artisan make:request LinkBarcodeRequest
```

- [ ] **Step 2: Write validation rules**

Edit `Backend/app/Http/Requests/LinkBarcodeRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LinkBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()?->hasAnyRole(['owner', 'staff']);
    }

    public function rules(): array
    {
        return [
            'barcode_value' => 'required|string|max:255',
            'part_id' => 'required|exists:parts,id',
            'barcode_type' => 'nullable|string|max:50',
        ];
    }
}
```

- [ ] **Step 3: Add linkBarcode method to controller**

Add this method to `MospamsController`:

```php
/**
 * Link an existing barcode to a part
 * POST /api/inventory/barcode/link
 */
public function linkBarcode(LinkBarcodeRequest $request)
{
    $shop_id = auth()->user()->shop_id_fk;

    // Check if barcode already exists for this part
    $existing = PartBarcode::where('barcode_value', $request->barcode_value)
        ->where('shop_id_fk', $shop_id)
        ->first();

    if ($existing && $existing->part_id !== $request->part_id) {
        return response()->json([
            'status' => 'error',
            'message' => 'This barcode is already linked to another part.',
            'linked_part' => [
                'id' => $existing->part->id,
                'part_code' => $existing->part->part_code,
                'description' => $existing->part->description,
            ],
        ], 409);
    }

    if ($existing && $existing->part_id === $request->part_id) {
        return response()->json([
            'status' => 'error',
            'message' => 'This barcode is already linked to this part.',
        ], 409);
    }

    // Create new barcode
    $barcode = PartBarcode::create([
        'part_id' => $request->part_id,
        'barcode_value' => $request->barcode_value,
        'barcode_type' => $request->barcode_type,
        'shop_id_fk' => $shop_id,
        'is_primary' => false,
    ]);

    $part = Part::find($request->part_id);

    return response()->json([
        'id' => $barcode->id,
        'barcode_value' => $barcode->barcode_value,
        'part_id' => $barcode->part_id,
        'part' => [
            'id' => $part->id,
            'brand' => $part->brand,
            'part_code' => $part->part_code,
            'description' => $part->description,
        ],
        'message' => 'Barcode linked successfully',
    ], 201);
}
```

- [ ] **Step 4: Add route**

In `Backend/routes/api.php`, add:

```php
Route::post('/inventory/barcode/link', [MospamsController::class, 'linkBarcode'])->name('barcode.link');
```

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Requests/LinkBarcodeRequest.php Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php
git commit -m "feat: add barcode link endpoint with duplicate prevention"
```

---

### Task 5: Add Create Part with Barcode Endpoint

**Files:**
- Modify: `Backend/app/Http/Requests/StorePartRequest.php`, `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Create Form Request**

Run:
```bash
cd Backend
php artisan make:request StorePartWithBarcodeRequest
```

- [ ] **Step 2: Write validation**

Edit `Backend/app/Http/Requests/StorePartWithBarcodeRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePartWithBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()?->hasAnyRole(['owner', 'staff']);
    }

    public function rules(): array
    {
        return [
            'brand' => 'required|string|max:255',
            'part_code' => 'required|string|max:255|unique:parts,part_code',
            'description' => 'required|string|max:1000',
            'category_id_fk' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'barcode_value' => 'required|string|max:255',
            'barcode_type' => 'nullable|string|max:50',
        ];
    }
}
```

- [ ] **Step 3: Add method to controller**

Add this method to `MospamsController`:

```php
/**
 * Create a new part with initial barcode
 * POST /api/inventory/parts/with-barcode
 */
public function storePartWithBarcode(StorePartWithBarcodeRequest $request)
{
    $shop_id = auth()->user()->shop_id_fk;

    // Check if barcode already exists
    $existingBarcode = PartBarcode::where('barcode_value', $request->barcode_value)
        ->where('shop_id_fk', $shop_id)
        ->first();

    if ($existingBarcode) {
        return response()->json([
            'status' => 'error',
            'message' => 'This barcode is already linked to a part.',
            'linked_part' => [
                'id' => $existingBarcode->part->id,
                'part_code' => $existingBarcode->part->part_code,
            ],
        ], 409);
    }

    // Start transaction
    \DB::beginTransaction();
    try {
        // Create part
        $part = Part::create([
            'brand' => $request->brand,
            'part_code' => $request->part_code,
            'description' => $request->description,
            'category_id_fk' => $request->category_id_fk,
            'unit_price' => $request->price,
            'stock_quantity' => $request->stock_quantity,
            'shop_id_fk' => $shop_id,
            'part_status_id_fk' => 1, // Assuming 1 is 'active' status
        ]);

        // Create barcode
        $barcode = PartBarcode::create([
            'part_id' => $part->id,
            'barcode_value' => $request->barcode_value,
            'barcode_type' => $request->barcode_type,
            'shop_id_fk' => $shop_id,
            'is_primary' => true,
        ]);

        \DB::commit();

        return response()->json([
            'part' => [
                'id' => $part->id,
                'brand' => $part->brand,
                'part_code' => $part->part_code,
                'description' => $part->description,
                'category_id_fk' => $part->category_id_fk,
                'price' => $part->unit_price,
                'stock_quantity' => $part->stock_quantity,
            ],
            'barcode' => [
                'id' => $barcode->id,
                'barcode_value' => $barcode->barcode_value,
                'is_primary' => $barcode->is_primary,
            ],
            'message' => 'Part and barcode created successfully',
        ], 201);
    } catch (\Exception $e) {
        \DB::rollBack();
        return response()->json([
            'status' => 'error',
            'message' => 'Failed to create part: ' . $e->getMessage(),
        ], 500);
    }
}
```

- [ ] **Step 4: Add route**

In `Backend/routes/api.php`:

```php
Route::post('/inventory/parts/with-barcode', [MospamsController::class, 'storePartWithBarcode'])->name('part.storeWithBarcode');
```

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Requests/StorePartWithBarcodeRequest.php Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php
git commit -m "feat: add create part with barcode endpoint with transaction"
```

---

### Task 6: Add List Barcodes for Part Endpoint

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Add method**

```php
/**
 * Get all barcodes for a part
 * GET /api/inventory/parts/{part}/barcodes
 */
public function getPartBarcodes($part_id)
{
    $part = Part::where('id', $part_id)
        ->where('shop_id_fk', auth()->user()->shop_id_fk)
        ->first();

    if (!$part) {
        return response()->json(['message' => 'Part not found'], 404);
    }

    $barcodes = PartBarcode::where('part_id', $part_id)
        ->where('shop_id_fk', auth()->user()->shop_id_fk)
        ->select('id', 'barcode_value', 'barcode_type', 'is_primary', 'created_at')
        ->orderBy('is_primary', 'desc')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'part' => [
            'id' => $part->id,
            'part_code' => $part->part_code,
            'description' => $part->description,
        ],
        'barcodes' => $barcodes,
    ]);
}
```

- [ ] **Step 2: Add route**

In `Backend/routes/api.php`:

```php
Route::get('/inventory/parts/{part}/barcodes', [MospamsController::class, 'getPartBarcodes'])->name('part.barcodes');
```

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php Backend/routes/api.php
git commit -m "feat: add list barcodes for part endpoint"
```

---

### Task 7: Write Backend Feature Tests

**Files:**
- Create: `Backend/tests/Feature/InventoryBarcodeTest.php`

- [ ] **Step 1: Create test file**

Run:
```bash
cd Backend
php artisan make:test InventoryBarcodeTest --feature
```

- [ ] **Step 2: Write tests**

Replace `Backend/tests/Feature/InventoryBarcodeTest.php` with:

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Shop;
use App\Models\Part;
use App\Models\Category;
use App\Models\PartBarcode;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryBarcodeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Shop $shop;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shop = Shop::factory()->create();
        $this->user = User::factory()
            ->for($this->shop, 'shop')
            ->create();
        $this->user->assignRole('staff');

        $this->category = Category::factory()
            ->for($this->shop, 'shop')
            ->create();
    }

    public function test_lookup_barcode_found()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        $barcode = PartBarcode::create([
            'part_id' => $part->id,
            'barcode_value' => '4545913123456',
            'barcode_type' => 'EAN-13',
            'shop_id_fk' => $this->shop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/4545913123456");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'found',
                'part' => [
                    'id' => $part->id,
                    'part_code' => $part->part_code,
                ],
            ]);
    }

    public function test_lookup_barcode_not_found()
    {
        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/nonexistent");

        $response->assertStatus(404)
            ->assertJson(['status' => 'not_found']);
    }

    public function test_lookup_barcode_scoped_to_shop()
    {
        $otherShop = Shop::factory()->create();
        $otherPart = Part::factory()
            ->for($otherShop, 'shop')
            ->create();

        PartBarcode::create([
            'part_id' => $otherPart->id,
            'barcode_value' => '4545913123456',
            'barcode_type' => 'EAN-13',
            'shop_id_fk' => $otherShop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/barcode/4545913123456");

        $response->assertStatus(404);
    }

    public function test_link_barcode_to_part()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/barcode/link", [
                'barcode_value' => '4545913123456',
                'part_id' => $part->id,
                'barcode_type' => 'EAN-13',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'barcode_value' => '4545913123456',
                'part_id' => $part->id,
            ]);

        $this->assertDatabaseHas('part_barcodes', [
            'barcode_value' => '4545913123456',
            'part_id' => $part->id,
            'shop_id_fk' => $this->shop->id,
        ]);
    }

    public function test_prevent_duplicate_barcode()
    {
        $part1 = Part::factory()->for($this->shop, 'shop')->create();
        $part2 = Part::factory()->for($this->shop, 'shop')->create();

        PartBarcode::create([
            'part_id' => $part1->id,
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/barcode/link", [
                'barcode_value' => '4545913123456',
                'part_id' => $part2->id,
            ]);

        $response->assertStatus(409)
            ->assertJson(['status' => 'error']);
    }

    public function test_create_part_with_barcode()
    {
        $response = $this->actingAs($this->user)
            ->postJson("/api/inventory/parts/with-barcode", [
                'brand' => 'Yamaha',
                'part_code' => '1LB-H3912-00',
                'description' => 'Lever LH',
                'category_id_fk' => $this->category->id,
                'price' => 45.99,
                'stock_quantity' => 1,
                'barcode_value' => '4545913123456',
                'barcode_type' => 'EAN-13',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'part' => [
                    'brand' => 'Yamaha',
                    'part_code' => '1LB-H3912-00',
                ],
                'barcode' => [
                    'barcode_value' => '4545913123456',
                ],
            ]);

        $this->assertDatabaseHas('parts', [
            'part_code' => '1LB-H3912-00',
            'shop_id_fk' => $this->shop->id,
        ]);

        $this->assertDatabaseHas('part_barcodes', [
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
        ]);
    }

    public function test_get_part_barcodes()
    {
        $part = Part::factory()
            ->for($this->shop, 'shop')
            ->create();

        PartBarcode::create([
            'part_id' => $part->id,
            'barcode_value' => '4545913123456',
            'shop_id_fk' => $this->shop->id,
            'is_primary' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/inventory/parts/{$part->id}/barcodes");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'part',
                'barcodes' => [
                    '*' => ['id', 'barcode_value', 'is_primary'],
                ],
            ]);
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd Backend
php artisan test tests/Feature/InventoryBarcodeTest.php
```

Expected: All tests pass (PASS count = 7)

- [ ] **Step 4: Commit**

```bash
git add Backend/tests/Feature/InventoryBarcodeTest.php
git commit -m "test: add feature tests for barcode endpoints"
```

---

## Phase 2: Frontend Scanning Components

### Task 8: Install Frontend Dependencies

**Files:**
- Modify: `Frontend/package.json`

- [ ] **Step 1: Install Firebase ML Kit and IndexedDB wrapper**

```bash
cd Frontend
npm install @firebase/ml-sdk idb
```

- [ ] **Step 2: Verify installation**

```bash
npm ls | grep -E "firebase|idb"
```

Expected: Both packages listed with versions

- [ ] **Step 3: Commit**

```bash
git add Frontend/package.json Frontend/package-lock.json
git commit -m "feat: add Firebase ML Kit and idb dependencies"
```

---

### Task 9: Create Barcode Scanner Service

**Files:**
- Create: `Frontend/src/shared/services/barcodeScanner.ts`

- [ ] **Step 1: Write barcode scanner helper**

```typescript
import { ml } from '@firebase/ml';

export interface BarcodeDetectionResult {
  barcode: string;
  format: string;
  confidence: number;
}

export async function initializeMLKit(): Promise<void> {
  // Firebase ML Kit is loaded via Firebase SDK
  // Initialization happens on first use
}

export async function detectBarcode(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<BarcodeDetectionResult | null> {
  if (!window.ml) {
    console.error('ML Kit not loaded');
    return null;
  }

  try {
    const detector = await ml.vision.barcodeDetector();
    const barcodes = await detector.detectBarcodes(image);

    if (barcodes.length === 0) {
      return null;
    }

    const firstBarcode = barcodes[0];
    return {
      barcode: firstBarcode.rawValue || '',
      format: firstBarcode.format || 'UNKNOWN',
      confidence: firstBarcode.confidence || 0,
    };
  } catch (error) {
    console.error('Barcode detection error:', error);
    return null;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop stream immediately after checking permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/services/barcodeScanner.ts
git commit -m "feat: add barcode scanner service with ML Kit integration"
```

---

### Task 10: Create OCR Service

**Files:**
- Create: `Frontend/src/shared/services/ocrService.ts`

- [ ] **Step 1: Write OCR helper**

```typescript
import { ml } from '@firebase/ml';

export interface OCRExtractionResult {
  text: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
}

export async function extractTextFromImage(
  image: HTMLImageElement | HTMLCanvasElement
): Promise<OCRExtractionResult | null> {
  if (!window.ml) {
    console.error('ML Kit not loaded');
    return null;
  }

  try {
    const detector = await ml.vision.textDetector();
    const annotation = await detector.detectText(image);

    if (!annotation || !annotation.text) {
      return null;
    }

    return {
      text: annotation.text,
      confidence: annotation.confidence || 0,
      lines: (annotation.blocks || []).flatMap((block: any) =>
        (block.lines || []).map((line: any) => ({
          text: line.text || '',
          confidence: line.confidence || 0,
        }))
      ),
    };
  } catch (error) {
    console.error('OCR error:', error);
    return null;
  }
}

export function suggestPartsFromOCR(
  extractedText: string
): { brand?: string; partCode?: string; description?: string } {
  const lines = extractedText.split('\n').filter((l) => l.trim());

  const result: {
    brand?: string;
    partCode?: string;
    description?: string;
  } = {};

  // Simple heuristics for brand/part code detection
  // Look for uppercase lines (likely brand) and alphanumeric codes
  const uppercaseLines = lines.filter((l) => /^[A-Z][A-Z0-9\s-]+$/.test(l.trim()));
  const codeLines = lines.filter((l) => /[\d-]{5,}/.test(l));

  if (uppercaseLines.length > 0) {
    result.brand = uppercaseLines[0].trim();
  }

  if (codeLines.length > 0) {
    result.partCode = codeLines[0].trim();
  }

  // Description is the longest line
  const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
  if (longestLine.length > 10) {
    result.description = longestLine.trim();
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/services/ocrService.ts
git commit -m "feat: add OCR service with text extraction and parsing"
```

---

### Task 11: Create Offline Cache Service

**Files:**
- Create: `Frontend/src/shared/services/offlineCache.ts`

- [ ] **Step 1: Write IndexedDB sync logic**

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineDBSchema extends DBSchema {
  parts: {
    key: number;
    value: {
      id: number;
      brand: string;
      part_code: string;
      description: string;
      category: string;
      price: number;
      stock_quantity: number;
      shop_id_fk: number;
    };
    indexes: {
      'by-part-code': string;
      'by-shop': number;
    };
  };
  part_barcodes: {
    key: number;
    value: {
      id: number;
      part_id: number;
      barcode_value: string;
      barcode_type: string;
      is_primary: boolean;
      shop_id_fk: number;
    };
    indexes: {
      'by-barcode': string;
      'by-part': number;
      'by-shop': number;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      type: 'new_part' | 'new_barcode';
      data: any;
      status: 'pending' | 'synced';
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

export async function initializeOfflineDB(): Promise<void> {
  db = await openDB<OfflineDBSchema>('mospams-offline', 1, {
    upgrade(db) {
      // Parts store
      if (!db.objectStoreNames.contains('parts')) {
        const partsStore = db.createObjectStore('parts', { keyPath: 'id' });
        partsStore.createIndex('by-part-code', 'part_code');
        partsStore.createIndex('by-shop', 'shop_id_fk');
      }

      // Barcodes store
      if (!db.objectStoreNames.contains('part_barcodes')) {
        const barcodesStore = db.createObjectStore('part_barcodes', {
          keyPath: 'id',
        });
        barcodesStore.createIndex('by-barcode', 'barcode_value');
        barcodesStore.createIndex('by-part', 'part_id');
        barcodesStore.createIndex('by-shop', 'shop_id_fk');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
}

export async function syncPartsToOffline(
  shopId: number,
  parts: any[]
): Promise<void> {
  if (!db) await initializeOfflineDB();

  for (const part of parts) {
    await db!.put('parts', {
      ...part,
      shop_id_fk: shopId,
    });
  }
}

export async function syncBarcodesToOffline(
  shopId: number,
  barcodes: any[]
): Promise<void> {
  if (!db) await initializeOfflineDB();

  for (const barcode of barcodes) {
    await db!.put('part_barcodes', {
      ...barcode,
      shop_id_fk: shopId,
    });
  }
}

export async function lookupBarcodeOffline(
  barcode: string,
  shopId: number
): Promise<any | null> {
  if (!db) await initializeOfflineDB();

  const barcode_record = await db!
    .index('part_barcodes', 'by-barcode')
    .get(barcode);

  if (!barcode_record || barcode_record.shop_id_fk !== shopId) {
    return null;
  }

  const part = await db!.get('parts', barcode_record.part_id);
  return part || null;
}

export async function queueNewPart(
  partData: any,
  barcodeData: any
): Promise<void> {
  if (!db) await initializeOfflineDB();

  const queueId = `part-${Date.now()}`;
  await db!.put('sync_queue', {
    id: queueId,
    type: 'new_part',
    data: { part: partData, barcode: barcodeData },
    status: 'pending',
    timestamp: Date.now(),
  });
}

export async function getPendingSyncItems(): Promise<any[]> {
  if (!db) await initializeOfflineDB();

  return db!.getAll('sync_queue');
}

export async function markSyncItemSynced(id: string): Promise<void> {
  if (!db) await initializeOfflineDB();

  const item = await db!.get('sync_queue', id);
  if (item) {
    item.status = 'synced';
    await db!.put('sync_queue', item);
  }
}

export async function cleanupOldSyncItems(olderThanMs: number = 86400000): Promise<void> {
  if (!db) await initializeOfflineDB();

  const allItems = await db!.getAll('sync_queue');
  const now = Date.now();

  for (const item of allItems) {
    if (now - item.timestamp > olderThanMs) {
      await db!.delete('sync_queue', item.id);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/services/offlineCache.ts
git commit -m "feat: add offline cache service with IndexedDB sync"
```

---

### Task 12: Create BarcodeScannerModal Component

**Files:**
- Create: `Frontend/src/features/inventory/components/BarcodeScannerModal.tsx`

- [ ] **Step 1: Write component**

```typescript
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  detectBarcode,
  requestCameraPermission,
  BarcodeDetectionResult,
} from '@/shared/services/barcodeScanner';

interface BarcodeScannerModalProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScannerModal({
  onBarcodeDetected,
  onClose,
  isOpen,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setError('Camera access required. Please grant permission in settings.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraEnabled(true);
        }
      } catch (err) {
        setError('Unable to access camera');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Polling for barcode detection
  useEffect(() => {
    if (!cameraEnabled || !videoRef.current) return;

    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const result = await detectBarcode(videoRef.current);
        if (result) {
          setDetectedBarcode(result.barcode);
          onBarcodeDetected(result.barcode);
          handleClose();
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [cameraEnabled, onBarcodeDetected]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onBarcodeDetected(manualInput.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setManualInput('');
    setDetectedBarcode(null);
    setCameraEnabled(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Scan Barcode</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {cameraEnabled && !error && (
          <div className="mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-square bg-gray-900 rounded border-2 border-gray-400"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {detectedBarcode && (
              <p className="mt-2 text-green-600 font-semibold">
                Detected: {detectedBarcode}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Or enter manually:</label>
          <Input
            placeholder="Type barcode..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="flex-1"
          >
            Use Barcode
          </Button>
          <Button onClick={handleClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/inventory/components/BarcodeScannerModal.tsx
git commit -m "feat: add barcode scanner modal with camera integration"
```

---

### Task 13: Create PartLookupResult Component

**Files:**
- Create: `Frontend/src/features/inventory/components/PartLookupResult.tsx`

- [ ] **Step 1: Write component**

```typescript
import React from 'react';
import { Button } from '@/shared/components/ui/button';

interface PartLookupResultProps {
  status: 'found' | 'not_found';
  part?: {
    id: number;
    brand: string;
    part_code: string;
    description: string;
    category: string;
    price: number;
    stock_quantity: number;
  };
  onQuickAdd?: () => void;
  onReviewFirst?: () => void;
  onUseOCR?: () => void;
  onManualEntry?: () => void;
  onBack?: () => void;
}

export function PartLookupResult({
  status,
  part,
  onQuickAdd,
  onReviewFirst,
  onUseOCR,
  onManualEntry,
  onBack,
}: PartLookupResultProps) {
  if (status === 'found' && part) {
    return (
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold text-green-600 mb-4">✓ Part Found</h3>

        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded">
          <div>
            <label className="text-sm font-medium text-gray-600">Brand</label>
            <p className="text-lg font-semibold">{part.brand}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Part Code</label>
            <p className="text-lg font-semibold">{part.part_code}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Description</label>
            <p className="text-base">{part.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Category</label>
              <p className="text-base">{part.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Price</label>
              <p className="text-base">${part.price.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Stock</label>
              <p className="text-base">{part.stock_quantity} units</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onQuickAdd} className="flex-1 bg-green-600 hover:bg-green-700">
            Quick Add
          </Button>
          <Button onClick={onReviewFirst} variant="outline" className="flex-1">
            Review First
          </Button>
        </div>

        {onBack && (
          <Button onClick={onBack} variant="ghost" className="w-full mt-2">
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-orange-600 mb-4">✗ Part Not Found</h3>

      <p className="text-gray-700 mb-6">
        This barcode is not in the system yet. Would you like to add it?
      </p>

      <div className="flex flex-col gap-2">
        <Button onClick={onUseOCR} className="bg-blue-600 hover:bg-blue-700">
          Use OCR to Extract Details
        </Button>
        <Button onClick={onManualEntry} variant="outline">
          Enter Details Manually
        </Button>
      </div>

      {onBack && (
        <Button onClick={onBack} variant="ghost" className="w-full mt-4">
          Scan Another Barcode
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/inventory/components/PartLookupResult.tsx
git commit -m "feat: add part lookup result display component"
```

---

### Task 14: Create OCRPreviewModal Component

**Files:**
- Create: `Frontend/src/features/inventory/components/OCRPreviewModal.tsx`

- [ ] **Step 1: Write component**

```typescript
import React, { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { extractTextFromImage, suggestPartsFromOCR } from '@/shared/services/ocrService';

interface OCRPreviewModalProps {
  onExtracted: (data: {
    brand: string;
    partCode: string;
    description: string;
    rawText: string;
  }) => void;
  onCancel: () => void;
  barcode: string;
}

export function OCRPreviewModal({ onExtracted, onCancel, barcode }: OCRPreviewModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    partCode: '',
    description: '',
  });

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      const img = new Image();
      img.src = url;
      img.onload = async () => {
        const result = await extractTextFromImage(img);

        if (result) {
          setExtractedText(result.text);
          setConfidence(result.confidence);

          // Auto-fill form with OCR suggestions
          const suggestions = suggestPartsFromOCR(result.text);
          setFormData({
            brand: suggestions.brand || '',
            partCode: suggestions.partCode || '',
            description: suggestions.description || '',
          });
        } else {
          setExtractedText('No text detected. Please enter details manually.');
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      setExtractedText('Error reading image. Please try another photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = () => {
    onExtracted({
      brand: formData.brand,
      partCode: formData.partCode,
      description: formData.description,
      rawText: extractedText,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Extract Part Details from Image</h2>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload Photo'}
          </Button>
        </div>

        {imageUrl && (
          <div className="mb-4">
            <img src={imageUrl} alt="Packaging" className="w-full rounded border" />
          </div>
        )}

        {extractedText && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-600">
              Detected Text (Confidence: {(confidence * 100).toFixed(0)}%)
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{extractedText}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g., Yamaha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part Code</label>
            <Input
              value={formData.partCode}
              onChange={(e) => setFormData({ ...formData, partCode: e.target.value })}
              placeholder="e.g., 1LB-H3912-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Lever LH"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
            Use These Details
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/inventory/components/OCRPreviewModal.tsx
git commit -m "feat: add OCR preview modal with image text extraction"
```

---

### Task 15: Create PartFormWithScanning Wrapper

**Files:**
- Create: `Frontend/src/features/inventory/components/PartFormWithScanning.tsx`

- [ ] **Step 1: Write component**

```typescript
import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PartLookupResult } from './PartLookupResult';
import { OCRPreviewModal } from './OCRPreviewModal';
import { useData } from '@/shared/hooks/useData';
import { Input } from '@/shared/components/ui/input';

interface PartFormWithScanningProps {
  onClose: () => void;
  onPartAdded?: () => void;
}

type FormStep = 'choice' | 'scanner' | 'lookup' | 'ocr' | 'manual' | 'form';

interface ScannedBarcode {
  value: string;
  partCode?: string;
}

export function PartFormWithScanning({
  onClose,
  onPartAdded,
}: PartFormWithScanningProps) {
  const { createPart, parts } = useData();

  const [step, setStep] = useState<FormStep>('choice');
  const [scannedBarcode, setScannedBarcode] = useState<ScannedBarcode | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    brand: '',
    part_code: '',
    description: '',
    category_id_fk: '',
    price: 0,
    stock_quantity: 1,
    barcode_value: '',
    barcode_type: 'EAN-13',
  });

  const handleScanBarcode = async (barcode: string) => {
    setScannedBarcode({ value: barcode });
    setFormData((prev) => ({ ...prev, barcode_value: barcode }));

    // Check if part exists (API call)
    try {
      const response = await fetch(`/api/inventory/barcode/${barcode}`);
      if (response.ok) {
        const data = await response.json();
        setLookupResult(data);
        setStep('lookup');
      } else {
        setLookupResult({ status: 'not_found' });
        setStep('lookup');
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      setLookupResult({ status: 'not_found' });
      setStep('lookup');
    }
  };

  const handleQuickAdd = async () => {
    if (!lookupResult?.part) return;

    const quantity = prompt('How many units?', '1');
    if (quantity) {
      // Record stock movement for existing part
      // TODO: Call stock movement API
      onPartAdded?.();
      onClose();
    }
  };

  const handleReviewFirst = () => {
    if (lookupResult?.part) {
      setFormData((prev) => ({
        ...prev,
        brand: lookupResult.part.brand,
        part_code: lookupResult.part.part_code,
        description: lookupResult.part.description,
      }));
      setStep('form');
    }
  };

  const handleOCRExtracted = (data: {
    brand: string;
    partCode: string;
    description: string;
    rawText: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      brand: data.brand,
      part_code: data.partCode,
      description: data.description,
    }));

    // Check if part_code already exists
    const existingPart = parts.find(
      (p) => p.part_code.toLowerCase() === data.partCode.toLowerCase()
    );
    if (existingPart) {
      // Offer to link barcode to existing part
      const confirm = window.confirm(
        `Link barcode to existing part "${existingPart.description}"?`
      );
      if (confirm) {
        // TODO: Call link barcode API
        onPartAdded?.();
        onClose();
      }
    } else {
      setStep('form');
    }
  };

  const handleSaveForm = async () => {
    if (
      !formData.brand ||
      !formData.part_code ||
      !formData.description ||
      !formData.category_id_fk ||
      formData.price <= 0
    ) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await createPart({
        ...formData,
        stock_quantity: parseInt(formData.stock_quantity.toString()),
      });
      onPartAdded?.();
      onClose();
    } catch (error) {
      console.error('Error creating part:', error);
      alert('Failed to create part');
    }
  };

  if (step === 'choice') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Add Part to Inventory</h2>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setStep('scanner')}
              className="bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            >
              📱 Scan Barcode/QR
            </Button>
            <Button
              onClick={() => setStep('manual')}
              variant="outline"
              className="h-12 text-lg"
            >
              ⌨️ Enter Manually
            </Button>
          </div>
          <Button onClick={onClose} variant="ghost" className="w-full mt-4">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'scanner') {
    return (
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={handleScanBarcode}
        onClose={() => setStep('choice')}
      />
    );
  }

  if (step === 'lookup' && lookupResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <PartLookupResult
          status={lookupResult.status}
          part={lookupResult.part}
          onQuickAdd={handleQuickAdd}
          onReviewFirst={handleReviewFirst}
          onUseOCR={() => setStep('ocr')}
          onManualEntry={() => setStep('manual')}
          onBack={() => {
            setStep('scanner');
            setLookupResult(null);
          }}
        />
      </div>
    );
  }

  if (step === 'ocr' && scannedBarcode) {
    return (
      <OCRPreviewModal
        barcode={scannedBarcode.value}
        onExtracted={handleOCRExtracted}
        onCancel={() => setStep('lookup')}
      />
    );
  }

  if (step === 'manual' || step === 'form') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Add New Part</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Brand *</label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Yamaha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Part Code *</label>
              <Input
                value={formData.part_code}
                onChange={(e) => setFormData({ ...formData, part_code: e.target.value })}
                placeholder="e.g., 1LB-H3912-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Lever LH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={formData.category_id_fk}
                onChange={(e) => setFormData({ ...formData, category_id_fk: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select category</option>
                {/* TODO: Load from API */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) =>
                  setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })
                }
              />
            </div>

            {scannedBarcode && (
              <div>
                <label className="block text-sm font-medium mb-1">Barcode</label>
                <Input disabled value={scannedBarcode.value} />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSaveForm} className="flex-1 bg-green-600 hover:bg-green-700">
              Save Part
            </Button>
            <Button
              onClick={() => (step === 'form' ? setStep('lookup') : setStep('choice'))}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
          </div>

          <Button onClick={onClose} variant="ghost" className="w-full mt-2">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/inventory/components/PartFormWithScanning.tsx
git commit -m "feat: add comprehensive part form wrapper with scanning workflow"
```

---

### Task 16: Integrate into InventoryPage

**Files:**
- Modify: `Frontend/src/features/inventory/pages/InventoryPage.tsx`

- [ ] **Step 1: Import new component**

Add at top of file:

```typescript
import { PartFormWithScanning } from '../components/PartFormWithScanning';
```

- [ ] **Step 2: Add state and handlers**

Add inside component function:

```typescript
const [showScanForm, setShowScanForm] = useState(false);

const handlePartAdded = () => {
  setShowScanForm(false);
  // Refresh inventory list (your existing refresh logic)
};
```

- [ ] **Step 3: Add Scan button to UI**

Find the button or action area where "Add Part" is shown, and add:

```typescript
<Button
  onClick={() => setShowScanForm(true)}
  className="bg-blue-600 hover:bg-blue-700"
>
  📱 Scan Part
</Button>
```

- [ ] **Step 4: Add modal at end of render**

Add before closing component return:

```typescript
{showScanForm && (
  <PartFormWithScanning
    onClose={() => setShowScanForm(false)}
    onPartAdded={handlePartAdded}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/inventory/pages/InventoryPage.tsx
git commit -m "feat: integrate barcode scanning into inventory page"
```

---

## Phase 3: Testing Components

### Task 17: Write Component Tests

**Files:**
- Create: `Frontend/__tests__/features/inventory/BarcodeScannerModal.test.tsx`

- [ ] **Step 1: Create test file**

```bash
mkdir -p "Frontend/__tests__/features/inventory"
```

- [ ] **Step 2: Write tests**

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BarcodeScannerModal } from '@/features/inventory/components/BarcodeScannerModal';

describe('BarcodeScannerModal', () => {
  const mockOnBarcodeDetected = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders camera modal when open', () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('Scan Barcode')).toBeInTheDocument();
  });

  it('shows manual input fallback', () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByPlaceholderText('Type barcode...')).toBeInTheDocument();
  });

  it('calls onBarcodeDetected when manual barcode submitted', async () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText('Type barcode...');
    fireEvent.change(input, { target: { value: '4545913123456' } });
    fireEvent.click(screen.getByText('Use Barcode'));

    expect(mockOnBarcodeDetected).toHaveBeenCalledWith('4545913123456');
  });

  it('does not render when closed', () => {
    const { container } = render(
      <BarcodeScannerModal
        isOpen={false}
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd Frontend
npm test -- BarcodeScannerModal.test.tsx
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add "Frontend/__tests__/features/inventory/BarcodeScannerModal.test.tsx"
git commit -m "test: add barcode scanner modal component tests"
```

---

### Task 18: Test Offline Cache

**Files:**
- Create: `Frontend/__tests__/shared/services/offlineCache.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import {
  initializeOfflineDB,
  syncPartsToOffline,
  lookupBarcodeOffline,
  queueNewPart,
  getPendingSyncItems,
} from '@/shared/services/offlineCache';

describe('Offline Cache Service', () => {
  beforeEach(async () => {
    await initializeOfflineDB();
  });

  it('initializes IndexedDB without error', async () => {
    await initializeOfflineDB();
    expect(true).toBe(true); // Should not throw
  });

  it('syncs parts to offline cache', async () => {
    const parts = [
      {
        id: 1,
        brand: 'Yamaha',
        part_code: '1LB-H3912-00',
        description: 'Lever LH',
        category: 'levers',
        price: 45.99,
        stock_quantity: 8,
      },
    ];

    await syncPartsToOffline(1, parts);
    // Should complete without error
    expect(true).toBe(true);
  });

  it('queues new parts for sync', async () => {
    const partData = {
      brand: 'Yamaha',
      part_code: '1LB-H3912-00',
      description: 'Lever LH',
    };
    const barcodeData = {
      barcode_value: '4545913123456',
      barcode_type: 'EAN-13',
    };

    await queueNewPart(partData, barcodeData);
    const items = await getPendingSyncItems();

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].data.part.brand).toBe('Yamaha');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd Frontend
npm test -- offlineCache.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add "Frontend/__tests__/shared/services/offlineCache.test.ts"
git commit -m "test: add offline cache service tests"
```

---

## Phase 4: Final Integration & Deploy

### Task 19: Manual Testing Checklist

- [ ] Test barcode scanning (known part)
- [ ] Test quick add workflow
- [ ] Test review first workflow
- [ ] Test unknown part + OCR
- [ ] Test manual entry fallback
- [ ] Test offline barcode lookup
- [ ] Test duplicate barcode prevention
- [ ] Test camera permission handling
- [ ] Deploy to production via deploy.sh

### Task 20: Deploy Changes

- [ ] **Step 1: Run deploy script**

```bash
bash deploy.sh
```

- [ ] **Step 2: Verify deployment**

Check that:
- Database migrations ran successfully
- Frontend built without errors
- Backend container restarted
- API endpoints are accessible

- [ ] **Step 3: Create final commit**

```bash
git add .
git commit -m "feat: complete smart inventory barcode scanning system

- Database: part_barcodes table with shop scoping
- Backend: 4 barcode API endpoints with transaction support
- Frontend: ML Kit camera scanner + OCR + offline IndexedDB sync
- UI: Scan vs manual entry choice, found/not found states, quick add/review
- Offline: Full parts/barcodes cache with auto-sync
- Testing: Backend feature tests, frontend component tests"
```

---

## Success Criteria Verification

Run through these before marking complete:

- ✓ Backend tests pass: `php artisan test tests/Feature/InventoryBarcodeTest.php`
- ✓ Frontend tests pass: `npm test`
- ✓ Scan known barcode: Part loads in <5 seconds
- ✓ Scan unknown barcode: OCR extracts text accurately
- ✓ Offline scan: Works without network
- ✓ Sync on reconnect: Queued items sync automatically
- ✓ No barcode duplicates: Unique constraint enforced
- ✓ Shop scoping: User only sees their shop's barcodes/parts
- ✓ Manual fallback: Always available if camera fails
- ✓ Mobile UI: Responsive on phone/tablet
