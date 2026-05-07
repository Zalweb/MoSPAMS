# Shop Service Flow — End-to-End Design

**Date:** 2026-05-07  
**Status:** Approved

---

## Overview

Connect the existing disconnected pieces (Services, Mechanics, Inventory, Sales, Customer Portal) into a single unbroken workflow. The DB is already 80% ready; this spec closes the gaps.

---

## Target Flow

```
[Customer arrives / books service]
        ↓
[Staff creates service record]
   - Assign 1 or multiple mechanics
   - Can edit mechanics anytime (even In Progress)
   - Can add/update parts anytime
   - Can update service status
        ↓
[Service starts → Status: "In Progress"]
   - Mechanics update progress
   - Parts used are recorded in real-time (auto-logged for billing)
        ↓
[Customer Portal Access]
   - Customer can view:
     • Service progress/status
     • Assigned mechanics
     • Parts/items being used
   - Customer can leave the shop and monitor remotely
        ↓
[Service marked "Complete"]
   - "Bill this Job" is triggered
        ↓
[Transaction auto-generated]
   - Includes:
     • Labor/services
     • All recorded parts used
        ↓
[Customer payment]
   - Stock auto-deducted
   - Receipt generated
        ↓
[Customer Portal Updated]
   - Payment status visible
   - Service history recorded
```

---

## Architecture

### What Already Works (no changes needed)

- `service_job_parts` — parts per job already stored with quantity, unit_price, subtotal
- `sales.job_id_fk` — DB already links a sale to a service job
- `storeTransaction` — already auto-deducts stock and records stock movements
- `service_job_items` — labor/service type already stored per job
- `notifications` table — already exists

### What Needs to Change

#### 1. DB Migration

Add `service_job_mechanics` junction table to support multiple mechanics per job:

```sql
service_job_mechanics
  id              bigint PK
  job_id_fk       FK → service_jobs.job_id (cascade delete)
  mechanic_id_fk  FK → mechanics.mechanic_id (cascade delete)
  assigned_at     timestamp
  shop_id_fk      FK → shops.shop_id
```

The existing `assigned_mechanic_id_fk` column on `service_jobs` is left in place for backwards compatibility but ignored by new logic.

#### 2. Backend API Changes

All routes stay in MospamsController under the existing `shop.active` + `tenant.user` middleware group.

**New / extended routes:**

| Method | Route | Role | Purpose |
|--------|-------|------|---------|
| `PATCH` | `/services/{id}` | Owner, Staff | Extend to accept `mechanicIds[]` and `partsUsed[]` |
| `POST` | `/services/{id}/mechanics` | Owner, Staff | Assign a mechanic to a job |
| `DELETE` | `/services/{id}/mechanics/{mechanicId}` | Owner, Staff | Remove a mechanic from a job |
| `POST` | `/services/{id}/bill` | Owner, Staff | Generate transaction from job — reads parts + labor, creates sale + payment, deducts stock |

**Extend `storeService` and `updateService`:**
- Accept `mechanicIds: string[]` — upsert rows in `service_job_mechanics`
- `updateService` — sync `service_job_parts` (delete old, insert new) when `partsUsed` is present

**`POST /services/{id}/bill` logic:**
1. Load all `service_job_parts` for the job
2. Load `service_job_items` for labor cost
3. Validate enough stock exists for each part
4. Call the existing transaction creation logic:
   - Create `sales` record with `job_id_fk` set
   - Insert `sale_items` for each part
   - Deduct stock + record `stock_movements`
   - Insert `payments` record
5. Update job status to `completed` if not already
6. Return transaction resource (same shape as existing `storeTransaction`)

**Extend Customer API:**
- `GET /customer/services` — include `mechanics[]` (name only) and `parts[]` (name + quantity) per job
- `GET /customer/payments` — return payments where `sales.customer_id_fk` matches the authenticated customer record

#### 3. Service Resource Shape (updated)

```json
{
  "id": "42",
  "customerName": "Juan Dela Cruz",
  "motorcycleModel": "Honda Click 150i",
  "serviceType": "Oil Change",
  "laborCost": 350,
  "status": "Ongoing",
  "notes": "",
  "mechanics": [
    { "id": "3", "name": "Pedro Santos" }
  ],
  "partsUsed": [
    { "partId": "7", "name": "Motul 10W-40", "quantity": 1, "unitPrice": 220 }
  ],
  "createdAt": "2026-05-07T10:00:00Z"
}
```

#### 4. Frontend — Services Page

**Service creation/edit modal:**
- Add "Assign Mechanics" multi-select — fetches from existing `GET /mechanics`
- "Parts Used" section already exists; fix it to show part names instead of raw IDs
- On save, send `mechanicIds[]` alongside existing fields

**Service card (list view):**
- Show mechanic badges: "Pedro Santos, Ana Cruz"
- Show parts by name: "Motul 10W-40 x1, Oil Filter x1"
- Add "Bill this Job" button (shown on all statuses for flexibility)
  - Opens a pre-filled checkout modal with parts + labor auto-loaded
  - Staff selects payment method and confirms
  - On success: transaction created, stock deducted, service marked Completed

**"Bill this Job" modal pre-fill logic (frontend):**
- Items: parts from `service.partsUsed` (name, quantity, unitPrice)
- Labor line: service type + laborCost
- Total computed client-side
- Calls `POST /services/{id}/bill` with `{ paymentMethod: 'Cash' | 'GCash' }`

#### 5. Frontend — Customer Portal

**Service cards (CustomerDashboard + ServiceHistory):**
- Show mechanics assigned: "Mechanic: Pedro Santos"
- Show parts in use: "Parts: Motul 10W-40 x1"
- Status badge already present

**Payments page:**
- Currently shows nothing — wire it to `GET /customer/payments`
- Show: date, service type, payment method, amount, receipt button
- Receipt modal: same structure as staff receipt but customer-branded

---

## Data Flow Summary

```
storeService / updateService
    → service_job_parts (parts reserved, stock NOT yet deducted)
    → service_job_mechanics (mechanics assigned)

POST /services/{id}/bill
    → reads service_job_parts + service_job_items
    → creates sale (job_id_fk set) + sale_items
    → deducts stock_quantity on parts
    → records stock_movements (reference_type='sale')
    → creates payment record
    → sets service_job status = completed
    → returns transaction resource
```

Stock is only deducted once — at billing. Parts added to a job are "reserved" not deducted, so no double-deduction risk.

---

## Out of Scope (this iteration)

- WebSocket / real-time push notifications to customer
- Partial payments / split billing
- Discount fields on billing modal
- Income report tab in Reports page (separate task)
- Notification bell UI (table already exists, UI deferred)

---

## Files to Create / Modify

### Backend
- `database/migrations/2026_05_07_000001_create_service_job_mechanics_table.php` — new
- `app/Http/Controllers/Api/MospamsController.php` — extend storeService, updateService, add billService, assignMechanic, removeMechanic
- `routes/api.php` — add 3 new routes

### Frontend
- `src/features/services/pages/ServicesPage.tsx` — mechanic multi-select, part names, "Bill this Job" button + modal
- `src/features/customers/pages/CustomerDashboard.tsx` — show mechanics + parts on service cards
- `src/features/customers/pages/ServiceHistory.tsx` — same
- `src/features/customers/pages/Payments.tsx` — wire to real API data
- `src/shared/types.ts` — update ServiceRecord type to include mechanics[]
