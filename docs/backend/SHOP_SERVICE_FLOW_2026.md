# Shop Service Flow 2026

## Summary

This document records the current service-job flow used by staff, mechanics, and customers.

The flow is now based on:

- `service_job_mechanics` as the only source of mechanic assignment
- stock deduction when parts are attached to a job
- billing that reads job parts and labor without deducting stock a second time
- customer notifications when a mechanic changes a job status

## Backend Routes

### Staff / Owner service routes

- `GET /api/services`
- `GET /api/services/{service}`
- `POST /api/services`
- `PATCH /api/services/{service}`
- `DELETE /api/services/{service}`
- `POST /api/services/{service}/mechanics`
- `DELETE /api/services/{service}/mechanics/{mechanic}`
- `POST /api/services/{service}/bill`

### Mechanic routes

- `GET /api/mechanic/jobs`
- `GET /api/mechanic/jobs/{job}`
- `PATCH /api/mechanic/jobs/{job}/status`
- `POST /api/mechanic/jobs/{job}/parts`
- `DELETE /api/mechanic/jobs/{job}/parts/{jobPart}`

## Mechanic Assignment Model

### Standard

Mechanic assignment uses the pivot table only:

- table: `service_job_mechanics`
- foreign keys:
  - `job_id_fk`
  - `mechanic_id_fk`
  - `shop_id_fk`

### Deprecated field

`service_jobs.assigned_mechanic_id_fk` is now considered deprecated application state.

It still exists in the database for backward compatibility, but controllers should not read from it for assignment, authorization, or job listing.

## Inventory Rules

### Source of truth

Parts inventory is adjusted when parts are attached to or removed from a service job.

This applies to:

- mechanic part actions in `MechanicController`
- staff job part syncing in `MospamsController`

### Billing rule

Billing must not adjust inventory again.

Billing only:

- creates the sale
- creates sale items
- creates the payment
- marks the job as completed

## Notifications

When a mechanic changes a job status:

- the system inserts a row into `notifications`
- `notification_type = job_status_update`
- `reference_type = service_job`
- `reference_id = {job id}`

The notification targets the customer user linked through:

- `service_jobs.customer_id_fk`
- `customers.user_id_fk`

## API Response Notes

### `GET /api/mechanic/jobs`

Each job now includes:

- job information
- `mechanics`
- `partsUsed`

### `GET /api/mechanic/jobs/{job}`

Each response now includes:

- job information
- `mechanics`
- `parts`
- customer contact fields

## Frontend Refresh Strategy

The frontend uses lightweight polling instead of WebSockets for now.

- staff services page: every 10 seconds
- customer dashboard: every 10 seconds
- mechanic assigned jobs page: every 10 seconds

## Test Steps

### Backend

Run:

```bash
cd Backend
php artisan test tests/Feature/ServiceFlowTest.php
```

This covers:

- pivot-based mechanic assignment
- mechanic job visibility
- billing without double stock deduction
- customer notification creation on status change

### Frontend

Run:

```bash
cd Frontend
npm run build
```

## Files Updated

- `Backend/app/Http/Controllers/Api/MechanicController.php`
- `Backend/app/Http/Controllers/Api/MospamsController.php`
- `Backend/app/Models/ServiceJob.php`
- `Backend/routes/api.php`
- `Backend/tests/Feature/ServiceFlowTest.php`
- `Frontend/src/shared/hooks/usePaginatedFetch.ts`
- `Frontend/src/features/services/pages/ServicesPage.tsx`
- `Frontend/src/features/customers/pages/CustomerDashboard.tsx`
- `Frontend/src/features/mechanic/pages/AssignedJobsPage.tsx`
