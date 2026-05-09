<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipStatus extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'membership_status_id';

    protected $fillable = ['status_code', 'status_name', 'description'];
}
