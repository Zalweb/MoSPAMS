<?php

$frontendUrl = env('FRONTEND_URL', 'https://mospams-frontend.vercel.app');
$frontendUrlPattern = env('FRONTEND_URL_PATTERN');

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://mospams.local:5173',
        'http://motoworks.mospams.local:5173',
        'http://speedzone.mospams.local:5173',
        'http://dc-motorparts-and-accessories.mospams.shop:5173',
        'http://admin.mospams.local:5173',
        'http://admin.mospams.shop:5173',
        $frontendUrl,
    ]),
    'allowed_origins_patterns' => array_filter([
        $frontendUrlPattern,
        '/^http:\/\/[a-z0-9-]+\.mospams\.local:5173$/',
        '/^http:\/\/[a-z0-9-]+\.mospams\.shop:5173$/',
        '/^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/',
        '/^https:\/\/[a-z0-9-]+\.ngrok\.dev$/',
        '/^https:\/\/mospams-frontend-[a-z0-9-]+-zalwebs-projects\.vercel\.app$/',
    ]),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
