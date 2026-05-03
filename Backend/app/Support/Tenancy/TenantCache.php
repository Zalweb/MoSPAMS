<?php

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\Cache;

class TenantCache
{
    public function __construct(private readonly TenantManager $tenantManager)
    {
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::get($this->tenantKey($key), $default);
    }

    public function put(string $key, mixed $value, int|\DateTimeInterface|\DateInterval|null $ttl = null): bool
    {
        return Cache::put($this->tenantKey($key), $value, $ttl);
    }

    public function forget(string $key): bool
    {
        return Cache::forget($this->tenantKey($key));
    }

    public function remember(string $key, int|\DateTimeInterface|\DateInterval|null $ttl, \Closure $callback): mixed
    {
        return Cache::remember($this->tenantKey($key), $ttl, $callback);
    }

    public function rememberForever(string $key, \Closure $callback): mixed
    {
        return Cache::rememberForever($this->tenantKey($key), $callback);
    }

    private function tenantKey(string $key): string
    {
        $shop = $this->tenantManager->current();

        if (! $shop) {
            return $key;
        }

        $prefix = config('tenancy.cache_prefix', 'shop');

        return "{$prefix}:{$shop->shop_id}:{$key}";
    }
}
