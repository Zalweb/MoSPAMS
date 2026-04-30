<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $primaryKey = 'sale_id';

    protected $fillable = ['customer_id_fk', 'job_id_fk', 'processed_by_fk', 'sale_type', 'total_amount', 'discount', 'net_amount', 'sale_date'];
}
