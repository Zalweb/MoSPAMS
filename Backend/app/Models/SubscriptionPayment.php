<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPayment extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'subscription_payment_id';

    protected $fillable = [
        'shop_subscription_id_fk',
        'shop_id_fk',
        'payment_status',
        'amount',
        'payment_method',
        'due_at',
        'paid_at',
        'reference_number',
        'notes',
        'created_by_fk',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_at' => 'datetime',
            'paid_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
