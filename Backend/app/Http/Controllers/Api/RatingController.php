<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RatingController extends \App\Http\Controllers\Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_id'  => 'required|integer|exists:service_jobs,job_id',
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        $user     = auth()->user();
        $customer = DB::table('customers')->where('user_id_fk', $user->user_id)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer profile not found'], 404);
        }

        $job = DB::table('service_jobs')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->where('service_jobs.job_id', $validated['job_id'])
            ->select('service_jobs.*', 'service_job_statuses.status_code')
            ->first();

        if (!$job || $job->customer_id_fk != $customer->customer_id) {
            return response()->json(['error' => 'Unauthorized or job not found'], 403);
        }

        if (!in_array($job->status_code, ['work_done', 'completed'])) {
            return response()->json(['error' => 'Job is not yet completed'], 422);
        }

        if (DB::table('ratings')->where('service_job_id_fk', $job->job_id)->exists()) {
            return response()->json(['error' => 'Job already rated'], 409);
        }

        $mechanic = DB::table('service_job_mechanics')
            ->where('job_id_fk', $job->job_id)
            ->first();

        if (!$mechanic) {
            return response()->json(['error' => 'No mechanic assigned to this job'], 422);
        }

        DB::table('ratings')->insert([
            'service_job_id_fk' => $job->job_id,
            'mechanic_id_fk'    => $mechanic->mechanic_id_fk,
            'customer_id_fk'    => $customer->customer_id,
            'shop_id_fk'        => $customer->shop_id_fk,
            'rating'            => $validated['rating'],
            'comment'           => $validated['comment'] ?? null,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        return response()->json(['message' => 'Rating submitted successfully'], 201);
    }

    public function show($jobId)
    {
        $rating = DB::table('ratings')->where('service_job_id_fk', $jobId)->first();

        if (!$rating) {
            return response()->json(['error' => 'No rating found'], 404);
        }

        return response()->json(['data' => $rating]);
    }
}
