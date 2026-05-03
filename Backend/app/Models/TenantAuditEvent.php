<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantAuditEvent extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'tenant_audit_event_id';

    protected $fillable = [
        'event_code',
        'level',
        'host',
        'path',
        'shop_id_fk',
        'user_id_fk',
        'context',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
