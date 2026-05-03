# Analytics Dashboard & Landing Page Stats — Design Spec
**Date:** 2026-05-01  
**Status:** Approved  
**Approach:** Approach B — Single detailed stats endpoint for both landing page and admin dashboard

---

## Overview

A single public `GET /api/stats` endpoint serves as the one source of truth for shop-wide analytics. The landing page `ReportsSection` reads the `summary` block to display real DB-backed numbers. The admin dashboard `Overview` page reads the full payload including `charts` to render four Chart.js visualizations. Existing admin detail panels (low stock, recent services, pipeline) remain unchanged.

---

## 1. Data Architecture

### Endpoint
`GET /api/stats` — public, no authentication required.

### Response shape
```json
{
  "summary": {
    "total_jobs_completed": 128,
    "total_customers": 45,
    "total_revenue": 48250.00,
    "total_parts": 142,
    "active_services": 12
  },
  "charts": {
    "revenue_by_day":    [{ "date": "2026-04-01", "amount": 1200.00 }, ...],
    "jobs_by_day":       [{ "date": "2026-04-01", "count": 4 }, ...],
    "service_status":    { "pending": 5, "ongoing": 7, "completed": 128 },
    "payment_methods":   { "cash": 32500.00, "gcash": 15750.00 },
    "top_service_types": [{ "name": "Oil Change", "count": 42, "revenue": 12600.00 }, ...]
  }
}
```

### Rules
- `revenue_by_day` and `jobs_by_day` always contain exactly 30 entries (last 30 days). Days with no activity are filled with `amount: 0` / `count: 0` in PHP before responding.
- `top_service_types` contains the top 5 service types ordered by job count descending.
- All dates are in `Y-m-d` format using the application's configured timezone.

---

## 2. Backend

### Route
Registered in `routes/api.php` **before** the `auth:sanctum` middleware group:
```php
Route::get('/stats', [MospamsController::class, 'publicStats']);
```

### Method: `MospamsController::publicStats()`
All queries are raw DB aggregates via `DB::select` / `DB::table` — no Eloquent model loading.

| Field | Table | Query |
|---|---|---|
| `total_jobs_completed` | `service_jobs` JOIN `service_job_statuses` | `COUNT(*)` WHERE `status_code = 'COMPLETED'` |
| `total_customers` | `customers` | `COUNT(*)` |
| `total_revenue` | `sales` | `SUM(net_amount)` |
| `total_parts` | `parts` JOIN `part_statuses` | `COUNT(*)` WHERE `status_code = 'ACTIVE'` |
| `active_services` | `service_jobs` JOIN `service_job_statuses` | `COUNT(*)` WHERE `status_code IN ('PENDING', 'ONGOING')` |
| `revenue_by_day` | `sales` | `SUM(net_amount) GROUP BY DATE(sale_date)` last 30 days |
| `jobs_by_day` | `service_jobs` | `COUNT(*) GROUP BY DATE(job_date)` last 30 days |
| `service_status` | `service_jobs` JOIN `service_job_statuses` | `COUNT(*) GROUP BY status_code` |
| `payment_methods` | `payments` | `SUM(amount_paid) GROUP BY payment_method` |
| `top_service_types` | `service_job_items` JOIN `service_types` | `COUNT(*), SUM(labor_cost) GROUP BY service_name` LIMIT 5 |

The method returns `response()->json([...])` directly with no additional middleware.

---

## 3. Landing Page

### New file
`Frontend/src/shared/hooks/usePublicStats.ts`

- Fetches `GET /api/stats` on mount using a plain `fetch` call (no auth token, no DataContext).
- Returns `{ summary, charts, loading, error }`.
- No retry logic; on error `loading` becomes `false` and `error` is set.

### Changes to `ReportsSection.tsx`

The five report cards replace hardcoded values with live `summary` fields:

| Card | Metric field | Label |
|---|---|---|
| Sales Reports | `summary.total_revenue` formatted as `₱X,XXX` | This Month |
| Inventory Reports | `summary.total_parts` | Active Parts |
| Service Performance | `summary.total_jobs_completed` | Jobs Done |
| Most Used Parts & Services | `"Top 5"` (static — no matching data point) | Items Ranked |
| Income Summary | `summary.total_revenue` formatted as `₱X,XXX` | Total Revenue |

The mini bar sparklines inside each card use data scaled to a 0–100 percentage of the max value:
- Sales Reports → `charts.revenue_by_day` amounts
- Inventory Reports → `charts.revenue_by_day` amounts (best available proxy)
- Service Performance → `charts.jobs_by_day` counts
- Most Used Parts & Services → static (no matching time-series)
- Income Summary → `charts.revenue_by_day` amounts

The Revenue Overview preview panel (left column) updates its headline number to `summary.total_revenue` and its bar chart to `charts.revenue_by_day` (30 bars). The x-axis shows only three labels — the date of the first entry, the midpoint, and "Today" — replacing the current hardcoded month labels.

**Loading state:** Cards pulse with a `animate-pulse bg-zinc-800 rounded` skeleton on the metric while `loading` is true.  
**Error state:** Metric displays `—` so the page never shows broken numbers.

---

## 4. Admin Dashboard

### New dependency
```
chart.js ^4.x
react-chartjs-2 ^5.x
```
Installed via `npm install chart.js react-chartjs-2` in `Frontend/`.

### New hook
`Frontend/src/shared/hooks/useAdminStats.ts`

- Fetches the same `GET /api/stats` endpoint using the existing `apiGet` helper (authenticated, Bearer token).
- Returns `{ summary, charts, loading, error }`.
- Called once inside `Overview.tsx`.

### New chart components
All in `Frontend/src/features/dashboard/components/`:

| File | Chart type | Data | Description |
|---|---|---|---|
| `RevenueLineChart.tsx` | Line | `charts.revenue_by_day` | 30-day daily revenue trend, x-axis = date labels, y-axis = ₱ amount |
| `ServiceStatusDonut.tsx` | Doughnut | `charts.service_status` | Pending / Ongoing / Completed ring |
| `PaymentPieChart.tsx` | Pie | `charts.payment_methods` | Cash vs GCash share of total payments |
| `TopServicesBar.tsx` | Horizontal Bar | `charts.top_service_types` | Top 5 service types by job count, revenue shown in tooltip |

Each component:
- Registers only the Chart.js components it needs (tree-shaking friendly).
- Accepts the data slice as a prop — no internal fetching.
- Wraps its `<canvas>` in a white `rounded-2xl border border-[#F5F5F4]` card with a `text-[13px] font-semibold text-[#1C1917]` title.
- Shows a centered spinner while parent reports `loading`.
- Shows a short `"Could not load data"` message on `error`.

### Chart color palette
Consistent with the existing stone/neutral design system:
- Line chart fill: `#1C1917` stroke, `rgba(28,25,23,0.08)` area fill
- Doughnut: `['#1C1917', '#78716C', '#D6D3D1']` for Completed / Ongoing / Pending
- Pie: `['#1C1917', '#A8A29E']` for Cash / GCash
- Bar: `#1C1917` bars, `#F5F5F4` grid lines

### `Overview.tsx` layout changes
Existing 4 KPI cards and two-column detail section remain. A new `"Analytics"` section is appended below with this layout:

```
[ RevenueLineChart — full width                    ]
[ ServiceStatusDonut ]  [ PaymentPieChart           ]
[ TopServicesBar — full width                      ]
```

Section header: `text-[13px] font-semibold text-[#1C1917]` label "Analytics" with a `mt-8 mb-4` spacer.

---

## 5. Error Handling

| Layer | Failure | Behavior |
|---|---|---|
| Backend | DB query error | Returns `500` with `{ message: "..." }` |
| Landing page hook | Fetch fails / non-200 | `error` set, metrics show `—`, page visible |
| Admin hook | Fetch fails / non-200 | `error` set, charts show `"Could not load data"` |
| Chart render | Empty arrays | Charts render empty state (no crash) |

---

## 6. Files Changed / Created

### Backend
- `Backend/routes/api.php` — add `Route::get('/stats', ...)`
- `Backend/app/Http/Controllers/Api/MospamsController.php` — add `publicStats()` method

### Frontend
- `Frontend/package.json` — add `chart.js`, `react-chartjs-2`
- `Frontend/src/shared/hooks/usePublicStats.ts` — new
- `Frontend/src/shared/hooks/useAdminStats.ts` — new
- `Frontend/src/features/landing/components/ReportsSection.tsx` — update with live data
- `Frontend/src/features/dashboard/components/RevenueLineChart.tsx` — new
- `Frontend/src/features/dashboard/components/ServiceStatusDonut.tsx` — new
- `Frontend/src/features/dashboard/components/PaymentPieChart.tsx` — new
- `Frontend/src/features/dashboard/components/TopServicesBar.tsx` — new
- `Frontend/src/features/dashboard/pages/Overview.tsx` — add analytics section
