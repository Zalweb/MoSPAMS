<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    protected $primaryKey = 'shop_id';

    protected $fillable = [
        'shop_name',
        'registration_owner_name',
        'registration_owner_email',
        'invitation_code',
        'subdomain',
        'custom_domain',
        'domain_status',
        'registration_status',
        'registration_rejection_reason',
        'registration_approved_at',
        'registration_rejected_at',
        'verification_token',
        'verified_at',
        'last_checked_at',
        'logo_url',
        'primary_color',
        'secondary_color',
        'phone',
        'address',
        'business_description',
        'facebook_url',
        'instagram_url',
        'business_hours',
        'shop_status_id_fk',
    ];

    public function status()
    {
        return $this->belongsTo(ShopStatus::class, 'shop_status_id_fk', 'shop_status_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'shop_id_fk', 'shop_id');
    }

    protected function casts(): array
    {
        return [
            'business_hours' => 'array',
            'verified_at' => 'datetime',
            'last_checked_at' => 'datetime',
            'registration_approved_at' => 'datetime',
            'registration_rejected_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
