<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerMechanicController extends \App\Http\Controllers\Controller
{
    public function index(Request $request)
    {
        $user   = auth()->user();
        $shopId = $user->shop_id_fk;

        $mechanics = DB::table('mechanics')
            ->where('shop_id_fk', $shopId)
            ->select('mechanic_id', 'full_name')
            ->get();

        $now        = now();
        $monthStart = $now->copy()->startOfMonth()->toDateString();

        $data = $mechanics->map(function ($mechanic) use ($shopId, $monthStart, $now) {
            $thisMonthJobs = DB::table('service_jobs')
                ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
                ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                ->where('service_job_mechanics.mechanic_id_fk', $mechanic->mechanic_id)
                ->where('service_jobs.shop_id_fk', $shopId)
                ->where('service_job_statuses.status_code', 'work_done')
                ->whereDate('service_jobs.completion_date', '>=', $monthStart)
                ->pluck('service_jobs.job_id')
                ->all();

            $count = count($thisMonthJobs);

            $avgRating = null;
            $lastActivity = null;
            if ($count > 0) {
                $ratingData = DB::table('ratings')
                    ->whereIn('service_job_id_fk', $thisMonthJobs)
                    ->avg('rating');
                $avgRating = $ratingData ? round($ratingData, 2) : null;

                $lastDate = DB::table('service_jobs')
                    ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
                    ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
                    ->where('service_job_mechanics.mechanic_id_fk', $mechanic->mechanic_id)
                    ->where('service_jobs.shop_id_fk', $shopId)
                    ->where('service_job_statuses.status_code', 'work_done')
                    ->whereDate('service_jobs.completion_date', '>=', $monthStart)
                    ->max('service_jobs.completion_date');
                $lastActivity = $lastDate ? \Illuminate\Support\Carbon::parse($lastDate)->diffForHumans() : null;
            }

            return [
                'id'             => $mechanic->mechanic_id,
                'name'           => $mechanic->full_name,
                'status'         => 'Active',
                'jobs_this_month'=> $count,
                'avg_rating'     => $avgRating,
                'last_activity'  => $lastActivity,
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, $mechanicId)
    {
        $user   = auth()->user();
        $shopId = $user->shop_id_fk;

        $mechanic = DB::table('mechanics')
            ->where('shop_id_fk', $shopId)
            ->where('mechanic_id', $mechanicId)
            ->first();

        if (!$mechanic) {
            return response()->json(['error' => 'Mechanic not found'], 404);
        }

        $now           = now();
        $threeMonthsAgo = $now->copy()->subMonths(3)->toDateString();

        $jobs = DB::table('service_jobs')
            ->join('service_job_mechanics', 'service_job_mechanics.job_id_fk', '=', 'service_jobs.job_id')
            ->join('service_job_statuses', 'service_job_statuses.service_job_status_id', '=', 'service_jobs.service_job_status_id_fk')
            ->join('customers', 'customers.customer_id', '=', 'service_jobs.customer_id_fk')
            ->leftJoin('service_job_items', 'service_job_items.job_id_fk', '=', 'service_jobs.job_id')
            ->leftJoin('service_types', 'service_types.service_type_id', '=', 'service_job_items.service_type_id_fk')
            ->where('service_job_mechanics.mechanic_id_fk', $mechanicId)
            ->where('service_jobs.shop_id_fk', $shopId)
            ->where('service_job_statuses.status_code', 'work_done')
            ->whereDate('service_jobs.completion_date', '>=', $threeMonthsAgo)
            ->select('service_jobs.job_id', 'service_jobs.completion_date', 'customers.full_name as customer_name', 'service_types.service_name')
            ->distinct()
            ->orderByDesc('service_jobs.completion_date')
            ->get();

        $jobIds = $jobs->pluck('job_id')->all();

        $ratingsMap = DB::table('ratings')
            ->whereIn('service_job_id_fk', $jobIds)
            ->get()
            ->keyBy('service_job_id_fk');

        // Build 3-month trend
        $trend = [];
        for ($i = 2; $i >= 0; $i--) {
            $monthDate  = $now->copy()->subMonths($i);
            $monthStart = $monthDate->copy()->startOfMonth()->toDateString();
            $monthEnd   = $monthDate->copy()->endOfMonth()->toDateString();

            $count = $jobs->filter(fn($j) =>
                $j->completion_date >= $monthStart && $j->completion_date <= $monthEnd
            )->count();

            $trend[] = [
                'month'          => $monthDate->format('Y-m'),
                'jobs_completed' => $count,
            ];
        }

        $allRatings = $ratingsMap->pluck('rating')->filter();
        $avgRating  = $allRatings->count() > 0 ? round($allRatings->avg(), 2) : null;

        $monthStart      = $now->copy()->startOfMonth()->toDateString();
        $thisMonthCount  = $jobs->filter(fn($j) => $j->completion_date >= $monthStart)->count();

        $recentJobs = $jobs->take(10)->map(function ($job) use ($ratingsMap) {
            $r = $ratingsMap->get($job->job_id);
            return [
                'id'           => $job->job_id,
                'service_type' => $job->service_name ?? 'General Service',
                'customer_name'=> $job->customer_name,
                'completed_at' => $job->completion_date,
                'rating'       => $r ? $r->rating : null,
                'comment'      => $r ? $r->comment : null,
            ];
        })->values();

        return response()->json([
            'data' => [
                'mechanic_name'             => $mechanic->full_name,
                'jobs_completed_this_month' => $thisMonthCount,
                'avg_rating'                => $avgRating,
                'trend_last_three_months'   => $trend,
                'recent_jobs'               => $recentJobs,
            ]
        ]);
    }
}
