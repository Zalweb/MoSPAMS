<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerRating;
use App\Models\Job;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerMechanicController extends \App\Http\Controllers\Controller
{
    public function index(Request $request)
    {
        $owner = auth()->user();
        $shopId = $owner->shop_id_fk;

        // Get all mechanics in owner's shop (users with role Mechanic)
        $mechanics = User::where('shop_id_fk', $shopId)
            ->whereHas('role', function ($query) {
                $query->where('role_name', 'Mechanic');
            })
            ->get();

        $now = now();
        $monthStart = $now->copy()->startOfMonth();

        $data = $mechanics->map(function ($mechanic) use ($shopId, $monthStart) {
            $thisMonth = Job::where('shop_id_fk', $shopId)
                ->where('mechanic_id', $mechanic->user_id)
                ->where('status', 'COMPLETED')
                ->whereDate('completed_at', '>=', $monthStart)
                ->get();

            // Get ratings for this month's jobs
            $jobIds = $thisMonth->pluck('id')->toArray();
            $ratings = collect();
            if (!empty($jobIds)) {
                $ratings = CustomerRating::whereIn('job_id', $jobIds)->get();
            }

            $lastActivity = $thisMonth->max('completed_at');

            return [
                'id' => $mechanic->user_id,
                'name' => $mechanic->full_name,
                'status' => 'Active',
                'jobs_this_month' => $thisMonth->count(),
                'avg_rating' => $ratings->count() > 0 ? round($ratings->avg('rating'), 2) : null,
                'last_activity' => $lastActivity?->diffForHumans(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, $mechanicId)
    {
        $owner = auth()->user();
        $shopId = $owner->shop_id_fk;

        // Verify mechanic exists and belongs to owner's shop
        $mechanic = User::where('shop_id_fk', $shopId)
            ->where('user_id', $mechanicId)
            ->whereHas('role', function ($query) {
                $query->where('role_name', 'Mechanic');
            })
            ->firstOrFail();

        $now = now();
        $threeMonthsAgo = $now->copy()->subMonths(3);

        // Performance data for last 3 months
        $jobs = Job::where('shop_id_fk', $shopId)
            ->where('mechanic_id', $mechanicId)
            ->where('status', 'COMPLETED')
            ->whereDate('completed_at', '>=', $threeMonthsAgo)
            ->get();

        // Get ratings for these jobs
        $jobIds = $jobs->pluck('id')->toArray();
        $ratings = collect();
        if (!empty($jobIds)) {
            $ratings = CustomerRating::whereIn('job_id', $jobIds)->get();
        }

        // Build trend for last 3 months
        $trend = [];
        for ($i = 2; $i >= 0; $i--) {
            $monthDate = $now->copy()->subMonths($i);
            $monthStart = $monthDate->copy()->startOfMonth();
            $monthEnd = $monthDate->copy()->endOfMonth();

            $count = $jobs->whereBetween('completed_at', [$monthStart, $monthEnd])->count();
            $trend[] = [
                'month' => $monthDate->format('Y-m'),
                'jobs_completed' => $count,
            ];
        }

        // This month stats
        $monthStart = $now->copy()->startOfMonth();
        $thisMonthJobs = $jobs->filter(function ($job) use ($monthStart) {
            return $job->completed_at && $job->completed_at->greaterThanOrEqualTo($monthStart);
        });

        $avgRating = $ratings->count() > 0 ? round($ratings->avg('rating'), 2) : null;

        // Recent jobs (take 10 most recent)
        $recentJobs = $jobs->sortByDesc('completed_at')->take(10)->map(function ($job) use ($ratings) {
            $jobRating = $ratings->firstWhere('job_id', $job->id);
            return [
                'id' => $job->id,
                'service_type' => $job->service_type ?? 'General Service',
                'customer_name' => $job->customer_name ?? 'Unknown',
                'completed_at' => $job->completed_at?->toIso8601String(),
                'rating' => $jobRating?->rating,
                'comment' => $jobRating?->comment,
            ];
        })->values();

        return response()->json([
            'data' => [
                'mechanic_name' => $mechanic->full_name,
                'jobs_completed_this_month' => $thisMonthJobs->count(),
                'avg_rating' => $avgRating,
                'trend_last_three_months' => $trend,
                'recent_jobs' => $recentJobs,
            ]
        ]);
    }
}
