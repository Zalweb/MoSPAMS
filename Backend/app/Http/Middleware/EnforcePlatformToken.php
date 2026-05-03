<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->jsonError('Authentication required', 'You must be authenticated to access this resource.', 401);
        }

        if ($user->shop_id_fk !== null) {
            return $this->jsonError('Platform access required', 'Tenant users cannot access platform administration.', 403);
        }

        $roleName = $user->role?->role_name;
        if ($roleName !== 'SuperAdmin') {
            return $this->jsonError('SuperAdmin required', 'Only SuperAdmin users can access platform administration.', 403);
        }

        return $next($request);
    }

    private function jsonError(string $error, string $message, int $status): JsonResponse
    {
        return response()->json([
            'error' => $error,
            'message' => $message,
        ], $status);
    }
}
