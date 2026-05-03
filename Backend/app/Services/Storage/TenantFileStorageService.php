<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class TenantFileStorageService
{
    public function storeLogo(UploadedFile $file, int $shopId): string
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $filename = sprintf('logo_%d_%d.%s', $shopId, time(), $extension ?: 'png');
        $path = sprintf('shops/%d/logos/%s', $shopId, $filename);

        Storage::disk('public')->putFileAs(dirname($path), $file, basename($path));

        return Storage::url($path);
    }

    public function deleteByPublicUrl(?string $url): void
    {
        if (! $url) {
            return;
        }

        $path = $this->relativePathFromPublicUrl($url);
        if (! $path) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    public function relativePathFromPublicUrl(string $url): ?string
    {
        $parsedPath = parse_url($url, PHP_URL_PATH);
        if (! is_string($parsedPath)) {
            return null;
        }

        $normalized = ltrim($parsedPath, '/');

        if (str_starts_with($normalized, 'storage/')) {
            $normalized = substr($normalized, strlen('storage/'));
        }

        return $normalized === '' ? null : $normalized;
    }
}
