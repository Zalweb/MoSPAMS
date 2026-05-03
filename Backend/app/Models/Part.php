<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Part extends Model
{
    use BelongsToTenant;

    protected $primaryKey = 'part_id';

    protected $fillable = [
        'shop_id_fk',
        'category_id_fk',
        'part_name',
        'barcode',
        'description',
        'unit_price',
        'stock_quantity',
        'reorder_level',
        'part_status_id_fk',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id_fk', 'category_id');
    }
}
