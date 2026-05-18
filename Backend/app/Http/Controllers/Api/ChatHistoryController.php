<?php

namespace App\Http\Controllers\Api;

use App\Models\ChatConversation;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ChatHistoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $conversations = ChatConversation::where('user_id_fk', $user->user_id)
            ->where('shop_id_fk', $user->shop_id_fk)
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['conversation_id', 'session_id', 'title', 'updated_at']);
        return response()->json($conversations);
    }

    public function show(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = ChatConversation::where('conversation_id', $conversationId)
            ->where('user_id_fk', $user->user_id)
            ->firstOrFail();
        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get(['role', 'content', 'created_at']);
        return response()->json(['conversation' => $conversation, 'messages' => $messages]);
    }

    public function destroy(Request $request, int $conversationId)
    {
        $user = $request->user();
        $conversation = ChatConversation::where('conversation_id', $conversationId)
            ->where('user_id_fk', $user->user_id)
            ->firstOrFail();
        $conversation->messages()->delete();
        $conversation->delete();
        return response()->json(['deleted' => true]);
    }
}
