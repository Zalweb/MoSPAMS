# Smart Inventory Barcode Scanning System Design

**Date:** 2026-05-14  
**Feature:** Staff/Admin barcode scanning for inventory part intake  
**Tech Stack:** Google ML Kit (barcode + OCR), IndexedDB (offline), Laravel API  
**Users:** Shop Staff, Shop Admins  
**Scope:** Camera-based barcode/QR scanning with OCR-assisted part registration

---

## Overview

The smart inventory scanning system enables staff and admins to quickly intake motorcycle parts using camera-based barcode scanning. When a part is unknown, the system uses OCR to extract text from packaging images, auto-populating the part registration form. The feature is fully offline-capable with automatic sync when connectivity returns.

**Core principle:** Barcode (lookup identifier) ≠ Part Code (master identity). One part can have many barcodes.

---

## Database Schema

### New Table: `part_barcodes`

```sql
CREATE TABLE part_barcodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  part_id BIGINT NOT NULL,
  barcode_value VARCHAR(255) NOT NULL,
  barcode_type VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  shop_id_fk BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id_fk) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY unique_barcode_per_shop (barcode_value, shop_id_fk),
  INDEX idx_barcode_lookup (barcode_value, shop_id_fk)
);
```

**Why separate from parts table:**
- One part → many barcodes (different suppliers, packaging versions, regional distributors)
- Fast O(1) barcode lookup via unique index
- Audit trail: track when each barcode was added to the system
- No changes to existing `parts` table schema

---

## Backend API Endpoints

All endpoints scoped to user's shop via `BelongsToTenant` trait. Authorization: Owner/Staff only.

### 1. Lookup Barcode
**`GET /api/inventory/barcode/{barcode}`**

Response (found):
```json
{
  "status": "found",
  "part": {
    "id": 42,
    "brand": "Yamaha",
    "part_code": "1LB-H3912-00",
    "description": "Lever LH",
    "category": "levers",
    "price": 45.99,
    "stock_quantity": 8,
    "supplier_id": 5
  },
  "barcodes": [
    { "id": 1, "barcode_value": "4545913123456", "is_primary": true }
  ]
}
```

Response (not found):
```json
{
  "status": "not_found",
  "message": "No part found for barcode"
}
```

---

### 2. Link Existing Barcode to Part
**`POST /api/inventory/barcode/link`**

Payload:
```json
{
  "barcode_value": "4545913123456",
  "part_id": 42,
  "barcode_type": "EAN-13"
}
```

Validation:
- Prevent duplicate barcode within shop
- Prevent barcode already assigned to another part
- If barcode is new but part_code from OCR exists, auto-link

Response:
```json
{
  "id": 1,
  "barcode_value": "4545913123456",
  "part_id": 42,
  "part": { ... },
  "message": "Barcode linked successfully"
}
```

---

### 3. Create Part with Barcode
**`POST /api/inventory/parts/with-barcode`**

Payload:
```json
{
  "brand": "Yamaha",
  "part_code": "1LB-H3912-00",
  "description": "Lever LH",
  "category_id_fk": 5,
  "price": 45.99,
  "stock_quantity": 1,
  "barcode_value": "4545913123456",
  "barcode_type": "EAN-13"
}
```

Creates part + barcode in single transaction. Response includes both records.

---

### 4. List Barcodes for Part
**`GET /api/inventory/parts/{part}/barcodes`**

Returns all barcodes linked to a part for review/management.

---

## Frontend Architecture

### New Components

**`src/features/inventory/components/BarcodeScannerModal.tsx`**
- Live camera feed with ML Kit barcode detection
- Auto-highlights detected barcode
- Manual input fallback (type barcode if camera fails)
- Cancel/reset controls

**`src/features/inventory/components/PartLookupResult.tsx`**
- Displays found part details (brand, code, description, category, price, stock)
- If found: two buttons (Quick Add / Review First)
- If not found: prompts for OCR or manual entry

**`src/features/inventory/components/OCRPreviewModal.tsx`**
- Captures/displays packaging image
- ML Kit text recognition extracts: brand, part code, description, left/right indicators
- Shows extracted text with edit fields for confirmation
- Allows manual correction before form submission

**`src/features/inventory/components/PartFormWithScanning.tsx`**
- New "Add Part" wrapper with scanning entry point
- Initial choice: "Scan Barcode" vs "Manual Entry"
- Scan path: barcode lookup → quick add or review
- Manual path: traditional form
- All paths save to same `storePart` endpoint

**Modified: `src/features/inventory/pages/InventoryPage.tsx`**
- Add "Scan Part" button at top of page or in floating action menu
- Launches `PartFormWithScanning` modal

---

## User Workflows

### Workflow A: Known Part (Fast Path - 3 clicks)
1. Staff taps "Scan Part" → camera opens
2. Points at barcode → ML Kit detects → sent to API
3. Part found → auto-fills: brand, code, description, category, price, current stock
4. Staff taps "Quick Add" (default) → enters quantity → saves
5. Redirect to inventory list

Time: ~10 seconds

---

### Workflow B: Unknown Part (OCR + Register)
1. Staff scans barcode → 404 (not found)
2. Shows "Part Not Found" with options:
   - **"Use OCR"**: Take photo of packaging → ML Kit extracts text (brand, part code, description)
     - System searches for extracted part_code in existing parts
     - If found: "Link this barcode to existing part?" → confirm
     - If not found: Auto-fill form with OCR results
       - Staff selects category, enters price, confirms stock qty
       - Optional: edit any pre-filled field
       - Save → creates new part + barcode
   - **"Enter Manually"**: Skip to traditional form
3. Done

Time: ~30-45 seconds (including OCR + manual review)

---

### Workflow C: Offline Behavior
1. **On app load:** IndexedDB syncs parts + part_barcodes (incremental, last-synced timestamp)
2. **When scanning offline:**
   - Barcode lookup is instant from IndexedDB (no network needed)
   - If found: show cached part details (read-only, "offline" badge)
   - If not found: queue for sync, allow manual entry
3. **When online:** Auto-sync queued new parts + barcodes to server

---

## Error Handling & Edge Cases

**Duplicate barcode:**
- If staff tries to link barcode already assigned to another part in shop
- Response: "This barcode is already linked to [Part Name]. Link to that part instead?"

**Camera permission denied:**
- Fallback to manual barcode input field
- Show message: "Camera access required for scanning. Please grant permission or type barcode manually."

**OCR low confidence:**
- If ML Kit extracts text but confidence is low
- Show extraction with warning icon
- Require staff confirmation before saving

**Network error during barcode lookup:**
- If offline: show IndexedDB cached version if available
- If never cached: show "Unable to look up. Try offline mode or enter manually."

**Invalid barcode format:**
- Barcode unreadable or invalid characters
- Show error: "Invalid barcode. Please try again or enter manually."

**New part creation fails:**
- Queue for sync if offline
- Show "sync pending" badge in inventory
- Auto-retry when online

---

## Offline Capability

### IndexedDB Schema

```javascript
stores: {
  parts: { keyPath: 'id', indexes: ['part_code', 'shop_id_fk'] },
  part_barcodes: { keyPath: 'id', indexes: ['barcode_value', 'part_id', 'shop_id_fk'] },
  sync_queue: { keyPath: 'id', indexes: ['status', 'timestamp'] }
}
```

### Sync Strategy

- **On app init:** Fetch parts + barcodes from API (paginated, incremental by timestamp)
- **Background sync:** Every 5 minutes (if online), check for updates
- **Before saving new part offline:** Queue to `sync_queue` with `status: 'pending'`
- **When online:** Process sync_queue → POST each queued part → update local DB on success
- **Auto-cleanup:** Remove synced items from queue after 24 hours

### Storage
- All parts/barcodes per shop cached in IndexedDB (~2MB typical)
- Sync queue limited to last 100 items to prevent bloat

---

## Technology Stack

### Frontend Dependencies (New)

- **Camera/Barcode:** Native MediaDevices API + Google ML Kit Barcode Scanner
  - Package: `@firebase/ml` (includes text recognition + barcode detection)
  - Size: ~300KB gzipped
- **Offline:** `idb` (IndexedDB wrapper)
- **Camera UI:** Built-in React video element + canvas for image capture

### Backend

- **Database:** Existing MySQL + Laravel migrations
- **ORM:** Eloquent (PartBarcode model with BelongsToTenant)
- **No new packages needed**

### Build & Deployment

- No breaking changes to existing inventory flow
- Deploy as part of normal backend + frontend cycle
- Database migration runs on deployment

---

## Testing Strategy

### Backend Tests (Feature Tests)

```php
// test/Feature/InventoryBarcodeTest.php
- test_barcode_lookup_found()
- test_barcode_lookup_not_found()
- test_duplicate_barcode_prevention()
- test_barcode_link_to_existing_part()
- test_create_part_with_barcode()
- test_barcode_scoped_to_shop()
```

### Frontend Tests (Unit + Integration)

```typescript
// __tests__/features/inventory/BarcodeScannerModal.test.tsx
- Detect barcode from camera feed (ML Kit mock)
- Handle camera permission denied
- Manual barcode input fallback
- OCR text extraction (mock)
- IndexedDB sync logic
- Offline barcode lookup
```

### Manual Testing Checklist

- ✓ Scan known barcode → quick add → complete
- ✓ Scan known barcode → review first → edit fields → save
- ✓ Scan unknown barcode → OCR extraction → auto-fill form
- ✓ OCR finds matching part_code → offer to link barcode
- ✓ Create new part from OCR + manual entry
- ✓ Offline: scan known part → show cached (no network)
- ✓ Offline: scan unknown part → queue for sync
- ✓ Reconnect to network → auto-sync queued items
- ✓ Camera permission denied → fallback to manual input
- ✓ Duplicate barcode → prevent, show message
- ✓ Invalid barcode format → error message
- ✓ Network error → graceful fallback

---

## Implementation Phases

### Phase 1: Backend Infrastructure
- Create `PartBarcode` model + migration
- Add barcode API endpoints (lookup, link, create)
- Add shop-scoped queries via BelongsToTenant

### Phase 2: Frontend Scanning
- Integrate ML Kit (barcode + text recognition)
- Build BarcodeScannerModal + PartLookupResult
- Integrate with existing InventoryPage

### Phase 3: OCR & Part Registration
- Build OCRPreviewModal with text extraction
- Implement part creation with barcode linking
- Add auto-detection of matching part_code

### Phase 4: Offline Capability
- Set up IndexedDB cache (parts, barcodes, sync_queue)
- Implement sync logic (on-demand + background)
- Add offline badges + sync status UI

### Phase 5: Testing & Polish
- Feature tests for all endpoints
- Component tests for scanner workflows
- Manual QA on mobile devices
- Deploy to production

---

## Success Criteria

- ✓ Staff can scan known part barcode in <15 seconds
- ✓ Unknown part registration with OCR in <45 seconds
- ✓ Works offline (scan → queue → sync)
- ✓ No barcode duplicates within shop
- ✓ All barcode queries scoped to user's shop
- ✓ Manual entry fallback always available
- ✓ Mobile-friendly camera UI (phones/tablets)
- ✓ Minimal clicks for fast workflow

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ML Kit barcode detection fails | Manual input fallback always available |
| OCR accuracy low on poor packaging | Show confidence indicator, allow manual edit |
| IndexedDB quota exceeded | Monitor cache size, implement LRU eviction |
| Network sync fails | Queue persists, auto-retry on reconnect |
| Camera permission denied | Fallback to manual barcode entry |
| Duplicate barcode across tenants | Unique constraint scoped to shop_id_fk |

---

## Future Enhancements (Out of Scope)

- Barcode history/audit log (which staff scanned, when)
- Batch scanning mode (continuous scan→add loop)
- Custom barcode generation for parts without barcodes
- Integration with physical barcode label printer
- Analytics: most scanned parts, OCR success rate
