<?php

namespace App\Support\Auth;

use App\Models\Account;
use App\Models\PlatformAdmin;
use App\Models\Shop;
use App\Models\ShopMembership;
use App\Models\User;
use App\Services\Identity\AccountProvisioner;
use App\Support\Tenancy\TenantManager;
use Illuminate\Http\Request;

class AuthenticatedContext
{
    private ?ShopMembership $membership = null;
    private bool $membershipResolved = false;
    private ?PlatformAdmin $platformAdmin = null;
    private bool $platformAdminResolved = false;

    public function __construct(private readonly TenantManager $tenantManager)
    {
    }

    public function user(?Request $request = null): ?User
    {
        return ($request ?? request())->user();
    }

    public function account(?Request $request = null): ?Account
    {
        $user = $this->user($request);
        if ($user && ! $user->account_id_fk) {
            $user = app(AccountProvisioner::class)->syncUser($user);
            ($request ?? request())->setUserResolver(fn () => $user);
        }

        return $user?->account ?: ($user?->account_id_fk ? Account::query()->with('status')->find((int) $user->account_id_fk) : null);
    }

    public function shop(?Request $request = null): ?Shop
    {
        return ($request ?? request())->attributes->get('shop') ?: $this->tenantManager->current();
    }

    public function shopId(?Request $request = null): ?int
    {
        $shop = $this->shop($request);
        if ($shop?->shop_id) {
            return (int) $shop->shop_id;
        }

        return $this->user($request)?->shop_id_fk ? (int) $this->user($request)->shop_id_fk : null;
    }

    public function membership(?Request $request = null): ?ShopMembership
    {
        if ($this->membershipResolved) {
            return $this->membership;
        }

        $this->membershipResolved = true;
        $user = $this->user($request);
        $account = $this->account($request);
        $accountId = $account?->account_id ?? $user?->account_id_fk;
        $shopId = $this->shopId($request);

        if (! $accountId || ! $shopId) {
            return null;
        }

        $this->membership = ShopMembership::query()
            ->with(['account.status', 'shop.status', 'role', 'status'])
            ->where('account_id_fk', $accountId)
            ->where('shop_id_fk', $shopId)
            ->first();

        return $this->membership;
    }

    public function roleName(?Request $request = null): ?string
    {
        return $this->membership($request)?->role?->role_name
            ?: $this->user($request)?->role?->role_name;
    }

    public function accountId(?Request $request = null): ?int
    {
        return $this->account($request)?->account_id ? (int) $this->account($request)->account_id : null;
    }

    public function platformAdmin(?Request $request = null): ?PlatformAdmin
    {
        if ($this->platformAdminResolved) {
            return $this->platformAdmin;
        }

        $this->platformAdminResolved = true;
        $account = $this->account($request);

        if (! $account) {
            return null;
        }

        $this->platformAdmin = PlatformAdmin::query()
            ->with(['account.status', 'status'])
            ->where('account_id_fk', $account->account_id)
            ->first();

        return $this->platformAdmin;
    }

    public function isPlatformAdmin(?Request $request = null): bool
    {
        return $this->platformAdmin($request)?->status?->status_code === 'active';
    }
}
