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

        $request->validate([
            'action'    => 'required|in:start,complete',
            'laborCost' => 'required_if:action,complete|numeric|min:0',
        ]);

        $jobData = $this->assignedJobsQuery((int) $mechanic->mechanic_id)
            ->where('service_jobs.job_id', $job)
            ->select(
                'service_jobs.*',
                'customers.user_id_fk as customer_user_id',
                'customers.full_name as customer_name',
                'service_job_statuses.status_code',
                'service_job_items.job_item_id',
                'service_job_items.labor_cost'
            )
            ->first();

        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }

        $action = $request->action;

        if ($action === 'start') {
            if ($jobData->status_code !== 'booked_confirmed') {
                return response()->json(['message' => 'Only confirmed jobs can be started.'], 422);
            }

            $inProgressId = DB::table('service_job_statuses')
                ->where('status_code', 'in_progress')
                ->value('service_job_status_id');

            DB::transaction(function () use ($job, $jobData, $inProgressId, $request) {
                DB::table('service_jobs')
                    ->where('job_id', $job)
                    ->update([
                        'service_job_status_id_fk' => $inProgressId,
                        'updated_at'               => now(),
                    ]);

                $this->logActivity(
                    $request->user()->user_id,
                    $jobData->shop_id_fk,
                    'Started job #' . $job,
                    'service_jobs',
                    $job,
                    $request->user()->account_id_fk
                );

                if ($jobData->customer_user_id) {
                    DB::table('notifications')->insert([
                        'user_id_fk'        => $jobData->customer_user_id,
                        'notification_type' => 'service_started',
                        'title'             => 'Service Started',
                        'message'           => 'Your motorcycle service has started! Our mechanic is now working on your bike.',
                        'reference_type'    => 'service_jobs',
                        'reference_id'      => $job,
                        'is_read'           => 0,
                        'created_at'        => now(),
                    ]);
                }
            });

            return $this->jobDetails($request, $job);

        } elseif ($action === 'complete') {
            if ($jobData->status_code !== 'in_progress') {
                return response()->json(['message' => 'Only in-progress jobs can be completed.'], 422);
            }

            $laborCost = (float) $request->laborCost;

            $workDoneId = DB::table('service_job_statuses')
                ->where('status_code', 'work_done')
                ->value('service_job_status_id');

            // Fetch confirmed parts for bill calculation
            $confirmedParts = DB::table('service_job_parts')
                ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
                ->where('service_job_parts.job_id_fk', $job)
                ->where('service_job_parts.status', 'confirmed')
                ->select('parts.part_name', 'service_job_parts.quantity', 'service_job_parts.unit_price')
                ->get();

            $partsCost  = $confirmedParts->sum(fn ($p) => $p->unit_price * $p->quantity);
            $totalCost  = $laborCost + $partsCost;
            $partsList  = $confirmedParts->map(fn ($p) => "{$p->part_name} x{$p->quantity}")->implode(', ');
            $partsDetail = $partsList ? "Parts: {$partsList}. " : '';
            $message = "Your service is done! Total Bill: ₱" . number_format($totalCost, 2)
                . ". {$partsDetail}Labor: ₱" . number_format($laborCost, 2)
                . ". Please proceed to the counter for payment.";

            DB::transaction(function () use ($job, $jobData, $workDoneId, $laborCost, $message, $request) {
                // Update labor cost on the service_job_items row for this job
                if ($jobData->job_item_id) {
                    DB::table('service_job_items')
                        ->where('job_item_id', $jobData->job_item_id)
                        ->update(['labor_cost' => $laborCost]);
                }

                DB::table('service_jobs')
                    ->where('job_id', $job)
                    ->update([
                        'service_job_status_id_fk' => $workDoneId,
                        'completion_date'           => now()->toDateString(),
                        'updated_at'                => now(),
                    ]);

                $this->logActivity(
                    $request->user()->user_id,
                    $jobData->shop_id_fk,
                    'Completed job #' . $job,
                    'service_jobs',
                    $job,
                    $request->user()->account_id_fk
                );

                if ($jobData->customer_user_id) {
                    DB::table('notifications')->insert([
                        'user_id_fk'        => $jobData->customer_user_id,
                        'notification_type' => 'work_done',
                        'title'             => 'Service Complete',
                        'message'           => $message,
                        'reference_type'    => 'service_jobs',
                        'reference_id'      => $job,
                        'is_read'           => 0,
                        'created_at'        => now(),
                    ]);
                }
            });

            return $this->jobDetails($request, $job);
        }

        return response()->json(['message' => 'Invalid action.'], 422);
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

    public function history(Request $request): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $query = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', (int) $mechanic->mechanic_id)
            ->where('service_job_statuses.status_code', 'work_done')
            ->select(
                'service_jobs.*',
                'customers.full_name as customer_name',
                'service_types.service_name'
            );

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('service_jobs.completion_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('service_jobs.completion_date', '<=', $request->date_to);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customers.full_name', 'like', "%$search%")
                  ->orWhere('service_types.service_name', 'like', "%$search%");
            });
        }

        $jobs = $query->orderByDesc('service_jobs.completion_date')
            ->distinct()
            ->paginate(20);

        // Get ratings for these jobs (safe if ratings table not yet migrated)
        $jobIds = $jobs->pluck('job_id')->all();
        $ratings = [];
        if ($jobIds && \Illuminate\Support\Facades\Schema::hasTable('ratings')) {
            $ratings = DB::table('ratings')
                ->whereIn('service_job_id_fk', $jobIds)
                ->get()
                ->keyBy('service_job_id_fk')
                ->toArray();
        }

        $data = $jobs->map(function ($job) use ($ratings) {
            $rating = $ratings[$job->job_id] ?? null;
            $durationHours = null;
            if ($job->completion_date && $job->created_at) {
                $completedAt = \Illuminate\Support\Carbon::parse($job->completion_date);
                $createdAt = \Illuminate\Support\Carbon::parse($job->created_at);
                $durationHours = round($completedAt->diffInSeconds($createdAt) / 3600, 2);
            }

            return [
                'id' => (string) $job->job_id,
                'service_type' => $job->service_name ?? 'General Service',
                'customer_name' => $job->customer_name,
                'completed_at' => $this->iso($job->completion_date),
                'duration_hours' => $durationHours,
                'rating' => $rating ? (int) $rating->rating : null,
                'comment' => $rating ? $rating->comment : null,
            ];
        });

        return response()->json([
            'data' => $data,
            'pagination' => [
                'current_page' => $jobs->currentPage(),
                'total' => $jobs->total(),
                'per_page' => $jobs->perPage(),
                'last_page' => $jobs->lastPage(),
            ]
        ]);
    }

    public function performance(Request $request): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $now = now();
        $monthStartStr = $now->copy()->startOfMonth()->toDateString();
        $threeMonthsAgoStr = $now->copy()->subMonths(3)->toDateString();

        // This month completed jobs (no ratings join — query separately)
        $thisMonth = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', (int) $mechanic->mechanic_id)
            ->where('service_job_statuses.status_code', 'work_done')
            ->whereDate('service_jobs.completion_date', '>=', $monthStartStr)
            ->select('service_jobs.job_id', 'service_jobs.completion_date', 'service_jobs.created_at')
            ->get();

        $thisMonthCount = $thisMonth->count();
        $thisMonthDuration = $thisMonth->sum(function ($job) {
            return $job->completion_date && $job->created_at
                ? \Illuminate\Support\Carbon::parse($job->completion_date)->diffInSeconds(\Illuminate\Support\Carbon::parse($job->created_at)) / 3600
                : 0;
        }) / max($thisMonthCount, 1);

        // Ratings queried separately so a missing ratings table doesn't crash the endpoint
        $thisMonthRating = null;
        if ($thisMonth->isNotEmpty() && \Illuminate\Support\Facades\Schema::hasTable('ratings')) {
            $thisMonthRating = DB::table('ratings')
                ->whereIn('service_job_id_fk', $thisMonth->pluck('job_id')->all())
                ->avg('rating');
        }

        // Last 3 months trend
        $threeMonths = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', (int) $mechanic->mechanic_id)
            ->where('service_job_statuses.status_code', 'work_done')
            ->whereDate('service_jobs.completion_date', '>=', $threeMonthsAgoStr)
            ->select('service_jobs.completion_date')
            ->get();

        $trend = [];
        for ($i = 2; $i >= 0; $i--) {
            $monthDate = $now->copy()->subMonths($i);
            $monthStartStr2 = $monthDate->copy()->startOfMonth()->toDateString();
            $monthEndStr2 = $monthDate->copy()->endOfMonth()->toDateString();

            // Use string date comparison so Collection::whereBetween works correctly
            $count = $threeMonths->whereBetween('completion_date', [$monthStartStr2, $monthEndStr2])->count();
            $trend[] = [
                'month' => $monthDate->format('M Y'),
                'jobs_completed' => $count,
            ];
        }

        return response()->json([
            'current_period' => [
                'jobs_completed_this_month' => $thisMonthCount,
                'avg_time_per_job_hours' => round($thisMonthDuration, 2),
                'customer_rating' => !is_null($thisMonthRating) ? round((float) $thisMonthRating, 2) : null,
            ],
            'trend_last_three_months' => $trend,
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $mechanic = $this->findMechanicProfile($request);

        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }

        $mid = (int) $mechanic->mechanic_id;
        $monthStart = now()->startOfMonth()->toDateString();

        $activeStatuses = DB::table('service_job_statuses')
            ->whereIn('status_code', ['booked_confirmed', 'in_progress'])
            ->pluck('service_job_status_id')
            ->all();

        $inProgressStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'in_progress')
            ->value('service_job_status_id');

        $workDoneStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'work_done')
            ->value('service_job_status_id');

        $activeJobs = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->where('service_job_mechanics.mechanic_id_fk', $mid)
            ->whereIn('service_jobs.service_job_status_id_fk', $activeStatuses)
            ->count();

        $inProgressJobs = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->where('service_job_mechanics.mechanic_id_fk', $mid)
            ->where('service_jobs.service_job_status_id_fk', $inProgressStatusId)
            ->count();

        $completedThisMonth = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->where('service_job_mechanics.mechanic_id_fk', $mid)
            ->where('service_jobs.service_job_status_id_fk', $workDoneStatusId)
            ->whereDate('service_jobs.completion_date', '>=', $monthStart)
            ->count();

        $pendingParts = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('service_job_parts', 'service_job_parts.job_id_fk', '=', 'service_jobs.job_id')
            ->where('service_job_mechanics.mechanic_id_fk', $mid)
            ->where('service_job_parts.status', 'requested')
            ->count();

        $avgRating = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('ratings')) {
            $avgRating = DB::table('ratings')
                ->where('mechanic_id_fk', $mid)
                ->avg('rating');
        }

        // Last 3 recently touched jobs
        $recentJobs = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', $mid)
            ->select(
                'service_jobs.job_id',
                'service_jobs.motorcycle_model',
                'service_jobs.updated_at',
                'customers.full_name as customer_name',
                'service_job_statuses.status_name',
                'service_job_statuses.status_code',
                'service_types.service_name'
            )
            ->orderByDesc('service_jobs.updated_at')
            ->limit(3)
            ->get()
            ->map(fn ($j) => [
                'id' => (string) $j->job_id,
                'customerName' => $j->customer_name,
                'motorcycleModel' => $j->motorcycle_model ?? '',
                'serviceType' => $j->service_name ?? 'General Service',
                'statusCode' => $j->status_code,
                'statusName' => $j->status_name,
                'updatedAt' => $this->iso($j->updated_at),
            ]);

        return response()->json([
            'mechanic_name' => $mechanic->full_name,
            'stats' => [
                'active_jobs' => $activeJobs,
                'in_progress' => $inProgressJobs,
                'completed_this_month' => $completedThisMonth,
                'pending_parts' => $pendingParts,
                'avg_rating' => !is_null($avgRating) ? round((float) $avgRating, 1) : null,
            ],
            'recent_jobs' => $recentJobs,
        ]);
    }
}
