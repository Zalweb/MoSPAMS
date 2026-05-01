<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function services(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $services = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.customer_id_fk', $customer->customer_id)
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name', 'service_types.service_name', 'service_job_items.labor_cost')
            ->orderByDesc('service_jobs.created_at')
            ->get()
            ->map(fn ($row) => [
                'id'               => (string) $row->job_id,
                'customerName'     => $row->customer_name,
                'motorcycleModel'  => $row->motorcycle_model ?? '',
                'serviceType'      => $row->service_name ?? 'General Service',
                'laborCost'        => (float) ($row->labor_cost ?? 0),
                'status'           => $row->status_name,
                'notes'            => $row->notes ?? '',
                'createdAt'        => $row->created_at ? \Illuminate\Support\Carbon::parse($row->created_at)->toISOString() : null,
                'completedAt'      => $row->completion_date ? \Illuminate\Support\Carbon::parse($row->completion_date)->toISOString() : null,
            ]);

        return response()->json(['data' => $services]);
    }

    public function createService(Request $request): JsonResponse
    {
        $request->validate([
            'motorcycle_model' => ['required', 'string', 'max:150'],
            'service_type'     => ['required', 'string', 'max:100'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ]);

        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->firstOrFail();

        $service = DB::transaction(function () use ($request, $customer, $user) {
            $serviceTypeId = DB::table('service_types')
                ->where('service_name', $request->service_type)
                ->value('service_type_id');

            $laborCost = $serviceTypeId
                ? DB::table('service_types')->where('service_type_id', $serviceTypeId)->value('labor_cost')
                : 0;

            $jobId = DB::table('service_jobs')->insertGetId([
                'customer_id_fk' => $customer->customer_id,
                'created_by_fk' => $user->user_id,
                'service_job_status_id_fk' => DB::table('service_job_statuses')->where('status_code', 'PENDING')->value('service_job_status_id'),
                'job_date' => now()->toDateString(),
                'motorcycle_model' => $request->motorcycle_model,
                'notes' => $request->notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('service_job_items')->insert([
                'job_id_fk' => $jobId,
                'service_type_id_fk' => $serviceTypeId,
                'labor_cost' => $laborCost,
                'remarks' => null,
            ]);

            $this->log($user->user_id, 'Created service request', 'service_jobs', $jobId);

            return $jobId;
        });

        $service = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $service)
            ->select('service_jobs.*', 'customers.full_name as customer_name', 'service_job_statuses.status_name')
            ->first();

        return response()->json([
            'id'           => (string) $service->job_id,
            'customer_name' => $service->customer_name,
            'status'       => $service->status_name,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $user = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['data' => []]);
        }

        $payments = DB::table('sales')
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

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
