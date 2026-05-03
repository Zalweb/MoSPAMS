<?php

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class TenantStorage
{
    public function __construct(private readonly TenantManager $tenantManager)
    {
    }

    public function put(string $path, string|UploadedFile $contents, array $options = []): string|false
    {
        return Storage::put($this->tenantPath($path), $contents, $options);
    }

    public function putFileAs(string $path, UploadedFile $file, string $name, array $options = []): string|false
    {
        return Storage::putFileAs($this->tenantPath($path), $file, $name, $options);
    }

    public function get(string $path): ?string
    {
        return Storage::get($this->tenantPath($path));
    }

    public function exists(string $path): bool
    {
        return Storage::exists($this->tenantPath($path));
    }

    public function delete(string $path): bool
    {
        return Storage::delete($this->tenantPath($path));
    }

    public function url(string $path): string
    {
        return Storage::url($this->tenantPath($path));
    }

    public function path(string $path): string
    {
        return Storage::path($this->tenantPath($path));
    }

    private function tenantPath(string $path): string
    {
        $shop = $this->tenantManager->current();

        if (! $shop) {
            return $path;
        }

        return "tenant-{$shop->shop_id}/{$path}";
    }
}
