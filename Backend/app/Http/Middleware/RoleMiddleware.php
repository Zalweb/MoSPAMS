<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        $role = $user?->role?->role_name;

        // SuperAdmin bypasses all role restrictions
        if ($role === 'SuperAdmin') {
            return $next($request);
        }

        abort_unless($role && in_array($role, $roles, true), 403, 'This action is not allowed for your role.');

        return $next($request);
    }
}
