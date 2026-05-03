<?php

namespace App\Services\Domain;

use Illuminate\Support\Facades\Http;

class CloudflareDomainService
{
    public function verifyDomainOwnership(string $domain, string $token): bool
    {
        $recordName = sprintf('_mospams-verify.%s', $domain);

        // Prefer Cloudflare DNS-over-HTTPS for deterministic checks.
        $response = Http::timeout(8)
            ->withHeaders(['Accept' => 'application/dns-json'])
            ->get('https://cloudflare-dns.com/dns-query', [
                'name' => $recordName,
                'type' => 'TXT',
            ]);

        if ($response->ok()) {
            $answers = $response->json('Answer', []);
            foreach ($answers as $answer) {
                $data = trim((string) ($answer['data'] ?? ''), '"');
                if ($data === $token) {
                    return true;
                }
            }
        }

        if (function_exists('dns_get_record')) {
            $records = dns_get_record($recordName, DNS_TXT);
            foreach ($records ?: [] as $record) {
                if (($record['txt'] ?? null) === $token) {
                    return true;
                }
            }
        }

        return false;
    }

    public function sslReady(string $domain): bool
    {
        $response = Http::timeout(8)->withOptions(['verify' => true])->get('https://'.$domain);

        return $response->successful() || in_array($response->status(), [301, 302, 401, 403], true);
    }
}
