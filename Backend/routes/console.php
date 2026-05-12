<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\Identity\MembershipRoleGuard;
use App\Jobs\CleanupOrphanedTenantMediaJob;
use App\Jobs\DomainHealthCheckJob;
use App\Jobs\RunSubscriptionRenewalSweepJob;
use App\Console\Commands\CancelStalePendingServicesCommand;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('identity:audit-memberships', function (MembershipRoleGuard $guard) {
    $conflicts = $guard->conflicts();

    if ($conflicts['multi_work_role_accounts'] === [] && $conflicts['multi_owner_shops'] === []) {
        $this->info('No identity membership conflicts found.');

        return self::SUCCESS;
    }

    if ($conflicts['multi_work_role_accounts'] !== []) {
        $this->error('Accounts with multiple active work-role memberships:');
        foreach ($conflicts['multi_work_role_accounts'] as $row) {
            $this->line(sprintf('- account_id=%d memberships=%d', $row['account_id'], $row['membership_count']));
        }
    }

    if ($conflicts['multi_owner_shops'] !== []) {
        $this->error('Shops with multiple active owners:');
        foreach ($conflicts['multi_owner_shops'] as $row) {
            $this->line(sprintf('- shop_id=%d owners=%d', $row['shop_id'], $row['owner_count']));
        }
    }

    return self::FAILURE;
})->purpose('Audit account/shop membership conflicts against the single-shop worker rules');

Schedule::job(new RunSubscriptionRenewalSweepJob())->everyFifteenMinutes();
Schedule::job(new CleanupOrphanedTenantMediaJob())->dailyAt('02:00');
Schedule::job(new DomainHealthCheckJob())->hourly();
Schedule::command(CancelStalePendingServicesCommand::class)->hourly();
