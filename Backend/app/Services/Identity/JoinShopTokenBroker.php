<?php

namespace App\Services\Identity;

use App\Models\Account;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class JoinShopTokenBroker
{
    public function issue(Account|int $account, int $shopId): string
    {
        $accountId = $account instanceof Account ? (int) $account->account_id : $account;

        return Crypt::encryptString(json_encode([
            'account_id' => $accountId,
            'shop_id' => $shopId,
            'issued_at' => now()->timestamp,
        ], JSON_THROW_ON_ERROR));
    }

    public function resolve(string $token): array
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            throw ValidationException::withMessages([
                'join_token' => 'This join request is invalid or has expired.',
            ]);
        }

        $issuedAt = (int) ($payload['issued_at'] ?? 0);
        if ($issuedAt <= 0 || now()->diffInMinutes(now()->setTimestamp($issuedAt)) > 10) {
            throw ValidationException::withMessages([
                'join_token' => 'This join request has expired. Please sign in again.',
            ]);
        }

        $accountId = (int) ($payload['account_id'] ?? 0);
        $shopId = (int) ($payload['shop_id'] ?? 0);

        if ($accountId <= 0 || $shopId <= 0) {
            throw ValidationException::withMessages([
                'join_token' => 'This join request is invalid.',
            ]);
        }

        return [
            'account_id' => $accountId,
            'shop_id' => $shopId,
        ];
    }
}
