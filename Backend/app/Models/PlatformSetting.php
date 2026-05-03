<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $primaryKey = 'setting_key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'setting_key',
        'setting_value',
        'is_encrypted',
        'updated_by_fk',
    ];

    protected function casts(): array
    {
        return [
            'is_encrypted' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
