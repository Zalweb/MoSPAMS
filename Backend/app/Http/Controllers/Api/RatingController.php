<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerRating;
use App\Models\Job;
use Illuminate\Http\Request;

class RatingController extends \App\Http\Controllers\Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_id' => 'required|string|exists:jobs,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        $customer = auth()->user();
        $job = Job::find($validated['job_id']);

        // Verify customer owns this job and job is complete
        if ($job->customer_id !== $customer->id || $job->status !== 'COMPLETED') {
            return response()->json(['error' => 'Unauthorized or invalid job'], 403);
        }

        // Check if already rated
        if ($job->rating) {
            return response()->json(['error' => 'Job already rated'], 409);
        }

        $rating = CustomerRating::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'job_id' => $validated['job_id'],
            'mechanic_id' => $job->mechanic_id,
            'customer_id' => $customer->id,
            'shop_id_fk' => $customer->shop_id_fk,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'],
        ]);

        return response()->json(['data' => $rating], 201);
    }

    public function show($jobId)
    {
        $rating = CustomerRating::where('job_id', $jobId)->first();

        if (!$rating) {
            return response()->json(['error' => 'No rating found'], 404);
        }

        return response()->json(['data' => $rating]);
    }
}
