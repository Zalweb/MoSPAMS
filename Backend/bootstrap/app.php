<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role'       => \App\Http\Middleware\RoleMiddleware::class,
            'shop.active' => \App\Http\Middleware\EnsureShopActive::class,
            'tenant.user' => \App\Http\Middleware\EnsureTenantUser::class,
            'tenant.resolve' => \App\Http\Middleware\ResolveTenantContext::class,
            'tenant.token' => \App\Http\Middleware\EnforceTenantToken::class,
            'platform.token' => \App\Http\Middleware\EnforcePlatformToken::class,
        ]);

        $middleware->prependToGroup('api', \App\Http\Middleware\ResolveTenantContext::class);

        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->expectsJson()) {
                return null;
            }
            return route('login');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
