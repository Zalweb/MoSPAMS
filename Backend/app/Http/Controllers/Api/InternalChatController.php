<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use App\Models\Part;
use App\Models\Sale;
use App\Models\ServiceJob;
use App\Models\ServiceType;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class InternalChatController extends Controller
{
    private function shopId(Request $request): int
    {
        return (int) $request->header('X-Shop-Id');
    }

    public function lowStockParts(Request $request)
    {
        $shopId = $this->shopId($request);
        $parts = Part::where('shop_id_fk', $shopId)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->get(['part_name', 'brand', 'stock_quantity', 'reorder_level', 'unit_price']);
        return response()->json($parts);
    }

    public function revenue(Request $request)
    {
        $shopId = $this->shopId($request);
        $from   = $request->query('from_date');
        $to     = $request->query('to_date');
        $query  = Sale::where('shop_id_fk', $shopId);
        if ($from) $query->whereDate('sale_date', '>=', $from);
        if ($to)   $query->whereDate('sale_date', '<=', $to);
        $total = $query->sum('net_amount');
        $count = $query->count();
        return response()->json(['total_revenue' => $total, 'transaction_count' => $count]);
    }

    public function serviceJobs(Request $request)
    {
        $shopId    = $this->shopId($request);
        $statusMap = ['pending' => 1, 'in_progress' => 2, 'completed' => 3];
        $query = ServiceJob::where('shop_id_fk', $shopId)
            ->with('customer:customer_id,full_name');
        if ($status = $request->query('status')) {
            $statusId = $statusMap[$status] ?? null;
            if ($statusId) $query->where('service_job_status_id_fk', $statusId);
        }
        if ($from = $request->query('from_date')) {
            $query->whereDate('job_date', '>=', $from);
        }
        return response()->json($query->latest('job_date')->limit(20)->get());
    }

    public function mechanicPerformance(Request $request)
    {
        $shopId = $this->shopId($request);
        $data = DB::table('mechanics')
            ->leftJoin('service_job_mechanics', function ($join) use ($shopId) {
                $join->on('service_job_mechanics.mechanic_id_fk', '=', 'mechanics.mechanic_id')
                     ->where('service_job_mechanics.shop_id_fk', $shopId);
            })
            ->leftJoin('service_jobs', function ($join) {
                $join->on('service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
                     ->whereIn('service_jobs.service_job_status_id_fk', [3, 6]);
            })
            ->where('mechanics.shop_id_fk', $shopId)
            ->select('mechanics.mechanic_id', 'mechanics.full_name',
                     DB::raw('COUNT(service_jobs.job_id) as completed_jobs'))
            ->groupBy('mechanics.mechanic_id', 'mechanics.full_name')
            ->orderByDesc('completed_jobs')
            ->get();
        return response()->json($data);
    }

    public function recentSales(Request $request)
    {
        $shopId = $this->shopId($request);
        $limit  = (int) $request->query('limit', 5);
        $sales  = Sale::where('shop_id_fk', $shopId)
            ->latest('sale_date')
            ->limit($limit)
            ->get(['sale_id', 'sale_type', 'total_amount', 'net_amount', 'sale_date']);
        return response()->json($sales);
    }

    public function topParts(Request $request)
    {
        $shopId = $this->shopId($request);
        $limit  = (int) $request->query('limit', 5);
        $parts = DB::table('sale_items')
            ->join('parts', 'sale_items.part_id_fk', '=', 'parts.part_id')
            ->join('sales', 'sale_items.sale_id_fk', '=', 'sales.sale_id')
            ->where('sales.shop_id_fk', $shopId)
            ->select('parts.part_name', DB::raw('SUM(sale_items.quantity) as total_sold'))
            ->groupBy('parts.part_id', 'parts.part_name')
            ->orderByDesc('total_sold')
            ->limit($limit)
            ->get();
        return response()->json($parts);
    }

    public function customerCount(Request $request)
    {
        $shopId = $this->shopId($request);
        $count  = Customer::where('shop_id_fk', $shopId)->count();
        return response()->json(['total_customers' => $count]);
    }

    public function customerSearch(Request $request)
    {
        $shopId  = $this->shopId($request);
        $q       = $request->query('query', '');
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where(fn($qb) => $qb->where('full_name', 'like', "%{$q}%")
                                  ->orWhere('email', 'like', "%{$q}%"))
            ->with(['serviceJobs' => fn($qb) => $qb->latest('job_date')->limit(5)])
            ->first();
        return response()->json($customer);
    }

    public function customerServices(Request $request, int $userId)
    {
        $shopId   = $this->shopId($request);
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->firstOrFail();
        $jobs = ServiceJob::where('shop_id_fk', $shopId)
            ->where('customer_id_fk', $customer->customer_id)
            ->latest('job_date')
            ->limit(10)
            ->get(['job_id', 'motorcycle_model', 'job_date', 'completion_date', 'notes', 'service_job_status_id_fk']);
        return response()->json($jobs);
    }

    public function customerPayments(Request $request, int $userId)
    {
        $shopId   = $this->shopId($request);
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->firstOrFail();
        $payments = Sale::where('shop_id_fk', $shopId)
            ->where('customer_id_fk', $customer->customer_id)
            ->latest('sale_date')
            ->limit(10)
            ->get(['sale_id', 'sale_type', 'total_amount', 'net_amount', 'sale_date']);
        return response()->json($payments);
    }

    public function serviceTypes(Request $request)
    {
        $shopId = $this->shopId($request);
        $types  = ServiceType::where('shop_id_fk', $shopId)
            ->get(['service_type_id', 'service_name', 'description', 'labor_cost', 'estimated_duration']);
        return response()->json($types);
    }

    public function shopInfo(Request $request)
    {
        $shopId = $this->shopId($request);
        $shop   = Shop::findOrFail($shopId);
        return response()->json([
            'name'           => $shop->shop_name,
            'address'        => $shop->address ?? '',
            'phone'          => $shop->phone ?? '',
            'email'          => $shop->email ?? '',
            'business_hours' => $shop->business_hours ?? '',
        ]);
    }

    public function createServiceRequest(Request $request)
    {
        $shopId   = $this->shopId($request);
        $data     = $request->json()->all();
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $data['user_id'])
            ->firstOrFail();
        $job = ServiceJob::create([
            'shop_id_fk'               => $shopId,
            'customer_id_fk'           => $customer->customer_id,
            'created_by_fk'            => $data['user_id'],
            'service_job_status_id_fk' => 1,
            'motorcycle_model'         => $data['motorcycle_model'],
            'job_date'                 => $data['job_date'],
            'notes'                    => $data['notes'] ?? null,
        ]);
        return response()->json($job, 201);
    }

    public function cancelServiceRequest(Request $request, int $jobId)
    {
        $shopId = $this->shopId($request);
        $job = ServiceJob::where('shop_id_fk', $shopId)
            ->where('job_id', $jobId)
            ->firstOrFail();
        if ($job->service_job_status_id_fk !== 1) {
            return response()->json(['error' => 'Only pending jobs can be cancelled via chat.'], 422);
        }
        $job->update(['service_job_status_id_fk' => 5]);
        return response()->json(['cancelled' => true, 'job_id' => $jobId]);
    }

    public function createVehicle(Request $request)
    {
        $shopId   = $this->shopId($request);
        $data     = $request->json()->all();
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $data['user_id'])
            ->firstOrFail();
        $vehicleId = DB::table('customer_vehicles')->insertGetId([
            'shop_id_fk'     => $shopId,
            'customer_id_fk' => $customer->customer_id,
            'make'           => $data['make'],
            'model'          => $data['model'],
            'year'           => $data['year'],
            'plate_number'   => $data['plate_number'],
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
        $vehicle = DB::table('customer_vehicles')->where('vehicle_id', $vehicleId)->first();
        return response()->json($vehicle, 201);
    }
}
