<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    public $timestamps  = false;
    protected $primaryKey = 'message_id';
    protected $fillable   = ['conversation_id_fk', 'role', 'content', 'token_count'];
    protected $casts      = ['created_at' => 'datetime'];
}
