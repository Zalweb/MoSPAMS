<?php

namespace App\Services\Billing;

class PayMongoBillingProvider implements BillingProviderInterface
{
    public function providerKey(): string
    {
        return 'paymongo';
    }

    public function verifySignature(string $payload, ?string $signatureHeader): bool
    {
        $secret = (string) config('services.paymongo.webhook_secret');

        if ($secret === '' || ! $signatureHeader) {
            return false;
        }

        $provided = $this->extractSignature($signatureHeader);
        if (! $provided) {
            return false;
        }

        $expected = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expected, $provided);
    }

    public function parseEvent(array $payload): array
    {
        $data = $payload['data'] ?? [];
        $attributes = $data['attributes'] ?? [];
        $metadata = $attributes['metadata'] ?? [];

        $rawEventId = $data['id'] ?? $payload['id'] ?? uniqid('evt_', true);

        return [
            'event_id' => (string) $rawEventId,
            'event_type' => (string) ($payload['type'] ?? $data['type'] ?? 'unknown'),
            'shop_subscription_id' => isset($metadata['shop_subscription_id']) ? (int) $metadata['shop_subscription_id'] : null,
            'status' => isset($attributes['status']) ? strtoupper((string) $attributes['status']) : null,
            'amount' => isset($attributes['amount']) ? ((float) $attributes['amount'] / 100) : null,
            'paid_at' => isset($attributes['paid_at']) ? (string) $attributes['paid_at'] : null,
            'reference_number' => isset($attributes['reference_number']) ? (string) $attributes['reference_number'] : null,
        ];
    }

    private function extractSignature(string $header): ?string
    {
        if (str_contains($header, 'v1=')) {
            foreach (explode(',', $header) as $part) {
                $part = trim($part);
                if (str_starts_with($part, 'v1=')) {
                    return substr($part, 3);
                }
            }
        }

        return trim($header) !== '' ? trim($header) : null;
    }
}
