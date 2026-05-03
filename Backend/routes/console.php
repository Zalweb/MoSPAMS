<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\CleanupOrphanedTenantMediaJob;
use App\Jobs\DomainHealthCheckJob;
use App\Jobs\RunSubscriptionRenewalSweepJob;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new RunSubscriptionRenewalSweepJob())->everyFifteenMinutes();
Schedule::job(new CleanupOrphanedTenantMediaJob())->dailyAt('02:00');
Schedule::job(new DomainHealthCheckJob())->hourly();
