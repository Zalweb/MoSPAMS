<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Customer;
use App\Models\RoleRequest;
use App\Models\Role;
use App\Models\ShopMembership;
use App\Models\Shop;
use App\Models\User;
use App\Models\UserStatus;
use App\Services\Identity\AccountProvisioner;
use App\Services\Identity\JoinShopTokenBroker;
use App\Support\Tenancy\PlatformHostResolver;
use App\Support\Tenancy\TenantAuditLogger;
use App\Traits\LogsActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    use LogsActivity;
    public function __construct(
        private readonly PlatformHostResolver $platformHosts,
        private readonly TenantAuditLogger $tenantAudit,
        private readonly AccountProvisioner $accounts,
        private readonly JoinShopTokenBroker $joinTokens,
    ) {
    }

    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate(['credential' => ['required', 'string']]);

        $payload = $this->verifyGoogleToken($request->credential);

        if (!$payload) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        $account = $this->accounts->findAccountByGoogle($payload['sub'], $payload['email']);

        if (! $account) {
            $legacyUser = User::query()
                ->where('google_id', $payload['sub'])
                ->orWhereRaw('LOWER(email) = ?', [strtolower($payload['email'])])
                ->first();
            if ($legacyUser) {
                $account = $this->accounts->syncUser($legacyUser)->account;
            }
        }

        if (!$account) {
            return response()->json([
                'needs_registration' => true,
                'google_data' => [
                    'google_id' => $payload['sub'],
                    'name'      => $payload['name'] ?? '',
                    'email'     => $payload['email'],
                ],
            ]);
        }

        if ($account->google_id === null) {
            $account->update(['google_id' => $payload['sub']]);
        }

        $shop = $request->attributes->get('shop');
        $isPlatformHost = $this->platformHosts->requestIsPlatformHost($request);
        $platformAdmin = $account->platformAdmin;

        if ($platformAdmin && ! $isPlatformHost) {
            $this->tenantAudit->write('superadmin_wrong_host_google_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['credential' => 'SuperAdmin accounts must log in through the platform portal.']);
        }

        if (! $platformAdmin && $isPlatformHost) {
            $this->tenantAudit->write('tenant_user_platform_host_google_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['credential' => 'Tenant users must log in from their shop domain.']);
        }

        if (! $shop && ! $platformAdmin) {
            $this->tenantAudit->write('tenant_google_login_without_shop_context', 'warning', [
                'attemptedHost' => $request->getHost(),
                'accountId' => $account->account_id,
            ]);
            throw ValidationException::withMessages(['credential' => 'This domain is not associated with your shop account.']);
        }

        if ($account->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['credential' => 'This account is inactive.']);
        }

        if ($platformAdmin) {
            $user = $this->accounts->ensurePlatformUser($account);
            $this->logActivity($user->user_id, null, 'Logged in via Google', 'users', $user->user_id, (int) $account->account_id);

            return response()->json($this->authPayload($user, null, ['platform:*']));
        }

        $membership = $this->accounts->membership($account, (int) $shop->shop_id);
        if (! $membership || $membership->status?->status_code !== 'active') {
            return response()->json($this->membershipRequiredPayload($account, $shop));
        }

        $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, (int) $membership->role_id_fk);
        $this->logActivity($user->user_id, (int) $shop->shop_id, 'Logged in via Google', 'users', $user->user_id, (int) $account->account_id);

        return response()->json($this->authPayload($user, $membership, [sprintf('tenant:%d', (int) $shop->shop_id)]));
    }

    /**
     * Proxy endpoint: Google OAuth from tenant subdomains routes through the
     * public host (mospams.shop) so only one origin is registered in Google
     * Cloud Console. The frontend on mospams.shop obtains the GIS id_token,
     * then POSTs it here together with the tenant host the user came from.
     *
     * Flow:
     *  1. tenant.mospams.shop  →  redirect to mospams.shop/auth/google?tenant=...
     *  2. GIS runs on mospams.shop (registered origin), user authenticates
     *  3. mospams.shop POSTs credential + tenant_host + return_to here
     *  4. This endpoint resolves shop context from tenant_host, authenticates,
     *     and returns a token + validated return_to URL
     *  5. Frontend redirects to return_to?token=...
     */
    public function googleLoginProxy(Request $request): JsonResponse
    {
        $request->validate([
            'credential'   => ['required', 'string'],
            'tenant_host'  => ['required', 'string', 'max:255'],
            'return_to'    => ['required', 'url', 'max:500'],
        ]);

        // ── Security: prevent open-redirect attacks ─────────────────────
        $returnHost = strtolower((string) parse_url($request->return_to, PHP_URL_HOST));
        $allowedBaseDomains = array_filter(array_map('trim', [
            config('tenancy.base_domain', 'mospams.app'),
            'mospams.shop',
            'mospams.local',
        ]));

        $returnHostAllowed = false;
        foreach ($allowedBaseDomains as $base) {
            if ($returnHost === $base || str_ends_with($returnHost, '.' . $base)) {
                $returnHostAllowed = true;
                break;
            }
        }

        if (! $returnHostAllowed) {
            return response()->json(['message' => 'Invalid return URL.'], 422);
        }

        // ── Override the request's host context so shop resolution works ─
        $tenantHost = $this->platformHosts->normalizeHost($request->tenant_host);
        $request->attributes->set('effective_host', $tenantHost);
        $request->attributes->set('effective_host_mode', $this->platformHosts->modeForHost($tenantHost));

        // Re-resolve shop from the overridden host
        $shop = \App\Models\Shop::whereHas('status', fn ($q) => $q->whereRaw('LOWER(status_code) = ?', ['active']))
            ->where('subdomain', explode('.', $tenantHost)[0] ?? '')
            ->first();

        if ($shop) {
            $request->attributes->set('shop', $shop);
        }

        // ── Verify the Google token ─────────────────────────────────────
        $payload = $this->verifyGoogleToken($request->credential);

        if (! $payload) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        // ── Lookup user ─────────────────────────────────────────────────
        $account = $this->accounts->findAccountByGoogle($payload['sub'], $payload['email']);

        if (! $account) {
            $legacyUser = User::query()
                ->where('google_id', $payload['sub'])
                ->orWhereRaw('LOWER(email) = ?', [strtolower($payload['email'])])
                ->first();
            if ($legacyUser) {
                $account = $this->accounts->syncUser($legacyUser)->account;
            }
        }

        if (! $account) {
            return response()->json([
                'needs_registration' => true,
                'google_data' => [
                    'google_id' => $payload['sub'],
                    'name'      => $payload['name'] ?? '',
                    'email'     => $payload['email'],
                ],
                'return_to' => $request->return_to,
                'tenant_host' => $tenantHost,
            ]);
        }

        if ($account->google_id === null) {
            $account->update(['google_id' => $payload['sub']]);
        }

        // ── Tenant isolation checks ─────────────────────────────────────
        $platformAdmin = $account->platformAdmin;

        if ($platformAdmin) {
            throw ValidationException::withMessages(['credential' => 'SuperAdmin accounts must log in through the platform portal.']);
        }

        if ($shop && ! $this->accounts->membership($account, (int) $shop->shop_id)) {
            $payload = $this->membershipRequiredPayload($account, $shop);
            $payload['return_to'] = $request->return_to;
            $payload['tenant_host'] = $tenantHost;

            return response()->json($payload);
        }

        if (! $shop) {
            throw ValidationException::withMessages(['credential' => 'This domain is not associated with your shop account.']);
        }

        if ($account->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['credential' => 'This account is inactive.']);
        }

        // ── Issue token ─────────────────────────────────────────────────
        $membership = $this->accounts->membership($account, (int) $shop->shop_id);
        if (! $membership || $membership->status?->status_code !== 'active') {
            $payload = $this->membershipRequiredPayload($account, $shop);
            $payload['return_to'] = $request->return_to;
            $payload['tenant_host'] = $tenantHost;

            return response()->json($payload);
        }

        $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, (int) $membership->role_id_fk);
        $this->logActivity($user->user_id, (int) $shop->shop_id, 'Logged in via Google (proxy)', 'users', $user->user_id, (int) $account->account_id);

        $payload = $this->authPayload($user, $membership, [sprintf('tenant:%d', (int) $shop->shop_id)]);
        $payload['return_to'] = $request->return_to;

        return response()->json($payload);
    }

    public function googleRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'google_id'      => ['required', 'string'],
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'max:100'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'password'       => ['required', 'string', 'min:8'],
            'requested_role' => ['required', 'in:customer,staff,mechanic'],
            'tenant_host'    => ['nullable', 'string', 'max:255'],
        ]);

        $customerRole  = Role::where('role_name', 'Customer')->firstOrFail();
        $activeStatus  = UserStatus::whereRaw('LOWER(status_code) = ?', ['active'])->firstOrFail();

        // Shop context: prefer the explicit tenant_host from the proxy registration flow
        // (registration happens on mospams.shop so the request host gives no shop context).
        $shop = $request->attributes->get('shop');
        if (! $shop && ! empty($data['tenant_host'])) {
            $subdomain = explode('.', $this->platformHosts->normalizeHost($data['tenant_host']))[0] ?? '';
            if ($subdomain) {
                $shop = \App\Models\Shop::whereHas('status', fn ($q) => $q->whereRaw('LOWER(status_code) = ?', ['active']))
                    ->where('subdomain', $subdomain)
                    ->first();
            }
        }
        $shopId = $shop?->shop_id ?? null;

        [$user, $membership] = DB::transaction(function () use ($data, $customerRole, $activeStatus, $shopId) {
            abort_if(!$shopId, 422, 'Could not determine which shop this registration belongs to.');

            $existingAccount = $this->accounts->findAccountByLogin($data['email']);
            abort_if($existingAccount, 422, 'This Google account already exists. Sign in first, then join this shop as Customer.');
            $account = $this->accounts->createOrUpdateAccount($data['name'], $data['email'], $data['password'], $data['google_id'], ! $existingAccount);
            // Google-verified emails are trusted — mark the account as verified.
            if (! $account->email_verified_at) {
                DB::table('accounts')
                    ->where('account_id', $account->account_id)
                    ->update(['email_verified_at' => now(), 'updated_at' => now()]);
                $account->email_verified_at = now();
            }
            abort_if($this->accounts->membership($account, (int) $shopId), 422, 'This email already has an account in this shop.');

            $membership = $this->accounts->createOrUpdateMembership($account, (int) $shopId, (int) $customerRole->role_id);
            $user = $this->accounts->ensureTenantUser($account, (int) $shopId, (int) $customerRole->role_id, $data['password']);

            Customer::create([
                'user_id_fk'  => $user->user_id,
                'account_id_fk' => $account->account_id,
                'shop_id_fk'  => $shopId,
                'full_name'   => $data['name'],
                'email'       => $data['email'],
                'phone'       => $data['phone'] ?? null,
            ]);

            if (in_array($data['requested_role'], ['staff', 'mechanic'])) {
                $requestedRole = Role::where('role_name', ucfirst($data['requested_role']))->firstOrFail();
                RoleRequest::create([
                    'user_id_fk'           => $user->user_id,
                    'account_id_fk'        => $account->account_id,
                    'membership_id_fk'     => $membership->membership_id,
                    'shop_id_fk'           => $shopId,
                    'requested_role_id_fk' => $requestedRole->role_id,
                    'status'               => 'pending',
                ]);
            }

            return [$user, $membership];
        });

        $this->logActivity($user->user_id, $shopId, 'Registered via Google', 'users', $user->user_id, $user->account_id_fk);

        return response()->json($this->authPayload($user, $membership, [sprintf('tenant:%d', (int) $shopId)]));
    }

    private function membershipRequiredPayload(Account $account, Shop $shop): array
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
            'username' => $user->username,
            'email' => $user->account?->email ?? $user->email ?? $user->username,
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
}
