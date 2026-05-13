# Mechanic Pages & Performance Tracking Design

**Date:** 2026-05-13  
**Scope:** Mechanic job history, performance dashboard, customer ratings integration, owner visibility

## Overview

Add three new mechanic-accessible pages under a "Work" section in the navigation:
1. **Assigned Jobs** (enhanced) — current active jobs
2. **Job History** — completed jobs with details and filtering
3. **Performance Dashboard** — personal metrics and trends over time

Integrate customer rating functionality so customers can rate mechanics after service completion. Owner/Admin roles gain enhanced visibility into mechanic performance metrics.

## User Roles & Access

| Role | Access | Changes |
|------|--------|---------|
| Mechanic | Dashboard + Work section (Assigned Jobs, Job History, Performance) | New pages |
| Owner/Admin | Enhanced Mechanics management page | Performance data visible |
| Customer | Rating dialog after service completion | New feature |
| Staff | No change | N/A |
| SuperAdmin | No change | N/A |

## Navigation Structure

**Mechanic sidebar:**
```
MAIN
  Dashboard

WORK
  Assigned Jobs       (/dashboard/mechanic/jobs)
  Job History         (/dashboard/mechanic/history)
  Performance         (/dashboard/mechanic/performance)
```

## Page Specifications

### 1. Assigned Jobs (`/dashboard/mechanic/jobs`)

**Current behavior enhanced:**
- Display jobs assigned to the mechanic
- Show customer name, motorcycle model, service type, labor cost, status
- Allow mechanic to start/update job status
- When completed, job disappears from this list (moved to history)

**No breaking changes** — existing functionality preserved.

### 2. Job History (`/dashboard/mechanic/history`)

**New page showing completed jobs:**
- Table with columns: Service Type, Customer Name, Date Completed, Duration, Customer Rating
- Search filter by customer name or service type
- Date range filter (All Time, This Month, Last 3 Months, custom range)
- Display completed_at timestamp and duration (completed_at - created_at)
- Show customer rating as stars (if rated)
- Click job row to view details (parts used, notes, customer feedback)

**Data requirements:**
- Query jobs where status = 'COMPLETED' or similar
- Calculate duration from job timestamps
- JOIN with customer_ratings table

### 3. Performance Dashboard (`/dashboard/mechanic/performance`)

**Personal metrics and trends:**

**Current Period Cards (KPIs):**
- Jobs Completed (This Month)
- Average Time per Job (in hours, this month)
- Customer Rating (average, 1-5 stars)

**Trends Chart (3-month lookback):**
- Line or bar chart showing jobs completed per month (last 3 months)
- Allow user to select different timeframes if desired

**Additional Stats (Optional expandable sections):**
- Total jobs completed (all-time)
- Most common service types performed
- Top/average customer feedback

## Customer Ratings Integration

### When Ratings Appear

After a customer's service job is marked COMPLETED by the mechanic:
1. Customer sees notification: "Rate your mechanic"
2. Dialog appears with 1-5 star rating + optional comment field
3. Submit saves rating, mapped to job_id and mechanic_id

### Data Model

New table: `customer_ratings`
```sql
- id (PK)
- job_id (FK → jobs)
- mechanic_id (FK → users)
- customer_id (FK → users)
- shop_id_fk (multi-tenancy)
- rating (1-5 int)
- comment (text, nullable)
- created_at
- updated_at
```

### Backend Endpoints

- `POST /api/customer/ratings` — submit rating
- `GET /api/mechanic/performance` — get mechanic's performance stats
- `GET /api/mechanic/history` — get completed jobs with ratings
- `GET /api/owner/mechanics` (enhanced) — list mechanics with performance data

### Frontend Routes

- `/dashboard/mechanic/history` → JobHistoryPage
- `/dashboard/mechanic/performance` → PerformanceDashboardPage
- Rating dialog: modal triggered after job completion

## Owner/Admin Integration

**Enhanced Mechanics Management Page** (`/dashboard/mechanics`):
- Add columns: Jobs (This Month), Avg Rating, Last Activity
- Add "View Performance" button per mechanic → opens modal/page showing that mechanic's:
  - Performance dashboard (their metrics)
  - Job history filtered to that mechanic
  - Rating distribution/feedback

**No new routes** — enhance existing page.

## Database Changes

### Jobs Table (existing)
- Ensure `status` column supports 'COMPLETED' state
- Ensure `completed_at` timestamp exists (nullable)

### New Table: customer_ratings
```sql
CREATE TABLE customer_ratings (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  mechanic_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  shop_id_fk CHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (mechanic_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (shop_id_fk) REFERENCES shops(id),
  UNIQUE KEY (job_id) -- one rating per job
);
```

## Permissions & Nav Access

Update `Frontend/src/shared/lib/permissions.ts`:
```typescript
NAV_ACCESS['/dashboard/mechanic/history'] = ['Mechanic'];
NAV_ACCESS['/dashboard/mechanic/performance'] = ['Mechanic'];
```

Update DashboardLayout.tsx to include "Work" section for Mechanic role with the three subroutes.

## Implementation Order

1. **Backend:**
   - Create migration for customer_ratings table
   - Create Eloquent models (CustomerRating, update Job model)
   - Create API endpoints (ratings, mechanic history, performance, owner metrics)
   - Add RLS/policies if applicable

2. **Frontend:**
   - Add new routes to App.tsx
   - Create JobHistoryPage component
   - Create PerformanceDashboardPage component
   - Add rating dialog/modal component
   - Update DashboardLayout to show "Work" section for mechanics
   - Update Mechanics management page (owner) with performance columns
   - Update permissions in permissions.ts and NAV_ACCESS

3. **Testing:**
   - Mechanic can view assigned jobs, history, performance
   - Customer can rate mechanic after service
   - Owner can see mechanic performance metrics
   - Ratings persist and display correctly

## Notes

- All mechanic data is scoped to their shop (shop_id_fk)
- Owners only see metrics for mechanics in their shop
- Customers only see rating dialog for jobs in their shop
- Performance trends use 3-month rolling window by default
- Times calculated in hours (duration / 3600 if stored in seconds)
