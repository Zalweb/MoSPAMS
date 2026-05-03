<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingWebhookEvent extends Model
{
    protected $primaryKey = 'billing_webhook_event_id';

    protected $fillable = [
        'provider',
        'event_id',
        'event_type',
        'signature_valid',
        'processing_status',
        'payload',
        'error_message',
        'received_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'signature_valid' => 'boolean',
            'payload' => 'array',
            'received_at' => 'datetime',
            'processed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
