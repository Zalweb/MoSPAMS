<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'customer_id';

    protected $fillable = ['shop_id_fk', 'user_id_fk', 'full_name', 'phone', 'email', 'address'];
}
