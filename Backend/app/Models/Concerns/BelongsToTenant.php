<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantScope;
use App\Support\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (Model $model): void {
            if (! $model->getAttribute('shop_id_fk')) {
                $tenantManager = app(TenantManager::class);
                $currentShop = $tenantManager->current();

                if ($currentShop) {
                    $model->setAttribute('shop_id_fk', $currentShop->shop_id);
                }
            }
        });
    }
}
