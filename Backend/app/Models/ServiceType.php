<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ServiceType extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'service_type_id';

    protected $fillable = ['shop_id_fk', 'service_name', 'description', 'labor_cost', 'estimated_duration', 'service_type_status_id_fk'];
}
