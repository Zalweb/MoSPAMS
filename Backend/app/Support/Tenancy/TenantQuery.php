<?php

namespace App\Support\Tenancy;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class TenantQuery
{
    public static function table(string $table, ?string $shopColumn = 'shop_id_fk'): Builder
    {
        $query = DB::table($table);
        $tenant = app(TenantManager::class);

        if ($shopColumn && $tenant->isResolved()) {
            $query->where($table.'.'.$shopColumn, $tenant->requireId());
        }

        return $query;
    }

    public static function key(string $key, ?int $shopId = null): string
    {
        $prefix = (string) config('tenancy.cache_prefix', 'shop');
        $resolvedShopId = $shopId ?? app(TenantManager::class)->id();

        if (! $resolvedShopId) {
            return sprintf('%s:global:%s', $prefix, $key);
        }

        return sprintf('%s:%d:%s', $prefix, $resolvedShopId, $key);
    }
}
