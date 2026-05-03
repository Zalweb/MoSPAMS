<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserStatus extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'user_status_id';

    protected $fillable = ['status_code', 'status_name', 'description'];
}
