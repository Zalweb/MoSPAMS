<?php

namespace App\Jobs;

use App\Services\Domain\CloudflareDomainService;
use App\Support\Tenancy\TenantAuditLogger;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class DomainHealthCheckJob implements ShouldQueue
{
    use Queueable;

    public function handle(CloudflareDomainService $domainService, TenantAuditLogger $audit): void
    {
        $shops = DB::table('shops')
            ->whereNotNull('custom_domain')
            ->whereRaw('UPPER(domain_status) IN (?, ?)', ['VERIFIED', 'ACTIVE'])
            ->get(['shop_id', 'custom_domain']);

        foreach ($shops as $shop) {
            $healthy = $domainService->sslReady((string) $shop->custom_domain);

            DB::table('shops')->where('shop_id', (int) $shop->shop_id)->update([
                'domain_status' => $healthy ? 'ACTIVE' : 'DEGRADED',
                'last_checked_at' => now(),
                'updated_at' => now(),
            ]);

            if (! $healthy) {
                $audit->write('domain_unhealthy', 'warning', [
                    'shopId' => (int) $shop->shop_id,
                    'customDomain' => $shop->custom_domain,
                ]);
            }
        }
    }
}
