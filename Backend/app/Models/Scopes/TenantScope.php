<?php

namespace App\Models\Scopes;

use App\Support\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantManager = app(TenantManager::class);
        $currentShop = $tenantManager->current();

        if ($currentShop) {
            $builder->where($model->getTable() . '.shop_id_fk', '=', $currentShop->shop_id);
        }
    }
}
