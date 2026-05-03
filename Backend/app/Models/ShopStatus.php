<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopStatus extends Model
{
    protected $primaryKey = 'shop_status_id';
    public $timestamps = false;

    protected $fillable = [
        'status_code',
        'status_name',
        'description',
    ];
}
