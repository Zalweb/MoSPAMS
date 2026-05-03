<?php

namespace App\Models\Concerns;

use App\Support\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder): void {
            $tenant = app(TenantManager::class);

            if ($tenant->isResolved()) {
                $builder->where($builder->getModel()->getTable().'.shop_id_fk', $tenant->requireId());
            }
        });
    }
}
