<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $primaryKey = 'account_id';

    protected $fillable = [
        'full_name',
        'email',
        'password_hash',
        'google_id',
        'account_status_id_fk',
        'email_verified_at',
    ];

    protected $hidden = ['password_hash', 'google_id'];

    public function status()
    {
        return $this->belongsTo(AccountStatus::class, 'account_status_id_fk', 'account_status_id');
    }

    public function memberships()
    {
        return $this->hasMany(ShopMembership::class, 'account_id_fk', 'account_id');
    }

    public function platformAdmin()
    {
        return $this->hasOne(PlatformAdmin::class, 'account_id_fk', 'account_id');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
