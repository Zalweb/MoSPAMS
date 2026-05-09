<?php

namespace App\Http\Middleware;

use App\Support\Auth\AuthenticatedContext;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformToken
{
    public function __construct(private readonly AuthenticatedContext $authContext)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->jsonError('Authentication required', 'You must be authenticated to access this resource.', 401);
        }

        if (! $this->authContext->isPlatformAdmin($request)) {
            return $this->jsonError('Platform access required', 'Tenant users cannot access platform administration.', 403);
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
