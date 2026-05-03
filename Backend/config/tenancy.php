<?php

return [
    'enforcement_mode' => env('TENANCY_ENFORCEMENT_MODE', 'off'), // off|shadow|enforce

    'base_domain' => env('TENANCY_BASE_DOMAIN', 'mospams.app'),

    'platform_hosts' => array_values(array_filter(array_map(
        static fn (string $host): string => strtolower(trim($host)),
        explode(',', (string) env('TENANCY_PLATFORM_HOSTS', 'admin.mospams.app,admin.mospams.local,admin.mospams.shop'))
    ))),

    'public_hosts' => array_values(array_filter(array_map(
        static fn (string $host): string => strtolower(trim($host)),
        explode(',', (string) env('TENANCY_PUBLIC_HOSTS', 'mospams.app,mospams.local,mospams.shop'))
    ))),

    'api_hosts' => array_values(array_filter(array_map(
        static fn (string $host): string => strtolower(trim($host)),
        explode(',', (string) env('TENANCY_API_HOSTS', 'api.mospams.app,api.mospams.local,api.mospams.shop'))
    ))),

    'allow_localhost_fallback' => env('TENANCY_ALLOW_LOCALHOST_FALLBACK', true),

    'default_local_subdomain' => env('DEFAULT_SHOP_SUBDOMAIN', 'default'),

    'shop_trial_days' => (int) env('SHOP_TRIAL_DAYS', 14),

    'audit_channel' => env('TENANCY_AUDIT_CHANNEL', env('LOG_CHANNEL', 'stack')),

    'cache_prefix' => env('TENANCY_CACHE_PREFIX', 'shop'),

    'custom_domain_verification_ttl_minutes' => (int) env('TENANCY_DOMAIN_VERIFICATION_TTL_MINUTES', 30),
];
