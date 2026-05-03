<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ShopSubscription extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'shop_subscription_id';

    protected $fillable = [
        'shop_id_fk',
        'plan_id_fk',
        'subscription_status',
        'starts_at',
        'ends_at',
        'renews_at',
        'created_by_fk',
        'updated_by_fk',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'renews_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
