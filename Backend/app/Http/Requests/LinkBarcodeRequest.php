<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LinkBarcodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()?->hasAnyRole(['owner', 'staff']) ?? false;
    }

    public function rules(): array
    {
        return [
            'barcode_value' => 'required|string|max:255',
            'part_id' => 'required|exists:parts,id',
            'barcode_type' => 'nullable|string|max:50',
        ];
    }
}
