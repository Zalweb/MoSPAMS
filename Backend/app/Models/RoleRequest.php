<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoleRequest extends Model
{
    protected $fillable = ['user_id_fk', 'requested_role_id_fk', 'status', 'reviewed_by_fk', 'reviewed_at'];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id_fk', 'user_id');
    }

    public function requestedRole()
    {
        return $this->belongsTo(Role::class, 'requested_role_id_fk', 'role_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by_fk', 'user_id');
    }
}
