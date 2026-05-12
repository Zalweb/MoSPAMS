<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivity;
use Illuminate\Support\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MechanicController extends Controller
{
    use LogsActivity;
    public function assignedJobs(Request $request): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $rows = $this->assignedJobsQuery((int) $mechanic->mechanic_id)
            ->orderByDesc('service_jobs.created_at')
            ->get();

        $jobIds = $rows->pluck('job_id')->all();
        $partsByJob = $this->partsByJobIds($jobIds);
        $mechanicsByJob = $this->mechanicsByJobIds($jobIds);

        $jobs = $rows->map(fn ($row) => $this->jobResource(
            $row,
            $partsByJob->get($row->job_id, collect())->values()->all(),
            $mechanicsByJob->get($row->job_id, collect())->values()->all(),
        ));

        return response()->json(['data' => $jobs]);
    }

    public function jobDetails(Request $request, int $job): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $jobData = $this->assignedJobsQuery((int) $mechanic->mechanic_id)
            ->where('service_jobs.job_id', $job)
            ->select(
                'service_jobs.*',
                'customers.full_name as customer_name',
                'customers.phone as customer_phone',
                'customers.email as customer_email',
                'service_job_statuses.status_name',
                'service_job_statuses.status_code',
                'service_types.service_name',
                'service_job_items.labor_cost'
            )
            ->first();

        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        $parts = $this->partsByJobIds([$job])->get($job, collect())->values();
        $mechanics = $this->mechanicsByJobIds([$job])->get($job, collect())->values();

        $resource = $this->jobResource($jobData, $parts->all(), $mechanics->all());
        $resource['parts'] = $parts;
        $resource['mechanics'] = $mechanics;
        $resource['customerPhone'] = $jobData->customer_phone;
        $resource['customerEmail'] = $jobData->customer_email;

        return response()->json(['data' => $resource]);
    }

    public function updateJobStatus(Request $request, int $job): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['Pending', 'In Progress', 'Completed'])],
        ]);

        $jobData = $this->assignedJobsQuery((int) $mechanic->mechanic_id)
            ->where('service_jobs.job_id', $job)
            ->select(
                'service_jobs.*',
                'customers.user_id_fk as customer_user_id',
                'customers.full_name as customer_name'
            )
            ->first();

        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        $statusCode = strtolower(str_replace(' ', '_', $data['status']));
        $statusId = DB::table('service_job_statuses')
            ->where('status_code', $statusCode)
            ->value('service_job_status_id');

        DB::transaction(function () use ($job, $jobData, $statusId, $statusCode, $data, $request) {
            $patch = [
                'service_job_status_id_fk' => $statusId,
                'updated_at' => now(),
                'completion_date' => $statusCode === 'completed' ? now()->toDateString() : null,
            ];

            DB::table('service_jobs')
                ->where('job_id', $job)
                ->update($patch);

            $this->logActivity(
                $request->user()->user_id,
                $jobData->shop_id_fk,
                'Updated job #' . $job . ' status to ' . $data['status'],
                'service_jobs',
                $job,
                $request->user()->account_id_fk
            );

            if ($jobData->customer_user_id) {
                DB::table('notifications')->insert([
                    'user_id_fk' => $jobData->customer_user_id,
                    'notification_type' => 'job_status_update',
                    'title' => 'Service status updated',
                    'message' => "Your service job for {$jobData->motorcycle_model} is now {$data['status']}.",
                    'reference_type' => 'service_job',
                    'reference_id' => $job,
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return $this->jobDetails($request, $job);
    }

    public function addPartToJob(Request $request, int $job): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        if (! $this->mechanicHasJob((int) $mechanic->mechanic_id, $job)) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        $data = $request->validate([
            'partId' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($job, $data, $request, $mechanic) {
            $part = DB::table('parts')
                ->where('part_id', $data['partId'])
                ->first();

            if (! $part) {
                abort(404, 'Part not found');
            }

            DB::table('service_job_parts')->insert([
                'job_id_fk'       => $job,
                'part_id_fk'      => $data['partId'],
                'quantity'        => $data['quantity'],
                'unit_price'      => $part->unit_price,
                'subtotal'        => $part->unit_price * $data['quantity'],
                'status'          => 'requested',
                'requested_by_fk' => $request->user()->user_id,
            ]);

            $this->logActivity(
                $request->user()->user_id,
                $request->user()->shop_id_fk,
                'Requested ' . $data['quantity'] . 'x ' . $part->part_name . ' for job #' . $job,
                'service_job_parts',
                $job,
                $request->user()->account_id_fk
            );
        });

        return $this->jobDetails($request, $job);
    }

    public function removePartFromJob(Request $request, int $job, int $jobPartId): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        if (! $this->mechanicHasJob((int) $mechanic->mechanic_id, $job)) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        $jobPart = DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->where('service_job_parts.job_part_id', $jobPartId)
            ->where('service_job_parts.job_id_fk', $job)
            ->select('service_job_parts.*', 'parts.part_name')
            ->first();

        if (!$jobPart) {
            return response()->json(['message' => 'Part not found in this job'], 404);
        }

        DB::transaction(function () use ($jobPartId, $jobPart, $job, $request) {
            DB::table('service_job_parts')
                ->where('job_part_id', $jobPartId)
                ->delete();

            DB::table('parts')
                ->where('part_id', $jobPart->part_id_fk)
                ->update([
                    'stock_quantity' => DB::raw('stock_quantity + ' . $jobPart->quantity),
                    'updated_at' => now(),
                ]);

            DB::table('stock_movements')->insert([
                'part_id_fk' => $jobPart->part_id_fk,
                'user_id_fk' => $request->user()->user_id,
                'movement_type' => 'in',
                'quantity' => $jobPart->quantity,
                'reference_type' => 'service_job',
                'reference_id' => $job,
                'movement_date' => now(),
                'remarks' => 'Returned from service job #' . $job,
            ]);

            $this->logActivity(
                $request->user()->user_id,
                $request->user()->shop_id_fk,
                'Removed ' . $jobPart->quantity . 'x ' . $jobPart->part_name . ' from job #' . $job,
                'service_job_parts',
                $job,
                $request->user()->account_id_fk
            );
        });

        return $this->jobDetails($request, $job);
    }

    private function findMechanicProfile(Request $request): ?object
    {
        return DB::table('mechanics')
            ->where('user_id_fk', $request->user()->user_id)
            ->first();
    }

    private function assignedJobsQuery(int $mechanicId)
    {
        return DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', $mechanicId)
            ->select(
                'service_jobs.*',
                'customers.full_name as customer_name',
                'service_job_statuses.status_name',
                'service_job_statuses.status_code',
                'service_types.service_name',
                'service_job_items.labor_cost'
            );
    }

    private function mechanicHasJob(int $mechanicId, int $jobId): bool
    {
        return DB::table('service_job_mechanics')
            ->where('job_id_fk', $jobId)
            ->where('mechanic_id_fk', $mechanicId)
            ->exists();
    }

    private function partsByJobIds(array $jobIds): Collection
    {
        if ($jobIds === []) {
            return collect();
        }

        return DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->whereIn('service_job_parts.job_id_fk', $jobIds)
            ->select(
                'service_job_parts.job_id_fk',
                'service_job_parts.job_part_id',
                'service_job_parts.part_id_fk',
                'parts.part_name',
                'service_job_parts.quantity',
                'service_job_parts.unit_price',
                'service_job_parts.subtotal',
                'service_job_parts.status'
            )
            ->get()
            ->groupBy('job_id_fk')
            ->map(fn (Collection $parts) => $parts->map(fn ($part) => [
                'id' => (string) $part->job_part_id,
                'partId' => (string) $part->part_id_fk,
                'name' => $part->part_name,
                'quantity' => (int) $part->quantity,
                'unitPrice' => (float) $part->unit_price,
                'subtotal' => (float) $part->subtotal,
                'status' => $part->status,
            ]));
    }

    private function mechanicsByJobIds(array $jobIds): Collection
    {
        if ($jobIds === []) {
            return collect();
        }

        return DB::table('service_job_mechanics')
            ->join('mechanics', 'mechanics.mechanic_id', '=', 'service_job_mechanics.mechanic_id_fk')
            ->whereIn('service_job_mechanics.job_id_fk', $jobIds)
            ->select('service_job_mechanics.job_id_fk', 'mechanics.mechanic_id', 'mechanics.full_name')
            ->get()
            ->groupBy('job_id_fk')
            ->map(fn (Collection $mechanics) => $mechanics->map(fn ($mechanic) => [
                'id' => (string) $mechanic->mechanic_id,
                'name' => $mechanic->full_name,
            ]));
    }

    private function jobResource(object $row, array $partsUsed = [], array $mechanics = []): array
    {
        return [
            'id' => (string) $row->job_id,
            'customerName' => $row->customer_name,
            'motorcycleModel' => $row->motorcycle_model ?? '',
            'serviceType' => $row->service_name ?? 'General Service',
            'laborCost' => (float) ($row->labor_cost ?? 0),
            'status' => $row->status_name,
            'statusCode' => $row->status_code,
            'partsUsed' => $partsUsed,
            'mechanics' => $mechanics,
            'notes' => $row->notes ?? '',
            'createdAt' => $this->iso($row->created_at),
            'completedAt' => $row->completion_date ? $this->iso($row->completion_date) : null,
        ];
    }

    private function iso(mixed $value): ?string
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->toISOString() : null;
    }
}
