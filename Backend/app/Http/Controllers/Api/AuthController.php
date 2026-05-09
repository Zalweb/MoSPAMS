<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordChangedMail;
use App\Mail\PasswordResetMail;
use App\Models\Account;
use App\Models\ShopMembership;
use App\Models\Shop;
use App\Models\User;
use App\Services\Identity\AccountProvisioner;
use App\Services\Identity\JoinShopTokenBroker;
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
        private readonly AccountProvisioner $accounts,
        private readonly JoinShopTokenBroker $joinTokens,
    ) {
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Always return the same message — never reveal whether email exists
        $genericMessage = 'If an account with that email exists, a reset link has been sent.';

        $account = $this->accounts->findAccountByLogin(strtolower($request->email));

        if (!$account || !$account->email) {
            return response()->json(['message' => $genericMessage]);
        }

        // Tenant isolation: only allow reset if user belongs to this shop
        $shop = $request->attributes->get('shop');
        $membership = $shop ? $this->accounts->membership($account, (int) $shop->shop_id) : null;
        if ($shop && ! $membership) {
            return response()->json(['message' => $genericMessage]);
        }

        $user = $shop
            ? User::query()->where('account_id_fk', $account->account_id)->where('shop_id_fk', $shop->shop_id)->first()
            : User::query()->where('account_id_fk', $account->account_id)->orderBy('user_id')->first();

        if (! $user) {
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
            $passwordHash = Hash::make($data['password']);
            $user->account?->update(['password_hash' => $passwordHash]);
            User::query()->where('account_id_fk', $user->account_id_fk)->update(['password_hash' => $passwordHash, 'updated_at' => now()]);

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

        $account = $this->accounts->findAccountByLogin($credentials['email']);

        if (! $account) {
            $legacyUser = User::query()
                ->whereRaw('LOWER(email) = ?', [strtolower($credentials['email'])])
                ->orWhereRaw('LOWER(username) = ?', [strtolower($credentials['email'])])
                ->first();
            if ($legacyUser) {
                $account = $this->accounts->syncUser($legacyUser)->account;
            }
        }

        if (! $account || ! $account->password_hash || ! Hash::check($credentials['password'], $account->password_hash)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        $shop = $request->attributes->get('shop');
        $isPlatformHost = $this->platformHosts->requestIsPlatformHost($request);
        $platformAdmin = $account->platformAdmin;

        // SuperAdmin accounts are only allowed on dedicated platform hosts.
        if ($platformAdmin && ! $isPlatformHost) {
            $this->tenantAudit->write('superadmin_wrong_host_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['email' => 'SuperAdmin accounts must log in through the platform portal.']);
        }

        // Tenant users are not allowed to log in on platform hosts.
        if (! $platformAdmin && $isPlatformHost) {
            $this->tenantAudit->write('tenant_user_platform_host_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['email' => 'Tenant users must log in from their shop domain.']);
        }

        if (! $shop && ! $platformAdmin) {
            $this->tenantAudit->write('tenant_login_without_shop_context', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['email' => 'This domain is not associated with your shop account.']);
        }

        if ($account->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['email' => 'This account is inactive.']);
        }

        if ($platformAdmin) {
            if ($platformAdmin->status?->status_code !== 'active') {
                throw ValidationException::withMessages(['email' => 'This platform account is inactive.']);
            }

            $user = $this->accounts->ensurePlatformUser($account);
            $this->log($user->user_id, null, 'Logged in to the platform', 'users', $user->user_id, (int) $account->account_id);

            return response()->json($this->authPayload($user, null, ['platform:*']));
        }

        $membership = $this->accounts->membership($account, (int) $shop->shop_id);

        if (! $membership || $membership->status?->status_code !== 'active') {
            $this->tenantAudit->write('tenant_cross_shop_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
                'resolvedShopId' => (int) $shop->shop_id,
            ]);

            return response()->json($this->membershipRequiredPayload($account, $shop));
        }

        $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, (int) $membership->role_id_fk);
        $this->log($user->user_id, (int) $shop->shop_id, 'Logged in to the system', 'users', $user->user_id, (int) $account->account_id);

        return response()->json($this->authPayload($user, $membership, [sprintf('tenant:%d', (int) $shop->shop_id)]));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['account.status', 'role', 'status', 'shop.status']);
        $membership = $user->account_id_fk && $user->shop_id_fk
            ? $this->accounts->membership((int) $user->account_id_fk, (int) $user->shop_id_fk)
            : null;

        return response()->json([
            'user' => $this->userResource($user, $membership),
            'account' => $this->accountResource($user->account),
            'membership' => $this->membershipResource($membership),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();
        $this->log($user->user_id, $user->shop_id_fk, 'Logged out of the system', 'users', $user->user_id, $user->account_id_fk);

        return response()->json(['message' => 'Logged out.']);
    }

    public function register(Request $request): JsonResponse
    {
        // The shop is already resolved from the subdomain by IdentifyShopByDomain middleware
        $shop = $request->attributes->get('shop');

        if (!$shop) {
            return response()->json([
                'message' => 'Could not determine which shop this registration belongs to. Please register from your shop\'s URL.',
            ], 422);
        }

        $data = $request->validate([
            'fullName' => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'max:100'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        // Check if shop is active
        $shopStatus = DB::table('shop_statuses')
            ->where('shop_status_id', $shop->shop_status_id_fk)
            ->value('status_code');

        if (strtoupper($shopStatus) !== 'ACTIVE') {
            return response()->json([
                'message' => 'This shop is not currently accepting new members.',
            ], 403);
        }

        $customerRoleId = DB::table('roles')->where('role_name', 'Customer')->value('role_id');
        $activeStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        return DB::transaction(function () use ($data, $shop, $customerRoleId, $activeStatusId) {
            $existingAccount = $this->accounts->findAccountByLogin($data['email']);

            if ($existingAccount) {
                // Smart hybrid: existing email — verify the supplied password before joining.
                if (! $existingAccount->password_hash || ! Hash::check($data['password'], $existingAccount->password_hash)) {
                    return response()->json([
                        'message' => 'Wrong password. Please sign in first to join this shop as a Customer.',
                        'hint'    => 'sign_in_first',
                    ], 422);
                }

                // Correct password — check they are not already a member.
                if ($this->accounts->membership($existingAccount, (int) $shop->shop_id)) {
                    return response()->json([
                        'message' => 'You already have an account in this shop. Please sign in.',
                        'hint'    => 'already_member',
                    ], 422);
                }

                // All good — join the shop with the existing global account.
                $membership = $this->accounts->createOrUpdateMembership($existingAccount, (int) $shop->shop_id, (int) $customerRoleId);
                $user = $this->accounts->ensureTenantUser($existingAccount, (int) $shop->shop_id, (int) $customerRoleId);

                $this->log($user->user_id, $shop->shop_id, "Joined shop {$shop->shop_name} as Customer via registration form", 'users', $user->user_id, (int) $existingAccount->account_id);

                return response()->json([
                    'message'       => 'Welcome back! You have joined this shop as a Customer.',
                    'userId'        => (string) $user->user_id,
                    'accountId'     => (string) $existingAccount->account_id,
                    'membershipId'  => (string) $membership->membership_id,
                    'shopName'      => $shop->shop_name,
                    'requestedRole' => 'Customer',
                ], 201);
            }

            // New email — create a fresh global account and join the shop.
            $account = $this->accounts->createOrUpdateAccount($data['fullName'], $data['email'], $data['password'], null, true);

            $membership = $this->accounts->createOrUpdateMembership($account, (int) $shop->shop_id, (int) $customerRoleId);
            $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, (int) $customerRoleId, $data['password']);

            $this->log($user->user_id, $shop->shop_id, "Registered as Customer in shop {$shop->shop_name}", 'users', $user->user_id, (int) $account->account_id);

            return response()->json([
                'message'       => 'Account created successfully! You can now log in.',
                'userId'        => (string) $user->user_id,
                'accountId'     => (string) $account->account_id,
                'membershipId'  => (string) $membership->membership_id,
                'shopName'      => $shop->shop_name,
                'requestedRole' => 'Customer',
            ], 201);
        });
    }

    public function joinShop(Request $request): JsonResponse
    {
        $data = $request->validate([
            'join_token' => ['required', 'string'],
            'tenant_host' => ['nullable', 'string', 'max:255'],
        ]);

        $shop = $this->resolveJoinShop($request, $data['tenant_host'] ?? null);
        abort_if(! $shop, 422, 'Could not determine which shop you are joining.');

        $joinContext = $this->joinTokens->resolve($data['join_token']);
        abort_if((int) $joinContext['shop_id'] !== (int) $shop->shop_id, 422, 'This join request does not match the current shop.');

        $shopStatus = DB::table('shop_statuses')
            ->where('shop_status_id', $shop->shop_status_id_fk)
            ->value('status_code');

        abort_if(strtoupper((string) $shopStatus) !== 'ACTIVE', 403, 'This shop is not currently accepting new members.');

        $account = Account::query()->with(['status', 'platformAdmin.status'])->find($joinContext['account_id']);
        abort_if(! $account, 422, 'This join request is invalid.');
        abort_if($account->status?->status_code !== 'active', 422, 'This account is inactive.');

        $customerRoleId = (int) DB::table('roles')->where('role_name', 'Customer')->value('role_id');

        [$membership, $user] = DB::transaction(function () use ($account, $shop, $customerRoleId) {
            $membership = $this->accounts->createOrUpdateMembership($account, (int) $shop->shop_id, $customerRoleId);
            $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, $customerRoleId);

            return [$membership, $user];
        });

        $this->log($user->user_id, (int) $shop->shop_id, "Joined shop {$shop->shop_name} as Customer", 'users', $user->user_id, (int) $account->account_id);

        return response()->json($this->authPayload($user, $membership, [sprintf('tenant:%d', (int) $shop->shop_id)]));
    }

    private function authPayload(User $user, ?ShopMembership $membership, array $abilities): array
    {
        $token = $user->createToken('frontend', $abilities)->plainTextToken;
        $user = $user->fresh(['account.status', 'role', 'status', 'shop.status']);

        return [
            'token' => $token,
            'user' => $this->userResource($user, $membership),
            'account' => $this->accountResource($user->account),
            'membership' => $this->membershipResource($membership),
        ];
    }

    private function userResource(User $user, ?ShopMembership $membership = null): array
    {
        $roleName = $membership?->role?->role_name ?? $user->role?->role_name;
        $shop = $membership?->shop ?? $user->shop;

        return [
            'id' => (string) $user->user_id,
            'name' => $user->account?->full_name ?? $user->full_name,
            'email' => $user->account?->email ?? $user->email,
            'role' => $roleName,
            'status' => $user->status?->status_name,
            'shopId' => $shop?->shop_id ? (string) $shop->shop_id : null,
            'shopName' => $shop?->shop_name,
            'shopStatus' => $shop?->status?->status_code,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function accountResource(?Account $account): ?array
    {
        if (! $account) {
            return null;
        }

        return [
            'id' => (string) $account->account_id,
            'name' => $account->full_name,
            'email' => $account->email,
            'status' => $account->status?->status_name,
        ];
    }

    private function membershipResource(?ShopMembership $membership): ?array
    {
        if (! $membership) {
            return null;
        }

        return [
            'id' => (string) $membership->membership_id,
            'shopId' => (string) $membership->shop_id_fk,
            'shopName' => $membership->shop?->shop_name,
            'role' => $membership->role?->role_name,
            'status' => $membership->status?->status_name,
            'shopStatus' => $membership->shop?->status?->status_code,
        ];
    }

    private function membershipRequiredPayload(Account $account, object $shop): array
    {
        return [
            'needs_membership' => true,
            'allowed_join_role' => 'Customer',
            'join_token' => $this->joinTokens->issue($account, (int) $shop->shop_id),
            'account' => $this->accountResource($account),
            'membership' => null,
            'shop' => [
                'shopId' => (string) $shop->shop_id,
                'shopName' => $shop->shop_name,
                'shopStatus' => $shop->status?->status_code ?? DB::table('shop_statuses')->where('shop_status_id', $shop->shop_status_id_fk)->value('status_code'),
            ],
        ];
    }

    private function resolveJoinShop(Request $request, ?string $tenantHost = null): ?Shop
    {
        $shop = $request->attributes->get('shop');
        if ($shop instanceof Shop) {
            return $shop;
        }

        if (! $tenantHost) {
            return null;
        }

        $subdomain = explode('.', $this->platformHosts->normalizeHost($tenantHost))[0] ?? '';

        return $subdomain
            ? Shop::query()->where('subdomain', $subdomain)->first()
            : null;
    }

    private function log(int $userId, ?int $shopId, string $action, ?string $table = null, ?int $recordId = null, ?int $accountId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk' => $shopId,
            'user_id_fk' => $userId,
            'account_id_fk' => $accountId,
            'action' => $action,
            'table_name' => $table,
            'record_id' => $recordId,
            'log_date' => now(),
            'description' => $action,
        ]);
    }
}
