<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelStalePendingServicesCommand extends Command
{
    protected $signature   = 'services:cancel-stale';
    protected $description = 'Cancel pending service jobs older than 12 hours.';

    public function handle(): int
    {
        $pendingStatusId = (int) DB::table('service_job_statuses')
            ->where('status_code', 'pending')
            ->value('service_job_status_id');

        $cancelledStatusId = (int) DB::table('service_job_statuses')
            ->where('status_code', 'cancelled')
            ->value('service_job_status_id');

        $cutoff = now()->subHours(12);

        $stale = DB::table('service_jobs')
            ->where('service_job_status_id_fk', $pendingStatusId)
            ->where('created_at', '<', $cutoff)
            ->get(['job_id', 'customer_id_fk', 'shop_id_fk']);

        $count = 0;
        foreach ($stale as $job) {
            DB::table('service_jobs')
                ->where('job_id', $job->job_id)
                ->update([
                    'service_job_status_id_fk' => $cancelledStatusId,
                    'updated_at'               => now(),
                ]);

            if ($job->customer_id_fk) {
                $userIdFk = DB::table('customers')
                    ->where('customer_id', $job->customer_id_fk)
                    ->value('user_id_fk');

                if ($userIdFk) {
                    DB::table('notifications')->insert([
                        'shop_id_fk'        => $job->shop_id_fk,
                        'user_id_fk'        => $userIdFk,
                        'notification_type' => 'job_status_update',
                        'title'             => 'Service Booking Cancelled',
                        'message'           => 'Your service booking was automatically cancelled due to no response within 12 hours.',
                        'reference_type'    => 'service_job',
                        'reference_id'      => $job->job_id,
                        'is_read'           => 0,
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }
            }

            $count++;
        }

        $this->info("Cancelled {$count} stale pending service job(s).");

        return self::SUCCESS;
    }
}
