<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'category_id';

    protected $fillable = ['shop_id_fk', 'category_name', 'description', 'category_status_id_fk'];
}
