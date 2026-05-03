<?php

namespace App\Jobs\Middleware;

use App\Models\Shop;
use App\Support\Tenancy\TenantManager;
use Closure;

class RestoreTenantContext
{
    public function __construct(private readonly TenantManager $tenantManager)
    {
    }

    public function handle(object $job, Closure $next): void
    {
        if (! property_exists($job, 'shopId') || ! $job->shopId) {
            $next($job);
            return;
        }

        $shop = Shop::query()->find((int) $job->shopId);

        if (! $shop) {
            $next($job);
            return;
        }

        $this->tenantManager->setCurrent($shop);

        $next($job);

        $this->tenantManager->clear();
    }
}
