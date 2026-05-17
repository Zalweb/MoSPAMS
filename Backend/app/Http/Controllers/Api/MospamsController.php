<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\ShopMembership;
use App\Models\User;
use App\Services\Identity\AccountProvisioner;
use App\Support\Auth\AuthenticatedContext;
use App\Support\MechanicStatusSync;
use App\Traits\LogsActivity;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class MospamsController extends Controller
{
    use LogsActivity;
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
        $allParts = DB::table('parts')
            ->join('categories', 'categories.category_id', '=', 'parts.category_id_fk')
            ->where('parts.shop_id_fk', $shopId)
            ->select('parts.*', 'categories.category_name')
            ->get();
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
                'category' => $part->category_name,
                'stock' => (int) $part->stock_quantity,
                'min_stock' => (int) $part->reorder_level,
                'price' => (float) $part->unit_price,
                'urgency' => $urgency,
            ];
        })->values();

        // Average revenue per customer
        $avgRevenuePerCustomer = $totalCustomers > 0 ? $totalRevenue / $totalCustomers : 0;

        // Average job completion time in days (cross-database compatible)
        $driver = DB::connection()->getDriverName();
        $dateDiffExpr = $driver === 'sqlite'
            ? "AVG(CAST(julianday(completion_date) - julianday(job_date) AS REAL))"
            : "AVG(DATEDIFF(completion_date, job_date))";
        $avgJobTime = DB::table('service_jobs')
            ->where('shop_id_fk', $shopId)
            ->whereNotNull('completion_date')
            ->selectRaw("{$dateDiffExpr} as avg_days")
            ->value('avg_days');
        $avgJobTime = $avgJobTime ? round((float) $avgJobTime, 1) : 0;

        // Repeat customer rate
        $repeatCustomerCount = DB::table('service_jobs')
            ->where('shop_id_fk', $shopId)
            ->groupBy('customer_id_fk')
            ->havingRaw('COUNT(*) > 1')
            ->select('customer_id_fk')
            ->get()
            ->count();
        $repeatRate = $totalCustomers > 0 ? round(($repeatCustomerCount / $totalCustomers) * 100, 1) : 0;

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
            ->selectRaw('LOWER(payment_method) as method, SUM(amount_paid) as total')
            ->groupByRaw('LOWER(payment_method)')
            ->pluck('total', 'method');

        $paymentMethods = [
            'cash' => (float) ($paymentRows['cash'] ?? 0),
            'gcash' => (float) ($paymentRows['gcash'] ?? 0),
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
                'avg_job_time' => $avgJobTime,
                'repeat_rate' => $repeatRate,
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

    public function publicPlans(): JsonResponse
    {
        $plans = DB::table('subscription_plans')
            ->where('is_active', 1)
            ->orderBy('monthly_price')
            ->get()
            ->map(fn ($row) => [
                'planId' => (int) $row->plan_id,
                'planCode' => $row->plan_code,
                'planName' => $row->plan_name,
                'monthlyPrice' => (float) $row->monthly_price,
                'description' => $row->description,
            ])->values();

        return response()->json(['data' => $plans]);
    }

    public function storePart(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'brand'    => ['nullable', 'string', 'max:100'],
            'partCode' => ['nullable', 'string', 'max:100', 'unique:parts,part_code'],
            'category' => ['required', 'string', 'max:100'],
            'stock'    => ['required', 'integer', 'min:0'],
            'minStock' => ['required', 'integer', 'min:0'],
            'price'    => ['required', 'numeric', 'min:0'],
            'barcode'  => ['nullable', 'string', 'max:100', 'unique:parts,barcode'],
        ]);

        return DB::transaction(function () use ($request, $data) {
            $partId = DB::table('parts')->insertGetId([
                'shop_id_fk'         => $this->shopId(),
                'category_id_fk'     => $this->categoryId($data['category']),
                'part_name'          => $data['name'],
                'brand'              => $data['brand'] ?? null,
                'part_code'          => $data['partCode'] ?? null,
                'barcode'            => $data['barcode'] ?? null,
                'unit_price'         => $data['price'],
                'stock_quantity'     => $data['stock'],
                'reorder_level'      => $data['minStock'],
                'part_status_id_fk'  => $this->statusId('part_statuses', 'part_status_id', 'in_stock'),
                'created_at'         => now(),
                'updated_at'         => now(),
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
            'name'     => ['sometimes', 'string', 'max:100'],
            'brand'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'partCode' => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('parts', 'part_code')->ignore($part, 'part_id')],
            'category' => ['sometimes', 'string', 'max:100'],
            'stock'    => ['sometimes', 'integer', 'min:0'],
            'minStock' => ['sometimes', 'integer', 'min:0'],
            'price'    => ['sometimes', 'numeric', 'min:0'],
            'barcode'  => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('parts', 'barcode')->ignore($part, 'part_id')],
        ]);

        return DB::transaction(function () use ($request, $part, $existing, $data) {
            $patch = ['updated_at' => now()];
            if (array_key_exists('name', $data))     $patch['part_name']      = $data['name'];
            if (array_key_exists('brand', $data))    $patch['brand']          = $data['brand'];
            if (array_key_exists('partCode', $data)) $patch['part_code']      = $data['partCode'];
            if (array_key_exists('category', $data)) $patch['category_id_fk'] = $this->categoryId($data['category']);
            if (array_key_exists('stock', $data))    $patch['stock_quantity'] = $data['stock'];
            if (array_key_exists('minStock', $data)) $patch['reorder_level']  = $data['minStock'];
            if (array_key_exists('price', $data))    $patch['unit_price']     = $data['price'];
            if (array_key_exists('barcode', $data))  $patch['barcode']        = $data['barcode'];

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

        if ($existing->image_path) {
            Storage::disk('public')->delete($existing->image_path);
        }

        DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted part: '.$existing->part_name, 'parts', $part);

        return response()->json(['message' => 'Part deleted.']);
    }

    public function uploadPartImage(Request $request, int $part): JsonResponse
    {
        $existing = DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->first();
        abort_if(! $existing, 404);

        $request->validate([
            'image' => ['required', 'image', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
        ]);

        if ($existing->image_path) {
            Storage::disk('public')->delete($existing->image_path);
        }

        $uploadedFile = $request->file('image');
        $ext = 'jpg';
        $filename = 'parts/' . uniqid('part_', true) . '.' . $ext;
        $tmpPath = $uploadedFile->getRealPath();
        $mime = mime_content_type($tmpPath);

        $src = match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
            str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
            default                     => imagecreatefromjpeg($tmpPath),
        };

        ob_start();
        imagejpeg($src, null, 90);
        $imageData = ob_get_clean();
        imagedestroy($src);

        Storage::disk('public')->put($filename, $imageData);
        $path = $filename;

        DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->update([
            'image_path' => $path,
            'updated_at' => now(),
        ]);

        $this->log($request, 'Uploaded image for part: '.$existing->part_name, 'parts', $part);

        return response()->json(['data' => $this->partById($part)]);
    }

    public function importPartsCsv(Request $request): JsonResponse
    {
        $request->validate([
            'csv' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $shopId = $this->shopId();
        $handle = fopen($request->file('csv')->getRealPath(), 'r');
        $header = fgetcsv($handle);
        $header = array_map('strtolower', array_map('trim', $header));

        foreach (['name', 'price'] as $col) {
            if (!in_array($col, $header)) {
                fclose($handle);
                return response()->json(['error' => "CSV missing required column: {$col}"], 422);
            }
        }

        $imported = 0;
        $skipped  = 0;
        $now = now();

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) < count($header)) { $skipped++; continue; }
            $data = array_combine($header, $row);

            $name = trim($data['name'] ?? '');
            if (!$name) { $skipped++; continue; }

            $price       = (float) ($data['price'] ?? 0);
            $stock       = (int) ($data['stock'] ?? 0);
            $reorder     = (int) ($data['reorder_level'] ?? 5);
            $description = trim($data['description'] ?? '');

            $categoryName = trim($data['category'] ?? 'Uncategorized');
            $categoryId   = DB::table('categories')
                ->where('shop_id_fk', $shopId)
                ->where('category_name', $categoryName)
                ->value('category_id');
            if (!$categoryId) {
                $categoryId = DB::table('categories')->insertGetId([
                    'shop_id_fk'    => $shopId,
                    'category_name' => $categoryName,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
            }

            DB::table('parts')->insert([
                'shop_id_fk'     => $shopId,
                'category_id_fk' => $categoryId,
                'part_name'      => $name,
                'description'    => $description ?: null,
                'price'          => $price,
                'stock_quantity' => $stock,
                'reorder_level'  => $reorder,
                'created_at'     => $now,
                'updated_at'     => $now,
            ]);
            $imported++;
        }
        fclose($handle);

        $this->log($request, "Imported {$imported} parts via CSV", 'parts', null);

        return response()->json([
            'message'  => "Imported {$imported} part(s). Skipped {$skipped} row(s).",
            'imported' => $imported,
            'skipped'  => $skipped,
        ]);
    }

    public function deletePartImage(Request $request, int $part): JsonResponse
    {
        $existing = DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->first();
        abort_if(! $existing, 404);

        if ($existing->image_path) {
            Storage::disk('public')->delete($existing->image_path);
            DB::table('parts')->where('part_id', $part)->where('shop_id_fk', $this->shopId())->update([
                'image_path' => null,
                'updated_at' => now(),
            ]);
        }

        $this->log($request, 'Removed image for part: '.$existing->part_name, 'parts', $part);

        return response()->json(['data' => $this->partById($part)]);
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

        $updatedPart = DB::table('parts')->where('part_id', $partId)->first();
        if ($updatedPart && $updatedPart->stock_quantity <= $updatedPart->reorder_level) {
            $this->notifyOwner(
                'low_stock',
                'Low Stock Alert',
                "{$updatedPart->part_name} is low on stock ({$updatedPart->stock_quantity} remaining, reorder at {$updatedPart->reorder_level}).",
                'parts',
                $partId
            );
        }

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
            ->leftJoin('mechanics as preferred_mech', 'preferred_mech.mechanic_id', '=', 'service_jobs.assigned_mechanic_id_fk')
            ->where('service_jobs.shop_id_fk', $this->shopId())
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost', 'preferred_mech.full_name as preferred_mech_name');

        $status = request()->query('status');
        if ($status) {
            $query->where('service_job_statuses.status_name', $status);
        }

        // FIFO queue order for pending, newest-first for everything else
        if ($status && strtolower($status) === 'pending') {
            $query->orderBy('service_jobs.created_at', 'asc');
        } else {
            $query->orderByDesc('service_jobs.created_at');
        }

        $result = $this->paginateOrLimit($query);

        // Batch-compute queue positions for pending jobs that have a preferred mechanic
        $queuePositions = [];
        $pendingRows = collect($result['data'])->filter(
            fn ($r) => isset($r->status_code) && $r->status_code === 'pending' && ! empty($r->assigned_mechanic_id_fk)
        );
        if ($pendingRows->isNotEmpty()) {
            $pendingStatusId = DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');
            $mechIds         = $pendingRows->pluck('assigned_mechanic_id_fk')->unique()->values();
            $allPending      = DB::table('service_jobs')
                ->whereIn('assigned_mechanic_id_fk', $mechIds)
                ->where('service_job_status_id_fk', $pendingStatusId)
                ->where('shop_id_fk', $this->shopId())
                ->orderBy('created_at', 'asc')
                ->select('job_id', 'assigned_mechanic_id_fk')
                ->get()
                ->groupBy('assigned_mechanic_id_fk');
            foreach ($allPending as $jobs) {
                foreach ($jobs as $pos => $job) {
                    $queuePositions[$job->job_id] = $pos + 1;
                }
            }
        }

        return response()->json([
            'data' => collect($result['data'])->map(fn ($row) => $this->serviceResource($row, $queuePositions[$row->job_id] ?? null)),
            'meta' => $result['meta'],
        ]);
    }

    public function showService(int $service): JsonResponse
    {
        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function storeService(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customerName'         => ['required', 'string', 'max:100'],
            'customerId'           => ['nullable', 'integer'],
            'motorcycleModel'      => ['nullable', 'string', 'max:150'],
            'serviceType'          => ['required', 'string', 'max:100'],
            'laborCost'            => ['required', 'numeric', 'min:0'],
            'status'               => ['nullable', Rule::in(['Pending', 'Ongoing', 'Completed'])],
            'partsUsed'            => ['array'],
            'partsUsed.*.partId'   => ['required'],
            'partsUsed.*.quantity' => ['required', 'integer', 'min:1'],
            'mechanicIds'          => ['array'],
            'mechanicIds.*'        => ['string'],
            'notes'                => ['nullable', 'string'],
        ]);

        $jobId = DB::transaction(function () use ($request, $data) {
            if (!empty($data['customerId'])) {
                $shopId = $this->shopId();
                $exists = DB::table('customers')
                    ->where('customer_id', (int) $data['customerId'])
                    ->where('shop_id_fk', $shopId)
                    ->exists();
                $customerId = $exists
                    ? (int) $data['customerId']
                    : $this->customerId($data['customerName']);
            } else {
                $customerId = $this->customerId($data['customerName']);
            }
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

            $this->syncServiceJobParts($jobId, $data['partsUsed'] ?? [], $request->user()->user_id);

            foreach ($data['mechanicIds'] ?? [] as $rawId) {
                $mechId = $this->numericId($rawId);
                if (DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->exists()) {
                    DB::table('service_job_mechanics')->insertOrIgnore([
                        'job_id_fk'      => $jobId,
                        'mechanic_id_fk' => $mechId,
                        'shop_id_fk'     => $this->shopId(),
                        'assigned_at'    => now(),
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
            'customerName'         => ['sometimes', 'string', 'max:100'],
            'motorcycleModel'      => ['sometimes', 'nullable', 'string', 'max:150'],
            'serviceType'          => ['sometimes', 'string', 'max:100'],
            'laborCost'            => ['sometimes', 'numeric', 'min:0'],
            'notes'                => ['sometimes', 'nullable', 'string'],
            'mechanicIds'          => ['sometimes', 'array'],
            'mechanicIds.*'        => ['string'],
            'partsUsed'            => ['sometimes', 'array'],
            'partsUsed.*.partId'   => ['required_with:partsUsed'],
            'partsUsed.*.quantity' => ['required_with:partsUsed', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $service, $data) {
            $patch = ['updated_at' => now()];
            if (array_key_exists('customerName', $data)) $patch['customer_id_fk'] = $this->customerId($data['customerName']);
            if (array_key_exists('motorcycleModel', $data)) $patch['motorcycle_model'] = $data['motorcycleModel'];
            if (array_key_exists('notes', $data)) $patch['notes'] = $data['notes'];
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

            if (array_key_exists('mechanicIds', $data)) {
                DB::table('service_job_mechanics')->where('job_id_fk', $service)->delete();
                foreach ($data['mechanicIds'] as $rawId) {
                    $mechId = $this->numericId($rawId);
                    if (DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->exists()) {
                        DB::table('service_job_mechanics')->insertOrIgnore([
                            'job_id_fk'      => $service,
                            'mechanic_id_fk' => $mechId,
                            'shop_id_fk'     => $this->shopId(),
                            'assigned_at'    => now(),
                        ]);
                    }
                }
            }

            if (array_key_exists('partsUsed', $data)) {
                $this->syncServiceJobParts($service, $data['partsUsed'], $request->user()->user_id);
            }

            $this->log($request, 'Updated service #'.$service, 'service_jobs', $service);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function startService(Request $request, int $service): JsonResponse
    {
        abort_unless(
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Service job not found.'
        );

        $data = $request->validate([
            'mechanicIds' => ['required', 'array'],
            'mechanicIds.*' => ['required', 'string'],
        ]);

        DB::transaction(function () use ($request, $service, $data) {
            $job = DB::table('service_jobs')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->where('service_jobs.job_id', $service)
                ->where('service_jobs.shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->first();

            abort_if(! $job, 404, 'Service job not found.');
            abort_if($job->status_code !== 'pending', 422, 'Only pending jobs can be confirmed.');

            DB::table('service_jobs')->where('job_id', $service)->update([
                'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'booked_confirmed'),
                'updated_at'               => now(),
            ]);

            // Save assigned mechanics - FIRST delete old assignments
            DB::table('service_job_mechanics')->where('job_id_fk', $service)->delete();

            // THEN insert new ones - validate mechanic exists before inserting
            foreach ($data['mechanicIds'] as $mId) {
                $mechanicId = $this->numericId($mId);

                // Verify mechanic exists and belongs to this shop
                $mechanicExists = DB::table('mechanics')
                    ->where('mechanic_id', $mechanicId)
                    ->where('shop_id_fk', $this->shopId())
                    ->exists();

                if ($mechanicExists) {
                    DB::table('service_job_mechanics')->insert([
                        'job_id_fk'      => $service,
                        'mechanic_id_fk' => $mechanicId,
                        'shop_id_fk'     => $this->shopId(),
                        'assigned_at'    => now(),
                    ]);
                }
            }

            // Collect assigned mechanic names for the customer notification
            $mechanicNames = DB::table('service_job_mechanics')
                ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
                ->where('service_job_mechanics.job_id_fk', $service)
                ->pluck('mechanics.full_name')
                ->toArray();

            // Send notification to the customer's linked user account (if any)
            $customerUserId = DB::table('service_jobs')
                ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
                ->where('service_jobs.job_id', $service)
                ->value('customers.user_id_fk');

            if ($customerUserId) {
                $mechanicList = count($mechanicNames) > 0
                    ? implode(', ', $mechanicNames)
                    : 'our mechanics';

                DB::table('notifications')->insert([
                    'user_id_fk'        => $customerUserId,
                    'notification_type' => 'booking_confirmed',
                    'title'             => 'Booking Confirmed',
                    'message'           => 'Your booking is confirmed! You can head to the shop now. Mechanics available to assist you: ' . $mechanicList . '.',
                    'reference_type'    => 'service_jobs',
                    'reference_id'      => $service,
                    'is_read'           => 0,
                    'created_at'        => now(),
                ]);
            }

            $this->log($request, "Confirmed booking for service job #{$service}", 'service_jobs', $service);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function cancelService(Request $request, int $service): JsonResponse
    {
        abort_unless(
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Service job not found.'
        );

        DB::transaction(function () use ($request, $service) {
            $job = DB::table('service_jobs')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->where('service_jobs.job_id', $service)
                ->where('service_jobs.shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->first();

            abort_if(! $job, 404, 'Service job not found.');
            $terminalCodes = ['completed', 'cancelled'];
            abort_if(in_array($job->status_code, $terminalCodes), 422, 'Cannot cancel a job that is already completed or cancelled.');

            DB::table('service_jobs')->where('job_id', $service)->update([
                'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'cancelled'),
                'updated_at'               => now(),
            ]);

            $this->log($request, "Cancelled service job #{$service}", 'service_jobs', $service);
        });

        MechanicStatusSync::releaseForJob($service, $this->shopId());

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function addPartToService(Request $request, int $service): JsonResponse
    {
        $data = $request->validate([
            'partId'   => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        abort_unless(
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Service job not found.'
        );

        DB::transaction(function () use ($request, $service, $data) {
            $part = DB::table('parts')
                ->where('part_id', $data['partId'])
                ->where('shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->first();

            abort_if(! $part, 404, 'Part not found.');
            abort_if($part->stock_quantity < $data['quantity'], 422, 'Insufficient stock.');

            DB::table('service_job_parts')->insert([
                'job_id_fk'  => $service,
                'part_id_fk' => $data['partId'],
                'quantity'   => $data['quantity'],
                'unit_price' => $part->unit_price,
                'subtotal'   => $part->unit_price * $data['quantity'],
                'status'     => 'confirmed',
            ]);

            DB::table('parts')->where('part_id', $data['partId'])->update([
                'stock_quantity' => DB::raw('stock_quantity - ' . $data['quantity']),
                'updated_at'     => now(),
            ]);

            DB::table('stock_movements')->insert([
                'part_id_fk'     => $data['partId'],
                'user_id_fk'     => $request->user()->user_id,
                'movement_type'  => 'out',
                'quantity'       => $data['quantity'],
                'reference_type' => 'service_job',
                'reference_id'   => $service,
                'movement_date'  => now(),
                'remarks'        => 'Staff-added to service job #' . $service,
            ]);

            $this->log($request, "Added part {$data['partId']} x{$data['quantity']} to service #{$service}", 'service_job_parts', $service);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function confirmServicePart(Request $request, int $service, int $jobPartId): JsonResponse
    {
        $part = DB::table('service_job_parts')
            ->where('job_part_id', $jobPartId)
            ->where('job_id_fk', $service)
            ->first();

        abort_if(! $part, 404, 'Part not found on this job.');
        abort_if($part->status !== 'requested', 422, 'Part is not in requested status.');

        DB::transaction(function () use ($request, $service, $jobPartId, $part) {
            $inventory = DB::table('parts')
                ->where('part_id', $part->part_id_fk)
                ->lockForUpdate()
                ->first();

            abort_if(! $inventory || $inventory->stock_quantity < $part->quantity, 422, 'Insufficient stock to confirm.');

            DB::table('service_job_parts')
                ->where('job_part_id', $jobPartId)
                ->update(['status' => 'confirmed']);

            DB::table('parts')->where('part_id', $part->part_id_fk)->update([
                'stock_quantity' => DB::raw('stock_quantity - ' . $part->quantity),
                'updated_at'     => now(),
            ]);

            DB::table('stock_movements')->insert([
                'part_id_fk'     => $part->part_id_fk,
                'user_id_fk'     => $request->user()->user_id,
                'movement_type'  => 'out',
                'quantity'       => $part->quantity,
                'reference_type' => 'service_job',
                'reference_id'   => $service,
                'movement_date'  => now(),
                'remarks'        => 'Confirmed mechanic request for service job #' . $service,
            ]);

            $this->log($request, "Confirmed part request #{$jobPartId} on service #{$service}", 'service_job_parts', $jobPartId);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function removeServicePart(Request $request, int $service, int $jobPartId): JsonResponse
    {
        $part = DB::table('service_job_parts')
            ->where('job_part_id', $jobPartId)
            ->where('job_id_fk', $service)
            ->first();

        abort_if(! $part, 404, 'Part not found on this job.');

        DB::transaction(function () use ($request, $service, $jobPartId, $part) {
            DB::table('service_job_parts')->where('job_part_id', $jobPartId)->delete();

            if ($part->status === 'confirmed') {
                DB::table('parts')->where('part_id', $part->part_id_fk)->update([
                    'stock_quantity' => DB::raw('stock_quantity + ' . $part->quantity),
                    'updated_at'     => now(),
                ]);

                DB::table('stock_movements')->insert([
                    'part_id_fk'     => $part->part_id_fk,
                    'user_id_fk'     => $request->user()->user_id,
                    'movement_type'  => 'in',
                    'quantity'       => $part->quantity,
                    'reference_type' => 'service_job',
                    'reference_id'   => $service,
                    'movement_date'  => now(),
                    'remarks'        => 'Removed from service job #' . $service,
                ]);
            }

            $this->log($request, "Removed part #{$jobPartId} from service #{$service}", 'service_job_parts', $jobPartId);
        });

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function assignMechanic(Request $request, int $service): JsonResponse
    {
        $data = $request->validate([
            'mechanicId' => ['required', 'string'],
        ]);

        $mechId = $this->numericId($data['mechanicId']);
        abort_unless(
            DB::table('mechanics')->where('mechanic_id', $mechId)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Mechanic not found.'
        );

        DB::table('service_job_mechanics')->insertOrIgnore([
            'job_id_fk'      => $service,
            'mechanic_id_fk' => $mechId,
            'shop_id_fk'     => $this->shopId(),
            'assigned_at'    => now(),
        ]);

        $this->log($request, "Assigned mechanic {$mechId} to job {$service}", 'service_jobs', $service);

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function removeMechanic(Request $request, int $service, int $mechanic): JsonResponse
    {
        DB::table('service_job_mechanics')
            ->where('job_id_fk', $service)
            ->where('mechanic_id_fk', $mechanic)
            ->delete();

        $this->log($request, "Removed mechanic {$mechanic} from job {$service}", 'service_jobs', $service);

        return response()->json(['data' => $this->serviceById($service)]);
    }

    public function billService(Request $request, int $service): JsonResponse
    {
        $data = $request->validate([
            'paymentMethod' => ['required', Rule::in(['Cash', 'GCash'])],
            'laborCost'     => ['sometimes', 'numeric', 'min:0'],
        ]);

        abort_unless(
            DB::table('service_jobs')->where('job_id', $service)->where('shop_id_fk', $this->shopId())->exists(),
            404,
            'Service job not found.'
        );

        $alreadyBilled = DB::table('sales')->where('job_id_fk', $service)->exists();
        abort_if($alreadyBilled, 422, 'This job has already been billed.');

        $jobStatus = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $service)
            ->value('service_job_statuses.status_code');

        abort_if(
            $jobStatus !== 'work_done',
            422,
            'Only jobs with status Work Done can be billed.'
        );

        $saleId = DB::transaction(function () use ($request, $service, $data) {
            $job = DB::table('service_jobs')->where('job_id', $service)->first();
            $laborItem = DB::table('service_job_items')->where('job_id_fk', $service)->first();
            if (array_key_exists('laborCost', $data)) {
                DB::table('service_job_items')
                    ->where('job_id_fk', $service)
                    ->update(['labor_cost' => $data['laborCost']]);
                $laborCost = (float) $data['laborCost'];
            } else {
                $laborCost = (float) ($laborItem?->labor_cost ?? 0);
            }

            $parts = DB::table('service_job_parts')
                ->where('job_id_fk', $service)
                ->where('status', 'confirmed')
                ->get();
            $partsCost = $parts->sum(fn ($p) => $p->unit_price * $p->quantity);
            $total = $laborCost + $partsCost;

            $saleId = DB::table('sales')->insertGetId([
                'shop_id_fk'      => $this->shopId(),
                'customer_id_fk'  => $job->customer_id_fk,
                'job_id_fk'       => $service,
                'processed_by_fk' => $request->user()->user_id,
                'sale_type'       => 'service+parts',
                'total_amount'    => $total,
                'discount'        => 0,
                'net_amount'      => $total,
                'sale_date'       => now(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            foreach ($parts as $p) {
                DB::table('sale_items')->insert([
                    'sale_id_fk' => $saleId,
                    'part_id_fk' => $p->part_id_fk,
                    'quantity'   => $p->quantity,
                    'unit_price' => $p->unit_price,
                    'subtotal'   => $p->unit_price * $p->quantity,
                ]);
            }

            DB::table('payments')->insert([
                'sale_id_fk'           => $saleId,
                'payment_method'       => $data['paymentMethod'],
                'amount_paid'          => $total,
                'payment_date'         => now(),
                'reference_number'     => null,
                'payment_status_id_fk' => $this->statusId('payment_statuses', 'payment_status_id', 'paid'),
            ]);

            DB::table('service_jobs')->where('job_id', $service)->update([
                'service_job_status_id_fk' => $this->statusId('service_job_statuses', 'service_job_status_id', 'completed'),
                'completion_date'          => now()->toDateString(),
                'updated_at'               => now(),
            ]);

            $this->log($request, "Billed job {$service} → sale {$saleId}", 'sales', $saleId);

            return $saleId;
        });

        MechanicStatusSync::releaseForJob($service, $this->shopId());

        return response()->json(['data' => $this->transactionById($saleId)], 201);
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
            'customerName'     => ['nullable', 'string', 'max:100'],
            'customerId'       => ['nullable', 'integer'],
            'type'             => ['required', Rule::in(['parts-only', 'service+parts'])],
            'items'            => ['array'],
            'items.*.partId'   => ['required'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.price'    => ['required', 'numeric', 'min:0'],
            'serviceId'        => ['nullable'],
            'serviceLaborCost' => ['nullable', 'numeric', 'min:0'],
            'paymentMethod'    => ['required', Rule::in(['Cash', 'GCash'])],
            'total'            => ['required', 'numeric', 'min:0'],
        ]);

        $saleId = DB::transaction(function () use ($request, $data) {
            $jobId = isset($data['serviceId']) ? $this->numericId($data['serviceId']) : null;
            $customerId = null;
            if ($jobId) {
                $customerId = DB::table('service_jobs')->where('job_id', $jobId)->value('customer_id_fk');
            } elseif (!empty($data['customerId'])) {
                $shopId = $this->shopId();
                $exists = DB::table('customers')
                    ->where('customer_id', (int) $data['customerId'])
                    ->where('shop_id_fk', $shopId)
                    ->exists();
                $customerId = $exists ? (int) $data['customerId'] : null;
                if (!$customerId && !empty($data['customerName'])) {
                    $customerId = $this->customerId($data['customerName']);
                }
            } elseif (!empty($data['customerName'])) {
                $customerId = $this->customerId($data['customerName']);
            }
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

    public function paymentDetail(Request $request, $saleId): JsonResponse
    {
        $sale = DB::table('sales')
            ->where('sale_id', $saleId)
            ->where('shop_id_fk', $this->shopId())
            ->first();

        if (!$sale) {
            return response()->json(['error' => 'Transaction not found'], 404);
        }

        $items = DB::table('sale_items')
            ->join('parts', 'parts.part_id', '=', 'sale_items.part_id_fk')
            ->where('sale_items.sale_id_fk', $saleId)
            ->get()
            ->map(fn ($i) => [
                'part_name'  => $i->part_name,
                'quantity'   => (int) $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'subtotal'   => (float) $i->subtotal,
            ])->values();

        $labor = [];
        if ($sale->job_id_fk) {
            $labor = DB::table('service_job_items')
                ->join('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
                ->where('service_job_items.job_id_fk', $sale->job_id_fk)
                ->get()
                ->map(fn ($l) => [
                    'service_name' => $l->service_name,
                    'labor_cost'   => (float) $l->labor_cost,
                ])->values();
        }

        $payment = DB::table('payments')
            ->join('payment_statuses', 'payment_statuses.payment_status_id', '=', 'payments.payment_status_id_fk')
            ->where('payments.sale_id_fk', $saleId)
            ->select('payments.payment_method', 'payment_statuses.status_name as payment_status', 'payments.payment_date', 'payments.reference_number')
            ->first();

        $mechanics = [];
        if ($sale->job_id_fk) {
            $mechanics = DB::table('service_job_mechanics')
                ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
                ->where('service_job_mechanics.job_id_fk', $sale->job_id_fk)
                ->pluck('mechanics.full_name')
                ->toArray();
        }

        $processedBy = null;
        if ($sale->processed_by_fk) {
            $processedBy = DB::table('users')
                ->where('user_id', $sale->processed_by_fk)
                ->value('full_name');
        }

        $customerName = null;
        if ($sale->customer_id_fk) {
            $customerName = DB::table('customers')
                ->where('customer_id', $sale->customer_id_fk)
                ->value('full_name');
        }

        $shopName = DB::table('shops')
            ->where('shop_id', $this->shopId())
            ->value('shop_name');

        return response()->json([
            'shopName'    => $shopName,
            'sale'        => [
                'sale_id'      => (string) $sale->sale_id,
                'sale_type'    => $sale->sale_type,
                'total_amount' => (float) $sale->total_amount,
                'discount'     => (float) ($sale->discount ?? 0),
                'net_amount'   => (float) $sale->net_amount,
                'sale_date'    => $sale->sale_date,
            ],
            'payment'     => [
                'payment_method'   => $payment?->payment_method,
                'payment_status'   => $payment?->payment_status,
                'payment_date'     => $payment?->payment_date,
                'reference_number' => $payment?->reference_number,
            ],
            'customer'    => $customerName ? ['name' => $customerName] : null,
            'processedBy' => $processedBy,
            'mechanics'   => $mechanics,
            'items'       => $items,
            'labor'       => $labor,
        ]);
    }

    public function users(): JsonResponse
    {
        $memberships = ShopMembership::query()
            ->with(['account.status', 'role', 'status'])
            ->where('shop_id_fk', $this->shopId())
            ->orderBy(Account::query()->select('full_name')->whereColumn('accounts.account_id', 'shop_memberships.account_id_fk'))
            ->get();

        return response()->json(['data' => $memberships->map(fn ($membership) => $this->membershipUserResource($membership))]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:100'],
            'role' => ['required', Rule::in(['Staff', 'Mechanic', 'Customer'])],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $provisioner = app(AccountProvisioner::class);
        $shopId = (int) $this->shopId();
        $existingAccount = $provisioner->findAccountByLogin($data['email']);
        abort_if($existingAccount && $provisioner->membership($existingAccount, $shopId), 422, 'This email already has a user in this shop.');

        $account = $provisioner->createOrUpdateAccount($data['name'], $data['email'], $data['password'], null, ! $existingAccount);
        $membership = $provisioner->createOrUpdateMembership($account, $shopId, $data['role']);
        $user = $provisioner->ensureTenantUser($account, $shopId, $data['role'], $data['password']);

        $this->log($request, 'Created user '.$data['name'].' ('.$data['role'].')', 'users', $user->user_id);

        $this->notifyOwner(
            'new_user',
            'New User Registered',
            "{$data['name']} joined as {$data['role']}.",
            'users',
            $user->user_id
        );

        return response()->json(['data' => $this->membershipUserResource($membership)], 201);
    }

    public function updateUser(Request $request, int $user): JsonResponse
    {
        $target = User::query()->where('user_id', $user)->where('shop_id_fk', $this->shopId())->firstOrFail();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'max:100'],
            'role' => ['sometimes', Rule::in(['Staff', 'Mechanic', 'Customer'])],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $provisioner = app(AccountProvisioner::class);
        $account = $target->account ?: Account::query()->findOrFail($target->account_id_fk);
        $shopId = (int) $this->shopId();

        if (array_key_exists('email', $data)) {
            $existing = $provisioner->findAccountByLogin($data['email']);
            abort_if($existing && (int) $existing->account_id !== (int) $account->account_id && $provisioner->membership($existing, $shopId), 422, 'This email already has a user in this shop.');
            $account->email = strtolower($data['email']);
        }

        if (array_key_exists('name', $data)) $account->full_name = $data['name'];
        if (! empty($data['password'])) $account->password_hash = Hash::make($data['password']);
        $account->save();

        $membership = $provisioner->membership($account, $shopId);
        if (array_key_exists('role', $data)) {
            $membership = $provisioner->createOrUpdateMembership($account, $shopId, $data['role']);
        }

        $provisioner->ensureTenantUser($account->fresh(), $shopId, (int) $membership->role_id_fk, $data['password'] ?? null);
        $this->log($request, 'Updated user #'.$user, 'users', $user);

        return response()->json(['data' => $this->membershipUserResource($membership->fresh(['account.status', 'role', 'status']))]);
    }

    public function updateUserStatus(Request $request, int $user): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['Active', 'Inactive'])]]);
        abort_if($request->user()->user_id === $user, 422, 'You cannot disable your own account.');

        $target = User::query()->where('user_id', $user)->where('shop_id_fk', $this->shopId())->firstOrFail();
        $membership = app(AccountProvisioner::class)->membership((int) $target->account_id_fk, (int) $this->shopId());
        abort_if(! $membership, 404, 'User not found.');

        DB::table('shop_memberships')->where('membership_id', $membership->membership_id)->update([
            'membership_status_id_fk' => (int) DB::table('membership_statuses')->where('status_code', strtolower($data['status']))->value('membership_status_id'),
            'updated_at' => now(),
        ]);
        DB::table('users')->where('user_id', $user)->update([
            'user_status_id_fk' => $this->statusId('user_statuses', 'user_status_id', strtolower($data['status'])),
            'updated_at' => now(),
        ]);
        $this->log($request, 'Set user #'.$user.' status to '.$data['status'], 'users', $user);

        return response()->json(['data' => $this->membershipUserResource($membership->fresh(['account.status', 'role', 'status']))]);
    }

    public function deleteUser(Request $request, int $user): JsonResponse
    {
        abort_if($request->user()->user_id === $user, 422, 'You cannot delete your own account.');
        $target = User::query()->where('user_id', $user)->where('shop_id_fk', $this->shopId())->firstOrFail();
        DB::table('shop_memberships')->where('account_id_fk', $target->account_id_fk)->where('shop_id_fk', $this->shopId())->delete();
        DB::table('users')->where('user_id', $user)->where('shop_id_fk', $this->shopId())->delete();
        $this->log($request, 'Deleted user #'.$user, 'users', $user);

        return response()->json(['message' => 'User deleted.']);
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $query = DB::table('activity_logs')
            ->leftJoin('users', 'users.user_id', '=', 'activity_logs.user_id_fk')
            ->where('activity_logs.shop_id_fk', $this->shopId());

        if ($from = $request->query('from')) {
            $query->where('log_date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('log_date', '<=', $to . ' 23:59:59');
        }

        $query->orderByDesc('log_date');

        $result = $this->paginateOrLimit($query, 50);

        $result['data'] = collect($result['data'])->map(fn ($row) => [
            'id' => (string) $row->log_id,
            'user' => $row->full_name ?? 'System',
            'action' => $row->action,
            'timestamp' => $this->iso($row->log_date),
        ])->values();

        return response()->json($result);
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

    public function dashboardStats(): JsonResponse
    {
        $shopId = $this->shopId();

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

        // Inventory metrics with category
        $allParts = DB::table('parts')
            ->join('categories', 'categories.category_id', '=', 'parts.category_id_fk')
            ->where('parts.shop_id_fk', $shopId)
            ->select('parts.*', 'categories.category_name')
            ->get();
        $lowStockParts = $allParts->filter(fn($p) => $p->stock_quantity <= $p->reorder_level);
        $inventoryHealth = $allParts->count() > 0 
            ? (($allParts->count() - $lowStockParts->count()) / $allParts->count()) * 100 
            : 100;

        $inventoryValue = $allParts->sum(fn($p) => $p->stock_quantity * $p->unit_price);

        // Low stock with urgency levels and category
        $lowStockWithUrgency = $lowStockParts->map(function($part) {
            $urgency = $part->stock_quantity === 0 ? 'critical' 
                : ($part->stock_quantity <= $part->reorder_level / 2 ? 'high' : 'medium');
            return [
                'part_id' => $part->part_id,
                'part_name' => $part->part_name,
                'category' => $part->category_name,
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

        // 30-day charts
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
                'revenue_sparkline_7d' => $revenueSparkline,
                'parts_usage_sparkline_7d' => $partsUsageSparkline,
            ],
            'low_stock' => $lowStockWithUrgency,
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $query = DB::table('customers')
            ->where('shop_id_fk', $this->shopId());

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');

        $result = $this->paginateOrLimit($query, 25);

        $result['data'] = collect($result['data'])->map(fn ($row) => [
            'id' => (string) $row->customer_id,
            'name' => $row->full_name,
            'phone' => $row->phone,
            'email' => $row->email,
            'address' => $row->address,
            'createdAt' => $this->iso($row->created_at),
        ])->values();

        return response()->json($result);
    }

    public function storeCustomer(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $id = DB::table('customers')->insertGetId([
            'shop_id_fk' => $this->shopId(),
            'full_name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->log($request, 'Created customer', 'customers', $id);

        $customer = DB::table('customers')->where('customer_id', $id)->first();
        return response()->json([
            'id' => (string) $customer->customer_id,
            'name' => $customer->full_name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'address' => $customer->address,
            'createdAt' => $this->iso($customer->created_at),
        ], 201);
    }

    public function searchCustomers(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 1) {
            return response()->json(['data' => []]);
        }

        $rows = DB::table('customers')
            ->where('shop_id_fk', $this->shopId())
            ->where('full_name', 'like', '%'.$q.'%')
            ->orderBy('full_name')
            ->limit(10)
            ->get(['customer_id', 'full_name', 'phone', 'email']);

        return response()->json(['data' => $rows->map(fn ($r) => [
            'id'    => (string) $r->customer_id,
            'name'  => $r->full_name,
            'phone' => $r->phone ?? null,
            'email' => $r->email ?? null,
        ])]);
    }

    public function updateCustomer(Request $request, $customerId): JsonResponse
    {
        $customer = DB::table('customers')
            ->where('customer_id', $customerId)
            ->where('shop_id_fk', $this->shopId())
            ->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        DB::table('customers')->where('customer_id', $customerId)->update([
            'full_name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'updated_at' => now(),
        ]);

        $this->log($request, 'Updated customer', 'customers', (int) $customerId);

        return response()->json([
            'id' => (string) $customer->customer_id,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'createdAt' => $this->iso($customer->created_at),
        ]);
    }

    public function manageMechanics(Request $request): JsonResponse
    {
        $query = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanics.shop_id_fk', $this->shopId());

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('mechanics.full_name', 'like', "%{$search}%")
                  ->orWhere('mechanics.phone', 'like', "%{$search}%")
                  ->orWhere('mechanics.email', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('mechanics.created_at');

        $result = $this->paginateOrLimit($query, 25);

        $result['data'] = collect($result['data'])->map(fn ($row) => [
            'id' => (string) $row->mechanic_id,
            'name' => $row->full_name,
            'phone' => $row->phone,
            'email' => $row->email,
            'address' => $row->address,
            'status' => $row->status_name,
            'statusCode' => $row->status_code,
            'createdAt' => $this->iso($row->created_at),
        ])->values();

        return response()->json($result);
    }

    public function storeMechanic(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $activeStatusId = DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');

        $id = DB::table('mechanics')->insertGetId([
            'shop_id_fk' => $this->shopId(),
            'full_name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'mechanic_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->log($request, 'Created mechanic', 'mechanics', $id);

        return response()->json([
            'id' => (string) $id,
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'status' => 'Available',
            'statusCode' => 'available',
            'createdAt' => now()->toISOString(),
        ], 201);
    }

    public function updateMechanic(Request $request, $mechanicId): JsonResponse
    {
        $mechanic = DB::table('mechanics')
            ->where('mechanic_id', $mechanicId)
            ->where('shop_id_fk', $this->shopId())
            ->first();

        if (!$mechanic) {
            return response()->json(['error' => 'Mechanic not found'], 404);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'statusCode' => ['nullable', 'string', 'in:active,inactive'],
        ]);

        $update = [
            'full_name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'updated_at' => now(),
        ];

        if ($request->has('statusCode')) {
            $statusId = DB::table('mechanic_statuses')->where('status_code', $request->statusCode)->value('mechanic_status_id');
            if ($statusId) {
                $update['mechanic_status_id_fk'] = $statusId;
            }
        }

        DB::table('mechanics')->where('mechanic_id', $mechanicId)->update($update);
        $this->log($request, 'Updated mechanic', 'mechanics', (int) $mechanicId);

        $updated = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanic_id', $mechanicId)
            ->first();

        return response()->json([
            'id' => (string) $updated->mechanic_id,
            'name' => $updated->full_name,
            'phone' => $updated->phone,
            'email' => $updated->email,
            'address' => $updated->address,
            'status' => $updated->status_name,
            'statusCode' => $updated->status_code,
            'createdAt' => $this->iso($mechanic->created_at),
        ]);
    }

    public function deleteMechanic(Request $request, $mechanicId): JsonResponse
    {
        $mechanic = DB::table('mechanics')
            ->where('mechanic_id', $mechanicId)
            ->where('shop_id_fk', $this->shopId())
            ->first();

        if (!$mechanic) {
            return response()->json(['error' => 'Mechanic not found'], 404);
        }

        DB::table('mechanics')->where('mechanic_id', $mechanicId)->delete();
        $this->log($request, 'Deleted mechanic', 'mechanics', (int) $mechanicId);

        return response()->json(['message' => 'Mechanic deleted']);
    }

    public function deleteCustomer(Request $request, $customerId): JsonResponse
    {
        $customer = DB::table('customers')
            ->where('customer_id', $customerId)
            ->where('shop_id_fk', $this->shopId())
            ->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        DB::table('customers')->where('customer_id', $customerId)->delete();
        $this->log($request, 'Deleted customer', 'customers', (int) $customerId);

        return response()->json(['message' => 'Customer deleted']);
    }

    public function notifications(Request $request): JsonResponse
    {
        $userId = auth()->user()->user_id;

        $query = DB::table('notifications')
            ->where('user_id_fk', $userId)
            ->orderByDesc('created_at');

        $unreadCount = (clone $query)->where('is_read', 0)->count();

        $result = $this->paginateOrLimit($query, 20);

        $result['data'] = collect($result['data'])->map(fn ($row) => [
            'id' => (string) $row->notification_id,
            'title' => $row->title,
            'message' => $row->message,
            'notification_type' => $row->notification_type,
            'is_read' => (bool) $row->is_read,
            'created_at' => $this->iso($row->created_at),
        ])->values();

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAllNotificationsRead(): JsonResponse
    {
        $userId = auth()->user()->user_id;

        DB::table('notifications')
            ->where('user_id_fk', $userId)
            ->update(['is_read' => 1]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function markNotificationRead($notificationId): JsonResponse
    {
        $userId = auth()->user()->user_id;

        DB::table('notifications')
            ->where('user_id_fk', $userId)
            ->where('notification_id', $notificationId)
            ->update(['is_read' => 1]);

        return response()->json(['message' => 'Notification marked as read']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = auth()->user();
        $dbUser = DB::table('users')->where('user_id', $user->user_id)->first();

        if (!Hash::check($request->current_password, $dbUser->password_hash)) {
            return response()->json(['error' => 'Current password is incorrect'], 422);
        }

        DB::table('users')->where('user_id', $user->user_id)->update([
            'password_hash' => Hash::make($request->new_password),
            'updated_at'    => now(),
        ]);

        $this->log($request, 'Changed password');

        return response()->json(['message' => 'Password updated successfully']);
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
            ->leftJoin('mechanics as preferred_mech', 'preferred_mech.mechanic_id', '=', 'service_jobs.assigned_mechanic_id_fk')
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost', 'preferred_mech.full_name as preferred_mech_name')
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

    private function serviceResource(object $row, ?int $queuePosition = null): array
    {
        $allParts = DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->leftJoin('users', 'users.user_id', '=', 'service_job_parts.requested_by_fk')
            ->where('service_job_parts.job_id_fk', $row->job_id)
            ->select(
                'service_job_parts.job_part_id',
                'service_job_parts.part_id_fk',
                'service_job_parts.quantity',
                'service_job_parts.unit_price',
                'service_job_parts.status',
                'service_job_parts.requested_by_fk',
                'parts.part_name',
                'users.full_name as requester_name',
            )
            ->get();

        $partsUsed = $allParts
            ->where('status', 'confirmed')
            ->map(fn ($p) => [
                'jobPartId' => (string) $p->job_part_id,
                'partId'    => (string) $p->part_id_fk,
                'name'      => $p->part_name,
                'quantity'  => (int) $p->quantity,
                'unitPrice' => (float) $p->unit_price,
                'status'    => $p->status,
            ])
            ->values();

        $partRequests = $allParts
            ->where('status', 'requested')
            ->map(fn ($p) => [
                'jobPartId'   => (string) $p->job_part_id,
                'partId'      => (string) $p->part_id_fk,
                'name'        => $p->part_name,
                'quantity'    => (int) $p->quantity,
                'unitPrice'   => (float) $p->unit_price,
                'requestedBy' => $p->requester_name ?? 'Mechanic',
                'status'      => $p->status,
            ])
            ->values();

        $mechanics = DB::table('service_job_mechanics')
            ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
            ->where('service_job_mechanics.job_id_fk', $row->job_id)
            ->get()
            ->map(fn ($m) => [
                'id'   => (string) $m->mechanic_id_fk,
                'name' => $m->full_name,
            ])
            ->values();

        return [
            'id'              => (string) $row->job_id,
            'customerName'    => $row->customer_name,
            'motorcycleModel' => $row->motorcycle_model ?? '',
            'serviceType'     => $row->service_name ?? 'General Service',
            'laborCost'       => (float) ($row->labor_cost ?? 0),
            'status'          => $this->mapJobStatus($row->status_name),
            'statusCode'      => $row->status_code ?? '',
            'partsUsed'    => $partsUsed,
            'partRequests' => $partRequests,
            'mechanics'       => $mechanics,
            'notes'           => $row->notes ?? '',
            'preferredMechanic' => isset($row->preferred_mech_name) && $row->preferred_mech_name ? [
                'id'   => (string) $row->assigned_mechanic_id_fk,
                'name' => $row->preferred_mech_name,
            ] : null,
            'queuePosition'   => $queuePosition,
            'createdAt'       => $this->iso($row->created_at),
            'completedAt'     => $row->completion_date ? $this->iso($row->completion_date) : null,
        ];
    }

    private function mapJobStatus(string $statusName): string
    {
        return match (strtolower($statusName)) {
            'in_progress', 'ongoing', 'in progress' => 'Ongoing',
            'pending'                                => 'Pending',
            'booked_confirmed', 'confirmed', 'booked & confirmed' => 'Confirmed',
            'work_done'                              => 'Work Done',
            'completed'                              => 'Completed',
            'cancelled'                              => 'Cancelled',
            default                                  => $statusName,
        };
    }

    private function partResource(object $part): array
    {
        return [
            'id'        => (string) $part->part_id,
            'name'      => $part->part_name,
            'brand'     => $part->brand ?? null,
            'partCode'  => $part->part_code ?? null,
            'category'  => $part->category_name,
            'stock'     => (int) $part->stock_quantity,
            'minStock'  => (int) $part->reorder_level,
            'price'     => (float) $part->unit_price,
            'barcode'   => $part->barcode ?? '',
            'imageUrl'  => isset($part->image_path) && $part->image_path
                            ? Storage::disk('public')->url($part->image_path)
                            : null,
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
            'email' => $user->email ?? $user->username,
            'role' => $user->role?->role_name,
            'status' => $user->status?->status_name,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function membershipUserResource(ShopMembership $membership): array
    {
        $userId = DB::table('users')
            ->where('account_id_fk', $membership->account_id_fk)
            ->where('shop_id_fk', $membership->shop_id_fk)
            ->value('user_id');

        return [
            'id' => (string) $userId,
            'name' => $membership->account?->full_name,
            'email' => $membership->account?->email,
            'role' => $membership->role?->role_name,
            'status' => $membership->status?->status_name,
            'lastActive' => optional($membership->updated_at)->toISOString(),
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

    private function syncServiceJobParts(int $jobId, array $partsUsed, int $userId): void
    {
        $desiredParts = $this->normalizeServiceParts($partsUsed);

        $existingParts = DB::table('service_job_parts')
            ->where('job_id_fk', $jobId)
            ->selectRaw('part_id_fk, SUM(quantity) as quantity')
            ->groupBy('part_id_fk')
            ->pluck('quantity', 'part_id_fk')
            ->map(fn ($quantity) => (int) $quantity)
            ->all();

        $partIds = array_values(array_unique(array_map(
            'intval',
            array_merge(array_keys($existingParts), array_keys($desiredParts)),
        )));

        foreach ($partIds as $partId) {
            $existingQty = (int) ($existingParts[$partId] ?? 0);
            $desiredQty = (int) ($desiredParts[$partId] ?? 0);
            $delta = $desiredQty - $existingQty;

            if ($delta === 0) {
                continue;
            }

            $part = DB::table('parts')
                ->where('part_id', $partId)
                ->where('shop_id_fk', $this->shopId())
                ->lockForUpdate()
                ->first();

            if (! $part) {
                abort(422, "Part #{$partId} is not available in this shop.");
            }

            if ($delta > 0 && $part->stock_quantity < $delta) {
                abort(response()->json([
                    'message' => 'Insufficient stock for selected parts.',
                    'partId' => (string) $partId,
                    'partName' => $part->part_name,
                    'available' => (int) $part->stock_quantity,
                    'requested' => $desiredQty,
                ], 422));
            }

            $operator = $delta > 0 ? '-' : '+';
            DB::table('parts')
                ->where('part_id', $partId)
                ->update([
                    'stock_quantity' => DB::raw('stock_quantity ' . $operator . ' ' . abs($delta)),
                    'updated_at' => now(),
                ]);

            $this->recordMovement(
                $partId,
                $userId,
                $delta > 0 ? 'out' : 'in',
                abs($delta),
                $delta > 0 ? 'Used in service job #' . $jobId : 'Returned from service job #' . $jobId,
                'service_job',
                $jobId,
            );
        }

        DB::table('service_job_parts')->where('job_id_fk', $jobId)->delete();

        foreach ($desiredParts as $partId => $quantity) {
            $part = DB::table('parts')
                ->where('part_id', $partId)
                ->where('shop_id_fk', $this->shopId())
                ->first();

            if (! $part) {
                continue;
            }

            DB::table('service_job_parts')->insert([
                'job_id_fk' => $jobId,
                'part_id_fk' => $partId,
                'quantity' => $quantity,
                'unit_price' => $part->unit_price,
                'subtotal' => $part->unit_price * $quantity,
            ]);
        }
    }

    private function normalizeServiceParts(array $partsUsed): array
    {
        $normalized = [];

        foreach ($partsUsed as $used) {
            $partId = $this->numericId($used['partId'] ?? null);
            $quantity = (int) ($used['quantity'] ?? 0);

            if ($partId === 0 || $quantity <= 0) {
                continue;
            }

            $normalized[$partId] = ($normalized[$partId] ?? 0) + $quantity;
        }

        return $normalized;
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
        $this->logActivity(
            $request->user()?->user_id,
            $this->shopId(),
            mb_substr($action, 0, 100),
            $table,
            $recordId,
            $request->user()?->account_id_fk
        );
    }

    private function notifyOwner(string $type, string $title, string $message, ?string $refType = null, ?int $refId = null): void
    {
        $shopId = $this->shopId();
        $ownerId = DB::table('shop_memberships')
            ->join('roles', 'roles.role_id', '=', 'shop_memberships.role_id_fk')
            ->where('shop_memberships.shop_id_fk', $shopId)
            ->where('roles.role_name', 'Owner')
            ->value('shop_memberships.user_id_fk');

        if (!$ownerId) return;

        DB::table('notifications')->insert([
            'user_id_fk' => $ownerId,
            'notification_type' => $type,
            'title' => $title,
            'message' => $message,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'is_read' => 0,
            'created_at' => now(),
        ]);
    }

    private function shopId(): ?int
    {
        $user = request()->user();

        if (! $user) {
            abort(401, 'Unauthenticated');
        }

        $authContext = app(AuthenticatedContext::class);

        // SuperAdmin can see all shops
        if ($authContext->isPlatformAdmin(request())) {
            return null;
        }

        $resolvedTenantId = $this->tenantManager()->id();
        if ($resolvedTenantId) {
            return $resolvedTenantId;
        }

        $membership = $authContext->membership(request());
        if ($membership) {
            return (int) $membership->shop_id_fk;
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
            $rows = $query->limit(max(1, min($limit, 500)))->get();
            return ['data' => $rows, 'meta' => null];
        }

        $perPage = max(1, min((int) $request->query('per_page', $defaultPerPage), 500));
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

    public function lookupBarcode($barcode)
    {
        $barcode_record = \App\Models\PartBarcode::where('barcode_value', $barcode)
            ->where('shop_id_fk', auth()->user()->shop_id_fk)
            ->with('part')
            ->first();

        if (!$barcode_record) {
            return response()->json([
                'status' => 'not_found',
                'message' => 'No part found for barcode',
            ], 404);
        }

        $part = $barcode_record->part;
        $allBarcodes = \App\Models\PartBarcode::where('part_id', $part->id)
            ->where('shop_id_fk', auth()->user()->shop_id_fk)
            ->select('id', 'barcode_value', 'barcode_type', 'is_primary')
            ->get();

        return response()->json([
            'status' => 'found',
            'part' => [
                'id' => $part->id,
                'brand' => $part->brand ?? '',
                'part_code' => $part->part_code ?? '',
                'description' => $part->description ?? '',
                'category' => $part->category?->category_name ?? '',
                'price' => $part->unit_price ?? 0,
                'stock_quantity' => $part->stock_quantity ?? 0,
            ],
            'barcodes' => $allBarcodes,
        ]);
    }

    public function linkBarcode(\App\Http\Requests\LinkBarcodeRequest $request)
    {
        $shop_id = auth()->user()->shop_id_fk;

        $existing = \App\Models\PartBarcode::where('barcode_value', $request->barcode_value)
            ->where('shop_id_fk', $shop_id)
            ->first();

        if ($existing && $existing->part_id !== $request->part_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'This barcode is already linked to another part.',
                'linked_part' => [
                    'id' => $existing->part->id,
                    'part_code' => $existing->part->part_code,
                    'description' => $existing->part->description,
                ],
            ], 409);
        }

        if ($existing && $existing->part_id === $request->part_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'This barcode is already linked to this part.',
            ], 409);
        }

        $barcode = \App\Models\PartBarcode::create([
            'part_id' => $request->part_id,
            'barcode_value' => $request->barcode_value,
            'barcode_type' => $request->barcode_type,
            'shop_id_fk' => $shop_id,
            'is_primary' => false,
        ]);

        $part = \App\Models\Part::find($request->part_id);

        return response()->json([
            'id' => $barcode->id,
            'barcode_value' => $barcode->barcode_value,
            'part_id' => $barcode->part_id,
            'part' => [
                'id' => $part->id,
                'brand' => $part->brand,
                'part_code' => $part->part_code,
                'description' => $part->description,
            ],
            'message' => 'Barcode linked successfully',
        ], 201);
    }

    public function storePartWithBarcode(\App\Http\Requests\StorePartWithBarcodeRequest $request)
    {
        $shop_id = auth()->user()->shop_id_fk;

        $existingBarcode = \App\Models\PartBarcode::where('barcode_value', $request->barcode_value)
            ->where('shop_id_fk', $shop_id)
            ->first();

        if ($existingBarcode) {
            return response()->json([
                'status' => 'error',
                'message' => 'This barcode is already linked to a part.',
                'linked_part' => [
                    'id' => $existingBarcode->part->id,
                    'part_code' => $existingBarcode->part->part_code,
                ],
            ], 409);
        }

        DB::beginTransaction();
        try {
            $part = \App\Models\Part::create([
                'brand' => $request->brand,
                'part_code' => $request->part_code,
                'description' => $request->description,
                'category_id_fk' => $request->category_id_fk,
                'unit_price' => $request->price,
                'stock_quantity' => $request->stock_quantity,
                'shop_id_fk' => $shop_id,
                'part_status_id_fk' => 1,
            ]);

            $barcode = \App\Models\PartBarcode::create([
                'part_id' => $part->id,
                'barcode_value' => $request->barcode_value,
                'barcode_type' => $request->barcode_type,
                'shop_id_fk' => $shop_id,
                'is_primary' => true,
            ]);

            DB::commit();

            return response()->json([
                'part' => [
                    'id' => $part->id,
                    'brand' => $part->brand,
                    'part_code' => $part->part_code,
                    'description' => $part->description,
                    'category_id_fk' => $part->category_id_fk,
                    'price' => $part->unit_price,
                    'stock_quantity' => $part->stock_quantity,
                ],
                'barcode' => [
                    'id' => $barcode->id,
                    'barcode_value' => $barcode->barcode_value,
                    'is_primary' => $barcode->is_primary,
                ],
                'message' => 'Part and barcode created successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create part: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getPartBarcodes($part_id)
    {
        $part = \App\Models\Part::where('id', $part_id)
            ->where('shop_id_fk', auth()->user()->shop_id_fk)
            ->first();

        if (!$part) {
            return response()->json(['message' => 'Part not found'], 404);
        }

        $barcodes = \App\Models\PartBarcode::where('part_id', $part_id)
            ->where('shop_id_fk', auth()->user()->shop_id_fk)
            ->select('id', 'barcode_value', 'barcode_type', 'is_primary', 'created_at')
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'part' => [
                'id' => $part->id,
                'part_code' => $part->part_code,
                'description' => $part->description,
            ],
            'barcodes' => $barcodes,
        ]);
    }

    private function iso(mixed $value): ?string
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->toISOString() : null;
    }
}
