<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', '')))),
    'allowed_origins_patterns' => array_merge(
        // Allow any subdomain of mospams.shop (admin, tenant subdomains, www) and Vercel preview URLs
        ['/^https:\/\/([a-z0-9-]+\.)?mospams\.shop$/', '/^https:\/\/[a-z0-9-]+\.vercel\.app$/'],
        array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS_PATTERNS', ''))))
    ),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
