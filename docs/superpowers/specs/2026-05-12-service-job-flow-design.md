# Service Job Flow Redesign

**Date:** 2026-05-12
**Status:** Approved

---

## Overview

Redesign the Service Job feature from a free-form status dropdown into a strict, button-driven workflow. Each status has exactly the actions that belong to it. Staff cannot skip steps; mechanics can request parts while the job is ongoing; billing happens at completion with manual payment confirmation.

---

## State Machine

```
[Customer books online] OR [Staff/Owner creates job]
               ↓
            PENDING
         ┌───────────────────────────┐
         │ [Start Service]           │  → opens Assign Mechanic modal
         │ [Cancel]                  │  → sets cancelled immediately
         └───────────────────────────┘
               ↓ (Start Service confirmed with ≥1 mechanic)
          IN PROGRESS
         ┌───────────────────────────┐
         │ [Add Items]               │  → staff picks parts from inventory (confirmed)
         │ [Complete]                │  → opens Billing modal
         │ Part Requests section     │  → mechanic-requested parts, staff confirms/rejects
         └───────────────────────────┘
               ↓ (Billing modal: labor cost set, payment method chosen, [Confirm Payment])
           COMPLETED

Auto-cancel: PENDING jobs older than 12 hours → CANCELLED (scheduled command)
```

Rules:
- Status only changes via dedicated action endpoints — never via a free-form PATCH field.
- `in_progress` → `completed` requires a billing record to be created first.
- Cancelled and Completed are terminal states — no further actions.

---

## Database Changes

### `service_job_parts` table — two new columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `status` | `enum('requested','confirmed')` | `confirmed` | `confirmed` = staff-added; `requested` = mechanic-requested pending staff approval |
| `requested_by_fk` | `unsignedBigInteger` nullable | `null` | FK → `users.id`. Null when staff adds directly. |

Migration: `add_status_and_requested_by_to_service_job_parts`

No other schema changes. Existing `service_job_parts` rows default to `confirmed`.

---

## Backend

### New Endpoints

#### `POST /services/{service}/start`
- **Auth:** Owner, Staff
- **Validates:** `mechanic_ids` array, min 1
- **Guards:** service status must be `pending`
- **Actions:** inserts rows into `service_job_mechanics`; sets status to `in_progress`
- **Returns:** updated service resource

#### `POST /services/{service}/cancel`
- **Auth:** Owner, Staff
- **Guards:** service status must be `pending`
- **Actions:** sets status to `cancelled`
- **Returns:** updated service resource

#### `PATCH /services/{service}/parts/{jobPartId}/confirm`
- **Auth:** Owner, Staff
- **Guards:** part status must be `requested`; part must belong to this service
- **Actions:** sets `service_job_parts.status` to `confirmed`
- **Returns:** updated service resource

#### `DELETE /services/{service}/parts/{jobPartId}`
- **Auth:** Owner, Staff
- **Actions:** deletes the `service_job_parts` row (works for both requested and confirmed)
- **Returns:** updated service resource

### Modified Endpoints

#### `POST /services/{service}/bill` (existing)
- Add optional `labor_cost` body param — when provided, updates `service_job_items.labor_cost` before calculating the billing total
- Billing total uses **only** `service_job_parts` rows with `status = 'confirmed'`
- Sets service status to `completed` (unchanged)
- Cannot be called twice (unchanged)

#### `POST /mechanic/jobs/{job}/parts` (existing `addPartToJob`)
- Mechanic-submitted parts now land with `status = 'requested'` and `requested_by_fk` = mechanic's user id
- Mechanic cannot add `confirmed` parts directly — that is staff-only

#### `PATCH /services/{service}` (existing `updateService`)
- Remove `status` from the list of accepted fields — status is now only changed via action endpoints
- All other fields (notes, motorcycleModel, etc.) remain editable

### Scheduled Command: `CancelStalePendingServices`

- Registered in `app/Console/Kernel.php` to run **hourly**
- Query: `service_jobs` where `status_code = 'pending'` AND `created_at < now() - 12 hours` AND `shop_id_fk` in active shops
- For each match: set status to `cancelled`
- If the job has a `customer_id_fk`: create a notification record for the customer ("Your service booking was automatically cancelled due to no response within 12 hours.")
- Logs count of cancelled jobs

---

## Frontend

### ServicesPage (`ServicesPage.tsx`)

Replace the per-card status dropdown with contextual action buttons.

**Pending card:**
- Primary button: `[Start Service]` — opens Start Service modal
- Ghost/destructive button: `[Cancel]` — confirms with a dialog, then calls `POST /services/{id}/cancel`

**Ongoing card:**
- `[Add Items]` button — opens parts picker modal (same inventory picker as today), parts added as `confirmed`
- `[Complete]` button — opens Billing modal
- **Part Requests** collapsible section below the card body:
  - Lists `requested` parts: part name, qty, requested by (mechanic name)
  - Per row: `[Confirm]` button (calls `PATCH .../parts/{id}/confirm`) and `[Reject]` button (calls `DELETE .../parts/{id}`)
  - Badge on the section header showing count of pending requests (e.g. "Part Requests (2)")

**Completed / Cancelled card:**
- Read-only status badge, no action buttons
- Confirmed parts list visible for reference

### Start Service Modal (new)

- Title: "Start Service"
- Multi-select mechanic picker — lists mechanics belonging to the shop
- Validation: at least one mechanic must be selected before confirming
- `[Confirm Start]` button → calls `POST /services/{id}/start` → closes modal, card transitions to Ongoing

### Billing Modal (triggered by Complete)

- Title: "Complete & Collect Payment"
- **Labor cost** input — pre-filled from `service_job_items.labor_cost` (which comes from service type default); editable
- **Parts** list — shows only `confirmed` parts with unit price, qty, subtotal
- **Total** = labor cost + sum of confirmed parts subtotals
- **Payment method** selector: Cash | GCash
- `[Confirm Payment Received]` button → calls `POST /services/{id}/bill` with `{ labor_cost, payment_method }` → job becomes Completed, modal closes, card shows Completed badge

### Mechanic Portal (`JobDetailsPage.tsx`)

- Add `[Request Parts]` button on the job detail view (only shown when job is `in_progress`)
- Opens an inventory picker modal — same component reused from ServicesPage
- On confirm: calls `POST /mechanic/jobs/{job}/parts` (modified to land as `requested`)
- After submit: parts list on the mechanic's view shows their requested parts with a `Pending Approval` badge
- When staff confirms, the badge updates to `Confirmed` on next poll/refresh

---

## Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Auto-cancel after 12h | Customer (if booking came from customer portal) | "Your service booking was automatically cancelled." |
| Job marked Completed | Customer (if exists) | "Your service job is complete. Please collect your receipt." |

Both use the existing `notifications` table and the pattern already in `updateService`.

---

## Out of Scope

- Online payment processing (PayMongo, etc.) — payment is always confirmed manually by staff
- Mechanic ability to reject a part request back to staff with a note
- Customer ability to cancel their own pending booking from the portal (staff-only for now)
- Email/SMS notifications (system notifications only)
