<?php

namespace App\Http\Controllers\Api;

use App\Models\ChatConversation;
use App\Models\ChatDailyUsage;
use App\Models\ChatMessage;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    private const DAILY_LIMITS = [
        'owner'    => PHP_INT_MAX,
        'staff'    => 200,
        'mechanic' => 50,
        'customer' => 50,
    ];

    public function send(Request $request)
    {
        $request->validate([
            'message'    => 'required|string|max:2000',
            'session_id' => 'required|string|max:64',
        ]);

        $user = $request->user();
        $role = strtolower($user->role?->role_name ?? 'customer');

        if ($role === 'superadmin') {
            return response()->json(['error' => 'Chat is not available for SuperAdmin.'], 403);
        }

        $shopId = $user->shop_id_fk;
        if (!$shopId) {
            return response()->json(['error' => 'No shop associated with this account.'], 422);
        }

        $limit = self::DAILY_LIMITS[$role] ?? 50;
        if ($limit !== PHP_INT_MAX) {
            $usage = ChatDailyUsage::firstOrCreate(
                ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId, 'usage_date' => today()],
                ['message_count' => 0]
            );
            if ($usage->message_count >= $limit) {
                return response()->json(['error' => "Daily message limit of {$limit} reached. Try again tomorrow."], 429);
            }
        }

        $conversation = ChatConversation::firstOrCreate(
            ['session_id' => $request->session_id],
            ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId]
        );

        $endpoint = in_array($role, ['owner', 'staff', 'mechanic']) ? 'owner' : 'customer';
        $aiUrl    = config('services.ai.url');

        $response = Http::timeout(60)->post("{$aiUrl}/chat/{$endpoint}", [
            'shop_id'    => $shopId,
            'user_id'    => $user->user_id,
            'role'       => $role,
            'session_id' => $request->session_id,
            'message'    => $request->message,
        ]);

        if ($response->failed()) {
            return response()->json(['error' => 'AI service unavailable. Please try again.'], 503);
        }

        $data   = $response->json();
        $answer = $data['response'] ?? '';

        ChatMessage::create([
            'conversation_id_fk' => $conversation->conversation_id,
            'role'               => 'user',
            'content'            => $request->message,
        ]);
        ChatMessage::create([
            'conversation_id_fk' => $conversation->conversation_id,
            'role'               => 'assistant',
            'content'            => $answer,
        ]);

        if (!$conversation->title) {
            $conversation->update(['title' => substr($request->message, 0, 80)]);
        }
        $conversation->touch();

        if ($limit !== PHP_INT_MAX) {
            ChatDailyUsage::where('user_id_fk', $user->user_id)
                ->where('shop_id_fk', $shopId)
                ->where('usage_date', today())
                ->increment('message_count');
        }

        return response()->json($data);
    }

    public function stream(Request $request)
    {
        $request->validate([
            'message'    => 'required|string|max:2000',
            'session_id' => 'required|string|max:64',
        ]);

        $user = $request->user();
        $role = strtolower($user->role?->role_name ?? 'customer');

        if ($role === 'superadmin') {
            return response()->json(['error' => 'Chat is not available for SuperAdmin.'], 403);
        }

        $shopId = $user->shop_id_fk;
        if (!$shopId) {
            return response()->json(['error' => 'No shop associated with this account.'], 422);
        }

        $limit = self::DAILY_LIMITS[$role] ?? 50;
        if ($limit !== PHP_INT_MAX) {
            $usage = ChatDailyUsage::firstOrCreate(
                ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId, 'usage_date' => today()],
                ['message_count' => 0]
            );
            if ($usage->message_count >= $limit) {
                return response()->json(['error' => "Daily message limit of {$limit} reached. Try again tomorrow."], 429);
            }
        }

        $conversation = ChatConversation::firstOrCreate(
            ['session_id' => $request->session_id],
            ['user_id_fk' => $user->user_id, 'shop_id_fk' => $shopId]
        );

        ChatMessage::create([
            'conversation_id_fk' => $conversation->conversation_id,
            'role'               => 'user',
            'content'            => $request->message,
        ]);

        if (!$conversation->title) {
            $conversation->update(['title' => substr($request->message, 0, 80)]);
        }

        $endpoint       = in_array($role, ['owner', 'staff', 'mechanic']) ? 'owner' : 'customer';
        $aiUrl          = config('services.ai.url');
        $conversationId = $conversation->conversation_id;
        $userId         = $user->user_id;
        $shopIdVal      = $shopId;
        $limitVal       = $limit;

        $payload = [
            'shop_id'    => $shopId,
            'user_id'    => $user->user_id,
            'role'       => $role,
            'session_id' => $request->session_id,
            'message'    => $request->message,
        ];

        return response()->stream(
            function () use ($aiUrl, $endpoint, $payload, $conversationId, $userId, $shopIdVal, $limitVal) {
                $client = new GuzzleClient();
                $guzzleResponse = $client->post("{$aiUrl}/chat/stream/{$endpoint}", [
                    'json'    => $payload,
                    'stream'  => true,
                    'timeout' => 60,
                ]);

                $accumulated = '';
                $body        = $guzzleResponse->getBody();

                while (!$body->eof()) {
                    $line = '';
                    while (!$body->eof()) {
                        $char = $body->read(1);
                        if ($char === "\n") break;
                        $line .= $char;
                    }
                    $line = trim($line);
                    if (!str_starts_with($line, 'data: ')) continue;
                    $data = substr($line, 6);
                    if ($data === '[DONE]') break;
                    $accumulated .= $data;
                    echo 'data: ' . json_encode(['token' => $data]) . "\n\n";
                    ob_flush();
                    flush();
                }

                ChatMessage::create([
                    'conversation_id_fk' => $conversationId,
                    'role'               => 'assistant',
                    'content'            => $accumulated,
                ]);

                if ($limitVal !== PHP_INT_MAX) {
                    ChatDailyUsage::where('user_id_fk', $userId)
                        ->where('shop_id_fk', $shopIdVal)
                        ->where('usage_date', today())
                        ->increment('message_count');
                }

                echo 'data: ' . json_encode(['done' => true]) . "\n\n";
                ob_flush();
                flush();
            },
            200,
            [
                'Content-Type'      => 'text/event-stream',
                'Cache-Control'     => 'no-cache',
                'X-Accel-Buffering' => 'no',
            ]
        );
    }
}
