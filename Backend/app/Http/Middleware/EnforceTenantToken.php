<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceTenantToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $shopId = $request->attributes->get('shop_id');

        if (! $user) {
            return $next($request);
        }

        if ($user->shop_id_fk === null) {
            return $this->jsonError('Invalid token scope', 'Platform tokens cannot access tenant resources.', 403);
        }

        if ($shopId && (int) $user->shop_id_fk !== (int) $shopId) {
            return $this->jsonError('Token tenant mismatch', 'Your authentication token does not match this shop.', 403);
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
