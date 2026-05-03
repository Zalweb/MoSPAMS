<?php

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TenantAuditLogger
{
    public function write(string $eventCode, string $level, array $context = []): void
    {
        $context = array_merge([
            'host' => request()->getHost(),
            'path' => request()->path(),
            'method' => request()->method(),
            'ip' => request()->ip(),
            'shopId' => app(TenantManager::class)->id(),
            'userId' => request()->user()?->user_id,
        ], $context);

        Log::channel((string) config('tenancy.audit_channel', 'stack'))->log($level, sprintf('tenant.%s', $eventCode), $context);

        DB::table('tenant_audit_events')->insert([
            'event_code' => $eventCode,
            'level' => $level,
            'host' => substr((string) ($context['host'] ?? ''), 0, 100),
            'path' => substr((string) ($context['path'] ?? ''), 0, 255),
            'user_id_fk' => $context['userId'] ?? null,
            'shop_id_fk' => $context['shopId'] ?? null,
            'context' => json_encode($context),
            'created_at' => now(),
        ]);
    }
}
