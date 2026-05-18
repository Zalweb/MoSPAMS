<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'customer_id';

    protected $fillable = ['shop_id_fk', 'user_id_fk', 'account_id_fk', 'full_name', 'phone', 'email', 'address'];

    public function serviceJobs()
    {
        return $this->hasMany(ServiceJob::class, 'customer_id_fk', 'customer_id');
    }
}
