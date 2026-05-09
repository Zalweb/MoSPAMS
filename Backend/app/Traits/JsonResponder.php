<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait JsonResponder
{
    private function success(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status);
    }

    private function error(string $error, string $message, int $status = 400): JsonResponse
    {
        return response()->json([
            'error'   => $error,
            'message' => $message,
        ], $status);
    }

    private function notFound(string $message = 'Resource not found.'): JsonResponse
    {
        return $this->error('Not Found', $message, 404);
    }

    private function validationError(string $message): JsonResponse
    {
        return $this->error('Validation Error', $message, 422);
    }

    private function forbidden(string $message = 'Access denied.'): JsonResponse
    {
        return $this->error('Forbidden', $message, 403);
    }
}
