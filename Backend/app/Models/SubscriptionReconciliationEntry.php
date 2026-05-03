<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SubscriptionReconciliationEntry extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'reconciliation_entry_id';

    protected $fillable = [
        'shop_id_fk',
        'shop_subscription_id_fk',
        'subscription_payment_id_fk',
        'subscription_invoice_id_fk',
        'entry_type',
        'amount',
        'notes',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
