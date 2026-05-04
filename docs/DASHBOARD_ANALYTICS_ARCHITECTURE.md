# Dashboard Analytics Architecture

## Overview
The dashboard analytics in MoSPAMS are **100% backend-calculated**. The frontend does NOT perform any calculations—it only displays data received from the Laravel API.

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NewDashboardPage.tsx                                  │ │
│  │  - Displays metrics                                    │ │
│  │  - Renders charts                                      │ │
│  │  - Shows KPI cards                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useDashboardData() Hook                               │ │
│  │  - Fetches from /api/stats                             │ │
│  │  - Fetches from /api/reports/income                    │ │
│  │  - Fetches from /api/transactions                      │ │
│  │  - NO calculations, just data fetching                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP Request
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND (Laravel)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MospamsController::publicStats()                      │ │
│  │  - Calculates ALL metrics from database               │ │
│  │  - Aggregates revenue, customers, services            │ │
│  │  - Computes trends, percentages, changes              │ │
│  │  - Generates sparklines and charts data               │ │
│  │  - Returns complete analytics payload                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  MySQL Database                                        │ │
│  │  - sales, service_jobs, parts, customers              │ │
│  │  - stock_movements, payments, etc.                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Backend Calculations

### Endpoint: `/api/stats` (publicStats method)

All analytics are calculated in `MospamsController::publicStats()`:

#### 1. **Revenue Metrics**
- **Total Revenue**: `SUM(sales.net_amount)`
- **This Week Revenue**: `SUM(sales.net_amount WHERE sale_date >= this_week_start)`
- **Last Week Revenue**: `SUM(sales.net_amount WHERE sale_date BETWEEN last_week_start AND last_week_end)`
- **Weekly Revenue Change**: `((this_week - last_week) / last_week) * 100`
- **Today Revenue**: `SUM(sales.net_amount WHERE sale_date = today)`
- **Yesterday Revenue**: `SUM(sales.net_amount WHERE sale_date = yesterday)`
- **Daily Revenue Change**: `((today - yesterday) / yesterday) * 100`

#### 2. **Customer Metrics**
- **Total Customers**: `COUNT(customers)`
- **Avg Revenue Per Customer**: `total_revenue / total_customers`

#### 3. **Service Metrics**
- **Total Jobs Completed**: `COUNT(service_jobs WHERE status = 'completed')`
- **Active Services**: `COUNT(service_jobs WHERE status IN ('pending', 'in_progress'))`
- **Pending Services**: `COUNT(service_jobs WHERE status = 'pending')`
- **Ongoing Services**: `COUNT(service_jobs WHERE status = 'in_progress')`
- **Completion Rate**: `(completed_jobs / total_jobs) * 100`
- **Active Pipeline**: `pending_services + ongoing_services`

#### 4. **Inventory Metrics**
- **Total Parts**: `COUNT(parts WHERE status = 'in_stock')`
- **Low Stock Count**: `COUNT(parts WHERE stock_quantity <= reorder_level)`
- **Inventory Health**: `((total_parts - low_stock_parts) / total_parts) * 100`
- **Inventory Value**: `SUM(parts.stock_quantity * parts.unit_price)`
- **Low Stock with Urgency**:
  - `critical`: stock = 0
  - `high`: stock <= reorder_level / 2
  - `medium`: stock <= reorder_level

#### 5. **Chart Data**
- **Revenue by Day (30 days)**: Daily aggregation of sales
- **Jobs by Day (30 days)**: Daily count of service jobs
- **Service Status Breakdown**: Count by status (pending, ongoing, completed)
- **Payment Methods**: Count by method (Cash, GCash)
- **Top Service Types**: Top 5 by revenue with job count

#### 6. **Sparklines (7 days)**
- **Revenue Sparkline**: Last 7 days of daily revenue
- **Parts Usage Sparkline**: Last 7 days of parts used in services

## Frontend Responsibilities

The frontend **ONLY**:
1. ✅ Fetches data from backend API
2. ✅ Displays the pre-calculated metrics
3. ✅ Renders charts with backend data
4. ✅ Shows loading and error states
5. ✅ Formats numbers for display (e.g., `toLocaleString()`)

The frontend **NEVER**:
1. ❌ Calculates revenue totals
2. ❌ Computes percentages or trends
3. ❌ Aggregates database records
4. ❌ Performs date-based filtering for metrics
5. ❌ Calculates averages or ratios

## Data Flow Example

### Example: Weekly Revenue Change

**Backend (MospamsController.php)**:
```php
$thisWeekStart = now()->startOfWeek();
$lastWeekStart = now()->subWeek()->startOfWeek();
$lastWeekEnd = now()->subWeek()->endOfWeek();

$thisWeekRevenue = (float) DB::table('sales')
    ->where('shop_id_fk', $shopId)
    ->where('sale_date', '>=', $thisWeekStart)
    ->sum('net_amount');

$lastWeekRevenue = (float) DB::table('sales')
    ->where('shop_id_fk', $shopId)
    ->whereBetween('sale_date', [$lastWeekStart, $lastWeekEnd])
    ->sum('net_amount');

$weeklyRevenueChange = $lastWeekRevenue > 0 
    ? (($thisWeekRevenue - $lastWeekRevenue) / $lastWeekRevenue) * 100 
    : 0;

return response()->json([
    'summary' => [
        'this_week_revenue' => $thisWeekRevenue,
        'last_week_revenue' => $lastWeekRevenue,
        'weekly_revenue_change' => round($weeklyRevenueChange, 2),
        // ... other metrics
    ]
]);
```

**Frontend (useDashboardData.ts)**:
```typescript
const statsResponse = await apiGet('/api/stats');

setMetrics({
    thisWeekRevenue: statsResponse.summary.this_week_revenue,
    lastWeekRevenue: statsResponse.summary.last_week_revenue,
    weeklyRevenueChange: statsResponse.summary.weekly_revenue_change,
    // ... other metrics
});
```

**Frontend (NewDashboardPage.tsx)**:
```typescript
const thisWeekRevenue = metrics?.thisWeekRevenue ?? 0;
const weeklyRevenueChange = metrics?.weeklyRevenueChange ?? 0;

// Just display, no calculation
<KPICard
    title="Weekly Revenue"
    value={`₱${thisWeekRevenue.toLocaleString()}`}
    change={weeklyRevenueChange}
/>
```

## Performance Optimization

### Backend Caching
The backend uses Laravel's cache for expensive queries:

```php
$cacheKey = $this->tenantCacheKey('report:sales:summary', $shopId);

$data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($shopId) {
    return [
        'totalRevenue' => (float) DB::table('sales')->where('shop_id_fk', $shopId)->sum('net_amount'),
        // ... other calculations
    ];
});
```

- Cache duration: **5 minutes**
- Cache key includes shop ID for multi-tenancy
- Reduces database load for frequently accessed metrics

### Frontend Optimization
- Data fetched once on page load
- Loading states prevent multiple requests
- Error handling with fallback data
- Memoized calculations for derived UI state (not metrics)

## Multi-Tenancy Support

All metrics are **shop-scoped**:
- Every query includes `WHERE shop_id_fk = $shopId`
- Each shop sees only their own data
- SuperAdmin can see all shops (shop_id_fk = null)

## API Response Structure

### `/api/stats` Response:
```json
{
  "summary": {
    "total_jobs_completed": 150,
    "total_customers": 85,
    "total_revenue": 125000,
    "total_parts": 320,
    "active_services": 12,
    "this_week_revenue": 18500,
    "last_week_revenue": 15200,
    "weekly_revenue_change": 21.71,
    "today_revenue": 3200,
    "yesterday_revenue": 2800,
    "daily_revenue_change": 14.29,
    "completion_rate": 87.5,
    "active_pipeline": 12,
    "pending_services": 5,
    "ongoing_services": 7,
    "inventory_health": 92.5,
    "inventory_value": 450000,
    "low_stock_count": 8,
    "avg_revenue_per_customer": 1470.59
  },
  "charts": {
    "revenue_by_day": [
      { "date": "2025-01-01", "amount": 5200 },
      { "date": "2025-01-02", "amount": 6100 }
    ],
    "jobs_by_day": [
      { "date": "2025-01-01", "count": 8 },
      { "date": "2025-01-02", "count": 12 }
    ],
    "service_status": {
      "pending": 5,
      "ongoing": 7,
      "completed": 150
    },
    "payment_methods": {
      "cash": 85,
      "gcash": 65
    },
    "top_service_types": [
      { "name": "Oil Change", "count": 45, "revenue": 22500 },
      { "name": "Brake Service", "count": 32, "revenue": 19200 }
    ],
    "revenue_sparkline_7d": [3200, 2800, 4100, 3500, 3900, 4200, 3200],
    "parts_usage_sparkline_7d": [12, 15, 18, 14, 16, 20, 17]
  },
  "low_stock": [
    {
      "part_id": 42,
      "part_name": "Brake Pad Set",
      "stock": 2,
      "min_stock": 10,
      "price": 850,
      "urgency": "high"
    }
  ]
}
```

## Benefits of Backend Calculation

✅ **Single Source of Truth**: All calculations in one place (backend)
✅ **Consistency**: Same logic for all clients (web, mobile, API)
✅ **Performance**: Database-level aggregations are faster
✅ **Security**: Business logic not exposed to frontend
✅ **Caching**: Backend can cache expensive queries
✅ **Accuracy**: Direct database queries, no data sync issues
✅ **Maintainability**: Change calculation logic in one place
✅ **Scalability**: Offload computation from client devices

## Exceptions (Minimal Frontend Calculations)

The frontend only performs **display-level** calculations:

1. **Percentage formatting**: `(value / total) * 100` for progress bars
2. **Date formatting**: `new Date().toLocaleDateString()`
3. **Number formatting**: `toLocaleString()` for currency display
4. **UI-only derived state**: Filtering/sorting displayed data

These are NOT business metrics—just UI presentation logic.

## Summary

| Aspect | Location | Responsibility |
|--------|----------|----------------|
| Revenue calculations | Backend | ✅ Database aggregation |
| Customer metrics | Backend | ✅ COUNT queries |
| Service analytics | Backend | ✅ Status-based filtering |
| Inventory health | Backend | ✅ Stock level analysis |
| Trend calculations | Backend | ✅ Week-over-week, day-over-day |
| Chart data generation | Backend | ✅ Time-series aggregation |
| Sparkline data | Backend | ✅ 7-day rolling data |
| Data fetching | Frontend | ✅ API calls |
| Data display | Frontend | ✅ Rendering UI |
| Number formatting | Frontend | ✅ Locale-aware display |
| Loading states | Frontend | ✅ UX feedback |

**Conclusion**: The dashboard is a **pure presentation layer**. All analytics, calculations, and business logic are handled by the Laravel backend. The frontend is a "dumb" client that displays pre-calculated data.
