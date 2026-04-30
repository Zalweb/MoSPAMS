<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RoleRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class GoogleAuthController extends Controller
{
    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate(['credential' => ['required', 'string']]);

        $payload = $this->verifyGoogleToken($request->credential);

        if (!$payload) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        $user = User::with(['role', 'status'])
            ->where(function ($q) use ($payload) {
                $q->where('google_id', $payload['sub'])
                  ->orWhere('email', $payload['email']);
            })
            ->first();

        if (!$user) {
            return response()->json([
                'needs_registration' => true,
                'google_data' => [
                    'google_id' => $payload['sub'],
                    'name'      => $payload['name'] ?? '',
                    'email'     => $payload['email'],
                ],
            ]);
        }

        if ($user->google_id === null) {
            $user->update(['google_id' => $payload['sub']]);
        }

        $this->log($user->user_id, 'Logged in via Google', 'users', $user->user_id);

        return response()->json([
            'token' => $user->createToken('frontend')->plainTextToken,
            'user'  => $this->userResource($user->fresh(['role', 'status'])),
        ]);
    }

    public function googleRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'google_id'      => ['required', 'string', 'unique:users,google_id'],
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'max:100', 'unique:users,email'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'password'       => ['required', 'string', 'min:8'],
            'requested_role' => ['required', 'in:customer,staff,mechanic'],
        ]);

        $customerRole  = Role::where('role_name', 'Customer')->firstOrFail();
        $activeStatus  = UserStatus::where('status_code', 'ACTIVE')->firstOrFail();

        $user = DB::transaction(function () use ($data, $customerRole, $activeStatus) {
            $user = User::create([
                'role_id_fk'        => $customerRole->role_id,
                'full_name'         => $data['name'],
                'username'          => $data['email'],
                'email'             => $data['email'],
                'google_id'         => $data['google_id'],
                'password_hash'     => Hash::make($data['password']),
                'user_status_id_fk' => $activeStatus->user_status_id,
            ]);

            Customer::create([
                'user_id_fk' => $user->user_id,
                'full_name'  => $data['name'],
                'email'      => $data['email'],
                'phone'      => $data['phone'] ?? null,
            ]);

            if (in_array($data['requested_role'], ['staff', 'mechanic'])) {
                $requestedRole = Role::where('role_name', ucfirst($data['requested_role']))->firstOrFail();
                RoleRequest::create([
                    'user_id_fk'           => $user->user_id,
                    'requested_role_id_fk' => $requestedRole->role_id,
                    'status'               => 'pending',
                ]);
            }

            return $user;
        });

        $this->log($user->user_id, 'Registered via Google', 'users', $user->user_id);

        return response()->json([
            'token' => $user->createToken('frontend')->plainTextToken,
            'user'  => $this->userResource($user->load(['role', 'status'])),
        ]);
    }

    private function verifyGoogleToken(string $credential): ?array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $credential,
        ]);

        if (!$response->ok()) {
            return null;
        }

        $payload = $response->json();

        if (($payload['aud'] ?? '') !== config('services.google.client_id')) {
            return null;
        }

        return $payload;
    }

    private function userResource(User $user): array
    {
        return [
            'id'         => (string) $user->user_id,
            'name'       => $user->full_name,
            'email'      => $user->email ?? $user->username,
            'role'       => $user->role?->role_name,
            'status'     => $user->status?->status_name,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
