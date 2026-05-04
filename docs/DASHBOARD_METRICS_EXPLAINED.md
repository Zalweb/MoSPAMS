# Dashboard Metrics - Backend vs Frontend Calculation

## 📊 Overview

The dashboard displays various metrics. Some come directly from the backend API, while others are calculated on the frontend from the data received.

---

## 🔌 Backend API Endpoint: `/api/stats`

### What the Backend Provides:

```json
{
  "summary": {
    "total_jobs_completed": 120,
    "total_customers": 45,
    "total_revenue": 450000,
    "total_parts": 150,
    "active_services": 8
  },
  "charts": {
    "revenue_by_day": [
      { "date": "2025-01-01", "amount": 15000 },
      { "date": "2025-01-02", "amount": 18000 }
      // ... 30 days
    ],
    "jobs_by_day": [
      { "date": "2025-01-01", "count": 5 },
      { "date": "2025-01-02", "count": 7 }
      // ... 30 days
    ],
    "service_status": {
      "pending": 5,
      "ongoing": 3,
      "completed": 120
    },
    "payment_methods": {
      "cash": 45,
      "gcash": 24
    },
    "top_service_types": [
      { "name": "Oil Change", "count": 25, "revenue": 45000 },
      { "name": "Brake Service", "count": 18, "revenue": 38000 }
      // ... top 5
    ]
  }
}
```

### Backend Calculation Details:

1. **total_revenue**: Sum of all `sales.net_amount` (last 30 days)
2. **total_jobs_completed**: Count of service_jobs with status 'completed'
3. **total_customers**: Count of all customers
4. **total_parts**: Count of parts with status 'in_stock'
5. **active_services**: Count of service_jobs with status 'pending' or 'in_progress'
6. **revenue_by_day**: Daily revenue for last 30 days
7. **jobs_by_day**: Daily job count for last 30 days
8. **service_status**: Count by status (pending/ongoing/completed)
9. **payment_methods**: Sum of payments by method (cash/gcash)
10. **top_service_types**: Top 5 services by count with revenue

---

## 💻 Frontend Calculations

### What the Frontend Calculates:

The frontend receives data from multiple sources and performs additional calculations:

#### 1. **Weekly Revenue** (KPI Card)
```typescript
// Source: Frontend calculation from transactions
const thisWeekRevenue = transactions
  .filter(t => t.createdAt >= weekAgo)
  .reduce((sum, t) => sum + t.total, 0);

const lastWeekRevenue = transactions
  .filter(t => t.createdAt >= twoWeeksAgo && t.createdAt < weekAgo)
  .reduce((sum, t) => sum + t.total, 0);

const weeklyRevenueChange = ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
```

**Data Source**: `/api/transactions` endpoint
**Calculation**: Frontend (useMemo)
**Why**: Backend only provides 30-day revenue, not week-over-week comparison

---

#### 2. **Service Completion Rate** (KPI Card)
```typescript
// Source: Frontend calculation from services
const completionRate = (completedServices / totalServices) * 100;
```

**Data Source**: `/api/services` endpoint
**Calculation**: Frontend (useMemo)
**Why**: Backend doesn't calculate percentage, only counts

---

#### 3. **Active Pipeline** (KPI Card)
```typescript
// Source: Frontend calculation from services
const activePipeline = pendingServices + ongoingServices;
```

**Data Source**: `/api/services` endpoint
**Calculation**: Frontend (useMemo)
**Why**: Simple sum of two statuses

---

#### 4. **Inventory Health** (KPI Card)
```typescript
// Source: Frontend calculation from parts
const inventoryHealth = ((totalParts - lowStockParts) / totalParts) * 100;
```

**Data Source**: `/api/parts` endpoint
**Calculation**: Frontend (useMemo)
**Why**: Backend doesn't provide health percentage

---

#### 5. **7-Day Sparklines** (KPI Cards)
```typescript
// Revenue sparkline
const last7Days = [];
for (let i = 6; i >= 0; i--) {
  const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
  const dayRevenue = transactions
    .filter(t => t.createdAt.startsWith(date))
    .reduce((sum, t) => sum + t.total, 0);
  last7Days.push(dayRevenue);
}

// Parts usage sparkline
const partsUsageTrend = [];
for (let i = 6; i >= 0; i--) {
  const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
  const dayServices = services.filter(s => s.createdAt.startsWith(date));
  const partsCount = dayServices.reduce((sum, s) => sum + (s.partsUsed?.length || 0), 0);
  partsUsageTrend.push(partsCount);
}
```

**Data Source**: `/api/transactions` and `/api/services`
**Calculation**: Frontend (useMemo)
**Why**: Backend provides 30-day data, but sparklines need last 7 days only

---

#### 6. **Low Stock Urgency Levels**
```typescript
const urgency = 
  part.stock === 0 ? 'critical' :
  part.stock <= part.minStock / 2 ? 'high' :
  'medium';
```

**Data Source**: `/api/parts` endpoint
**Calculation**: Frontend (inline)
**Why**: Backend doesn't classify urgency levels

---

#### 7. **Inventory Value**
```typescript
const inventoryValue = parts.reduce((sum, p) => sum + (p.price * p.stock), 0);
```

**Data Source**: `/api/parts` endpoint
**Calculation**: Frontend (inline)
**Why**: Backend doesn't calculate total inventory value

---

#### 8. **Average Revenue Per Customer**
```typescript
const avgRevenuePerCustomer = totalRevenue / totalCustomers;
```

**Data Source**: Backend `total_revenue` and `total_customers`
**Calculation**: Frontend (inline)
**Why**: Simple division not provided by backend

---

#### 9. **Today vs Yesterday Comparison**
```typescript
const today = new Date().toISOString().split('T')[0];
const todayRevenue = transactions
  .filter(t => t.createdAt.startsWith(today))
  .reduce((sum, t) => sum + t.total, 0);

const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const yesterdayRevenue = transactions
  .filter(t => t.createdAt.startsWith(yesterday))
  .reduce((sum, t) => sum + t.total, 0);

const revenueChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
```

**Data Source**: `/api/transactions` endpoint
**Calculation**: Frontend (useMemo)
**Why**: Backend doesn't provide daily comparisons

---

## 📋 Summary Table

| Metric | Backend Provides | Frontend Calculates | Data Source |
|--------|------------------|---------------------|-------------|
| **Weekly Revenue** | ❌ No | ✅ Yes | `/api/transactions` |
| **Weekly Revenue Change** | ❌ No | ✅ Yes | `/api/transactions` |
| **Service Completion Rate** | ❌ No | ✅ Yes | `/api/services` |
| **Active Pipeline** | ❌ No | ✅ Yes | `/api/services` |
| **Inventory Health %** | ❌ No | ✅ Yes | `/api/parts` |
| **7-Day Revenue Sparkline** | ❌ No | ✅ Yes | `/api/transactions` |
| **7-Day Parts Usage Sparkline** | ❌ No | ✅ Yes | `/api/services` |
| **Low Stock Urgency** | ❌ No | ✅ Yes | `/api/parts` |
| **Inventory Value** | ❌ No | ✅ Yes | `/api/parts` |
| **Avg Revenue/Customer** | ❌ No | ✅ Yes | `/api/stats` |
| **Today vs Yesterday** | ❌ No | ✅ Yes | `/api/transactions` |
| **Total Revenue (30 days)** | ✅ Yes | ❌ No | `/api/stats` |
| **Total Jobs Completed** | ✅ Yes | ❌ No | `/api/stats` |
| **Total Customers** | ✅ Yes | ❌ No | `/api/stats` |
| **Total Parts** | ✅ Yes | ❌ No | `/api/stats` |
| **Active Services** | ✅ Yes | ❌ No | `/api/stats` |
| **Revenue by Day (30 days)** | ✅ Yes | ❌ No | `/api/stats` |
| **Service Status Counts** | ✅ Yes | ❌ No | `/api/stats` |
| **Payment Methods** | ✅ Yes | ❌ No | `/api/stats` |
| **Top Service Types** | ✅ Yes | ❌ No | `/api/stats` |

---

## 🎯 Why Frontend Calculations?

### Advantages:
1. **Flexibility**: Can calculate any metric from existing data
2. **Real-time**: Updates immediately when data changes
3. **No Backend Changes**: Don't need to modify API for new metrics
4. **Client-side Filtering**: Can filter by any date range
5. **Performance**: Reduces backend load

### Disadvantages:
1. **Data Transfer**: Need to fetch all transactions/services/parts
2. **Calculation Load**: Client does the work
3. **Consistency**: Different clients might calculate differently
4. **Accuracy**: Depends on having all data locally

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /api/stats          → 30-day aggregated data              │
│  /api/transactions   → All transactions with dates         │
│  /api/services       → All services with status            │
│  /api/parts          → All parts with stock levels         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useDashboardData()  → Fetches from /api/stats             │
│  useData()           → Fetches transactions, services, parts│
│                                                             │
│  useMemo()           → Calculates:                          │
│    • Weekly revenue & change                                │
│    • Completion rate                                        │
│    • Active pipeline                                        │
│    • Inventory health                                       │
│    • 7-day sparklines                                       │
│    • Urgency levels                                         │
│    • Inventory value                                        │
│    • Today vs yesterday                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD UI                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KPI Cards           → Display calculated metrics           │
│  Charts              → Display backend data                 │
│  Tables              → Display backend data                 │
│  Sections            → Mix of both                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Recommendations

### Current Approach (Frontend Calculations):
✅ **Good for**: Rapid prototyping, flexibility, no backend changes
✅ **Works well when**: Data volume is small (<1000 records)
✅ **Best for**: MVP and early development

### Future Optimization (Backend Calculations):
🚀 **Consider when**: Data volume grows (>10,000 records)
🚀 **Benefits**: Better performance, consistency, accuracy
🚀 **Implement**: Add new endpoints like:
- `/api/stats/weekly` - Weekly revenue with comparison
- `/api/stats/completion-rate` - Service completion rate
- `/api/stats/inventory-health` - Inventory health percentage
- `/api/stats/sparklines` - 7-day trend data

---

## 📝 Conclusion

**Current Implementation:**
- ✅ Backend provides aggregated 30-day data
- ✅ Frontend calculates time-specific metrics (weekly, daily, 7-day)
- ✅ Frontend calculates derived metrics (percentages, comparisons, urgency)
- ✅ Works well for current data volume
- ✅ Flexible and easy to modify

**All metrics are working correctly** - they're just calculated in different places based on what makes sense for the use case!
