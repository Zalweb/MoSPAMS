<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class MechanicStatusSync
{
    public static function markBusyForJob(int $jobId): void
    {
        $busyId = DB::table('mechanic_statuses')
            ->where('status_code', 'busy')
            ->value('mechanic_status_id');

        if (! $busyId) return;

        $mechanicIds = DB::table('service_job_mechanics')
            ->where('job_id_fk', $jobId)
            ->pluck('mechanic_id_fk');

        if ($mechanicIds->isEmpty()) return;

        DB::table('mechanics')
            ->whereIn('mechanic_id', $mechanicIds)
            ->update(['mechanic_status_id_fk' => $busyId, 'updated_at' => now()]);
    }

    public static function releaseForJob(int $jobId, int $shopId): void
    {
        $availableId = DB::table('mechanic_statuses')
            ->where('status_code', 'available')
            ->value('mechanic_status_id');

        $inProgressStatusId = DB::table('service_job_statuses')
            ->where('status_code', 'in_progress')
            ->value('service_job_status_id');

        if (! $availableId || ! $inProgressStatusId) return;

        $mechanicIds = DB::table('service_job_mechanics')
            ->where('job_id_fk', $jobId)
            ->pluck('mechanic_id_fk');

        foreach ($mechanicIds as $mechId) {
            $stillBusy = DB::table('service_job_mechanics')
                ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
                ->where('service_job_mechanics.mechanic_id_fk', $mechId)
                ->where('service_jobs.shop_id_fk', $shopId)
                ->where('service_jobs.service_job_status_id_fk', $inProgressStatusId)
                ->where('service_jobs.job_id', '!=', $jobId)
                ->exists();

            if (! $stillBusy) {
                DB::table('mechanics')
                    ->where('mechanic_id', $mechId)
                    ->update(['mechanic_status_id_fk' => $availableId, 'updated_at' => now()]);
            }
        }
    }
}
