<?php

return [

    'default' => env('MAIL_MAILER', 'log'),

    'mailers' => [

        'resend' => [
            'transport' => 'resend',
        ],

        // Used locally (dev) — emails written to storage/logs/laravel.log instead of sending
        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        // Used by Laravel's test suite
        'array' => [
            'transport' => 'array',
        ],

    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'noreply@mospams.shop'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'MoSPAMS')),
    ],

];
