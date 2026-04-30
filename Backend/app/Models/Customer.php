<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $primaryKey = 'customer_id';

    protected $fillable = ['user_id_fk', 'full_name', 'phone', 'email', 'address'];
}
