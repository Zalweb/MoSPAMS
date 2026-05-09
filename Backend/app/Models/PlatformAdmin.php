<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformAdmin extends Model
{
    protected $primaryKey = 'platform_admin_id';

    protected $fillable = ['account_id_fk', 'user_status_id_fk'];

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id_fk', 'account_id');
    }

    public function status()
    {
        return $this->belongsTo(UserStatus::class, 'user_status_id_fk', 'user_status_id');
    }
}
