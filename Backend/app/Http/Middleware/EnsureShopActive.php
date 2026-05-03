<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureShopActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // SuperAdmin has no shop — always allowed
        if ($user?->isSuperAdmin()) {
            return $next($request);
        }

        $statusCode = $user?->shop?->status?->status_code;

        abort_unless($statusCode === 'ACTIVE', 403, 'Your shop is not active. Please contact the platform administrator.');

        return $next($request);
    }
}
