<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopMembership extends Model
{
    protected $primaryKey = 'membership_id';

    protected $fillable = [
        'account_id_fk',
        'shop_id_fk',
        'role_id_fk',
        'membership_status_id_fk',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id_fk', 'account_id');
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'shop_id');
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id_fk', 'role_id');
    }

    public function status()
    {
        return $this->belongsTo(MembershipStatus::class, 'membership_status_id_fk', 'membership_status_id');
    }
}
