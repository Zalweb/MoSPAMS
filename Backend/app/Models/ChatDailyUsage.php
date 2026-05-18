<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatDailyUsage extends Model
{
    public $timestamps = false;
    protected $fillable = ['user_id_fk', 'shop_id_fk', 'usage_date', 'message_count'];
}
