<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceType extends Model
{
    protected $primaryKey = 'service_type_id';

    protected $fillable = ['service_name', 'description', 'labor_cost', 'estimated_duration', 'service_type_status_id_fk'];
}
