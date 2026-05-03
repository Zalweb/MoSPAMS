<?php

namespace App\Support\Tenancy;

class HostClassifier
{
    public const MODE_PUBLIC = 'public';
    public const MODE_PLATFORM = 'platform';
    public const MODE_API = 'api';
    public const MODE_TENANT = 'tenant';
    public const MODE_LOCALHOST = 'localhost';

    private array $publicHosts;
    private array $platformHosts;
    private array $apiHosts;

    public function __construct()
    {
        $this->publicHosts = (array) config('tenancy.public_hosts', []);
        $this->platformHosts = (array) config('tenancy.platform_hosts', []);
        $this->apiHosts = (array) config('tenancy.api_hosts', []);
    }

    public function classify(string $host): string
    {
        $host = strtolower(trim($host));

        if ($host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            return self::MODE_LOCALHOST;
        }

        if (in_array($host, $this->publicHosts, true)) {
            return self::MODE_PUBLIC;
        }

        if (in_array($host, $this->platformHosts, true)) {
            return self::MODE_PLATFORM;
        }

        if (in_array($host, $this->apiHosts, true)) {
            return self::MODE_API;
        }

        return self::MODE_TENANT;
    }

    public function isPublicHost(string $host): bool
    {
        return $this->classify($host) === self::MODE_PUBLIC;
    }

    public function isPlatformHost(string $host): bool
    {
        return $this->classify($host) === self::MODE_PLATFORM;
    }

    public function isApiHost(string $host): bool
    {
        return $this->classify($host) === self::MODE_API;
    }

    public function isTenantHost(string $host): bool
    {
        return $this->classify($host) === self::MODE_TENANT;
    }

    public function isLocalhost(string $host): bool
    {
        return $this->classify($host) === self::MODE_LOCALHOST;
    }
}
