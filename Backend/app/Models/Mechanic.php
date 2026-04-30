<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Mechanic extends Model
{
    protected $primaryKey = 'mechanic_id';

    protected $fillable = ['user_id_fk', 'full_name', 'phone', 'email', 'address', 'mechanic_status_id_fk'];
}
