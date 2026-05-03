<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SubscriptionInvoice extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'subscription_invoice_id';

    protected $fillable = [
        'shop_subscription_id_fk',
        'shop_id_fk',
        'invoice_number',
        'invoice_status',
        'amount_due',
        'due_at',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_due' => 'decimal:2',
            'due_at' => 'datetime',
            'paid_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
