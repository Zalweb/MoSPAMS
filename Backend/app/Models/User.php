<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'user_id';

    protected $fillable = [
        'role_id_fk',
        'full_name',
        'username',
        'password_hash',
        'user_status_id_fk',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id_fk', 'role_id');
    }

    public function status()
    {
        return $this->belongsTo(UserStatus::class, 'user_status_id_fk', 'user_status_id');
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
