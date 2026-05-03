<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class ServiceJob extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'job_id';

    protected $fillable = [
        'shop_id_fk',
        'customer_id_fk',
        'assigned_mechanic_id_fk',
        'created_by_fk',
        'service_job_status_id_fk',
        'job_date',
        'completion_date',
        'motorcycle_model',
        'notes',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id_fk', 'customer_id');
    }
}
