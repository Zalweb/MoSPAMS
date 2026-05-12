<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('service_job_statuses')->insertOrIgnore([
            [
                'status_code' => 'booked_confirmed',
                'status_name' => 'Booked & Confirmed',
                'description' => 'Booking confirmed by staff, mechanic(s) assigned',
            ],
            [
                'status_code' => 'work_done',
                'status_name' => 'Work Done',
                'description' => 'Mechanic completed work, awaiting staff payment confirmation',
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('service_job_statuses')
            ->whereIn('status_code', ['booked_confirmed', 'work_done'])
            ->delete();
    }
};
