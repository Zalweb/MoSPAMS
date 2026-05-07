<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordChangedMail;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Support\Tenancy\PlatformHostResolver;
use App\Support\Tenancy\TenantAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly PlatformHostResolver $platformHosts,
        private readonly TenantAuditLogger $tenantAudit,
    ) {
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Always return the same message — never reveal whether email exists
        $genericMessage = 'If an account with that email exists, a reset link has been sent.';

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user || !$user->email) {
            return response()->json(['message' => $genericMessage]);
        }

        // Tenant isolation: only allow reset if user belongs to this shop
        $shop = $request->attributes->get('shop');
        if ($shop && $user->shop_id_fk !== $shop->shop_id) {
            return response()->json(['message' => $genericMessage]);
        }

        // 60-second cooldown: silently drop the request if a token was issued recently
        $recentlySent = DB::table('password_resets')
            ->where('user_id', $user->user_id)
            ->where('created_at', '>', now()->subSeconds(60))
            ->exists();

        if ($recentlySent) {
            return response()->json(['message' => $genericMessage]);
        }

        // Invalidate any existing unused tokens for this user
        DB::table('password_resets')
            ->where('user_id', $user->user_id)
            ->where('used', false)
            ->update(['used' => true]);

        $rawToken  = Str::random(64);
        $tokenHash = hash('sha256', $rawToken);

        DB::table('password_resets')->insert([
            'user_id'    => $user->user_id,
            'token_hash' => $tokenHash,
            'expires_at' => now()->addMinutes(15),
            'used'       => false,
            'created_at' => now(),
        ]);

        // Build reset URL pointing back to the frontend the request came from
        $host   = $request->header('X-Tenant-Host') ?: parse_url(config('app.url'), PHP_URL_HOST);
        $scheme = str_contains((string) $host, 'localhost') ? 'http' : 'https';
        $resetUrl = "{$scheme}://{$host}/reset-password?token={$rawToken}";

        try {
            Mail::to($user->email)->send(new PasswordResetMail($user->full_name, $resetUrl));
        } catch (\Throwable $e) {
            Log::error('Password reset email failed', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
        }

        return response()->json(['message' => $genericMessage]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required', 'string'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $tokenHash = hash('sha256', $data['token']);

        $record = DB::table('password_resets')
            ->where('token_hash', $tokenHash)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired reset link.'], 422);
        }

        $user = User::find($record->user_id);

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired reset link.'], 422);
        }

        DB::transaction(function () use ($user, $data, $record) {
            $user->update(['password_hash' => Hash::make($data['password'])]);

            DB::table('password_resets')
                ->where('id', $record->id)
                ->update(['used' => true]);

            // Revoke all active sessions / tokens
            $user->tokens()->delete();
        });

        $this->log($user->user_id, $user->shop_id_fk, 'Password reset via email link', 'users', $user->user_id);

        try {
            if ($user->email) {
                Mail::to($user->email)->send(new PasswordChangedMail($user->full_name));
            }
        } catch (\Throwable $e) {
            Log::error('Password changed confirmation email failed', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
        }

        return response()->json(['message' => 'Password reset successfully. You can now log in.']);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->with(['role', 'status', 'shop.status'])
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password_hash)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        $shop = $request->attributes->get('shop');
        $isPlatformHost = $this->platformHosts->requestIsPlatformHost($request);

        // SuperAdmin accounts are only allowed on dedicated platform hosts.
        if ($user->role?->role_name === 'SuperAdmin' && ! $isPlatformHost) {
            $this->tenantAudit->write('superadmin_wrong_host_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['email' => 'SuperAdmin accounts must log in through the platform portal.']);
        }

        // Tenant users are not allowed to log in on platform hosts.
        if ($user->role?->role_name !== 'SuperAdmin' && $isPlatformHost) {
            $this->tenantAudit->write('tenant_user_platform_host_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['email' => 'Tenant users must log in from their shop domain.']);
        }

        // Validate shop context for tenant users (non-SuperAdmin)
        if ($shop && $user->role?->role_name !== 'SuperAdmin') {
            if ($user->shop_id_fk !== $shop->shop_id) {
                $this->tenantAudit->write('tenant_cross_shop_login', 'warning', [
                    'attemptedHost' => $request->getHost(),
                    'userId' => $user->user_id,
                    'userShopId' => $user->shop_id_fk,
                    'resolvedShopId' => (int) $shop->shop_id,
                ]);
                throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
            }
        }

        if (! $shop && $user->role?->role_name !== 'SuperAdmin') {
            $this->tenantAudit->write('tenant_login_without_shop_context', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['email' => 'This domain is not associated with your shop account.']);
        }

        if ($user->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['email' => 'This account is inactive.']);
        }

        $this->log($user->user_id, $user->shop_id_fk, 'Logged in to the system', 'users', $user->user_id);

        $abilities = $user->role?->role_name === 'SuperAdmin'
            ? ['platform:*']
            : ($user->shop_id_fk ? [sprintf('tenant:%d', (int) $user->shop_id_fk)] : ['public:guest']);

        return response()->json([
            'token' => $user->createToken('frontend', $abilities)->plainTextToken,
            'user' => $this->userResource($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userResource($request->user()->load(['role', 'status', 'shop.status']))]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();
        $this->log($user->user_id, $user->shop_id_fk, 'Logged out of the system', 'users', $user->user_id);

        return response()->json(['message' => 'Logged out.']);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invitationCode' => ['required', 'string', 'exists:shops,invitation_code'],
            'fullName' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'requestedRole' => ['required', 'in:Staff,Mechanic'],
        ]);

        $shop = DB::table('shops')
            ->where('invitation_code', $data['invitationCode'])
            ->first();

        if (!$shop) {
            throw ValidationException::withMessages(['invitationCode' => 'Invalid invitation code.']);
        }

        // Check if shop is active
        $shopStatus = DB::table('shop_statuses')
            ->where('shop_status_id', $shop->shop_status_id_fk)
            ->value('status_code');

        if (strtoupper($shopStatus) !== 'ACTIVE') {
            throw ValidationException::withMessages(['invitationCode' => 'This shop is not currently accepting new members.']);
        }

        $requestedRoleId = DB::table('roles')->where('role_name', $data['requestedRole'])->value('role_id');
        $customerRoleId = DB::table('roles')->where('role_name', 'Customer')->value('role_id');
        $pendingStatusId = DB::table('user_statuses')->where('status_code', 'pending')->value('user_status_id');

        return DB::transaction(function () use ($data, $shop, $requestedRoleId, $customerRoleId, $pendingStatusId) {
            // Create user with Customer role and pending status
            $userId = DB::table('users')->insertGetId([
                'shop_id_fk' => $shop->shop_id,
                'role_id_fk' => $customerRoleId,
                'full_name' => $data['fullName'],
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'user_status_id_fk' => $pendingStatusId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create role request if requesting Staff or Mechanic
            if ($data['requestedRole'] !== 'Customer') {
                DB::table('role_requests')->insert([
                    'shop_id_fk' => $shop->shop_id,
                    'user_id_fk' => $userId,
                    'requested_role_id_fk' => $requestedRoleId,
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->log($userId, $shop->shop_id, "Registered to shop {$shop->shop_name} as {$data['requestedRole']}", 'users', $userId);

            return response()->json([
                'message' => 'Registration successful. Your account is pending approval by the shop owner.',
                'userId' => (string) $userId,
                'shopName' => $shop->shop_name,
                'requestedRole' => $data['requestedRole'],
            ], 201);
        });
    }

    private function userResource(User $user): array
    {
        return [
            'id' => (string) $user->user_id,
            'name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role?->role_name,
            'status' => $user->status?->status_name,
            'shopId' => $user->shop_id_fk ? (string) $user->shop_id_fk : null,
            'shopName' => $user->shop?->shop_name,
            'shopStatus' => $user->shop?->status?->status_code,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function log(int $userId, ?int $shopId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $userId,
            'action' => $action,
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }
}
