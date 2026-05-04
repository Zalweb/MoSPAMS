<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class MospamsController extends Controller
{
    public function parts(): JsonResponse
    {
        $query = DB::table('parts')
            ->join('categories', 'categories.category_id', '=', 'parts.category_id_fk')
            ->select('parts.*', 'categories.category_name')
            ->orderByDesc('parts.created_at');

        $this->scopeToShop($query, 'parts');

        $result = $this->paginateOrLimit($query);

        return response()->json([
            'data' => collect($result['data'])->map(fn ($row) => $this->partResource($row)),
            'meta' => $result['meta'],
        ]);
    }

    public function publicStats(): JsonResponse
    {
        // For public stats, use default shop or first active shop
        $shopId = DB::table('shops')
            ->join('shop_statuses', 'shop_statuses.shop_status_id', '=', 'shops.shop_status_id_fk')
            ->where('shop_statuses.status_code', 'ACTIVE')
            ->value('shops.shop_id');

        // Basic counts
        $totalJobsCompleted = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_job_statuses.status_code', 'completed')
            ->count();

        $totalCustomers = DB::table('customers')->where('shop_id_fk', $shopId)->count();
        $totalRevenue = (float) DB::table('sales')->where('shop_id_fk', $shopId)->sum('net_amount');

        $totalParts = DB::table('parts')
            ->join('part_statuses', 'part_statuses.part_status_id', '=', 'parts.part_status_id_fk')
            ->where('parts.shop_id_fk', $shopId)
            ->where('part_statuses.status_code', 'in_stock')
            ->count();

        $activeServices = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->whereIn('service_job_statuses.status_code', ['pending', 'in_progress'])
            ->count();

        // Weekly revenue calculations
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

        // Today vs Yesterday revenue
        $todayRevenue = (float) DB::table('sales')
            ->where('shop_id_fk', $shopId)
            ->whereDate('sale_date', now()->toDateString())
            ->sum('net_amount');

        $yesterdayRevenue = (float) DB::table('sales')
            ->where('shop_id_fk', $shopId)
            ->whereDate('sale_date', now()->subDay()->toDateString())
            ->sum('net_amount');

        $dailyRevenueChange = $yesterdayRevenue > 0 
            ? (($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100 
            : 0;

        // Service completion rate
        $totalServices = DB::table('service_jobs')->where('shop_id_fk', $shopId)->count();
        $completionRate = $totalServices > 0 ? ($totalJobsCompleted / $totalServices) * 100 : 0;

        // Active pipeline (pending + ongoing)
        $pendingServices = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_job_statuses.status_code', 'pending')
            ->count();

        $ongoingServices = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_job_statuses.status_code', 'in_progress')
            ->count();

        $activePipeline = $pendingServices + $ongoingServices;

        // Inventory metrics
        $allParts = DB::table('parts')->where('shop_id_fk', $shopId)->get();
        $lowStockParts = $allParts->filter(fn($p) => $p->stock_quantity <= $p->reorder_level);
        $inventoryHealth = $allParts->count() > 0 
            ? (($allParts->count() - $lowStockParts->count()) / $allParts->count()) * 100 
            : 100;

        $inventoryValue = $allParts->sum(fn($p) => $p->stock_quantity * $p->unit_price);

        // Low stock with urgency levels
        $lowStockWithUrgency = $lowStockParts->map(function($part) {
            $urgency = $part->stock_quantity === 0 ? 'critical' 
                : ($part->stock_quantity <= $part->reorder_level / 2 ? 'high' : 'medium');
            return [
                'part_id' => $part->part_id,
                'part_name' => $part->part_name,
                'stock' => (int) $part->stock_quantity,
                'min_stock' => (int) $part->reorder_level,
                'price' => (float) $part->unit_price,
                'urgency' => $urgency,
            ];
        })->values();

        // Average revenue per customer
        $avgRevenuePerCustomer = $totalCustomers > 0 ? $totalRevenue / $totalCustomers : 0;

        // 7-day revenue sparkline
        $revenueSparkline = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $amount = (float) DB::table('sales')
                ->where('shop_id_fk', $shopId)
                ->whereDate('sale_date', $date)
                ->sum('net_amount');
            $revenueSparkline[] = $amount;
        }

        // 7-day parts usage sparkline
        $partsUsageSparkline = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $count = DB::table('service_job_parts')
                ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_parts.job_id_fk')
                ->where('service_jobs.shop_id_fk', $shopId)
                ->whereDate('service_jobs.job_date', $date)
                ->count();
            $partsUsageSparkline[] = $count;
        }

        // 30-day charts (existing)
        $start = now()->subDays(29)->startOfDay();
        $end = now()->endOfDay();

        $revenueRows = DB::table('sales')
            ->selectRaw('DATE(sale_date) as day, SUM(net_amount) as amount')
            ->where('shop_id_fk', $shopId)
            ->whereBetween('sale_date', [$start, $end])
            ->groupByRaw('DATE(sale_date)')
            ->pluck('amount', 'day');

        $jobRows = DB::table('service_jobs')
            ->selectRaw('DATE(job_date) as day, COUNT(*) as count')
            ->where('shop_id_fk', $shopId)
            ->whereBetween('job_date', [$start->toDateString(), $end->toDateString()])
            ->groupByRaw('DATE(job_date)')
            ->pluck('count', 'day');

        $revenueByDay = [];
        $jobsByDay = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $revenueByDay[] = ['date' => $date, 'amount' => (float) ($revenueRows[$date] ?? 0)];
            $jobsByDay[] = ['date' => $date, 'count' => (int) ($jobRows[$date] ?? 0)];
        }

        $statusRows = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->selectRaw('LOWER(service_job_statuses.status_code) as code, COUNT(*) as count')
            ->groupByRaw('LOWER(service_job_statuses.status_code)')
            ->pluck('count', 'code');

        $serviceStatus = [
            'pending' => (int) ($statusRows['pending'] ?? 0),
            'ongoing' => (int) ($statusRows['in_progress'] ?? 0),
            'completed' => (int) ($statusRows['completed'] ?? 0),
        ];

        $paymentRows = DB::table('payments')
            ->join('sales', 'sales.sale_id', '=', 'payments.sale_id_fk')
            ->where('sales.shop_id_fk', $shopId)
            ->selectRaw('LOWER(payment_method) as method, COUNT(*) as count')
            ->groupByRaw('LOWER(payment_method)')
            ->pluck('count', 'method');

        $paymentMethods = [
            'cash' => (int) ($paymentRows['cash'] ?? 0),
            'gcash' => (int) ($paymentRows['gcash'] ?? 0),
        ];

        $topServiceTypes = DB::table('service_job_items')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_items.job_id_fk')
            ->join('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->selectRaw('service_types.service_name as name, COUNT(*) as count, SUM(service_job_items.labor_cost) as revenue')
            ->groupBy('service_types.service_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'count' => (int) $row->count,
                'revenue' => (float) $row->revenue,
            ])
            ->values();

        return response()->json([
            'summary' => [
                'total_jobs_completed' => $totalJobsCompleted,
                'total_customers' => $totalCustomers,
                'total_revenue' => $totalRevenue,
                'total_parts' => $totalParts,
                'active_services' => $activeServices,
                
                // New metrics
                'this_week_revenue' => $thisWeekRevenue,
                'last_week_revenue' => $lastWeekRevenue,
                'weekly_revenue_change' => round($weeklyRevenueChange, 2),
                'today_revenue' => $todayRevenue,
                'yesterday_revenue' => $yesterdayRevenue,
                'daily_revenue_change' => round($dailyRevenueChange, 2),
                'completion_rate' => round($completionRate, 2),
                'active_pipeline' => $activePipeline,
                'pending_services' => $pendingServices,
                'ongoing_services' => $ongoingServices,
                'inventory_health' => round($inventoryHealth, 2),
                'inventory_value' => $inventoryValue,
                'low_stock_count' => $lowStockParts->count(),
                'avg_revenue_per_customer' => round($avgRevenuePerCustomer, 2),
            ],
            'charts' => [
                'revenue_by_day' => $revenueByDay,
                'jobs_by_day' => $jobsByDay,
                'service_status' => $serviceStatus,
                'payment_methods' => $paymentMethods,
                'top_service_types' => $topServiceTypes,
                
                // New sparklines
                'revenue_sparkline_7d' => $revenueSparkline,
                'parts_usage_sparkline_7d' => $partsUsageSparkline,
            ],
            'low_stock' => $lowStockWithUrgency,
        ]);
    }

    public function storePart(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', 'string', 'max:100'],
            'stock' => ['required', 'integer', 'min:0'],
            'minStock' => ['required', 'integer', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'barcode' => ['nullable', 'string', 'max:100', 'unique:parts,barcode'],
        ]);

        return DB::transaction(function () use ($request, $data) {
            $partId = DB::table('parts')->insertGetId([
                'shop_id_fk' => $this->shopId(),
                'category_id_fk' => $this->categoryId($data['category']),
                'part_name' => $data['name'],
                'barcode' => $data['barcode'] ?? null,
                'unit_price' => $data['price'],
                'stock_quantity' => $data['stock'],
                'reorder_level' => $data['minStock'],
                'part_status_id_fk' => $this->statusId('part_statuses', 'part_status_id', 'in_stock'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($data['stock'] > 0) {
                $this->recordMovement($partId, $request->user()->user_id, 'in', $data['stock'], 'Initial stock', 'part', $partId);
            }

            $this->log($request, 'Added new part: '.$data['name'], 'parts', $partId);

            return response()->json(['data' => $this->partById($partId)], 201);
        });
    }

    public function updatePart(Request $request, int $part): JsonResponse
    {
        $existing = DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->first();
        abort_if(! $existing, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', 'max:100'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'minStock' => ['sometimes', 'integer', 'min:0'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('parts', 'barcode')->ignore($part, 'part_id')],
        ]);

        return DB::transaction(function () use ($request, $part, $existing, $data) {
            $patch = ['updated_at' => now()];
            if (array_key_exists('name', $data)) $patch['part_name'] = $data['name'];
            if (array_key_exists('category', $data)) $patch['category_id_fk'] = $this->categoryId($data['category']);
            if (array_key_exists('stock', $data)) $patch['stock_quantity'] = $data['stock'];
            if (array_key_exists('minStock', $data)) $patch['reorder_level'] = $data['minStock'];
            if (array_key_exists('price', $data)) $patch['unit_price'] = $data['price'];
            if (array_key_exists('barcode', $data)) $patch['barcode'] = $data['barcode'];

            DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->update($patch);

            if (array_key_exists('stock', $data) && (int) $data['stock'] !== (int) $existing->stock_quantity) {
                $difference = (int) $data['stock'] - (int) $existing->stock_quantity;
                $this->recordMovement($part, $request->user()->user_id, $difference >= 0 ? 'in' : 'adjust', abs($difference), 'Manual update', 'part', $part);
            }

            $this->log($request, 'Updated part: '.($data['name'] ?? $existing->part_name), 'parts', $part);

            return response()->json(['data' => $this->partById($part)]);
        });
    }

    public function deletePart(Request $request, int $part): JsonResponse
    {
        $existing = DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->first();
        abort_if(! $existing, 404);

        DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted part: '.$existing->part_name, 'parts', $part);

        return response()->json(['message' => 'Part deleted.']);
    }

    public function categories(): JsonResponse
    {
        $categories = DB::table('categories')
            ->where('shop_id_fk', $this->shopId())
            ->orderBy('category_name')
            ->get()
            ->map(fn ($row) => [
                'id' => (string) $row->category_id,
                'name' => $row->category_name,
                'description' => $row->description,
            ]);

        return response()->json(['data' => $categories]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $id = DB::table('categories')->insertGetId([
            'shop_id_fk' => $this->shopId(),
            'category_name' => $data['name'],
            'description' => $data['description'] ?? null,
            'category_status_id_fk' => $this->statusId('category_statuses', 'category_status_id', 'active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->log($request, 'Added category: '.$data['name'], 'categories', $id);

        $category = DB::table('categories')->where('category_id', $id)->first();

        return response()->json(['data' => [
            'id' => (string) $category->category_id,
            'name' => $category->category_name,
            'description' => $category->description,
        ]], 201);
    }

    public function stockMovements(): JsonResponse
    {
        $query = DB::table('stock_movements')
            ->join('parts', 'parts.part_id', '=', 'stock_movements.part_id_fk')
            ->join('users', 'users.user_id', '=', 'stock_movements.user_id_fk')
            ->where('parts.shop_id_fk', $this->shopId())
            ->orderByDesc('movement_date');

        $result = $this->paginateOrLimit($query);

        return response()->json([
            'data' => collect($result['data'])->map(fn ($row) => [
                'id' => (string) $row->movement_id,
                'partId' => (string) $row->part_id_fk,
                'partName' => $row->part_name,
                'type' => $row->movement_type,
                'qty' => (int) $row->quantity,
                'reason' => $row->remarks ?? '',
                'userId' => (string) $row->user_id_fk,
                'userName' => $row->full_name,
                'timestamp' => $this->iso($row->movement_date),
            ]),
            'meta' => $result['meta'],
        ]);
    }

    public function storeStockMovement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'partId' => ['required'],
            'type' => ['required', Rule::in(['in', 'out', 'adjust'])],
            'qty' => ['required', 'integer', 'min:0'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $partId = $this->numericId($data['partId']);
        $part = DB::table('parts')->where('part_id', $partId)->where('shop_id_fk', $this->shopId())->first();
        abort_if(! $part, 404);

        DB::transaction(function () use ($request, $part, $partId, $data) {
            $newStock = match ($data['type']) {
                'in' => $part->stock_quantity + $data['qty'],
                'out' => max(0, $part->stock_quantity - $data['qty']),
                'adjust' => $data['qty'],
            };

            DB::table('parts')->where('part_id', $partId)->where('shop_id_fk', $this->shopId())->update(['stock_quantity' => $newStock, 'updated_at' => now()]);
            $this->recordMovement($partId, $request->user()->user_id, $data['type'], $data['qty'], $data['reason']);
            $this->log($request, 'Recorded stock '.$data['type'].' for '.$part->part_name, 'stock_movements', $partId);
        });

        return response()->json(['data' => $this->partById($partId)]);
    }

    public function serviceTypes(): JsonResponse
    {
        $types = DB::table('service_types')
            ->where('shop_id_fk', $this->shopId())
            ->orderBy('service_name')
            ->get()
            ->map(fn ($row) => $this->serviceTypeResource($row));

        return response()->json(['data' => $types]);
    }

    public function storeServiceType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'defaultLaborCost' => ['required', 'numeric', 'min:0'],
        ]);

        $id = DB::table('service_types')->insertGetId([
            'shop_id_fk' => $this->shopId(),
            'service_name' => $data['name'],
            'labor_cost' => $data['defaultLaborCost'],
            'service_type_status_id_fk' => $this->statusId('service_type_statuses', 'service_type_status_id', 'active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->log($request, 'Added service type: '.$data['name'], 'service_types', $id);

        return response()->json(['data' => $this->serviceTypeResource(DB::table('service_types')->where('service_type_id', $id)->first())], 201);
    }

    public function updateServiceType(Request $request, int $serviceType): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'defaultLaborCost' => ['sometimes', 'numeric', 'min:0'],
        ]);

        $patch = ['updated_at' => now()];
        if (array_key_exists('name', $data)) $patch['service_name'] = $data['name'];
        if (array_key_exists('defaultLaborCost', $data)) $patch['labor_cost'] = $data['defaultLaborCost'];

        DB::table('service_types')->where('service_type_id', $serviceType)->where('shop_id_fk', $this->shopId())->update($patch);
        $this->log($request, 'Updated service type #'.$serviceType, 'service_types', $serviceType);

        return response()->json(['data' => $this->serviceTypeResource(DB::table('service_types')->where('service_type_id', $serviceType)->first())]);
    }

    public function deleteServiceType(Request $request, int $serviceType): JsonResponse
    {
        DB::table('service_types')->where('service_type_id', $serviceType)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted service type #'.$serviceType, 'service_types', $serviceType);

        return response()->json(['message' => 'Service type deleted.']);
    }

    public function services(): JsonResponse
    {
        $query = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.shop_id_fk', $this->shopId())
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
            ->orderByDesc('service_jobs.created_at');

        if ($status = request()->query('status')) {
            $query->where('service_job_statuses.status_name', $status);
        }

        $result = $this->paginateOrLimit($query);

        return response()->json([
            'data' => collect($result['data'])->map(fn ($row) => $this->serviceResource($row)),
            'meta' => $result['meta'],
        ]);
    }

    public function storeService(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customerName' => ['required', 'string', 'max:100'],
            'motorcycleModel' => ['nullable', 'string', 'max:150'],
            'serviceType' => ['required', 'string', 'max:100'],
            'laborCost' => ['required', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['Pending', 'Ongoing', 'Completed'])],
            'partsUsed' => ['array'],
            'partsUsed.*.partId' => ['required'],
            'partsUsed.*.quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
        ]);

        $jobId = DB::transaction(function () use ($request, $data) {
            $customerId = $this->customerId($data['customerName']);
            $statusCode = strtolower($data['status'] ?? 'Pending');
            $jobId = DB::table('service_jobs')->insertGetId([
                'shop_id_fk' => $this->shopId(),
                'customer_id_fk' => $customerId,
                'created_by_fk' => $request->user()->user_id,
                'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', $statusCode),
                'job_date' => now()->toDateString(),
                'completion_date' => $statusCode === 'completed' ? now()->toDateString() : null,
                'motorcycle_model' => $data['motorcycleModel'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('service_job_items')->insert([
                'job_id_fk' => $jobId,
                'service_type_id_fk' => $this->serviceTypeId($data['serviceType'], $data['laborCost']),
                'labor_cost' => $data['laborCost'],
                'remarks' => null,
            ]);

            foreach ($data['partsUsed'] ?? [] as $used) {
                $part = DB::table('parts')->where('part_id', $this->numericId($used['partId']))->first();
                if ($part) {
                    DB::table('service_job_parts')->insert([
                        'job_id_fk' => $jobId,
                        'part_id_fk' => $part->part_id,
                        'quantity' => $used['quantity'],
                        'unit_price' => $part->unit_price,
                        'subtotal' => $part->unit_price * $used['quantity'],
                    ]);
                }
            }

            $this->log($request, 'Created service record for '.$data['customerName'], 'service_jobs', $jobId);

            return $jobId;
        });

        return response()->json(['data' => $this->serviceById($jobId)], 201);
    }

    public function updateService(Request $request, int $service): JsonResponse
    {
        $data = $request->validate([
            'customerName' => ['sometimes', 'string', 'max:100'],
            'motorcycleModel' => ['sometimes', 'nullable', 'string', 'max:150'],
            'serviceType' => ['sometimes', 'string', 'max:100'],
            'laborCost' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['Pending', 'Ongoing', 'Completed'])],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        DB::transaction(function () use ($request, $service, $data) {
            $patch = ['updated_at' => now()];
            if (array_key_exists('customerName', $data)) $patch['customer_id_fk'] = $this->customerId($data['customerName']);
            if (array_key_exists('motorcycleModel', $data)) $patch['motorcycle_model'] = $data['motorcycleModel'];
            if (array_key_exists('notes', $data)) $patch['notes'] = $data['notes'];
            if (array_key_exists('status', $data)) {
                $statusCode = strtolower($data['status']);
                $patch['service_job_status_id_fk'] = $this->statusId('service_job_statuses', 'service_job_status_id', $statusCode);
                $patch['completion_date'] = $statusCode === 'completed' ? now()->toDateString() : null;
            }
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->update($patch);

            if (array_key_exists('serviceType', $data) || array_key_exists('laborCost', $data)) {
                $current = DB::table('service_job_items')->where('job_id_fk', $service)->first();
                $labor = $data['laborCost'] ?? $current?->labor_cost ?? 0;
                $name = $data['serviceType'] ?? DB::table('service_types')->where('service_type_id', $current?->service_type_id_fk)->value('service_name') ?? 'General Service';
                DB::table('service_job_items')->updateOrInsert(
                    ['job_id_fk' => $service],
                    ['service_type_id_fk' => $this->serviceTypeId($name, $labor), 'labor_cost' => $labor, 'remarks' => null]
                );
            }

            $this->log($request, 'Updated service #'.$service, 'service_jobs', $service);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function deleteService(Request $request, int $service): JsonResponse
    {
        DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted service record #'.$service, 'service_jobs', $service);

        return response()->json(['message' => 'Service deleted.']);
    }

    public function transactions(): JsonResponse
    {
        $query = DB::table('sales')
            ->leftJoin('payments', 'payments.sale_id_fk', '=', 'sales.sale_id')
            ->where('sales.shop_id_fk', $this->shopId())
            ->orderByDesc('sales.sale_date')
            ->select('sales.*', 'payments.payment_method');

        $result = $this->paginateOrLimit($query);

        return response()->json([
            'data' => collect($result['data'])->map(fn ($sale) => $this->transactionResource($sale)),
            'meta' => $result['meta'],
        ]);
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['parts-only', 'service+parts'])],
            'items' => ['array'],
            'items.*.partId' => ['required'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'serviceId' => ['nullable'],
            'serviceLaborCost' => ['nullable', 'numeric', 'min:0'],
            'paymentMethod' => ['required', Rule::in(['Cash', 'GCash'])],
            'total' => ['required', 'numeric', 'min:0'],
        ]);

        $saleId = DB::transaction(function () use ($request, $data) {
            $jobId = isset($data['serviceId']) ? $this->numericId($data['serviceId']) : null;
            $customerId = $jobId ? DB::table('service_jobs')->where('job_id', $jobId)->value('customer_id_fk') : null;
            $saleId = DB::table('sales')->insertGetId([
                'shop_id_fk' => $this->shopId(),
                'customer_id_fk' => $customerId,
                'job_id_fk' => $jobId,
                'processed_by_fk' => $request->user()->user_id,
                'sale_type' => $data['type'],
                'total_amount' => $data['total'],
                'discount' => 0,
                'net_amount' => $data['total'],
                'sale_date' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($data['items'] ?? [] as $item) {
                $partId = $this->numericId($item['partId']);
                $part = DB::table('parts')->where('part_id', $partId)->first();
                if (! $part) continue;
                DB::table('sale_items')->insert([
                    'sale_id_fk' => $saleId,
                    'part_id_fk' => $partId,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['price'],
                    'subtotal' => $item['quantity'] * $item['price'],
                ]);
                DB::table('parts')->where('part_id', $partId)->update([
                    'stock_quantity' => max(0, $part->stock_quantity - $item['quantity']),
                    'updated_at' => now(),
                ]);
                $this->recordMovement($partId, $request->user()->user_id, 'out', $item['quantity'], 'Sale '.$saleId, 'sale', $saleId);
            }

            DB::table('payments')->insert([
                'sale_id_fk' => $saleId,
                'payment_method' => $data['paymentMethod'],
                'amount_paid' => $data['total'],
                'payment_date' => now(),
                'reference_number' => null,
                'payment_status_id_fk' => $this->statusId('payment_statuses', 'payment_status_id', 'paid'),
            ]);

            $this->log($request, 'Recorded '.$data['type'].' transaction (#'.$saleId.')', 'sales', $saleId);

            return $saleId;
        });

        return response()->json(['data' => $this->transactionById($saleId)], 201);
    }

    public function payments(): JsonResponse
    {
        $payments = DB::table('payments')
            ->join('sales', 'sales.sale_id', '=', 'payments.sale_id_fk')
            ->join('payment_statuses', 'payment_statuses.payment_status_id', '=', 'payments.payment_status_id_fk')
            ->where('sales.shop_id_fk', $this->shopId())
            ->orderByDesc('payment_date')
            ->select('payments.*', 'payment_statuses.status_name')
            ->get()
            ->map(fn ($row) => [
                'id' => (string) $row->payment_id,
                'saleId' => (string) $row->sale_id_fk,
                'paymentMethod' => $row->payment_method,
                'amountPaid' => (float) $row->amount_paid,
                'paymentDate' => $this->iso($row->payment_date),
                'referenceNumber' => $row->reference_number,
                'status' => $row->status_name,
            ]);

        return response()->json(['data' => $payments]);
    }

    public function users(): JsonResponse
    {
        return response()->json(['data' => User::query()->where('shop_id_fk', $this->shopId())->with(['role', 'status'])->orderBy('full_name')->get()->map(fn ($user) => $this->userResource($user))]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'max:100', 'unique:users,username'],
            'role' => ['required', Rule::in(['Owner', 'Staff', 'Mechanic', 'Customer'])],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::query()->create([
            'shop_id_fk' => $this->shopId(),
            'role_id_fk' => DB::table('roles')->where('role_name', $data['role'])->value('role_id'),
            'full_name' => $data['name'],
            'username' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'user_status_id_fk' => $this->statusId('user_statuses', 'user_status_id', 'active'),
        ])->load(['role', 'status']);

        $this->log($request, 'Created user '.$data['name'].' ('.$data['role'].')', 'users', $user->user_id);

        return response()->json(['data' => $this->userResource($user)], 201);
    }

    public function updateUser(Request $request, int $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'string', 'max:100', Rule::unique('users', 'username')->ignore($user, 'user_id')],
            'role' => ['sometimes', Rule::in(['Owner', 'Staff', 'Mechanic', 'Customer'])],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $patch = [];
        if (array_key_exists('name', $data)) $patch['full_name'] = $data['name'];
        if (array_key_exists('email', $data)) $patch['username'] = $data['email'];
        if (array_key_exists('role', $data)) $patch['role_id_fk'] = DB::table('roles')->where('role_name', $data['role'])->value('role_id');
        if (! empty($data['password'])) $patch['password_hash'] = Hash::make($data['password']);
        if ($patch) $patch['updated_at'] = now();

        DB::table('users')->where('user_id', $user)->where('shop_id_fk', $this->shopId())->update($patch);
        $this->log($request, 'Updated user #'.$user, 'users', $user);

        return response()->json(['data' => $this->userResource(User::query()->where('shop_id_fk', $this->shopId())->with(['role', 'status'])->findOrFail($user))]);
    }

    public function updateUserStatus(Request $request, int $user): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['Active', 'Inactive'])]]);
        abort_if($request->user()->user_id === $user, 422, 'You cannot disable your own account.');

        DB::table('users')->where('user_id', $user)->where('shop_id_fk', $this->shopId())->update([
            'user_status_id_fk' => $this->statusId('user_statuses', 'user_status_id', strtolower($data['status'])),
            'updated_at' => now(),
        ]);
        $this->log($request, 'Set user #'.$user.' status to '.$data['status'], 'users', $user);

        return response()->json(['data' => $this->userResource(User::query()->with(['role', 'status'])->findOrFail($user))]);
    }

    public function deleteUser(Request $request, int $user): JsonResponse
    {
        abort_if($request->user()->user_id === $user, 422, 'You cannot delete your own account.');
        DB::table('users')->where('user_id', $user)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted user #'.$user, 'users', $user);

        return response()->json(['message' => 'User deleted.']);
    }

    public function activityLogs(): JsonResponse
    {
        $logs = DB::table('activity_logs')
            ->leftJoin('users', 'users.user_id', '=', 'activity_logs.user_id_fk')
            ->where('activity_logs.shop_id_fk', $this->shopId())
            ->orderByDesc('log_date')
            ->get()
            ->map(fn ($row) => [
                'id' => (string) $row->log_id,
                'user' => $row->full_name ?? 'System',
                'action' => $row->action,
                'timestamp' => $this->iso($row->log_date),
            ]);

        return response()->json(['data' => $logs]);
    }

    public function mechanics(): JsonResponse
    {
        $mechanics = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanics.shop_id_fk', $this->shopId())
            ->orderBy('full_name')
            ->get()
            ->map(fn ($row) => [
                'id' => (string) $row->mechanic_id,
                'name' => $row->full_name,
                'email' => $row->email,
                'phone' => $row->phone,
                'status' => $row->status_name,
            ]);

        return response()->json(['data' => $mechanics]);
    }

    public function salesReport(Request $request): JsonResponse
    {
        $shopId = $this->shopId();
        $cacheKey = $this->tenantCacheKey('report:sales:summary', $shopId);

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($shopId) {
            return [
                'totalRevenue' => (float) DB::table('sales')->where('shop_id_fk', $shopId)->sum('net_amount'),
                'transactions' => DB::table('sales')->where('shop_id_fk', $shopId)->count(),
                'cash' => (float) DB::table('payments')
                    ->join('sales', 'sales.sale_id', '=', 'payments.sale_id_fk')
                    ->where('sales.shop_id_fk', $shopId)
                    ->where('payment_method', 'Cash')
                    ->sum('amount_paid'),
                'gcash' => (float) DB::table('payments')
                    ->join('sales', 'sales.sale_id', '=', 'payments.sale_id_fk')
                    ->where('sales.shop_id_fk', $shopId)
                    ->where('payment_method', 'GCash')
                    ->sum('amount_paid'),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function inventoryReport(): JsonResponse
    {
        $shopId = $this->shopId();
        $cacheKey = $this->tenantCacheKey('report:inventory:summary', $shopId);

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($shopId) {
            return [
                'parts' => DB::table('parts')->where('shop_id_fk', $shopId)->count(),
                'lowStock' => DB::table('parts')->where('shop_id_fk', $shopId)->whereColumn('stock_quantity', '<=', 'reorder_level')->count(),
                'stockValue' => (float) DB::table('parts')->where('shop_id_fk', $shopId)->selectRaw('SUM(stock_quantity * unit_price) as value')->value('value'),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function servicesReport(): JsonResponse
    {
        $shopId = $this->shopId();
        return response()->json(['data' => DB::table('service_jobs')
            ->where('shop_id_fk', $shopId)
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->select('service_job_statuses.status_name as status', DB::raw('COUNT(*) as count'))
            ->groupBy('service_job_statuses.status_name')
            ->pluck('count', 'status')]);
    }

    public function incomeReport(): JsonResponse
    {
        $shopId = $this->shopId();
        $sales = (float) DB::table('sales')->where('shop_id_fk', $shopId)->sum('net_amount');
        $labor = (float) DB::table('service_job_items')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_items.job_id_fk')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->sum('labor_cost');

        return response()->json(['data' => ['sales' => $sales, 'labor' => $labor, 'total' => $sales]]);
    }

    private function partById(int $id): array
    {
        $part = DB::table('parts')
            ->join('categories', 'categories.category_id', '=', 'parts.category_id_fk')
            ->where('part_id', $id)
            ->where('parts.shop_id_fk', $this->shopId())
            ->first();

        return $this->partResource($part);
    }

    private function serviceById(int $id): array
    {
        $row = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
            ->where('service_jobs.job_id', $id)
            ->where('service_jobs.shop_id_fk', $this->shopId())
            ->first();

        return $this->serviceResource($row);
    }

    private function transactionById(int $id): array
    {
        $sale = DB::table('sales')
            ->leftJoin('payments', 'payments.sale_id_fk', '=', 'sales.sale_id')
            ->select('sales.*', 'payments.payment_method')
            ->where('sales.sale_id', $id)
            ->where('sales.shop_id_fk', $this->shopId())
            ->first();

        return $this->transactionResource($sale);
    }

    private function transactionResource(object $sale): array
    {
        $items = DB::table('sale_items')
            ->join('parts', 'parts.part_id', '=', 'sale_items.part_id_fk')
            ->where('sale_id_fk', $sale->sale_id)
            ->get()
            ->map(fn ($item) => [
                'partId' => (string) $item->part_id_fk,
                'name' => $item->part_name,
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->unit_price,
            ])->values();

        $labor = $sale->job_id_fk
            ? (float) DB::table('service_job_items')->where('job_id_fk', $sale->job_id_fk)->sum('labor_cost')
            : null;

        return [
            'id' => (string) $sale->sale_id,
            'type' => $sale->sale_type,
            'items' => $items,
            'serviceId' => $sale->job_id_fk ? (string) $sale->job_id_fk : null,
            'serviceLaborCost' => $labor ?: null,
            'paymentMethod' => $sale->payment_method ?? 'Cash',
            'total' => (float) $sale->net_amount,
            'createdAt' => $this->iso($sale->sale_date),
        ];
    }

    private function serviceResource(object $row): array
    {
        $parts = DB::table('service_job_parts')
            ->where('job_id_fk', $row->job_id)
            ->get()
            ->map(fn ($part) => ['partId' => (string) $part->part_id_fk, 'quantity' => (int) $part->quantity])
            ->values();

        return [
            'id' => (string) $row->job_id,
            'customerName' => $row->customer_name,
            'motorcycleModel' => $row->motorcycle_model ?? '',
            'serviceType' => $row->service_name ?? 'General Service',
            'laborCost' => (float) ($row->labor_cost ?? 0),
            'status' => $row->status_name,
            'partsUsed' => $parts,
            'notes' => $row->notes ?? '',
            'createdAt' => $this->iso($row->created_at),
            'completedAt' => $row->completion_date ? $this->iso($row->completion_date) : null,
        ];
    }

    private function partResource(object $part): array
    {
        return [
            'id' => (string) $part->part_id,
            'name' => $part->part_name,
            'category' => $part->category_name,
            'stock' => (int) $part->stock_quantity,
            'minStock' => (int) $part->reorder_level,
            'price' => (float) $part->unit_price,
            'barcode' => $part->barcode ?? '',
            'createdAt' => $this->iso($part->created_at),
        ];
    }

    private function serviceTypeResource(object $row): array
    {
        return [
            'id' => (string) $row->service_type_id,
            'name' => $row->service_name,
            'defaultLaborCost' => (float) $row->labor_cost,
        ];
    }

    private function userResource(User $user): array
    {
        return [
            'id' => (string) $user->user_id,
            'name' => $user->full_name,
            'email' => $user->username,
            'role' => $user->role?->role_name,
            'status' => $user->status?->status_name,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function categoryId(string $name): int
    {
        $shopId = $this->shopId();
        $existing = DB::table('categories')->where('category_name', $name)->where('shop_id_fk', $shopId)->value('category_id');
        if ($existing) return (int) $existing;

        return DB::table('categories')->insertGetId([
            'shop_id_fk' => $shopId,
            'category_name' => $name,
            'category_status_id_fk' => $this->statusId('category_statuses', 'category_status_id', 'active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function customerId(string $name): int
    {
        $shopId = $this->shopId();
        $existing = DB::table('customers')->where('full_name', $name)->where('shop_id_fk', $shopId)->value('customer_id');
        if ($existing) return (int) $existing;

        return DB::table('customers')->insertGetId(['shop_id_fk' => $shopId, 'full_name' => $name, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function serviceTypeId(string $name, float|int|string $labor): int
    {
        $shopId = $this->shopId();
        $existing = DB::table('service_types')->where('service_name', $name)->where('shop_id_fk', $shopId)->value('service_type_id');
        if ($existing) return (int) $existing;

        return DB::table('service_types')->insertGetId([
            'shop_id_fk' => $shopId,
            'service_name' => $name,
            'labor_cost' => $labor,
            'service_type_status_id_fk' => $this->statusId('service_type_statuses', 'service_type_status_id', 'active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function statusId(string $table, string $key, string $code): int
    {
        return (int) DB::table($table)->where('status_code', $code)->value($key);
    }

    private function recordMovement(int $partId, int $userId, string $type, int $quantity, string $remarks, ?string $referenceType = null, ?int $referenceId = null): void
    {
        DB::table('stock_movements')->insert([
            'shop_id_fk' => $this->shopId(),
            'part_id_fk' => $partId,
            'user_id_fk' => $userId,
            'movement_type' => $type,
            'quantity' => $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'movement_date' => now(),
            'remarks' => $remarks,
        ]);
    }

    private function log(Request $request, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $this->shopId(),
            'user_id_fk' => $request->user()?->user_id,
            'action' => mb_substr($action, 0, 100),
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }

    private function shopId(): ?int
    {
        $user = request()->user();

        if (! $user) {
            abort(401, 'Unauthenticated');
        }

        // SuperAdmin can see all shops
        if ($user->isSuperAdmin()) {
            return null;
        }

        $resolvedTenantId = $this->tenantManager()->id();
        if ($resolvedTenantId) {
            return $resolvedTenantId;
        }

        if (! $user->shop_id_fk) {
            abort(403, 'User has no shop assigned');
        }

        return (int) $user->shop_id_fk;
    }

    private function scopeToShop($query, string $table = 'parts')
    {
        $shopId = $this->shopId();

        if ($shopId !== null) {
            $query->where("{$table}.shop_id_fk", $shopId);
        }

        return $query;
    }

    private function paginateOrLimit($query, int $defaultPerPage = 25): array
    {
        $request = request();

        if ($limit = (int) $request->query('limit', 0)) {
            $rows = $query->limit(max(1, min($limit, 100)))->get();
            return ['data' => $rows, 'meta' => null];
        }

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

    private function numericId(mixed $id): int
    {
        return (int) preg_replace('/\D+/', '', (string) $id);
    }

    private function iso(mixed $value): ?string
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->toISOString() : null;
    }
}
