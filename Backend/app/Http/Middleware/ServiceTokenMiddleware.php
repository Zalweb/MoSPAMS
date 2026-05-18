<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ServiceTokenMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        $expected = config('services.ai.internal_token');

        if (!$token || !$expected || !hash_equals($expected, $token)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
