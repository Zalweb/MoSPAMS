<?php

namespace App\Support\Tenancy;

use Illuminate\Http\Request;

class PlatformHostResolver
{
    public const MODE_PLATFORM = 'platform';
    public const MODE_PUBLIC = 'public';
    public const MODE_API = 'api';
    public const MODE_TENANT = 'tenant';
    public const MODE_LOCAL = 'local';

    public function isPlatformHost(string $host): bool
    {
        return in_array($this->normalizeHost($host), $this->platformHosts(), true);
    }

    public function isPublicHost(string $host): bool
    {
        return in_array($this->normalizeHost($host), $this->publicHosts(), true);
    }

    public function isApiHost(string $host): bool
    {
        return in_array($this->normalizeHost($host), $this->apiHosts(), true);
    }

    public function requestIsPlatformHost(Request $request): bool
    {
        return $this->requestHostMode($request) === self::MODE_PLATFORM;
    }

    public function requestHostMode(Request $request): string
    {
        $mode = $request->attributes->get('effective_host_mode');
        if (is_string($mode) && $mode !== '') {
            return $mode;
        }

        $effectiveHost = $this->effectiveHost($request);

        return $this->modeForHost($effectiveHost);
    }

    public function effectiveHost(Request $request): string
    {
        $host = strtolower((string) $request->attributes->get('effective_host', ''));
        if ($host !== '') {
            return $host;
        }

        $requestHost = $this->normalizeHost((string) $request->getHost());
        if (! $this->isApiHost($requestHost)) {
            return $requestHost;
        }

        return $this->contextHost($request) ?? $requestHost;
    }

    public function contextHost(Request $request): ?string
    {
        $headerHost = $request->headers->get('X-Tenant-Host');
        if (is_string($headerHost) && trim($headerHost) !== '') {
            return $this->normalizeHost($headerHost);
        }

        $origin = $request->headers->get('Origin');
        if (is_string($origin) && trim($origin) !== '') {
            $parsed = parse_url($origin, PHP_URL_HOST);
            if (is_string($parsed) && $parsed !== '') {
                return $this->normalizeHost($parsed);
            }
        }

        $referer = $request->headers->get('Referer');
        if (is_string($referer) && trim($referer) !== '') {
            $parsed = parse_url($referer, PHP_URL_HOST);
            if (is_string($parsed) && $parsed !== '') {
                return $this->normalizeHost($parsed);
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    public function platformHosts(): array
    {
        $configured = config('tenancy.platform_hosts', []);

        if (!is_array($configured)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($host) => $this->normalizeHost((string) $host),
            $configured
        )));
    }

    /**
     * @return array<int, string>
     */
    public function publicHosts(): array
    {
        $configured = config('tenancy.public_hosts', []);

        if (! is_array($configured)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($host) => $this->normalizeHost((string) $host),
            $configured
        )));
    }

    /**
     * @return array<int, string>
     */
    public function apiHosts(): array
    {
        $configured = config('tenancy.api_hosts', []);

        if (! is_array($configured)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($host) => $this->normalizeHost((string) $host),
            $configured
        )));
    }

    public function modeForHost(string $host): string
    {
        $normalized = $this->normalizeHost($host);

        if ($this->isPlatformHost($normalized)) {
            return self::MODE_PLATFORM;
        }

        if ($this->isPublicHost($normalized)) {
            return self::MODE_PUBLIC;
        }

        if ($this->isApiHost($normalized)) {
            return self::MODE_API;
        }

        if ($normalized === 'localhost' || filter_var($normalized, FILTER_VALIDATE_IP)) {
            return self::MODE_LOCAL;
        }

        return self::MODE_TENANT;
    }

    public function normalizeHost(string $host): string
    {
        $normalized = strtolower(trim($host));

        if (str_contains($normalized, ':')) {
            [$normalized] = explode(':', $normalized, 2);
        }

        return $normalized;
    }
}
