<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Mechanic extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'mechanic_id';

    protected $fillable = ['shop_id_fk', 'user_id_fk', 'full_name', 'phone', 'email', 'address', 'mechanic_status_id_fk'];
}
