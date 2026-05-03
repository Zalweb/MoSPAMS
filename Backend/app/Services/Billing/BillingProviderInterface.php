<?php

namespace App\Services\Billing;

interface BillingProviderInterface
{
    public function providerKey(): string;

    public function verifySignature(string $payload, ?string $signatureHeader): bool;

    /**
     * @return array{event_id:string,event_type:string,shop_subscription_id:int|null,status:string|null,amount:float|null,paid_at:string|null,reference_number:string|null}
     */
    public function parseEvent(array $payload): array;
}
