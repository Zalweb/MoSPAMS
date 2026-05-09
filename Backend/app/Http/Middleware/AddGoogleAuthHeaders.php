<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddGoogleAuthHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cross-Origin-Opener-Policy', 'unsafe-none');
        $response->headers->set('Cross-Origin-Embedder-Policy', 'unsafe-none');

        return $response;
    }
}
