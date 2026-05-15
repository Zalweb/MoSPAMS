<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $busyId      = DB::table('mechanic_statuses')->where('status_code', 'busy')->value('mechanic_status_id');
        $availableId = DB::table('mechanic_statuses')->where('status_code', 'available')->value('mechanic_status_id');
        $inProgressId = DB::table('service_job_statuses')->where('status_code', 'in_progress')->value('service_job_status_id');

        if (! $busyId || ! $availableId || ! $inProgressId) return;

        // Mechanics assigned to at least one in_progress job → mark busy
        $busyMechanicIds = DB::table('service_job_mechanics')
            ->join('service_jobs', 'service_jobs.job_id', '=', 'service_job_mechanics.job_id_fk')
            ->where('service_jobs.service_job_status_id_fk', $inProgressId)
            ->pluck('service_job_mechanics.mechanic_id_fk')
            ->unique();

        if ($busyMechanicIds->isNotEmpty()) {
            DB::table('mechanics')
                ->whereIn('mechanic_id', $busyMechanicIds)
                ->update(['mechanic_status_id_fk' => $busyId, 'updated_at' => now()]);
        }

        // Mechanics currently marked busy but with NO in_progress jobs → restore to available
        $wronglyBusyIds = DB::table('mechanics')
            ->where('mechanic_status_id_fk', $busyId)
            ->whereNotIn('mechanic_id', $busyMechanicIds->isEmpty() ? [0] : $busyMechanicIds)
            ->pluck('mechanic_id');

        if ($wronglyBusyIds->isNotEmpty()) {
            DB::table('mechanics')
                ->whereIn('mechanic_id', $wronglyBusyIds)
                ->update(['mechanic_status_id_fk' => $availableId, 'updated_at' => now()]);
        }
    }

    public function down(): void {}
};
