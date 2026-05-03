# Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-data analytics section to the admin dashboard and replace hardcoded numbers on the landing page, both driven by a single public `GET /api/stats` endpoint.

**Architecture:** A new public route calls `MospamsController::publicStats()` which runs raw DB aggregates and returns `{ summary, charts }`. Two frontend hooks (`usePublicStats` for the landing page, `useAdminStats` for the admin) fetch this endpoint. Four Chart.js chart components render the `charts` block in `Overview.tsx`, and `ReportsSection.tsx` replaces hardcoded values with `summary` fields.

**Tech Stack:** PHP/Laravel (backend), React + TypeScript + Vite (frontend), Chart.js 4.x + react-chartjs-2 5.x

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `Backend/routes/api.php` | Modify | Add public `GET /stats` route before auth middleware |
| `Backend/app/Http/Controllers/Api/MospamsController.php` | Modify | Add `publicStats()` method |
| `Frontend/package.json` | Modify | Add `chart.js`, `react-chartjs-2` |
| `Frontend/src/shared/hooks/usePublicStats.ts` | Create | Fetch `/api/stats` without auth for landing page |
| `Frontend/src/shared/hooks/useAdminStats.ts` | Create | Fetch `/api/stats` with auth for admin dashboard |
| `Frontend/src/features/landing/components/ReportsSection.tsx` | Modify | Replace hardcoded numbers with live data |
| `Frontend/src/features/dashboard/components/RevenueLineChart.tsx` | Create | Line chart — 30-day revenue trend |
| `Frontend/src/features/dashboard/components/ServiceStatusDonut.tsx` | Create | Doughnut — Pending/Ongoing/Completed |
| `Frontend/src/features/dashboard/components/PaymentPieChart.tsx` | Create | Pie — Cash vs GCash |
| `Frontend/src/features/dashboard/components/TopServicesBar.tsx` | Create | Horizontal bar — top 5 service types |
| `Frontend/src/features/dashboard/pages/Overview.tsx` | Modify | Add Analytics section with four charts |

---

## Task 1: Add the public `/stats` route

**Files:**
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add route before the auth:sanctum group**

Open `Backend/routes/api.php`. Add this line at line 13, directly after the `googleRegister` route and before `Route::middleware('auth:sanctum')`:

```php
Route::get('/stats', [MospamsController::class, 'publicStats']);
```

Full file after edit (lines 1–15):
```php
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\MospamsController;
use App\Http\Controllers\Api\RoleRequestController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/google', [GoogleAuthController::class, 'googleLogin']);
Route::post('/auth/google/register', [GoogleAuthController::class, 'googleRegister']);
Route::get('/stats', [MospamsController::class, 'publicStats']);

Route::middleware('auth:sanctum')->group(function () {
```

- [ ] **Step 2: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: add public GET /stats route"
```

---

## Task 2: Implement `publicStats()` in MospamsController

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/MospamsController.php`

- [ ] **Step 1: Add the `publicStats` method**

Add this method after the `parts()` method opening (insert before `storePart`, around line 26). The method uses `DB::table` raw queries — no Eloquent, no auth required.

```php
public function publicStats(): JsonResponse
{
    $totalJobsCompleted = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->where('service_job_statuses.status_code', 'COMPLETED')
        ->count();

    $totalCustomers = DB::table('customers')->count();

    $totalRevenue = (float) DB::table('sales')->sum('net_amount');

    $totalParts = DB::table('parts')
        ->join('part_statuses', 'part_statuses.part_status_id', '=', 'parts.part_status_id_fk')
        ->where('part_statuses.status_code', 'ACTIVE')
        ->count();

    $activeServices = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->whereIn('service_job_statuses.status_code', ['PENDING', 'ONGOING'])
        ->count();

    // Build a date-keyed map for the last 30 days
    $start = now()->subDays(29)->startOfDay();
    $end   = now()->endOfDay();

    $revenueRows = DB::table('sales')
        ->selectRaw('DATE(sale_date) as day, SUM(net_amount) as amount')
        ->whereBetween('sale_date', [$start, $end])
        ->groupByRaw('DATE(sale_date)')
        ->pluck('amount', 'day');

    $jobRows = DB::table('service_jobs')
        ->selectRaw('DATE(job_date) as day, COUNT(*) as count')
        ->whereBetween('job_date', [$start, $end])
        ->groupByRaw('DATE(job_date)')
        ->pluck('count', 'day');

    $revenueByDay = [];
    $jobsByDay    = [];
    for ($i = 29; $i >= 0; $i--) {
        $date           = now()->subDays($i)->format('Y-m-d');
        $revenueByDay[] = ['date' => $date, 'amount' => (float) ($revenueRows[$date] ?? 0)];
        $jobsByDay[]    = ['date' => $date, 'count' => (int)   ($jobRows[$date]    ?? 0)];
    }

    $statusRows = DB::table('service_jobs')
        ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
        ->selectRaw('LOWER(service_job_statuses.status_code) as code, COUNT(*) as count')
        ->groupBy('service_job_statuses.status_code')
        ->pluck('count', 'code');

    $serviceStatus = [
        'pending'   => (int) ($statusRows['pending']   ?? 0),
        'ongoing'   => (int) ($statusRows['ongoing']   ?? 0),
        'completed' => (int) ($statusRows['completed'] ?? 0),
    ];

    $paymentRows = DB::table('payments')
        ->selectRaw('LOWER(payment_method) as method, SUM(amount_paid) as total')
        ->groupByRaw('LOWER(payment_method)')
        ->pluck('total', 'method');

    $paymentMethods = [
        'cash'  => (float) ($paymentRows['cash']  ?? 0),
        'gcash' => (float) ($paymentRows['gcash'] ?? 0),
    ];

    $topServiceTypes = DB::table('service_job_items')
        ->join('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
        ->selectRaw('service_types.service_name as name, COUNT(*) as count, SUM(service_job_items.labor_cost) as revenue')
        ->groupBy('service_types.service_name')
        ->orderByDesc('count')
        ->limit(5)
        ->get()
        ->map(fn ($r) => [
            'name'    => $r->name,
            'count'   => (int)   $r->count,
            'revenue' => (float) $r->revenue,
        ]);

    return response()->json([
        'summary' => [
            'total_jobs_completed' => $totalJobsCompleted,
            'total_customers'      => $totalCustomers,
            'total_revenue'        => $totalRevenue,
            'total_parts'          => $totalParts,
            'active_services'      => $activeServices,
        ],
        'charts' => [
            'revenue_by_day'    => $revenueByDay,
            'jobs_by_day'       => $jobsByDay,
            'service_status'    => $serviceStatus,
            'payment_methods'   => $paymentMethods,
            'top_service_types' => $topServiceTypes,
        ],
    ]);
}
```

- [ ] **Step 2: Verify the endpoint returns valid JSON**

Start the Laravel server if not running:
```bash
cd Backend && php artisan serve
```

Then in a browser or curl hit:
```
curl http://127.0.0.1:8000/api/stats
```

Expected: HTTP 200 with JSON containing `summary` and `charts` keys. `revenue_by_day` should have exactly 30 entries.

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/MospamsController.php
git commit -m "feat: implement publicStats endpoint with 30-day aggregates"
```

---

## Task 3: Install Chart.js in the frontend

**Files:**
- Modify: `Frontend/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd Frontend && npm install chart.js react-chartjs-2
```

Expected output ends with something like:
```
added 2 packages ...
```

- [ ] **Step 2: Verify install**

```bash
node -e "console.log(require('./node_modules/chart.js/package.json').version)"
```
Expected output: `4.x.x`. Or just check `Frontend/package.json` — both `chart.js` and `react-chartjs-2` should appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add Frontend/package.json Frontend/package-lock.json
git commit -m "feat: install chart.js and react-chartjs-2"
```

---

## Task 4: Create `usePublicStats` hook

**Files:**
- Create: `Frontend/src/shared/hooks/usePublicStats.ts`

- [ ] **Step 1: Create the hook**

Create `Frontend/src/shared/hooks/usePublicStats.ts`:

```typescript
import { useEffect, useState } from 'react';

export interface DayRevenue { date: string; amount: number }
export interface DayJobs    { date: string; count: number }
export interface ServiceType { name: string; count: number; revenue: number }

export interface PublicStats {
  summary: {
    total_jobs_completed: number;
    total_customers: number;
    total_revenue: number;
    total_parts: number;
    active_services: number;
  };
  charts: {
    revenue_by_day: DayRevenue[];
    jobs_by_day: DayJobs[];
    service_status: { pending: number; ongoing: number; completed: number };
    payment_methods: { cash: number; gcash: number };
    top_service_types: ServiceType[];
  };
}

export function usePublicStats() {
  const [data, setData]       = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    fetch(`${base}/api/stats`, {
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then(r => {
        if (!r.ok) throw new Error('stats fetch failed');
        return r.json() as Promise<PublicStats>;
      })
      .then(json => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/hooks/usePublicStats.ts
git commit -m "feat: add usePublicStats hook"
```

---

## Task 5: Create `useAdminStats` hook

**Files:**
- Create: `Frontend/src/shared/hooks/useAdminStats.ts`

- [ ] **Step 1: Create the hook**

Create `Frontend/src/shared/hooks/useAdminStats.ts`:

```typescript
import { useEffect, useState } from 'react';
import { apiGet } from '@/shared/lib/api';
import type { PublicStats } from './usePublicStats';

export function useAdminStats() {
  const [data, setData]       = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    apiGet<PublicStats>('/api/stats')
      .then(json => { setData(json); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/shared/hooks/useAdminStats.ts
git commit -m "feat: add useAdminStats hook"
```

---

## Task 6: Update `ReportsSection.tsx` with live data

**Files:**
- Modify: `Frontend/src/features/landing/components/ReportsSection.tsx`

- [ ] **Step 1: Replace the file with the live-data version**

Replace the entire file `Frontend/src/features/landing/components/ReportsSection.tsx`:

```typescript
import { usePublicStats } from '@/shared/hooks/usePublicStats';

function toPercent(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map(v => Math.round((v / max) * 100));
}

function fmt(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ReportsSection() {
  const { data, loading } = usePublicStats();

  const rev   = data?.charts.revenue_by_day.map(d => d.amount) ?? [];
  const jobs  = data?.charts.jobs_by_day.map(d => d.count)  ?? [];
  const revPct  = toPercent(rev);
  const jobsPct = toPercent(jobs);

  const totalRevenue = data?.summary.total_revenue ?? 0;
  const totalParts   = data?.summary.total_parts   ?? 0;
  const totalJobs    = data?.summary.total_jobs_completed ?? 0;

  // Three x-axis labels for the Revenue Overview bar
  const dates = data?.charts.revenue_by_day ?? [];
  const xLabels = dates.length === 30
    ? [dates[0].date.slice(5), dates[14].date.slice(5), 'Today']
    : ['', '', 'Today'];

  const REPORTS = [
    {
      icon: '💰',
      title: 'Sales Reports',
      description: 'Daily, weekly, and monthly sales breakdowns with payment method analysis.',
      metric: loading ? '—' : fmt(totalRevenue),
      metricLabel: 'Total Revenue',
      trend: '+12%',
      positive: true,
      bars: revPct,
    },
    {
      icon: '📦',
      title: 'Inventory Reports',
      description: 'Stock levels, low-stock alerts, stock-in/out movements, and part categories.',
      metric: loading ? '—' : String(totalParts),
      metricLabel: 'Active Parts',
      trend: 'Updated Live',
      positive: true,
      bars: revPct,
    },
    {
      icon: '🔧',
      title: 'Service Performance',
      description: 'Jobs completed, average service time, mechanic productivity, and service types.',
      metric: loading ? '—' : String(totalJobs),
      metricLabel: 'Jobs Done',
      trend: 'Updated Live',
      positive: true,
      bars: jobsPct,
    },
    {
      icon: '⭐',
      title: 'Most Used Parts & Services',
      description: 'Identify top-selling parts and most-requested services to optimize your stock.',
      metric: 'Top 5',
      metricLabel: 'Items Ranked',
      trend: 'Updated Daily',
      positive: true,
      bars: revPct,
    },
    {
      icon: '📈',
      title: 'Income Summary',
      description: 'Gross income, net income after discounts, and payment status overview.',
      metric: loading ? '—' : fmt(totalRevenue),
      metricLabel: 'Total Revenue',
      trend: 'Updated Live',
      positive: true,
      bars: revPct,
    },
  ];

  return (
    <section id="reports" className="relative py-24 bg-zinc-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4">
            📊 Reports & Analytics
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Clear reports for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              smarter decisions
            </span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Generate actionable business intelligence at the click of a button. No spreadsheet
            skills required.
          </p>
        </div>

        {/* Dashboard Preview + Cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Overview Panel */}
          <div className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Revenue Overview
            </p>

            <div className="mb-5">
              {loading ? (
                <div className="h-9 w-32 animate-pulse bg-zinc-800 rounded mb-2" />
              ) : (
                <p className="text-3xl font-bold text-white mb-0.5">{fmt(totalRevenue)}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  Live data
                </span>
              </div>
            </div>

            {/* Bar chart — 30-day revenue */}
            <div className="mb-5">
              <div className="flex items-end gap-[2px] h-24">
                {(revPct.length > 0 ? revPct : Array(30).fill(0)).map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all hover:opacity-80 ${
                      i === revPct.length - 1 ? 'bg-white' : i >= revPct.length - 7 ? 'bg-zinc-400' : 'bg-zinc-700'
                    }`}
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>{xLabels[0]}</span>
                <span>{xLabels[1]}</span>
                <span>{xLabels[2]}</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="space-y-2">
              {[
                { label: 'Service Revenue', pct: 59 },
                { label: 'Parts Sales', pct: 41 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">{item.label}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REPORTS.map((report) => (
              <div
                key={report.title}
                className="group bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 cursor-default"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{report.icon}</span>
                    <h3 className="text-sm font-semibold text-white">{report.title}</h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700">
                    {report.trend}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-3">{report.description}</p>

                {/* Sparkline */}
                <div className="flex items-end gap-0.5 h-8 mb-3">
                  {(report.bars.length > 0 ? report.bars : Array(12).fill(40)).map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity bg-white"
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {loading ? (
                      <div className="h-6 w-16 animate-pulse bg-zinc-800 rounded mb-1" />
                    ) : (
                      <p className="text-xl font-bold text-white">{report.metric}</p>
                    )}
                    <p className="text-[10px] text-zinc-500">{report.metricLabel}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/landing/components/ReportsSection.tsx
git commit -m "feat: connect ReportsSection to live /api/stats data"
```

---

## Task 7: Create `RevenueLineChart` component

**Files:**
- Create: `Frontend/src/features/dashboard/components/RevenueLineChart.tsx`

- [ ] **Step 1: Create the file**

Create `Frontend/src/features/dashboard/components/RevenueLineChart.tsx`:

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DayRevenue } from '@/shared/hooks/usePublicStats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface Props {
  data: DayRevenue[];
  loading: boolean;
  error: boolean;
}

export default function RevenueLineChart({ data, loading, error }: Props) {
  const labels  = data.map(d => d.date.slice(5));   // "MM-DD"
  const amounts = data.map(d => d.amount);

  const chartData = {
    labels,
    datasets: [{
      label: 'Revenue (₱)',
      data: amounts,
      borderColor: '#1C1917',
      backgroundColor: 'rgba(28,25,23,0.08)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.35,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            '₱' + ctx.parsed.y.toLocaleString('en-PH'),
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F5F5F4' },
        ticks: {
          color: '#A8A29E',
          font: { size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: { color: '#F5F5F4' },
        ticks: {
          color: '#A8A29E',
          font: { size: 10 },
          callback: (v: number | string) => '₱' + Number(v).toLocaleString('en-PH'),
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Revenue — Last 30 Days</p>
      <div className="h-48">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#E7E5E4] border-t-[#1C1917] animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">Could not load data</p>
          </div>
        )}
        {!loading && !error && <Line data={chartData} options={options as never} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/components/RevenueLineChart.tsx
git commit -m "feat: add RevenueLineChart component"
```

---

## Task 8: Create `ServiceStatusDonut` component

**Files:**
- Create: `Frontend/src/features/dashboard/components/ServiceStatusDonut.tsx`

- [ ] **Step 1: Create the file**

Create `Frontend/src/features/dashboard/components/ServiceStatusDonut.tsx`:

```typescript
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { PublicStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: PublicStats['charts']['service_status'] | null;
  loading: boolean;
  error: boolean;
}

export default function ServiceStatusDonut({ data, loading, error }: Props) {
  const chartData = {
    labels: ['Completed', 'Ongoing', 'Pending'],
    datasets: [{
      data: data ? [data.completed, data.ongoing, data.pending] : [0, 0, 0],
      backgroundColor: ['#1C1917', '#78716C', '#D6D3D1'],
      borderColor: '#ffffff',
      borderWidth: 3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#78716C',
          font: { size: 11 },
          padding: 12,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Service Status</p>
      <div className="h-48">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#E7E5E4] border-t-[#1C1917] animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">Could not load data</p>
          </div>
        )}
        {!loading && !error && <Doughnut data={chartData} options={options} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/components/ServiceStatusDonut.tsx
git commit -m "feat: add ServiceStatusDonut component"
```

---

## Task 9: Create `PaymentPieChart` component

**Files:**
- Create: `Frontend/src/features/dashboard/components/PaymentPieChart.tsx`

- [ ] **Step 1: Create the file**

Create `Frontend/src/features/dashboard/components/PaymentPieChart.tsx`:

```typescript
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { PublicStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: PublicStats['charts']['payment_methods'] | null;
  loading: boolean;
  error: boolean;
}

export default function PaymentPieChart({ data, loading, error }: Props) {
  const chartData = {
    labels: ['Cash', 'GCash'],
    datasets: [{
      data: data ? [data.cash, data.gcash] : [0, 0],
      backgroundColor: ['#1C1917', '#A8A29E'],
      borderColor: '#ffffff',
      borderWidth: 3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#78716C',
          font: { size: 11 },
          padding: 12,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ₱${ctx.parsed.toLocaleString('en-PH')}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Payment Methods</p>
      <div className="h-48">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#E7E5E4] border-t-[#1C1917] animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">Could not load data</p>
          </div>
        )}
        {!loading && !error && <Pie data={chartData} options={options} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/components/PaymentPieChart.tsx
git commit -m "feat: add PaymentPieChart component"
```

---

## Task 10: Create `TopServicesBar` component

**Files:**
- Create: `Frontend/src/features/dashboard/components/TopServicesBar.tsx`

- [ ] **Step 1: Create the file**

Create `Frontend/src/features/dashboard/components/TopServicesBar.tsx`:

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ServiceType } from '@/shared/hooks/usePublicStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  data: ServiceType[];
  loading: boolean;
  error: boolean;
}

export default function TopServicesBar({ data, loading, error }: Props) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      label: 'Jobs',
      data: data.map(d => d.count),
      backgroundColor: '#1C1917',
      borderRadius: 6,
      barThickness: 18,
    }],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (ctx: { dataIndex: number }) =>
            `Revenue: ₱${(data[ctx.dataIndex]?.revenue ?? 0).toLocaleString('en-PH')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F5F5F4' },
        ticks: { color: '#A8A29E', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#44403C', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Top Service Types</p>
      <div className="h-48">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#E7E5E4] border-t-[#1C1917] animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">Could not load data</p>
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">No service data yet</p>
          </div>
        )}
        {!loading && !error && data.length > 0 && <Bar data={chartData} options={options as never} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/components/TopServicesBar.tsx
git commit -m "feat: add TopServicesBar component"
```

---

## Task 11: Wire charts into `Overview.tsx`

**Files:**
- Modify: `Frontend/src/features/dashboard/pages/Overview.tsx`

- [ ] **Step 1: Replace the file with the updated version**

Replace the entire file `Frontend/src/features/dashboard/pages/Overview.tsx`:

```typescript
import { motion } from 'framer-motion';
import { Package, Wrench, ShoppingCart, AlertTriangle, Clock, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useData } from '@/shared/contexts/DataContext';
import { useAdminStats } from '@/shared/hooks/useAdminStats';
import RevenueLineChart from '@/features/dashboard/components/RevenueLineChart';
import ServiceStatusDonut from '@/features/dashboard/components/ServiceStatusDonut';
import PaymentPieChart from '@/features/dashboard/components/PaymentPieChart';
import TopServicesBar from '@/features/dashboard/components/TopServicesBar';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function Overview() {
  const { parts, services, transactions } = useData();
  const { data: statsData, loading: statsLoading, error: statsError } = useAdminStats();

  const lowStock = parts.filter(p => p.stock <= p.minStock);
  const pendingServices   = services.filter(s => s.status === 'Pending').length;
  const ongoingServices   = services.filter(s => s.status === 'Ongoing').length;
  const completedServices = services.filter(s => s.status === 'Completed').length;

  const today = new Date().toISOString().split('T')[0];
  const todaySales   = transactions.filter(t => t.createdAt.startsWith(today));
  const todayRevenue = todaySales.reduce((sum, t) => sum + t.total, 0);

  const stats = [
    { label: 'Total Parts',     value: parts.length.toString(),           icon: Package,       accent: 'bg-[#EFF6FF] text-[#3B82F6]', trend: `${lowStock.length} low stock` },
    { label: "Today's Revenue", value: `₱${todayRevenue.toLocaleString()}`, icon: ShoppingCart, accent: 'bg-[#ECFDF5] text-[#10B981]', trend: `${todaySales.length} transactions` },
    { label: 'Pending Jobs',    value: pendingServices.toString(),         icon: Clock,         accent: 'bg-[#FFFBEB] text-[#F59E0B]', trend: `${ongoingServices} ongoing` },
    { label: 'Completed',       value: completedServices.toString(),       icon: CheckCircle2,  accent: 'bg-[#F5F3FF] text-[#8B5CF6]', trend: 'this month' },
  ];

  const revData    = statsData?.charts.revenue_by_day    ?? [];
  const statusData = statsData?.charts.service_status    ?? null;
  const payData    = statsData?.charts.payment_methods   ?? null;
  const topSvc     = statsData?.charts.top_service_types ?? [];

  return (
    <div>
      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Dashboard</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Overview of your shop's performance</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...fadeUp(i * 0.06 + 0.05)}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#F5F5F4] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-[10px] ${s.accent} flex items-center justify-center`}>
                <s.icon className="w-[14px] h-[14px]" strokeWidth={2} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E7E5E4] group-hover:text-[#D6D3D1] transition-colors" />
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">{s.value}</p>
            <p className="text-[12px] font-medium text-[#A8A29E] mt-1">{s.label}</p>
            <p className="text-[11px] text-[#D6D3D1] mt-0.5">{s.trend}</p>
          </motion.div>
        ))}
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock */}
        <motion.div {...fadeUp(0.3)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" strokeWidth={2} />
              <h3 className="text-[13px] font-semibold text-[#1C1917]">Low Stock</h3>
            </div>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#FFFBEB] px-2 py-[3px] rounded-full">{lowStock.length} items</span>
            )}
          </div>
          <div className="divide-y divide-[#FAFAF9]">
            {lowStock.length === 0 ? (
              <p className="text-[12px] text-[#D6D3D1] py-10 text-center">All stock levels are healthy</p>
            ) : (
              lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors">
                  <div>
                    <p className="text-[13px] font-medium text-[#44403C]">{p.name}</p>
                    <p className="text-[11px] text-[#D6D3D1]">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold ${p.stock === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{p.stock} left</p>
                    <p className="text-[10px] text-[#D6D3D1]">min {p.minStock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Services */}
        <motion.div {...fadeUp(0.35)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={2} />
            <h3 className="text-[13px] font-semibold text-[#1C1917]">Recent Services</h3>
          </div>
          <div className="divide-y divide-[#FAFAF9]">
            {services.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#44403C] truncate">{s.customerName}</p>
                  <p className="text-[11px] text-[#D6D3D1]">{s.motorcycleModel} — {s.serviceType}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-[3px] rounded-full ml-3 ${
                  s.status === 'Completed' ? 'bg-[#ECFDF5] text-[#059669]' :
                  s.status === 'Ongoing'   ? 'bg-[#EFF6FF] text-[#2563EB]' :
                                             'bg-[#FFFBEB] text-[#D97706]'
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pipeline */}
        <motion.div {...fadeUp(0.4)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 lg:col-span-2">
          <h3 className="text-[13px] font-semibold text-[#1C1917] mb-5">Service Pipeline</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending',   count: pendingServices,   icon: Clock,         color: 'bg-[#FFFBEB] text-[#D97706]' },
              { label: 'Ongoing',   count: ongoingServices,   icon: Wrench,        color: 'bg-[#EFF6FF] text-[#2563EB]' },
              { label: 'Completed', count: completedServices, icon: CheckCircle2,  color: 'bg-[#ECFDF5] text-[#059669]' },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-3.5 p-4 rounded-2xl ${item.color} bg-opacity-30`}>
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <div>
                  <p className="text-[22px] font-bold text-[#1C1917] leading-none">{item.count}</p>
                  <p className="text-[11px] font-medium opacity-60 mt-0.5">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Analytics Section */}
      <motion.div {...fadeUp(0.45)} className="mt-8">
        <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Analytics</h3>
        <div className="grid grid-cols-1 gap-4">
          <RevenueLineChart
            data={revData}
            loading={statsLoading}
            error={statsError}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ServiceStatusDonut data={statusData} loading={statsLoading} error={statsError} />
            <PaymentPieChart    data={payData}    loading={statsLoading} error={statsError} />
          </div>
          <TopServicesBar data={topSvc} loading={statsLoading} error={statsError} />
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/dashboard/pages/Overview.tsx
git commit -m "feat: add Analytics section with Chart.js charts to Overview"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Start both servers**

Backend:
```bash
cd Backend && php artisan serve
```

Frontend (new terminal):
```bash
cd Frontend && npm run dev
```

- [ ] **Step 2: Verify landing page**

Open `http://localhost:5173` (or whichever port Vite uses). Scroll to the Reports section. Confirm:
- Revenue number is not `₱48,250` (hardcoded) — it reflects real DB data
- Bar sparklines render (even if flat/zero with empty DB)
- No console errors about missing modules

- [ ] **Step 3: Verify admin dashboard**

Log in as Admin. Open `/dashboard`. Scroll below the pipeline section. Confirm:
- "Analytics" heading is visible
- Line chart renders (flat if no data, no crash)
- Doughnut and Pie charts render side by side
- Horizontal bar chart renders at the bottom
- No JS console errors

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: analytics dashboard complete — Chart.js charts + live landing page stats"
```
