<?php

namespace App\Http\Controllers;

use App\Support\Tenancy\TenantManager;
use App\Support\Tenancy\TenantQuery;
use Illuminate\Database\Query\Builder;

abstract class Controller
{
    protected function tenantManager(): TenantManager
    {
        return app(TenantManager::class);
    }

    protected function tenantTable(string $table, ?string $shopColumn = 'shop_id_fk'): Builder
    {
        return TenantQuery::table($table, $shopColumn);
    }

    protected function tenantCacheKey(string $key, ?int $shopId = null): string
    {
        return TenantQuery::key($key, $shopId);
    }
}
