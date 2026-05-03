<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CleanupOrphanedTenantMediaJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $logosInDb = DB::table('shops')
            ->whereNotNull('logo_url')
            ->pluck('logo_url')
            ->map(function (string $url): ?string {
                $path = parse_url($url, PHP_URL_PATH);
                if (! is_string($path)) {
                    return null;
                }

                $path = ltrim($path, '/');
                if (str_starts_with($path, 'storage/')) {
                    $path = substr($path, strlen('storage/'));
                }

                return $path === '' ? null : $path;
            })
            ->filter()
            ->flip();

        $allShopFiles = Storage::disk('public')->allFiles('shops');

        foreach ($allShopFiles as $file) {
            if (! isset($logosInDb[$file]) && str_contains($file, '/logos/')) {
                Storage::disk('public')->delete($file);
            }
        }
    }
}
