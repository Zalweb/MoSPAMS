<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePartWithBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()?->hasAnyRole(['owner', 'staff']) ?? false;
    }

    public function rules(): array
    {
        return [
            'brand' => 'required|string|max:255',
            'part_code' => 'required|string|max:255|unique:parts,part_code',
            'description' => 'required|string|max:1000',
            'category_id_fk' => 'required|exists:categories,category_id',
            'price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'barcode_value' => 'required|string|max:255',
            'barcode_type' => 'nullable|string|max:50',
        ];
    }
}
