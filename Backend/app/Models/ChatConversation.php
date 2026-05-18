<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatConversation extends Model
{
    protected $primaryKey = 'conversation_id';
    protected $fillable   = ['user_id_fk', 'shop_id_fk', 'session_id', 'title'];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id_fk', 'conversation_id');
    }
}
