<?php

namespace App\Support\Tenancy;

use App\Models\Shop;
use App\Models\User;

class TenantManager
{
    private ?Shop $shop = null;

    public function setCurrent(?Shop $shop): void
    {
        $this->shop = $shop;
    }

    public function current(): ?Shop
    {
        return $this->shop;
    }

    public function id(): ?int
    {
        return $this->shop?->shop_id ? (int) $this->shop->shop_id : null;
    }

    public function requireId(): int
    {
        $id = $this->id();

        if (! $id) {
            abort(403, 'Tenant context is missing.');
        }

        return $id;
    }

    public function isResolved(): bool
    {
        return $this->shop !== null;
    }

    public function domain(): ?string
    {
        return $this->shop?->custom_domain ?: ($this->shop?->subdomain ? sprintf('%s.%s', $this->shop->subdomain, config('tenancy.base_domain')) : null);
    }

    public function isSuperAdmin(?User $user = null): bool
    {
        $user ??= request()->user();

        return (bool) $user?->isSuperAdmin();
    }
}
