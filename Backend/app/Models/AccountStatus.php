<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountStatus extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'account_status_id';

    protected $fillable = ['status_code', 'status_name', 'description'];
}
