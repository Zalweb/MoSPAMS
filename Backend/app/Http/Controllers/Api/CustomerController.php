<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
    use LogsActivity;
    public function services(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $rows = $this->tenantTable('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.customer_id_fk', $customer->customer_id)
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_job_statuses.status_code', 'service_types.service_name', 'service_job_items.labor_cost')
            ->orderByDesc('service_jobs.created_at')
            ->get();

        $jobIds = $rows->pluck('job_id')->all();

        $partsByJob = DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->whereIn('service_job_parts.job_id_fk', $jobIds)
            ->where('service_job_parts.status', 'confirmed')
            ->select('service_job_parts.job_id_fk', 'parts.part_name', 'service_job_parts.quantity')
            ->get()
            ->groupBy('job_id_fk');

        $mechanicsByJob = DB::table('service_job_mechanics')
            ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
            ->whereIn('service_job_mechanics.job_id_fk', $jobIds)
            ->select('service_job_mechanics.job_id_fk', 'mechanics.full_name')
            ->get()
            ->groupBy('job_id_fk');

        $salesByJob = DB::table('sales')
            ->whereIn('job_id_fk', $jobIds)
            ->whereNotNull('job_id_fk')
            ->select('job_id_fk', 'net_amount')
            ->get()
            ->keyBy('job_id_fk');

        $ratedJobIds = [];
        if ($jobIds && \Illuminate\Support\Facades\Schema::hasTable('ratings')) {
            $ratedJobIds = DB::table('ratings')
                ->whereIn('service_job_id_fk', $jobIds)
                ->pluck('service_job_id_fk')
                ->toArray();
        }

        $services = $rows->map(fn ($row) => [
            'id'               => (string) $row->job_id,
            'customerName'     => $row->customer_name,
            'vehicleId'        => $row->vehicle_id_fk ? (string) $row->vehicle_id_fk : null,
            'motorcycleModel'  => $row->motorcycle_model ?? '',
            'serviceType'      => $row->service_name ?? 'General Service',
            'laborCost'        => (float) ($row->labor_cost ?? 0),
            'status'           => match ($row->status_name) { 'In Progress' => 'Ongoing', 'Booked & Confirmed' => 'Confirmed', default => $row->status_name },
            'statusCode'       => $row->status_code ?? '',
            'totalBill'        => isset($salesByJob[$row->job_id]) ? (float) $salesByJob[$row->job_id]->net_amount : null,
            'notes'            => $row->notes ?? '',
            'mechanics'        => collect($mechanicsByJob->get($row->job_id, []))->map(fn ($m) => ['name' => $m->full_name])->values(),
            'partsUsed'        => collect($partsByJob->get($row->job_id, []))->map(fn ($p) => ['name' => $p->part_name, 'quantity' => (int) $p->quantity])->values(),
            'createdAt'        => $row->created_at ? \Illuminate\Support\Carbon::parse($row->created_at)->toISOString() : null,
            'completedAt'      => $row->completion_date ? \Illuminate\Support\Carbon::parse($row->completion_date)->toISOString() : null,
            'hasRating'        => in_array($row->job_id, $ratedJobIds),
        ]);

        return response()->json(['data' => $services]);
    }

    public function createService(Request $request): JsonResponse
    {
        $request->validate([
            'motorcycle_model'      => ['required', 'string', 'max:150'],
            'service_type'          => ['required', 'string', 'max:100'],
            'notes'                 => ['nullable', 'string', 'max:500'],
            'vehicle_id'            => ['nullable', 'integer'],
            'preferred_mechanic_id' => ['nullable', 'integer'],
        ]);

        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $service = DB::transaction(function () use ($request, $customer, $user) {
            $serviceTypeId = DB::table('service_types')
                ->where('shop_id_fk', $user->shop_id_fk)
                ->where('service_name', $request->service_type)
                ->value('service_type_id');

            $laborCost = $serviceTypeId
                ? DB::table('service_types')->where('shop_id_fk', $user->shop_id_fk)->where('service_type_id', $serviceTypeId)->value('labor_cost')
                : 0;

            // Validate preferred mechanic belongs to this shop
            $preferredMechanicId = null;
            if ($request->preferred_mechanic_id) {
                $exists = DB::table('mechanics')
                    ->where('mechanic_id', (int) $request->preferred_mechanic_id)
                    ->where('shop_id_fk', $user->shop_id_fk)
                    ->exists();
                $preferredMechanicId = $exists ? (int) $request->preferred_mechanic_id : null;
            }

            $jobId = DB::table('service_jobs')->insertGetId([
                'shop_id_fk'               => $user->shop_id_fk,
                'customer_id_fk'           => $customer->customer_id,
                'vehicle_id_fk'            => $request->vehicle_id ?: null,
                'assigned_mechanic_id_fk'  => $preferredMechanicId,
                'created_by_fk'            => $user->user_id,
                'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id'),
                'job_date'                 => now()->toDateString(),
                'motorcycle_model'         => $request->motorcycle_model,
                'notes'                    => $request->notes,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);

            DB::table('service_job_items')->insert([
                'job_id_fk' => $jobId,
                'service_type_id_fk' => $serviceTypeId,
                'labor_cost' => $laborCost,
                'remarks' => null,
            ]);

            $this->logActivity($user->user_id, $user->shop_id_fk, 'Created service request', 'service_jobs', $jobId, $user->account_id_fk);

            return ['jobId' => $jobId, 'preferredMechanicId' => $preferredMechanicId];
        });

        $jobId             = $service['jobId'];
        $preferredMechanicId = $service['preferredMechanicId'];

        $queuePosition = null;
        $mechanicName  = null;
        if ($preferredMechanicId) {
            $pendingStatusId = DB::table('service_job_statuses')->where('status_code', 'pending')->value('service_job_status_id');
            $queuePosition   = DB::table('service_jobs')
                ->where('assigned_mechanic_id_fk', $preferredMechanicId)
                ->where('service_job_status_id_fk', $pendingStatusId)
                ->where('shop_id_fk', $user->shop_id_fk)
                ->count();
            $mechanicName = DB::table('mechanics')->where('mechanic_id', $preferredMechanicId)->value('full_name');
        }

        $service = $this->tenantTable('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $jobId)
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name')
            ->first();

        return response()->json([
            'id'            => (string) $service->job_id,
            'customer_name' => $service->customer_name,
            'status'        => $service->status_name,
            'queuePosition' => $queuePosition,
            'mechanicName'  => $mechanicName,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $payments = $this->tenantTable('sales')
            ->join('payments', 'payments.sale_id_fk', '=', 'sales.sale_id')
            ->join('payment_statuses', 'payment_statuses.payment_status_id', '=', 'payments.payment_status_id_fk')
            ->where('sales.customer_id_fk', $customer->customer_id)
            ->select('sales.*', 'payments.payment_method', 'payment_statuses.status_name')
            ->orderByDesc('sales.sale_date')
            ->get()
            ->map(fn ($row) => [
                'id'            => (string) $row->sale_id,
                'type'          => $row->sale_type,
                'total'         => (float) $row->net_amount,
                'paymentMethod' => $row->payment_method,
                'createdAt'     => $row->sale_date ? \Illuminate\Support\Carbon::parse($row->sale_date)->toISOString() : null,
            ]);

        return response()->json(['data' => $payments]);
    }

    public function cancelService(Request $request, $jobId): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        $job = $this->tenantTable('service_jobs')
            ->where('job_id', $jobId)
            ->where('customer_id_fk', $customer->customer_id)
            ->first();

        if (!$job) {
            return response()->json(['error' => 'Job not found'], 404);
        }

        $status = DB::table('service_job_statuses')->where('service_job_status_id', $job->service_job_status_id_fk)->first();
        if (strtolower($status->status_code) !== 'pending') {
            return response()->json(['error' => 'Only pending jobs can be cancelled'], 400);
        }

        $cancelledStatusId = DB::table('service_job_statuses')->where('status_code', 'cancelled')->value('service_job_status_id');

        DB::table('service_jobs')->where('job_id', $jobId)->update([
            'service_job_status_id_fk' => $cancelledStatusId,
            'updated_at'               => now(),
        ]);

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Cancelled service request', 'service_jobs', $jobId, $user->account_id_fk);

        return response()->json(['message' => 'Service cancelled successfully']);
    }

    public function requestCancellation(Request $request, $jobId): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        $job = $this->tenantTable('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $jobId)
            ->where('service_jobs.customer_id_fk', $customer->customer_id)
            ->select('service_jobs.*', 'service_job_statuses.status_code')
            ->first();

        if (!$job) {
            return response()->json(['error' => 'Job not found'], 404);
        }

        if ($job->status_code !== 'booked_confirmed') {
            return response()->json(['error' => 'Only confirmed bookings can request cancellation'], 400);
        }

        $shopId = $user->shop_id_fk;
        $ownerId = DB::table('shop_memberships')
            ->join('roles', 'roles.role_id', '=', 'shop_memberships.role_id_fk')
            ->where('shop_memberships.shop_id_fk', $shopId)
            ->where('roles.role_name', 'Owner')
            ->value('shop_memberships.user_id_fk');

        if ($ownerId) {
            DB::table('notifications')->insert([
                'user_id_fk'        => $ownerId,
                'shop_id_fk'        => $shopId,
                'notification_type' => 'cancellation_request',
                'title'             => 'Cancellation Requested',
                'message'           => "{$customer->full_name} is requesting to cancel their confirmed service booking (Job #{$jobId}).",
                'reference_type'    => 'service_jobs',
                'reference_id'      => $jobId,
                'is_read'           => 0,
                'created_at'        => now(),
            ]);
        }

        return response()->json(['message' => 'Cancellation request sent to the shop.']);
    }

    public function paymentDetails(Request $request, $paymentId): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer not found'], 404);
        }

        $sale = $this->tenantTable('sales')
            ->where('sale_id', $paymentId)
            ->where('customer_id_fk', $customer->customer_id)
            ->first();

        if (!$sale) {
            return response()->json(['error' => 'Payment not found'], 404);
        }

        $items = $this->tenantTable('sale_items')
            ->join('parts', 'parts.part_id', '=', 'sale_items.part_id_fk')
            ->where('sale_items.sale_id_fk', $paymentId)
            ->select('sale_items.*', 'parts.part_name')
            ->get();
            
        $labor = [];
        if ($sale->job_id_fk) {
            $labor = $this->tenantTable('service_job_items')
                ->join('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
                ->where('service_job_items.job_id_fk', $sale->job_id_fk)
                ->select('service_job_items.*', 'service_types.service_name')
                ->get();
        }

        $payment = $this->tenantTable('payments')
            ->join('payment_statuses', 'payment_statuses.payment_status_id', '=', 'payments.payment_status_id_fk')
            ->where('sale_id_fk', $paymentId)
            ->select('payments.payment_method', 'payment_statuses.status_name as payment_status', 'payments.payment_date')
            ->first();

        return response()->json([
            'sale' => $sale,
            'payment' => $payment,
            'items' => $items,
            'labor' => $labor
        ]);
    }

    public function getProfile(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        return response()->json([
            'full_name' => $customer->full_name ?? $user->full_name,
            'phone' => $customer->phone ?? '',
            'email' => $customer->email ?? $user->username,
            'address' => $customer->address ?? ''
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        DB::table('users')->where('user_id', $user->user_id)->update([
            'full_name' => $request->full_name,
            'updated_at' => now(),
        ]);

        $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->update([
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'updated_at' => now(),
        ]);

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Updated profile', 'customers', null, $user->account_id_fk);

        return response()->json(['message' => 'Profile updated successfully']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
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

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Changed password', 'users', $user->user_id, $user->account_id_fk);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function getVehicles(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $vehicles = DB::table('customer_vehicles')
            ->where('customer_id_fk', $customer->customer_id)
            ->where('shop_id_fk', $user->shop_id_fk)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($v) => [
                'id'           => (string) $v->vehicle_id,
                'make'         => $v->make,
                'model'        => $v->model,
                'year'         => $v->year,
                'plateNumber'  => $v->plate_number,
                'color'        => $v->color,
                'notes'        => $v->notes,
                'createdAt'    => $v->created_at,
            ]);

        return response()->json(['data' => $vehicles]);
    }

    public function storeVehicle(Request $request): JsonResponse
    {
        $request->validate([
            'make'         => ['required', 'string', 'max:100'],
            'model'        => ['required', 'string', 'max:100'],
            'year'         => ['nullable', 'digits:4'],
            'plate_number' => ['nullable', 'string', 'max:30'],
            'color'        => ['nullable', 'string', 'max:50'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $vehicleId = DB::table('customer_vehicles')->insertGetId([
            'customer_id_fk' => $customer->customer_id,
            'shop_id_fk'     => $user->shop_id_fk,
            'make'           => $request->make,
            'model'          => $request->model,
            'year'           => $request->year,
            'plate_number'   => $request->plate_number,
            'color'          => $request->color,
            'notes'          => $request->notes,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Added vehicle', 'customer_vehicles', $vehicleId, $user->account_id_fk);

        $vehicle = DB::table('customer_vehicles')->where('vehicle_id', $vehicleId)->first();

        return response()->json([
            'id'          => (string) $vehicle->vehicle_id,
            'make'        => $vehicle->make,
            'model'       => $vehicle->model,
            'year'        => $vehicle->year,
            'plateNumber' => $vehicle->plate_number,
            'color'       => $vehicle->color,
            'notes'       => $vehicle->notes,
        ], 201);
    }

    public function updateVehicle(Request $request, $vehicleId): JsonResponse
    {
        $request->validate([
            'make'         => ['required', 'string', 'max:100'],
            'model'        => ['required', 'string', 'max:100'],
            'year'         => ['nullable', 'digits:4'],
            'plate_number' => ['nullable', 'string', 'max:30'],
            'color'        => ['nullable', 'string', 'max:50'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $vehicle = DB::table('customer_vehicles')
            ->where('vehicle_id', $vehicleId)
            ->where('customer_id_fk', $customer->customer_id)
            ->first();

        if (!$vehicle) {
            return response()->json(['error' => 'Vehicle not found'], 404);
        }

        DB::table('customer_vehicles')->where('vehicle_id', $vehicleId)->update([
            'make'         => $request->make,
            'model'        => $request->model,
            'year'         => $request->year,
            'plate_number' => $request->plate_number,
            'color'        => $request->color,
            'notes'        => $request->notes,
            'updated_at'   => now(),
        ]);

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Updated vehicle', 'customer_vehicles', (int) $vehicleId, $user->account_id_fk);

        return response()->json(['message' => 'Vehicle updated successfully']);
    }

    public function deleteVehicle(Request $request, $vehicleId): JsonResponse
    {
        $user = auth()->user();
        $customer = $this->tenantTable('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $deleted = DB::table('customer_vehicles')
            ->where('vehicle_id', $vehicleId)
            ->where('customer_id_fk', $customer->customer_id)
            ->delete();

        if (!$deleted) {
            return response()->json(['error' => 'Vehicle not found'], 404);
        }

        $this->logActivity($user->user_id, $user->shop_id_fk, 'Deleted vehicle', 'customer_vehicles', (int) $vehicleId, $user->account_id_fk);

        return response()->json(['message' => 'Vehicle deleted successfully']);
    }

    public function getNotifications(Request $request): JsonResponse
    {
        $user = auth()->user();

        $notifications = DB::table('notifications')
            ->where('user_id_fk', $user->user_id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'            => (string) $n->notification_id,
                'type'          => $n->notification_type,
                'title'         => $n->title,
                'message'       => $n->message,
                'referenceType' => $n->reference_type,
                'referenceId'   => $n->reference_id ? (string) $n->reference_id : null,
                'isRead'        => (bool) $n->is_read,
                'createdAt'     => $n->created_at,
            ]);

        $unreadCount = DB::table('notifications')
            ->where('user_id_fk', $user->user_id)
            ->where('is_read', false)
            ->count();

        return response()->json(['data' => $notifications, 'unread_count' => $unreadCount]);
    }

    public function markNotificationRead(Request $request, $notificationId): JsonResponse
    {
        $user = auth()->user();

        $updated = DB::table('notifications')
            ->where('notification_id', $notificationId)
            ->where('user_id_fk', $user->user_id)
            ->update(['is_read' => true, 'updated_at' => now()]);

        if (!$updated) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        return response()->json(['message' => 'Notification marked as read']);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $user = auth()->user();

        DB::table('notifications')
            ->where('user_id_fk', $user->user_id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }
    public function mechanics(Request $request): JsonResponse
    {
        $user   = auth()->user();
        $shopId = $user->shop_id_fk;

        $completedStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'completed')
            ->value('service_job_status_id');

        $pendingStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'pending')
            ->value('service_job_status_id');

        $mechanics = DB::table('mechanics')
            ->join('mechanic_statuses', 'mechanic_statuses.mechanic_status_id', '=', 'mechanics.mechanic_status_id_fk')
            ->where('mechanics.shop_id_fk', $shopId)
            ->orderBy('mechanics.full_name')
            ->select(
                'mechanics.mechanic_id',
                'mechanics.full_name',
                'mechanic_statuses.status_code',
                'mechanic_statuses.status_name'
            )
            ->get();

        $mechanicIds = $mechanics->pluck('mechanic_id');

        $ratings = DB::table('ratings')
            ->whereIn('mechanic_id_fk', $mechanicIds)
            ->where('shop_id_fk', $shopId)
            ->selectRaw('mechanic_id_fk, AVG(rating) as avg_rating, COUNT(*) as rating_count')
            ->groupBy('mechanic_id_fk')
            ->get()
            ->keyBy('mechanic_id_fk');

        $completedJobs = DB::table('service_job_mechanics')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
            ->whereIn('service_job_mechanics.mechanic_id_fk', $mechanicIds)
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_jobs.service_job_status_id_fk', $completedStatusId)
            ->selectRaw('mechanic_id_fk, COUNT(*) as completed')
            ->groupBy('mechanic_id_fk')
            ->get()
            ->keyBy('mechanic_id_fk');

        $pendingQueues = DB::table('service_jobs')
            ->whereIn('assigned_mechanic_id_fk', $mechanicIds)
            ->where('service_job_status_id_fk', $pendingStatusId)
            ->where('shop_id_fk', $shopId)
            ->selectRaw('assigned_mechanic_id_fk, COUNT(*) as queue_count')
            ->groupBy('assigned_mechanic_id_fk')
            ->get()
            ->keyBy('assigned_mechanic_id_fk');

        $data = $mechanics->map(function ($row) use ($ratings, $completedJobs, $pendingQueues) {
            $r = $ratings->get($row->mechanic_id);
            $c = $completedJobs->get($row->mechanic_id);
            $q = $pendingQueues->get($row->mechanic_id);
            return [
                'id'                => (string) $row->mechanic_id,
                'name'              => $row->full_name,
                'statusCode'        => $row->status_code,
                'statusName'        => $row->status_name,
                'avgRating'         => $r ? round((float) $r->avg_rating, 1) : null,
                'ratingCount'       => $r ? (int) $r->rating_count : 0,
                'completedJobs'     => $c ? (int) $c->completed : 0,
                'pendingQueueCount' => $q ? (int) $q->queue_count : 0,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function serviceTypes(Request $request): JsonResponse
    {
        $user = auth()->user();

        $tenantManagerId = app(\App\Support\Tenancy\TenantManager::class)->id();
        $authContextId   = app(\App\Support\Auth\AuthenticatedContext::class)->shopId($request);
        $userShopId      = $user?->shop_id_fk ? (int) $user->shop_id_fk : null;

        $shopId = $tenantManagerId ?? $authContextId ?? $userShopId;

        if (! $shopId) {
            return response()->json(['data' => [], '_debug' => ['shopId' => null, 'tenantManagerId' => null, 'authContextId' => null, 'userShopId' => null]]);
        }

        $types = DB::table('service_types')
            ->where('shop_id_fk', $shopId)
            ->orderBy('service_name')
            ->get()
            ->map(fn ($row) => [
                'id'          => (string) $row->service_type_id,
                'service_name' => $row->service_name,
                'description' => $row->description,
                'labor_cost'  => (float) $row->labor_cost,
            ]);

        // Debug: also fetch all shop IDs present in service_types to compare
        $allShopIds = DB::table('service_types')->distinct()->pluck('shop_id_fk');

        return response()->json([
            'data'   => $types,
            '_debug' => [
                'resolvedShopId'      => $shopId,
                'tenantManagerId'     => $tenantManagerId,
                'authContextId'       => $authContextId,
                'userShopId'          => $userShopId,
                'allShopIdsInTable'   => $allShopIds,
                'countForShop'        => $types->count(),
            ],
        ]);
    }
}
