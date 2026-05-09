<?php

namespace App\Http\Middleware;

use App\Support\Auth\AuthenticatedContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureShopActive
{
    public function __construct(private readonly AuthenticatedContext $authContext)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->authContext->isPlatformAdmin($request)) {
            return $next($request);
        }

        $statusCode = $this->authContext->membership($request)?->shop?->status?->status_code
            ?? $request->user()?->shop?->status?->status_code;

        abort_unless($statusCode === 'ACTIVE', 403, 'Your shop is not active. Please contact the platform administrator.');

        return $next($request);
    }
}
