<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'sale_id';

    protected $fillable = ['shop_id_fk', 'customer_id_fk', 'job_id_fk', 'processed_by_fk', 'sale_type', 'total_amount', 'discount', 'net_amount', 'sale_date'];
}
