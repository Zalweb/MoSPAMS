<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->with(['role', 'status'])
            ->where(function ($q) use ($credentials) {
                $q->where('username', $credentials['email'])
                  ->orWhere('email', $credentials['email']);
            })
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        if ($user->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['email' => 'This account is inactive.']);
        }

        $this->log($user->user_id, 'Logged in to the system', 'users', $user->user_id);

        return response()->json([
            'token' => $user->createToken('frontend')->plainTextToken,
            'user' => $this->userResource($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userResource($request->user()->load(['role', 'status']))]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();
        $this->log($user->user_id, 'Logged out of the system', 'users', $user->user_id);

        return response()->json(['message' => 'Logged out.']);
    }

    private function userResource(User $user): array
    {
        return [
            'id' => (string) $user->user_id,
            'name' => $user->full_name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role?->role_name,
            'status' => $user->status?->status_name,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'user_id_fk' => $userId,
            'action' => $action,
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }
}
