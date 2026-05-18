<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
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

        $endpoint = in_array($role, ['owner', 'staff']) ? 'owner' : 'customer';
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

        return response()->json($response->json());
    }
}
