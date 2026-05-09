<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RoleRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserStatus;
use App\Support\Tenancy\PlatformHostResolver;
use App\Support\Tenancy\TenantAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    public function __construct(
        private readonly PlatformHostResolver $platformHosts,
        private readonly TenantAuditLogger $tenantAudit,
    ) {
    }

    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate(['credential' => ['required', 'string']]);

        $payload = $this->verifyGoogleToken($request->credential);

        if (!$payload) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        $user = User::with(['role', 'status', 'shop.status'])
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

        $shop = $request->attributes->get('shop');
        $isPlatformHost = $this->platformHosts->requestIsPlatformHost($request);

        if ($user->role?->role_name === 'SuperAdmin' && ! $isPlatformHost) {
            $this->tenantAudit->write('superadmin_wrong_host_google_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['credential' => 'SuperAdmin accounts must log in through the platform portal.']);
        }

        if ($user->role?->role_name !== 'SuperAdmin' && $isPlatformHost) {
            $this->tenantAudit->write('tenant_user_platform_host_google_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['credential' => 'Tenant users must log in from their shop domain.']);
        }

        if ($shop && $user->role?->role_name !== 'SuperAdmin' && $user->shop_id_fk !== $shop->shop_id) {
            $this->tenantAudit->write('tenant_cross_shop_google_login', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'userShopId' => $user->shop_id_fk,
                'resolvedShopId' => (int) $shop->shop_id,
            ]);
            throw ValidationException::withMessages(['credential' => 'Invalid credentials.']);
        }

        if (! $shop && $user->role?->role_name !== 'SuperAdmin') {
            $this->tenantAudit->write('tenant_google_login_without_shop_context', 'warning', [
                'attemptedHost' => $request->getHost(),
                'userId' => $user->user_id,
                'shopId' => $user->shop_id_fk,
            ]);
            throw ValidationException::withMessages(['credential' => 'This domain is not associated with your shop account.']);
        }

        if ($user->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['credential' => 'This account is inactive.']);
        }

        $this->log($user->user_id, $user->shop_id_fk, 'Logged in via Google', 'users', $user->user_id);

        $abilities = $user->role?->role_name === 'SuperAdmin'
            ? ['platform:*']
            : ($user->shop_id_fk ? [sprintf('tenant:%d', (int) $user->shop_id_fk)] : ['public:guest']);

        return response()->json([
            'token' => $user->createToken('frontend', $abilities)->plainTextToken,
            'user'  => $this->userResource($user->fresh(['role', 'status', 'shop.status'])),
        ]);
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
        $user = User::with(['role', 'status', 'shop.status'])
            ->where(function ($q) use ($payload) {
                $q->where('google_id', $payload['sub'])
                  ->orWhere('email', $payload['email']);
            })
            ->first();

        if (! $user) {
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

        if ($user->google_id === null) {
            $user->update(['google_id' => $payload['sub']]);
        }

        // ── Tenant isolation checks ─────────────────────────────────────
        if ($shop && $user->role?->role_name !== 'SuperAdmin' && $user->shop_id_fk !== $shop->shop_id) {
            throw ValidationException::withMessages(['credential' => 'Invalid credentials.']);
        }

        if (! $shop && $user->role?->role_name !== 'SuperAdmin') {
            throw ValidationException::withMessages(['credential' => 'This domain is not associated with your shop account.']);
        }

        if ($user->status?->status_code !== 'active') {
            throw ValidationException::withMessages(['credential' => 'This account is inactive.']);
        }

        // ── Issue token ─────────────────────────────────────────────────
        $this->log($user->user_id, $user->shop_id_fk, 'Logged in via Google (proxy)', 'users', $user->user_id);

        $abilities = $user->role?->role_name === 'SuperAdmin'
            ? ['platform:*']
            : ($user->shop_id_fk ? [sprintf('tenant:%d', (int) $user->shop_id_fk)] : ['public:guest']);

        return response()->json([
            'token'     => $user->createToken('frontend', $abilities)->plainTextToken,
            'user'      => $this->userResource($user->fresh(['role', 'status', 'shop.status'])),
            'return_to' => $request->return_to,
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

        $user = DB::transaction(function () use ($data, $customerRole, $activeStatus, $shopId) {
            $user = User::create([
                'role_id_fk'        => $customerRole->role_id,
                'shop_id_fk'        => $shopId,
                'full_name'         => $data['name'],
                'username'          => $data['email'],
                'email'             => $data['email'],
                'google_id'         => $data['google_id'],
                'password_hash'     => Hash::make($data['password']),
                'user_status_id_fk' => $activeStatus->user_status_id,
            ]);

            Customer::create([
                'user_id_fk'  => $user->user_id,
                'shop_id_fk'  => $shopId,
                'full_name'   => $data['name'],
                'email'       => $data['email'],
                'phone'       => $data['phone'] ?? null,
            ]);

            if (in_array($data['requested_role'], ['staff', 'mechanic'])) {
                $requestedRole = Role::where('role_name', ucfirst($data['requested_role']))->firstOrFail();
                RoleRequest::create([
                    'user_id_fk'           => $user->user_id,
                    'shop_id_fk'           => $shopId,
                    'requested_role_id_fk' => $requestedRole->role_id,
                    'status'               => 'pending',
                ]);
            }

            return $user;
        });

        $this->log($user->user_id, $shopId, 'Registered via Google', 'users', $user->user_id);

        $abilities = $user->role?->role_name === 'SuperAdmin'
            ? ['platform:*']
            : ($user->shop_id_fk ? [sprintf('tenant:%d', (int) $user->shop_id_fk)] : ['public:guest']);

        return response()->json([
            'token' => $user->createToken('frontend', $abilities)->plainTextToken,
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
            'id' => (string) $user->user_id,
            'name' => $user->full_name,
            'username' => $user->username,
            'email' => $user->email ?? $user->username,
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
            'user_id_fk'  => $userId,
            'shop_id_fk'  => $shopId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
