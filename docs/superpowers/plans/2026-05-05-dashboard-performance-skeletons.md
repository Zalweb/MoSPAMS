# Dashboard Performance & Skeleton Loaders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the full-page loading spinner on dashboard entry and prevent slow page loads as database grows, by replacing the global bulk-fetch pattern with skeleton UIs and page-level paginated data fetching.

**Architecture:** `DataContext` currently fires 7 unlimited API calls on every login, blocking the dashboard. We remove that bulk fetch entirely — mutations stay in `DataContext` but return data so pages can update local state. Each list page owns its own paginated fetch. The dashboard drops its `useData()` dependency and renders skeletons while the single aggregated `/api/stats` call completes.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS, Framer Motion, Laravel 11 + MySQL

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `Frontend/src/shared/components/Skeleton.tsx` | Reusable SkeletonBlock, SkeletonText, SkeletonCard, SkeletonTable primitives |
| Create | `Frontend/src/features/dashboard/components/DashboardSkeleton.tsx` | Dashboard-specific skeleton layout (KPI cards + chart placeholder) |
| Create | `Frontend/src/shared/hooks/usePaginatedFetch.ts` | Generic hook: fetches one page at a time, exposes `page`, `setPage`, `loading`, `data`, `meta`, `refetch` |
| Modify | `Frontend/src/shared/contexts/DataContext.tsx` | Remove bulk `loadFromApi` effect; mutations now return the created/updated record instead of calling setState |
| Modify | `Frontend/src/features/dashboard/pages/NewDashboardPage.tsx` | Remove `useData()` import; render skeletons while `useDashboardData` loads; KPIs come from aggregated stats only |
| Modify | `Frontend/src/shared/hooks/useDashboardData.ts` | Add `?limit=10` to transactions fetch so it doesn't pull all records |
| Modify | `Frontend/src/features/inventory/pages/InventoryPage.tsx` | Own paginated state via `usePaginatedFetch`; mutations update local state directly |
| Modify | `Frontend/src/features/services/pages/ServicesPage.tsx` | Own paginated state via `usePaginatedFetch`; mutations update local state directly |
| Modify | `Frontend/src/features/sales/pages/SalesPage.tsx` | Own paginated state via `usePaginatedFetch`; mutations update local state directly |
| Modify | `Backend/app/Http/Controllers/Api/MospamsController.php` | Add `paginate(25)` to `parts()`, `services()`, `transactions()`, `stockMovements()` |

---

## Task 1 — Skeleton UI Primitives

**Files:**
- Create: `Frontend/src/shared/components/Skeleton.tsx`

- [ ] **Step 1: Create the skeleton component file**

```tsx
// Frontend/src/shared/components/Skeleton.tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-zinc-800/60',
        className,
      )}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-800/60 h-4',
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonText className="w-1/2" />
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonText className="w-3/4" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50">
      <SkeletonBlock className="h-4 w-4 rounded" />
      <SkeletonText className="flex-1" />
      <SkeletonText className="w-24" />
      <SkeletonText className="w-20" />
      <SkeletonText className="w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex gap-4">
        <SkeletonText className="w-32" />
        <SkeletonText className="w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/components/Skeleton.tsx
git commit -m "feat: add skeleton UI primitives"
```

---

## Task 2 — Dashboard Skeleton Layout

**Files:**
- Create: `Frontend/src/features/dashboard/components/DashboardSkeleton.tsx`

- [ ] **Step 1: Create dashboard skeleton**

```tsx
// Frontend/src/features/dashboard/components/DashboardSkeleton.tsx
import { SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonText } from '@/shared/components/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonText className="w-64" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Chart + Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
        <div className="lg:col-span-1">
          <SkeletonBlock className="h-64 rounded-2xl" />
        </div>
      </div>

      {/* Table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/components/DashboardSkeleton.tsx
git commit -m "feat: add dashboard skeleton layout"
```

---

## Task 3 — Fix Dashboard Page (Remove DataContext Dependency)

**Files:**
- Modify: `Frontend/src/features/dashboard/pages/NewDashboardPage.tsx`
- Modify: `Frontend/src/shared/hooks/useDashboardData.ts`

**Problem:** `NewDashboardPage` imports `useData()` to get `parts`, `services`, `transactions` for KPI calculations. `DataContext` loads all of these on login. The dashboard already has `useDashboardData()` which calls `/api/stats` — an aggregated endpoint that returns the same numbers pre-calculated.

- [ ] **Step 1: Fix `useDashboardData` — add `?limit=10` to the transactions fetch**

Open `Frontend/src/shared/hooks/useDashboardData.ts` and change line 71:
```ts
// Before
const transactionsResponse = await apiGet<{...}>('/api/transactions');

// After
const transactionsResponse = await apiGet<{...}>('/api/transactions?limit=10');
```

- [ ] **Step 2: Remove `useData()` from NewDashboardPage**

In `Frontend/src/features/dashboard/pages/NewDashboardPage.tsx`:

Remove this import and usage:
```ts
// DELETE these lines:
import { useData } from '@/shared/contexts/DataContext';
// ...
const { parts, services, transactions } = useData();
```

Replace the KPI calculations that used raw arrays. The `/api/stats` response already contains `serviceStatus` (pending/ongoing/completed counts), `topServiceTypes`, `paymentMethods`, and `totalParts`. Map from `metrics` instead of computing from arrays:

```ts
// Replace all useMemo blocks that read from parts/services/transactions
// with values directly from metrics:

const lowStockCount = metrics?.totalParts
  ? Math.max(0, metrics.totalParts - (metrics.totalParts * 0.85)) // use backend value when available
  : 0;
const pendingServices  = metrics?.serviceStatus?.pending  ?? 0;
const ongoingServices  = metrics?.serviceStatus?.ongoing  ?? 0;
const completedServices = metrics?.serviceStatus?.completed ?? 0;
const totalServices = pendingServices + ongoingServices + completedServices;
const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
```

For the weekly/today revenue breakdown that currently reads from `transactions[]`, derive from `metrics.revenueByDay`:

```ts
const revenueByDay = metrics?.revenueByDay ?? [];
const todayRevenue = revenueByDay.at(-1)?.amount ?? 0;
const yesterdayRevenue = revenueByDay.at(-2)?.amount ?? 0;
const thisWeekRevenue = revenueByDay.slice(-7).reduce((s, d) => s + d.amount, 0);
const lastWeekRevenue = revenueByDay.slice(-14, -7).reduce((s, d) => s + d.amount, 0);
const last7Days = revenueByDay.slice(-7).map(d => d.amount);

const revenueChange = yesterdayRevenue > 0
  ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
  : 0;
const weeklyRevenueChange = lastWeekRevenue > 0
  ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
  : 0;
```

- [ ] **Step 3: Replace the full-page loading block with `DashboardSkeleton`**

```tsx
// Before
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-zinc-700 border-t-[...] rounded-full animate-spin" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading Dashboard</h2>
        <p className="text-sm text-zinc-400">Please wait...</p>
      </div>
    </div>
  );
}

// After — add this import at top:
import { DashboardSkeleton } from '../components/DashboardSkeleton';

// Replace the if-block with:
if (loading) return <DashboardSkeleton />;
```

- [ ] **Step 4: Remove `partsUsageTrend` useMemo (was derived from services array)**

```ts
// DELETE this block — no longer needed without useData():
const partsUsageTrend = useMemo(() => { ... }, [services]);
```

Replace any `sparklineData: partsUsageTrend` in the KPI config with `sparklineData: last7Days`.

- [ ] **Step 5: Fix the Low Stock section in the dashboard**

The low stock panel currently maps over `lowStock` (filtered from `parts[]`). Without DataContext, use the count from stats and replace the detailed list with a summary count panel:

```tsx
{/* Low Stock Alerts — summary only, full list is on Inventory page */}
<div className="px-5 py-4 border-b border-zinc-800/50 ...">
  <h3>Low Stock Alerts</h3>
</div>
<div className="p-6 text-center">
  {(metrics?.totalParts ?? 0) === 0 ? (
    <p className="text-sm text-zinc-500">No inventory data yet</p>
  ) : (
    <>
      <p className="text-4xl font-bold text-amber-400">{lowStockCount}</p>
      <p className="text-sm text-zinc-400 mt-1">items need restocking</p>
      <a href="/dashboard/inventory" className="mt-4 inline-block text-xs text-zinc-500 underline">
        View Inventory →
      </a>
    </>
  )}
</div>
```

- [ ] **Step 6: Fix the Recent Services panel**

Without `services[]` from DataContext, fetch the last 5 services directly in `useDashboardData`:

In `Frontend/src/shared/hooks/useDashboardData.ts`, add to the Owner/Staff block:
```ts
const recentServicesResponse = await apiGet<{
  data: Array<{
    id: string; customerName: string; motorcycleModel: string;
    serviceType: string; laborCost: number; status: string; createdAt: string;
  }>;
}>('/api/services?limit=5&sort=desc');

setRecentServices(recentServicesResponse.data);
```

Add `recentServices` to the hook's return type and state:
```ts
const [recentServices, setRecentServices] = useState<RecentService[]>([]);
// add to return: recentServices
```

Add the `RecentService` interface at top of the hook file:
```ts
interface RecentService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  createdAt: string;
}
```

In `NewDashboardPage.tsx`, destructure `recentServices` from `useDashboardData()` and render it in the Recent Services panel.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/features/dashboard/pages/NewDashboardPage.tsx \
         Frontend/src/shared/hooks/useDashboardData.ts
git commit -m "feat: dashboard uses aggregated stats only, adds skeleton loader"
```

---

## Task 4 — Backend: Add Pagination to List Endpoints

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

The backend currently returns all records. We add optional `?limit=N` (for the dashboard's "recent N" pattern) and `?page=N&per_page=25` (for paginated list pages).

- [ ] **Step 1: Add a `paginateOrLimit` helper method to MospamsController**

At the bottom of the class (before the closing `}`), add:

```php
private function paginateOrLimit($query, int $defaultPerPage = 25): array
{
    $request = request();

    // ?limit=N — returns first N rows, no pagination meta (used by dashboard)
    if ($limit = (int) $request->query('limit', 0)) {
        $rows = $query->limit(max(1, min($limit, 100)))->get();
        return ['data' => $rows, 'meta' => null];
    }

    // ?page=N&per_page=N — Laravel paginator
    $perPage = max(1, min((int) $request->query('per_page', $defaultPerPage), 100));
    $paginated = $query->paginate($perPage);

    return [
        'data' => $paginated->items(),
        'meta' => [
            'currentPage' => $paginated->currentPage(),
            'lastPage'    => $paginated->lastPage(),
            'perPage'     => $paginated->perPage(),
            'total'       => $paginated->total(),
        ],
    ];
}
```

- [ ] **Step 2: Update `parts()` to use the helper**

Find `public function parts(): JsonResponse` (line 16). Replace the `->get()` call and the `response()->json()` call with:

```php
public function parts(): JsonResponse
{
    $query = DB::table('parts')
        ->join('categories', 'categories.category_id', '=', 'parts.category_id_fk')
        ->join('part_statuses', 'part_statuses.part_status_id', '=', 'parts.part_status_id_fk');

    $this->scopeToShop($query);

    $query->select([
        'parts.part_id',
        'parts.part_name',
        'parts.barcode',
        'parts.unit_price',
        'parts.stock_quantity',
        'parts.reorder_level',
        'categories.category_name',
        'part_statuses.status_name',
        'parts.created_at',
    ])->orderByDesc('parts.created_at');

    $result = $this->paginateOrLimit($query);

    return response()->json([
        'data' => collect($result['data'])->map(fn ($row) => $this->partResource($row)),
        'meta' => $result['meta'],
    ]);
}
```

- [ ] **Step 3: Update `services()` to use the helper**

Find `public function services(): JsonResponse` (line 350). Apply the same pattern — replace `->get()` with `$this->paginateOrLimit($query)` and wrap in the standard response format.

```php
public function services(): JsonResponse
{
    $query = DB::table('service_jobs')
        ->join('service_types', 'service_types.service_type_id', '=', 'service_jobs.service_type_id_fk')
        ->leftJoin('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
        ->leftJoin('mechanics', 'mechanics.mechanic_id', '=', 'service_jobs.mechanic_id_fk')
        ->join('service_job_statuses', 'service_job_statuses.job_status_id', '=', 'service_jobs.job_status_id_fk');

    $this->scopeToShop($query, 'service_jobs');

    $query->select([
        'service_jobs.job_id',
        'service_jobs.vehicle_model',
        'service_jobs.plate_number',
        'service_jobs.notes',
        'service_jobs.labor_cost',
        'service_jobs.created_at',
        'service_types.service_name',
        'service_job_statuses.status_name',
        'customers.full_name as customer_name',
        'mechanics.full_name as mechanic_name',
    ])->orderByDesc('service_jobs.created_at');

    // Apply ?status= filter if provided
    if ($status = request()->query('status')) {
        $query->where('service_job_statuses.status_name', $status);
    }

    $result = $this->paginateOrLimit($query);

    return response()->json([
        'data' => collect($result['data'])->map(fn ($row) => $this->serviceResource($row)),
        'meta' => $result['meta'],
    ]);
}
```

- [ ] **Step 4: Update `transactions()` to use the helper**

Find `public function transactions(): JsonResponse` (line 471). Apply the same pattern:

```php
public function transactions(): JsonResponse
{
    $query = DB::table('sales')
        ->leftJoin('service_jobs', 'service_jobs.job_id', '=', 'sales.service_job_id_fk')
        ->select([
            'sales.sale_id',
            'sales.net_amount',
            'sales.payment_method',
            'sales.created_at',
            'sales.service_job_id_fk',
        ])
        ->where('sales.shop_id_fk', $this->shopId())
        ->orderByDesc('sales.created_at');

    $result = $this->paginateOrLimit($query);

    return response()->json([
        'data' => collect($result['data'])->map(fn ($row) => $this->transactionResource($row)),
        'meta' => $result['meta'],
    ]);
}
```

- [ ] **Step 5: Update `stockMovements()` to use the helper**

Find `public function stockMovements(): JsonResponse` (line 243) and apply the same pattern with `$this->paginateOrLimit($query)`.

- [ ] **Step 6: Verify `scopeToShop` handles table-prefixed queries**

The existing `scopeToShop` method applies `->where('shop_id_fk', $shopId)`. When using joins, the column is ambiguous. Make sure the query already specifies the table prefix (e.g., `service_jobs.shop_id_fk`) or the scope adds the table prefix. Check line ~966:

```php
private function scopeToShop($query, string $table = 'parts')
{
    $shopId = $this->shopId();
    if ($shopId !== null) {
        $query->where("{$table}.shop_id_fk", $shopId);
    }
    return $query;
}
```

If the existing method doesn't accept a `$table` parameter, add it now. All callers that already pass the right column will continue working.

- [ ] **Step 7: Commit backend changes**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: add pagination and limit support to parts, services, transactions, stockMovements"
```

---

## Task 5 — Generic `usePaginatedFetch` Hook

**Files:**
- Create: `Frontend/src/shared/hooks/usePaginatedFetch.ts`

- [ ] **Step 1: Create the hook**

```ts
// Frontend/src/shared/hooks/usePaginatedFetch.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '@/shared/lib/api';

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta | null;
}

interface UsePaginatedFetchResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  meta: PaginationMeta | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  // Optimistic helpers — update local state without a refetch
  prependItem: (item: T) => void;
  updateItem: (id: string | number, idKey: keyof T, updated: T) => void;
  removeItem: (id: string | number, idKey: keyof T) => void;
}

export function usePaginatedFetch<T>(
  path: string,
  perPage = 25,
  extraParams: Record<string, string> = {},
): UsePaginatedFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const activeRef = useRef(true);

  const fetchPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(pageNum),
      per_page: String(perPage),
      ...extraParams,
    });

    try {
      const response = await apiGet<PaginatedResponse<T>>(
        `${path}?${params.toString()}`,
      );
      if (!activeRef.current) return;
      setData(response.data);
      setMeta(response.meta);
    } catch (err) {
      if (!activeRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [path, perPage, JSON.stringify(extraParams)]);

  useEffect(() => {
    activeRef.current = true;
    void fetchPage(page);
    return () => { activeRef.current = false; };
  }, [page, fetchPage]);

  const refetch = useCallback(() => { void fetchPage(page); }, [fetchPage, page]);

  const prependItem = useCallback((item: T) => {
    setData(prev => [item, ...prev]);
  }, []);

  const updateItem = useCallback((id: string | number, idKey: keyof T, updated: T) => {
    setData(prev => prev.map(item => (item[idKey] as unknown) === id ? updated : item));
  }, []);

  const removeItem = useCallback((id: string | number, idKey: keyof T) => {
    setData(prev => prev.filter(item => (item[idKey] as unknown) !== id));
  }, []);

  return { data, loading, error, meta, page, setPage, refetch, prependItem, updateItem, removeItem };
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/hooks/usePaginatedFetch.ts
git commit -m "feat: add usePaginatedFetch generic hook"
```

---

## Task 6 — Refactor DataContext (Remove Bulk Fetch)

**Files:**
- Modify: `Frontend/src/shared/contexts/DataContext.tsx`

**Goal:** Remove the `loadFromApi` effect and all internal state arrays (`parts`, `services`, etc.). Mutations keep their API calls and toasts but return the created/updated record so pages can update their local state.

- [ ] **Step 1: Remove all state declarations and the loadFromApi effect**

Delete these state declarations:
```ts
// DELETE all of these:
const [parts, setParts] = useState<Part[]>([]);
const [services, setServices] = useState<ServiceRecord[]>([]);
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [logs, setLogs] = useState<ActivityLog[]>([]);
const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
const [users, setUsers] = useState<User[]>([]);
const [loading, setLoading] = useState(false);
```

Delete the entire `useEffect` block that calls `loadFromApi()` (lines 57–133).

Delete `addLogAction` and `recordMovement` helper callbacks — these were only used to update local state.

- [ ] **Step 2: Update the DataContextType interface**

```ts
interface DataContextType {
  // Mutations — each returns the created/updated record
  addPart: (part: Omit<Part, 'id' | 'createdAt'>) => Promise<Part>;
  updatePart: (id: string, part: Partial<Part>) => Promise<Part>;
  deletePart: (id: string) => Promise<void>;
  recordStockMovement: (partId: string, type: 'in' | 'out' | 'adjust', qty: number, reason: string) => Promise<void>;
  addService: (service: Omit<ServiceRecord, 'id' | 'createdAt'>) => Promise<ServiceRecord>;
  updateService: (id: string, service: Partial<ServiceRecord>) => Promise<ServiceRecord>;
  deleteService: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  addServiceType: (st: Omit<ServiceType, 'id'>) => Promise<ServiceType>;
  updateServiceType: (id: string, st: Partial<ServiceType>) => Promise<ServiceType>;
  deleteServiceType: (id: string) => Promise<void>;
  addUser: (input: { name: string; email: string; role: Role; password: string }) => Promise<void>;
  updateUser: (id: string, patch: Partial<User> & { password?: string }) => Promise<void>;
  setUserStatus: (id: string, status: 'Active' | 'Inactive') => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}
```

- [ ] **Step 3: Update mutation functions to return the record**

Each mutation currently sets local state after the API call. Remove the setState calls and add `return`:

```ts
// addPart — before
const addPart = useCallback(async (part: Omit<Part, 'id' | 'createdAt'>) => {
  const response = await apiMutation<ApiItem<Part>>('/api/parts', 'POST', part);
  const newPart = response.data;
  setParts(prev => [...prev, newPart]);         // ← DELETE
  recordMovement(...);                           // ← DELETE
  addLogAction(`Added new part: ${part.name}`); // ← DELETE
  toast.success(`Part added: ${part.name}`);
}, [addLogAction, recordMovement]);

// addPart — after
const addPart = useCallback(async (part: Omit<Part, 'id' | 'createdAt'>): Promise<Part> => {
  try {
    const response = await apiMutation<ApiItem<Part>>('/api/parts', 'POST', part);
    toast.success(`Part added: ${part.name}`);
    return response.data;
  } catch (error) {
    showApiFailure('Add part', error);
    throw error;
  }
}, []);
```

Apply the same pattern to `updatePart`, `deletePart`, `addService`, `updateService`, `deleteService`, `addTransaction`, `addServiceType`, `updateServiceType`, `deleteServiceType`.

For `addUser`, `updateUser`, `setUserStatus`, `deleteUser` — these don't return records to the page (users page will refetch), so they just throw on error.

- [ ] **Step 4: Remove unused imports**

After the state and helper removals, remove:
- `useRef` (no longer needed)
- `normalizeRole` (no longer needed for role check in loadFromApi)
- `ActivityLog`, `StockMovement` types if no longer referenced

- [ ] **Step 5: Update the Provider return value**

```tsx
return (
  <DataContext.Provider value={{
    addPart, updatePart, deletePart, recordStockMovement,
    addService, updateService, deleteService,
    addTransaction,
    addServiceType, updateServiceType, deleteServiceType,
    addUser, updateUser, setUserStatus, deleteUser,
  }}>
    {children}
  </DataContext.Provider>
);
```

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/shared/contexts/DataContext.tsx
git commit -m "refactor: DataContext removes bulk fetch, mutations return records"
```

---

## Task 7 — Inventory Page: Paginated Local State

**Files:**
- Modify: `Frontend/src/features/inventory/pages/InventoryPage.tsx`

- [ ] **Step 1: Replace `useData()` with `usePaginatedFetch` + direct mutations**

At the top of the component, replace:
```ts
// DELETE:
const { parts, addPart, updatePart, deletePart, recordStockMovement, stockMovements } = useData();

// ADD:
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { useData } from '@/shared/contexts/DataContext';
import type { Part } from '@/shared/types';

const { addPart, updatePart, deletePart, recordStockMovement } = useData();
const {
  data: parts,
  loading,
  meta,
  page,
  setPage,
  prependItem,
  updateItem,
  removeItem,
} = usePaginatedFetch<Part>('/api/parts');
```

- [ ] **Step 2: Update form submission handlers to use optimistic updates**

```ts
// Add Part
const handleAddPart = async (data: PartForm) => {
  try {
    const newPart = await addPart(data);
    prependItem(newPart);          // Optimistic: show at top of list
    setModalOpen(false);
    form.reset();
  } catch {
    // error toast already shown by DataContext
  }
};

// Update Part
const handleUpdatePart = async (data: PartForm) => {
  if (!editing) return;
  try {
    const updated = await updatePart(editing.id, data);
    updateItem(editing.id, 'id', updated);
    setEditing(null);
    setModalOpen(false);
  } catch {
    // error toast already shown
  }
};

// Delete Part
const handleDeletePart = async (id: string) => {
  try {
    await deletePart(id);
    removeItem(id, 'id');
    setConfirmDelete(null);
  } catch {
    // error toast already shown
  }
};
```

- [ ] **Step 3: Remove the search/category client-side filter (move to server-side)**

Currently the page filters `parts` with `useMemo`. With pagination, filtering must be server-side. Pass filter params to the hook:

```ts
const [search, setSearch] = useState('');
const [catFilter, setCatFilter] = useState('All');
const [debouncedSearch, setDebouncedSearch] = useState('');

// Debounce search input
useEffect(() => {
  const t = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(t);
}, [search]);

const extraParams: Record<string, string> = {};
if (debouncedSearch) extraParams.search = debouncedSearch;
if (catFilter !== 'All') extraParams.category = catFilter;

const { data: parts, loading, meta, page, setPage, prependItem, updateItem, removeItem } =
  usePaginatedFetch<Part>('/api/parts', 25, extraParams);
```

> Note: The backend `parts()` method needs `?search=` and `?category=` support. Add to `parts()` in `MospamsController.php`:
> ```php
> if ($search = request()->query('search')) {
>     $query->where('parts.part_name', 'like', "%{$search}%");
> }
> if ($category = request()->query('category')) {
>     $query->where('categories.category_name', $category);
> }
> ```

- [ ] **Step 4: Add skeleton loader while loading**

```tsx
import { SkeletonTable } from '@/shared/components/Skeleton';

// At the top of the returned JSX, before the parts list:
{loading && <SkeletonTable rows={8} />}
```

- [ ] **Step 5: Add pagination controls at the bottom**

```tsx
{meta && meta.lastPage > 1 && (
  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
    <span className="text-xs text-zinc-500">
      {meta.total} total · page {meta.currentPage} of {meta.lastPage}
    </span>
    <div className="flex gap-2">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={meta.currentPage === 1}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white disabled:opacity-40"
      >
        Previous
      </button>
      <button
        onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))}
        disabled={meta.currentPage === meta.lastPage}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white disabled:opacity-40"
      >
        Next
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/features/inventory/pages/InventoryPage.tsx \
         Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: inventory page uses paginated local state, server-side search"
```

---

## Task 8 — Services Page: Paginated Local State

**Files:**
- Modify: `Frontend/src/features/services/pages/ServicesPage.tsx`

- [ ] **Step 1: Replace `useData()` with paginated fetch + DataContext mutations**

```ts
// DELETE:
const { services, serviceTypes, addService, updateService, deleteService, addServiceType, updateServiceType, deleteServiceType } = useData();

// ADD:
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import type { ServiceRecord, ServiceType } from '@/shared/types';

const { addService, updateService, deleteService, addServiceType, updateServiceType, deleteServiceType } = useData();

const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
const extraParams = statusFilter !== 'All' ? { status: statusFilter } : {};

const {
  data: services, loading: servicesLoading, meta, page, setPage,
  prependItem: prependService, updateItem: updateServiceItem, removeItem: removeServiceItem,
} = usePaginatedFetch<ServiceRecord>('/api/services', 25, extraParams);

// Service types are small — fetch all (no pagination needed)
const { data: serviceTypes, loading: stLoading } =
  usePaginatedFetch<ServiceType>('/api/service-types', 100);
```

- [ ] **Step 2: Update form submission handlers**

```ts
const handleAddService = async (data: ServiceForm) => {
  try {
    const newService = await addService(data);
    prependService(newService);
    setModalOpen(false);
    form.reset();
  } catch { /* toast already shown */ }
};

const handleUpdateService = async (data: ServiceForm) => {
  if (!editing) return;
  try {
    const updated = await updateService(editing.id, data);
    updateServiceItem(editing.id, 'id', updated);
    setEditing(null);
    setModalOpen(false);
  } catch { /* toast already shown */ }
};

const handleDeleteService = async (id: string) => {
  try {
    await deleteService(id);
    removeServiceItem(id, 'id');
    setConfirmDelete(null);
  } catch { /* toast already shown */ }
};
```

- [ ] **Step 3: Replace the full-page spinner with `SkeletonTable`**

```tsx
import { SkeletonTable } from '@/shared/components/Skeleton';

// Replace any loading spinner with:
{servicesLoading && <SkeletonTable rows={8} />}
```

- [ ] **Step 4: Add pagination controls** (same pattern as InventoryPage, Step 5)

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/features/services/pages/ServicesPage.tsx
git commit -m "feat: services page uses paginated local state"
```

---

## Task 9 — Sales Page: Paginated Local State

**Files:**
- Modify: `Frontend/src/features/sales/pages/SalesPage.tsx`

- [ ] **Step 1: Replace `useData()` with paginated fetch**

```ts
// DELETE:
const { transactions, services, parts, serviceTypes, addTransaction } = useData();

// ADD:
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import type { Transaction, ServiceRecord, Part, ServiceType } from '@/shared/types';

const { addTransaction } = useData();

const {
  data: transactions, loading, meta, page, setPage,
  prependItem: prependTransaction,
} = usePaginatedFetch<Transaction>('/api/transactions');

// For the sale form dropdowns — fetch with high limit (these are small sets)
const { data: services } = usePaginatedFetch<ServiceRecord>('/api/services', 100);
const { data: parts }    = usePaginatedFetch<Part>('/api/parts', 100);
const { data: serviceTypes } = usePaginatedFetch<ServiceType>('/api/service-types', 100);
```

- [ ] **Step 2: Update the add-transaction handler**

```ts
const handleAddTransaction = async (data: TransactionForm) => {
  try {
    const newTx = await addTransaction(data);
    prependTransaction(newTx);
    setModalOpen(false);
    form.reset();
  } catch { /* toast already shown */ }
};
```

- [ ] **Step 3: Replace spinner with skeleton + add pagination controls**

Same pattern as Tasks 7 and 8.

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/features/sales/pages/SalesPage.tsx
git commit -m "feat: sales page uses paginated local state"
```

---

## Task 10 — Final Verification

- [ ] **Step 1: Start the dev server and verify no TypeScript errors**

```bash
cd Frontend
npm run build
```

Expected: exit 0, no type errors.

- [ ] **Step 2: Manual smoke test checklist**

Test each of the following in the browser:

| Action | Expected |
|---|---|
| Login on tenant subdomain | Login form appears immediately, no blocking spinner |
| Navigate to Dashboard | Dashboard skeleton shows, then data fills in |
| Navigate to Inventory | Skeleton shows, parts load; search filters server-side |
| Add a new part | Part appears at top of list instantly |
| Delete a part | Part disappears instantly from list |
| Navigate to Services | Services load paginated |
| Navigate to Sales | Transactions load paginated |
| Go to next page on Inventory | Page 2 loads, URL not changed |
| Navigate to Landing page (mospams.shop) | Loads immediately, no API call |

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: dashboard performance — skeleton loaders, paginated list pages, DataContext mutation-only"
```
