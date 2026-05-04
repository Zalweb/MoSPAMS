<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MechanicController extends Controller
{
    /**
     * Get all jobs assigned to the authenticated mechanic
     */
    public function assignedJobs(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get mechanic_id from user
        $mechanic = DB::table('mechanics')
            ->where('user_id_fk', $user->user_id)
            ->first();
        
        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }
        
        $jobs = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.assigned_mechanic_id_fk', $mechanic->mechanic_id)
            ->select(
                'service_jobs.*',
                'customers.full_name as customer_name',
                'service_job_statuses.status_name',
                'service_job_statuses.status_code',
                'service_types.service_name',
                'service_job_items.labor_cost'
            )
            ->orderByDesc('service_jobs.created_at')
            ->get()
            ->map(fn ($row) => $this->jobResource($row));
        
        return response()->json(['data' => $jobs]);
    }
    
    /**
     * Get detailed information about a specific job
     */
    public function jobDetails(Request $request, int $job): JsonResponse
    {
        $user = $request->user();
        
        // Get mechanic_id from user
        $mechanic = DB::table('mechanics')
            ->where('user_id_fk', $user->user_id)
            ->first();
        
        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }
        
        // Get job details
        $jobData = DB::table('service_jobs')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_jobs.job_id', $job)
            ->where('service_jobs.assigned_mechanic_id_fk', $mechanic->mechanic_id)
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
        
        // Get parts used in this job
        $parts = DB::table('service_job_parts')
            ->join('parts', 'parts.part_id', '=', 'service_job_parts.part_id_fk')
            ->where('service_job_parts.job_id_fk', $job)
            ->select(
                'service_job_parts.job_part_id',
                'service_job_parts.part_id_fk',
                'parts.part_name',
                'service_job_parts.quantity',
                'service_job_parts.unit_price',
                'service_job_parts.subtotal'
            )
            ->get()
            ->map(fn ($part) => [
                'id' => (string) $part->job_part_id,
                'partId' => (string) $part->part_id_fk,
                'name' => $part->part_name,
                'quantity' => (int) $part->quantity,
                'unitPrice' => (float) $part->unit_price,
                'subtotal' => (float) $part->subtotal,
            ]);
        
        $resource = $this->jobResource($jobData);
        $resource['parts'] = $parts;
        $resource['customerPhone'] = $jobData->customer_phone;
        $resource['customerEmail'] = $jobData->customer_email;
        
        return response()->json(['data' => $resource]);
    }
    
    /**
     * Update job status
     */
    public function updateJobStatus(Request $request, int $job): JsonResponse
    {
        $user = $request->user();
        
        // Get mechanic_id from user
        $mechanic = DB::table('mechanics')
            ->where('user_id_fk', $user->user_id)
            ->first();
        
        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }
        
        $data = $request->validate([
            'status' => ['required', Rule::in(['Pending', 'In Progress', 'Completed'])],
        ]);
        
        // Verify job is assigned to this mechanic
        $jobData = DB::table('service_jobs')
            ->where('job_id', $job)
            ->where('assigned_mechanic_id_fk', $mechanic->mechanic_id)
            ->first();
        
        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }
        
        $statusCode = strtolower(str_replace(' ', '_', $data['status']));
        $statusId = DB::table('service_job_statuses')
            ->where('status_code', $statusCode)
            ->value('service_job_status_id');
        
        DB::transaction(function () use ($job, $statusId, $statusCode, $request) {
            $patch = [
                'service_job_status_id_fk' => $statusId,
                'updated_at' => now(),
            ];
            
            if ($statusCode === 'completed') {
                $patch['completion_date'] = now()->toDateString();
            }
            
            DB::table('service_jobs')
                ->where('job_id', $job)
                ->update($patch);
            
            // Log activity
            DB::table('activity_logs')->insert([
                'user_id_fk' => $request->user()->user_id,
                'action' => 'Updated job #' . $job . ' status to ' . $data['status'],
                'table_name' => 'service_jobs',
                'record_id' => $job,
                'log_date' => now(),
                'description' => 'Mechanic updated job status',
            ]);
        });
        
        return $this->jobDetails($request, $job);
    }
    
    /**
     * Add a part to a job
     */
    public function addPartToJob(Request $request, int $job): JsonResponse
    {
        $user = $request->user();
        
        // Get mechanic_id from user
        $mechanic = DB::table('mechanics')
            ->where('user_id_fk', $user->user_id)
            ->first();
        
        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }
        
        // Verify job is assigned to this mechanic
        $jobData = DB::table('service_jobs')
            ->where('job_id', $job)
            ->where('assigned_mechanic_id_fk', $mechanic->mechanic_id)
            ->first();
        
        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }
        
        $data = $request->validate([
            'partId' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);
        
        // Get part details
        $part = DB::table('parts')
            ->where('part_id', $data['partId'])
            ->first();
        
        if (!$part) {
            return response()->json(['message' => 'Part not found'], 404);
        }
        
        // Check stock availability
        if ($part->stock_quantity < $data['quantity']) {
            return response()->json([
                'message' => 'Insufficient stock',
                'available' => $part->stock_quantity,
                'requested' => $data['quantity'],
            ], 422);
        }
        
        DB::transaction(function () use ($job, $data, $part, $request) {
            // Add part to job
            DB::table('service_job_parts')->insert([
                'job_id_fk' => $job,
                'part_id_fk' => $data['partId'],
                'quantity' => $data['quantity'],
                'unit_price' => $part->unit_price,
                'subtotal' => $part->unit_price * $data['quantity'],
            ]);
            
            // Deduct from inventory
            DB::table('parts')
                ->where('part_id', $data['partId'])
                ->update([
                    'stock_quantity' => DB::raw('stock_quantity - ' . $data['quantity']),
                    'updated_at' => now(),
                ]);
            
            // Record stock movement
            DB::table('stock_movements')->insert([
                'part_id_fk' => $data['partId'],
                'user_id_fk' => $request->user()->user_id,
                'movement_type' => 'out',
                'quantity' => $data['quantity'],
                'reference_type' => 'service_job',
                'reference_id' => $job,
                'movement_date' => now(),
                'remarks' => 'Used in service job #' . $job,
            ]);
            
            // Log activity
            DB::table('activity_logs')->insert([
                'user_id_fk' => $request->user()->user_id,
                'action' => 'Added ' . $data['quantity'] . 'x ' . $part->part_name . ' to job #' . $job,
                'table_name' => 'service_job_parts',
                'record_id' => $job,
                'log_date' => now(),
                'description' => 'Mechanic added part to job',
            ]);
        });
        
        return $this->jobDetails($request, $job);
    }
    
    /**
     * Remove a part from a job
     */
    public function removePartFromJob(Request $request, int $job, int $jobPartId): JsonResponse
    {
        $user = $request->user();
        
        // Get mechanic_id from user
        $mechanic = DB::table('mechanics')
            ->where('user_id_fk', $user->user_id)
            ->first();
        
        if (!$mechanic) {
            return response()->json(['message' => 'Mechanic profile not found'], 404);
        }
        
        // Verify job is assigned to this mechanic
        $jobData = DB::table('service_jobs')
            ->where('job_id', $job)
            ->where('assigned_mechanic_id_fk', $mechanic->mechanic_id)
            ->first();
        
        if (!$jobData) {
            return response()->json(['message' => 'Job not found or not assigned to you'], 404);
        }
        
        // Get part details
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
            // Remove part from job
            DB::table('service_job_parts')
                ->where('job_part_id', $jobPartId)
                ->delete();
            
            // Return to inventory
            DB::table('parts')
                ->where('part_id', $jobPart->part_id_fk)
                ->update([
                    'stock_quantity' => DB::raw('stock_quantity + ' . $jobPart->quantity),
                    'updated_at' => now(),
                ]);
            
            // Record stock movement
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
            
            // Log activity
            DB::table('activity_logs')->insert([
                'user_id_fk' => $request->user()->user_id,
                'action' => 'Removed ' . $jobPart->quantity . 'x ' . $jobPart->part_name . ' from job #' . $job,
                'table_name' => 'service_job_parts',
                'record_id' => $job,
                'log_date' => now(),
                'description' => 'Mechanic removed part from job',
            ]);
        });
        
        return $this->jobDetails($request, $job);
    }
    
    /**
     * Map job data to resource format
     */
    private function jobResource(object $row): array
    {
        return [
            'id' => (string) $row->job_id,
            'customerName' => $row->customer_name,
            'motorcycleModel' => $row->motorcycle_model ?? '',
            'serviceType' => $row->service_name ?? 'General Service',
            'laborCost' => (float) ($row->labor_cost ?? 0),
            'status' => $row->status_name,
            'statusCode' => $row->status_code,
            'notes' => $row->notes ?? '',
            'createdAt' => $this->iso($row->created_at),
            'completedAt' => $row->completion_date ? $this->iso($row->completion_date) : null,
        ];
    }
    
    /**
     * Convert date to ISO 8601 string
     */
    private function iso(mixed $value): ?string
    {
        return $value ? \Illuminate\Support\Carbon::parse($value)->toISOString() : null;
    }
}
