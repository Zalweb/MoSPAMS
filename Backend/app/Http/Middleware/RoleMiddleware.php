<?php

namespace App\Http\Middleware;

use App\Support\Auth\AuthenticatedContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function __construct(private readonly AuthenticatedContext $authContext)
    {
    }

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = $this->authContext->roleName($request);

        // SuperAdmin bypasses all role restrictions
        if ($role === 'SuperAdmin' || $this->authContext->isPlatformAdmin($request)) {
            return $next($request);
        }

        abort_unless($role && in_array($role, $roles, true), 403, 'This action is not allowed for your role.');

        return $next($request);
    }
}
