<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Billing\BillingWebhookService;
use App\Services\Billing\PayMongoBillingProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingWebhookController extends Controller
{
    public function paymongo(Request $request, BillingWebhookService $service, PayMongoBillingProvider $provider): JsonResponse
    {
        $rawPayload = $request->getContent();
        $payload = $request->all();
        $signature = $request->header('Paymongo-Signature') ?? $request->header('X-Paymongo-Signature');

        $event = $service->process($provider, $payload, $rawPayload, $signature);

        return response()->json([
            'data' => [
                'eventId' => $event->event_id,
                'status' => $event->processing_status,
                'signatureValid' => (bool) $event->signature_valid,
            ],
        ]);
    }
}
