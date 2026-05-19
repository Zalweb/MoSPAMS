<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use App\Models\Part;
use App\Models\Sale;
use App\Models\ServiceJob;
use App\Models\ServiceType;
use App\Models\Shop;
use App\Models\User;
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
        $statusMap = ['pending' => 1, 'in_progress' => 2, 'completed' => 3, 'cancelled' => 4, 'booked' => 5, 'work_done' => 6];
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

    public function mechanicJobs(Request $request, int $userId)
    {
        $shopId    = $this->shopId($request);
        $mechanic  = DB::table('mechanics')
            ->where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->first();
        if (!$mechanic) {
            return response()->json(['error' => 'Mechanic not found'], 404);
        }
        $jobs = DB::table('service_job_mechanics')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', $mechanic->mechanic_id)
            ->where('service_job_mechanics.shop_id_fk', $shopId)
            ->select('service_jobs.job_id', 'service_jobs.motorcycle_model',
                     'service_jobs.job_date', 'service_jobs.service_job_status_id_fk', 'service_jobs.notes')
            ->orderByDesc('service_jobs.job_date')
            ->get();
        return response()->json($jobs);
    }

    public function customerProfile(Request $request, int $userId)
    {
        $shopId   = $this->shopId($request);
        $customer = Customer::where('shop_id_fk', $shopId)
            ->where('user_id_fk', $userId)
            ->firstOrFail();
        return response()->json([
            'full_name' => $customer->full_name,
            'email'     => $customer->email,
            'phone'     => $customer->phone ?? '',
            'address'   => $customer->address ?? '',
        ]);
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

    // ──────────────────────────────────────────────────────────────────
    // Universal DB operation endpoint — replaces all individual tools
    // ──────────────────────────────────────────────────────────────────

    public function dbOperation(Request $request)
    {
        $shopId   = $this->shopId($request);
        $role     = strtolower($request->header('X-User-Role', 'customer'));
        $userId   = (int) $request->header('X-User-Id', 0);
        $body     = $request->json()->all();

        $action   = $body['action']    ?? 'list';
        $entity   = $body['entity']    ?? '';
        $filters  = (array)($body['filters']   ?? []);
        $data     = (array)($body['data']      ?? []);
        $recordId = $body['record_id'] ?? null;
        $limit    = min((int)($body['limit']   ?? 20), 100);
        $orderBy  = $body['order_by']  ?? null;

        if ($action === 'delete') {
            return response()->json(['error' => 'Delete operations are not permitted.'], 403);
        }

        $readAccess = match($role) {
            'owner'    => ['customers','service_jobs','parts','mechanics','sales','service_types','shop','user_profile','job_parts'],
            'staff'    => ['customers','service_jobs','parts','mechanics','service_types','shop','user_profile','job_parts'],
            'mechanic' => ['service_jobs','user_profile','job_parts'],
            default    => ['service_jobs','service_types','shop','user_profile','payments','job_parts'],
        };
        $writeAccess = match($role) {
            'owner'    => ['customers','service_jobs','parts','service_types','shop'],
            'staff'    => ['service_jobs'],
            'mechanic' => ['service_jobs'],
            default    => ['service_jobs'],
        };

        $allowed = in_array($action, ['create','update']) ? $writeAccess : $readAccess;
        if (!in_array($entity, $allowed)) {
            return response()->json(['error' => "Access denied: {$role} cannot {$action} {$entity}."], 403);
        }

        return match($entity) {
            'customers'     => $this->opCustomers($action, $shopId, $filters, $data, $recordId, $limit, $orderBy),
            'service_jobs'  => $this->opServiceJobs($action, $shopId, $role, $userId, $filters, $data, $recordId, $limit, $orderBy),
            'parts'         => $this->opParts($action, $shopId, $filters, $data, $recordId, $limit, $orderBy),
            'mechanics'     => $this->opMechanics($action, $shopId, $filters, $recordId, $limit, $orderBy),
            'sales'         => $this->opSales($action, $shopId, $filters, $recordId, $limit, $orderBy),
            'service_types' => $this->opServiceTypes($action, $shopId, $filters, $data, $recordId, $limit),
            'shop'          => $this->opShop($action, $shopId, $role, $data),
            'user_profile'  => $this->opUserProfile($shopId, $userId),
            'payments'      => $this->opPayments($shopId, $userId, $filters, $limit),
            'job_parts'     => $this->opJobParts($shopId, $filters, $recordId, $limit),
            default         => response()->json(['error' => "Unknown entity: {$entity}"], 400),
        };
    }

    private function applyOrder($query, ?string $orderBy, array $allowed)
    {
        if (!$orderBy) return $query;
        $parts = explode(' ', trim($orderBy), 2);
        $col   = $parts[0];
        $dir   = strtolower($parts[1] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        return in_array($col, $allowed) ? $query->orderBy($col, $dir) : $query;
    }

    private function safe(array $data, array $whitelist): array
    {
        return array_intersect_key($data, array_flip($whitelist));
    }

    private function statusId(string $name): ?int
    {
        return match(strtolower(str_replace(' ', '_', $name))) {
            'pending'      => 1,
            'in_progress'  => 2,
            'completed'    => 3,
            'cancelled'    => 4,
            'booked', 'booked_confirmed' => 5,
            'work_done'    => 6,
            default        => null,
        };
    }

    private function opCustomers(string $action, int $shopId, array $f, array $data, $id, int $limit, ?string $ob)
    {
        $q = Customer::where('shop_id_fk', $shopId);
        if (!empty($f['name']))  $q->where('full_name', 'like', "%{$f['name']}%");
        if (!empty($f['email'])) $q->where('email', 'like', "%{$f['email']}%");
        $q = $this->applyOrder($q, $ob, ['full_name','created_at','email']);

        if ($action === 'count')  return response()->json(['count' => $q->count(), 'entity' => 'customers']);
        if ($action === 'list')   return response()->json($q->limit($limit)->get(['customer_id','full_name','email','phone','address']));
        if ($action === 'get')    return response()->json(Customer::where('shop_id_fk', $shopId)->findOrFail($id));
        if ($action === 'create') {
            $customer = Customer::create(array_merge(
                $this->safe($data, ['full_name','email','phone','address']),
                ['shop_id_fk' => $shopId]
            ));
            return response()->json($customer, 201);
        }
        if ($action === 'update') {
            $customer = Customer::where('shop_id_fk', $shopId)->findOrFail($id);
            $customer->update($this->safe($data, ['full_name','email','phone','address']));
            return response()->json($customer->fresh());
        }
        return response()->json(['error' => 'Invalid action'], 400);
    }

    private function opServiceJobs(string $action, int $shopId, string $role, int $userId, array $f, array $data, $id, int $limit, ?string $ob)
    {
        $q = DB::table('service_jobs')
            ->where('service_jobs.shop_id_fk', $shopId)
            ->leftJoin('service_job_statuses', 'service_jobs.service_job_status_id_fk', '=', 'service_job_statuses.service_job_status_id')
            ->leftJoin('customers', 'service_jobs.customer_id_fk', '=', 'customers.customer_id')
            ->select(
                'service_jobs.job_id',
                'service_jobs.motorcycle_model',
                'service_jobs.job_date',
                'service_jobs.completion_date',
                'service_jobs.notes',
                'service_job_statuses.status_name as status',
                'customers.full_name as customer_name',
                'customers.customer_id'
            );

        // Scope by role
        if ($role === 'mechanic') {
            $mechanic = DB::table('mechanics')->where('shop_id_fk', $shopId)->where('user_id_fk', $userId)->first();
            if (!$mechanic) return response()->json(['error' => 'Mechanic record not found'], 404);
            $q->join('service_job_mechanics', function ($j) use ($mechanic) {
                $j->on('service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
                  ->where('service_job_mechanics.mechanic_id_fk', $mechanic->mechanic_id);
            });
        } elseif ($role === 'customer') {
            $customer = Customer::where('shop_id_fk', $shopId)->where('user_id_fk', $userId)->first();
            if (!$customer) return response()->json(['error' => 'Customer record not found'], 404);
            $q->where('service_jobs.customer_id_fk', $customer->customer_id);
        }

        // Filters
        if (!empty($f['status'])) {
            $sid = $this->statusId($f['status']);
            if ($sid) $q->where('service_jobs.service_job_status_id_fk', $sid);
        }
        if (!empty($f['from_date']))        $q->whereDate('service_jobs.job_date', '>=', $f['from_date']);
        if (!empty($f['to_date']))          $q->whereDate('service_jobs.job_date', '<=', $f['to_date']);
        if (!empty($f['motorcycle_model'])) $q->where('service_jobs.motorcycle_model', 'like', "%{$f['motorcycle_model']}%");
        if (!empty($f['customer_name']))    $q->where('customers.full_name', 'like', "%{$f['customer_name']}%");

        $q = $this->applyOrder($q, $ob ?? 'service_jobs.job_date desc', ['service_jobs.job_date','service_jobs.created_at','customers.full_name']);

        if ($action === 'count') return response()->json(['count' => $q->count(), 'entity' => 'service_jobs']);
        if ($action === 'list')  return response()->json($q->limit($limit)->get());
        if ($action === 'get') {
            $job = DB::table('service_jobs')
                ->where('service_jobs.shop_id_fk', $shopId)
                ->where('service_jobs.job_id', $id)
                ->leftJoin('service_job_statuses', 'service_jobs.service_job_status_id_fk', '=', 'service_job_statuses.service_job_status_id')
                ->leftJoin('customers', 'service_jobs.customer_id_fk', '=', 'customers.customer_id')
                ->select('service_jobs.*', 'service_job_statuses.status_name as status', 'customers.full_name as customer_name')
                ->first();
            return $job ? response()->json($job) : response()->json(['error' => 'Not found'], 404);
        }
        if ($action === 'create') {
            $jobData = $this->safe($data, ['motorcycle_model','job_date','notes']);
            $jobData['shop_id_fk']               = $shopId;
            $jobData['service_job_status_id_fk'] = 1;
            $jobData['created_by_fk']            = $userId;

            if (!empty($data['customer_id'])) {
                $jobData['customer_id_fk'] = (int) $data['customer_id'];
            } elseif (!empty($data['customer_name'])) {
                $c = Customer::where('shop_id_fk', $shopId)->where('full_name', 'like', "%{$data['customer_name']}%")->first();
                if ($c) $jobData['customer_id_fk'] = $c->customer_id;
            } elseif ($role === 'customer') {
                $c = Customer::where('shop_id_fk', $shopId)->where('user_id_fk', $userId)->first();
                if ($c) $jobData['customer_id_fk'] = $c->customer_id;
            }

            $job = ServiceJob::create($jobData);
            return response()->json($job, 201);
        }
        if ($action === 'update') {
            $job = ServiceJob::where('shop_id_fk', $shopId)->findOrFail($id);
            $update = $this->safe($data, ['motorcycle_model','job_date','completion_date','notes']);
            if (!empty($data['status'])) {
                $sid = $this->statusId($data['status']);
                if ($sid) $update['service_job_status_id_fk'] = $sid;
            }
            $job->update($update);
            return response()->json($job->fresh());
        }
        return response()->json(['error' => 'Invalid action'], 400);
    }

    private function opParts(string $action, int $shopId, array $f, array $data, $id, int $limit, ?string $ob)
    {
        $q = Part::where('shop_id_fk', $shopId);
        if (!empty($f['name']))     $q->where('part_name', 'like', "%{$f['name']}%");
        if (!empty($f['brand']))    $q->where('brand', 'like', "%{$f['brand']}%");
        if (!empty($f['category'])) $q->where('category', $f['category']);
        if (!empty($f['low_stock'])) $q->whereColumn('stock_quantity', '<=', 'reorder_level');
        $q = $this->applyOrder($q, $ob, ['part_name','stock_quantity','unit_price','created_at']);

        if ($action === 'count')  return response()->json(['count' => $q->count(), 'entity' => 'parts']);
        if ($action === 'list')   return response()->json($q->limit($limit)->get(['part_id','part_name','brand','category','stock_quantity','reorder_level','unit_price']));
        if ($action === 'get')    return response()->json(Part::where('shop_id_fk', $shopId)->findOrFail($id));
        if ($action === 'create') {
            $part = Part::create(array_merge(
                $this->safe($data, ['part_name','brand','category','stock_quantity','reorder_level','unit_price','description']),
                ['shop_id_fk' => $shopId]
            ));
            return response()->json($part, 201);
        }
        if ($action === 'update') {
            $part = Part::where('shop_id_fk', $shopId)->findOrFail($id);
            $part->update($this->safe($data, ['part_name','brand','category','stock_quantity','reorder_level','unit_price','description']));
            return response()->json($part->fresh());
        }
        return response()->json(['error' => 'Invalid action'], 400);
    }

    private function opMechanics(string $action, int $shopId, array $f, $id, int $limit, ?string $ob)
    {
        $q = DB::table('mechanics')->where('shop_id_fk', $shopId);
        if (!empty($f['name']))         $q->where('full_name', 'like', "%{$f['name']}%");
        if (!empty($f['specialization'])) $q->where('specialization', 'like', "%{$f['specialization']}%");
        if ($ob) {
            $parts = explode(' ', $ob, 2);
            if (in_array($parts[0], ['full_name','created_at'])) $q->orderBy($parts[0], $parts[1] ?? 'asc');
        }

        if ($action === 'count') return response()->json(['count' => $q->count(), 'entity' => 'mechanics']);
        if ($action === 'list')  return response()->json($q->limit($limit)->get(['mechanic_id','full_name','specialization']));
        if ($action === 'get')   return response()->json(DB::table('mechanics')->where('shop_id_fk', $shopId)->where('mechanic_id', $id)->first() ?? response()->json(['error' => 'Not found'], 404));
        return response()->json(['error' => 'Mechanics are read-only'], 400);
    }

    private function opSales(string $action, int $shopId, array $f, $id, int $limit, ?string $ob)
    {
        $q = Sale::where('shop_id_fk', $shopId);
        if (!empty($f['from_date']))  $q->whereDate('sale_date', '>=', $f['from_date']);
        if (!empty($f['to_date']))    $q->whereDate('sale_date', '<=', $f['to_date']);
        if (!empty($f['sale_type']))  $q->where('sale_type', $f['sale_type']);
        if ($ob) {
            $parts = explode(' ', $ob, 2);
            if (in_array($parts[0], ['sale_date','total_amount','net_amount'])) $q->orderBy($parts[0], $parts[1] ?? 'desc');
        } else {
            $q->latest('sale_date');
        }

        if ($action === 'count') return response()->json(['count' => $q->count(), 'total_revenue' => $q->sum('net_amount'), 'entity' => 'sales']);
        if ($action === 'list')  return response()->json($q->limit($limit)->get(['sale_id','sale_type','total_amount','net_amount','sale_date','payment_method']));
        if ($action === 'get')   return response()->json(Sale::where('shop_id_fk', $shopId)->findOrFail($id));
        return response()->json(['error' => 'Sales are read-only'], 400);
    }

    private function opServiceTypes(string $action, int $shopId, array $f, array $data, $id, int $limit)
    {
        $q = ServiceType::where('shop_id_fk', $shopId);
        if (!empty($f['name'])) $q->where('service_name', 'like', "%{$f['name']}%");

        if ($action === 'count')  return response()->json(['count' => $q->count(), 'entity' => 'service_types']);
        if ($action === 'list')   return response()->json($q->limit($limit)->get(['service_type_id','service_name','description','labor_cost','estimated_duration']));
        if ($action === 'get')    return response()->json(ServiceType::where('shop_id_fk', $shopId)->findOrFail($id));
        if ($action === 'create') {
            $st = ServiceType::create(array_merge(
                $this->safe($data, ['service_name','description','labor_cost','estimated_duration']),
                ['shop_id_fk' => $shopId]
            ));
            return response()->json($st, 201);
        }
        if ($action === 'update') {
            $st = ServiceType::where('shop_id_fk', $shopId)->findOrFail($id);
            $st->update($this->safe($data, ['service_name','description','labor_cost','estimated_duration']));
            return response()->json($st->fresh());
        }
        return response()->json(['error' => 'Invalid action'], 400);
    }

    private function opShop(string $action, int $shopId, string $role, array $data)
    {
        $shop = Shop::findOrFail($shopId);
        if ($action === 'update') {
            if ($role !== 'owner') return response()->json(['error' => 'Only the owner can update shop info.'], 403);
            $shop->update($this->safe($data, ['shop_name','address','phone','email','business_hours']));
            return response()->json($shop->fresh());
        }
        return response()->json([
            'shop_name'      => $shop->shop_name,
            'address'        => $shop->address ?? '',
            'phone'          => $shop->phone   ?? '',
            'email'          => $shop->email   ?? '',
            'business_hours' => $shop->business_hours ?? '',
        ]);
    }

    private function opUserProfile(int $shopId, int $userId)
    {
        $user = User::with('role')->find($userId);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }
        return response()->json([
            'full_name' => $user->full_name,
            'username'  => $user->username,
            'email'     => $user->email,
            'role'      => $user->role?->role_name ?? '',
        ]);
    }

    private function opJobParts(int $shopId, array $f, $recordId, int $limit)
    {
        $jobId = $f['job_id'] ?? $recordId ?? null;
        if (!$jobId) {
            return response()->json(['error' => 'job_id filter is required. Example: filters={"job_id": 69}'], 400);
        }
        $exists = DB::table('service_jobs')
            ->where('job_id', $jobId)
            ->where('shop_id_fk', $shopId)
            ->exists();
        if (!$exists) {
            return response()->json(['error' => "Service job {$jobId} not found in this shop."], 404);
        }
        $parts = DB::table('service_job_parts')
            ->join('parts', 'service_job_parts.part_id_fk', '=', 'parts.part_id')
            ->where('service_job_parts.job_id_fk', $jobId)
            ->select(
                'service_job_parts.job_part_id',
                'parts.part_name',
                'parts.brand',
                'service_job_parts.quantity',
                'service_job_parts.unit_price',
                'service_job_parts.subtotal'
            )
            ->limit($limit)
            ->get();
        return response()->json(['job_id' => $jobId, 'parts' => $parts, 'count' => $parts->count()]);
    }

    private function opPayments(int $shopId, int $userId, array $f, int $limit)
    {
        $customer = Customer::where('shop_id_fk', $shopId)->where('user_id_fk', $userId)->first();
        if (!$customer) return response()->json(['error' => 'Customer not found'], 404);
        $q = Sale::where('shop_id_fk', $shopId)->where('customer_id_fk', $customer->customer_id);
        if (!empty($f['from_date'])) $q->whereDate('sale_date', '>=', $f['from_date']);
        if (!empty($f['to_date']))   $q->whereDate('sale_date', '<=', $f['to_date']);
        return response()->json($q->latest('sale_date')->limit($limit)->get(['sale_id','sale_type','total_amount','net_amount','sale_date','payment_method']));
    }

    // ──────────────────────────────────────────────────────────────────
    // Legacy per-entity endpoints (kept for compatibility)
    // ──────────────────────────────────────────────────────────────────

    public function userProfile(Request $request, int $userId)
    {
        $user = User::with('role')->findOrFail($userId);
        return response()->json([
            'full_name' => $user->full_name,
            'username'  => $user->username,
            'email'     => $user->email,
            'role'      => $user->role?->role_name ?? '',
        ]);
    }

    public function customerList(Request $request)
    {
        $shopId = $this->shopId($request);
        $customers = Customer::where('shop_id_fk', $shopId)
            ->orderBy('full_name')
            ->get(['customer_id', 'full_name', 'email', 'phone']);
        return response()->json(['total' => $customers->count(), 'customers' => $customers]);
    }

    public function mechanicList(Request $request)
    {
        $shopId = $this->shopId($request);
        $mechanics = DB::table('mechanics')
            ->where('shop_id_fk', $shopId)
            ->select('mechanic_id', 'full_name', 'specialization')
            ->orderBy('full_name')
            ->get();
        return response()->json(['total' => $mechanics->count(), 'mechanics' => $mechanics]);
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
