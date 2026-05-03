<?php

namespace App\Jobs;

use App\Services\Billing\SubscriptionLifecycleService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RunSubscriptionRenewalSweepJob implements ShouldQueue
{
    use Queueable;

    public function handle(SubscriptionLifecycleService $service): void
    {
        $service->runRenewalSweep();
    }
}
