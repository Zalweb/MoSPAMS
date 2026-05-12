# Backlog: Items-Only Sale Flow

**Status:** Parked — implement after service job flow redesign

## Concept

A customer purchases parts/items without a service job attached.

## Two Entry Points

### A — Walk-in (staff-managed)
- Staff opens a "New Sale" flow from the Sales page
- Picks parts from inventory with quantities
- Optionally assigns a registered customer (search by name/account) OR manually types a name (for receipt)
- Selects payment method (Cash / GCash)
- Confirms → creates a `sales` record (`sale_type = 'parts'`), deducts stock, generates receipt

### B — Customer portal (online request)
- Registered customer browses/requests parts from their portal
- Request lands as a pending sale for staff to fulfill
- Staff confirms availability, collects payment in-person, marks as paid

## Key Design Decisions (to resolve in brainstorm)
- Does the customer portal need a parts catalog view?
- Can a walk-in sale be split across multiple payment methods?
- Stock reservation: does a customer portal request reserve stock immediately?
- Receipt format: printed vs digital (PDF)?
