<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToTenant;

class PartBarcode extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'part_id',
        'barcode_value',
        'barcode_type',
        'is_primary',
        'shop_id_fk',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id', 'id');
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id_fk', 'id');
    }
}
