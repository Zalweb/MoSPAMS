<?php

namespace App\Console\Commands;

use App\Services\Storage\TenantFileStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BackfillTenantLogosCommand extends Command
{
    protected $signature = 'tenant:backfill-logos {--dry-run : Show operations without writing files}';

    protected $description = 'Move legacy shop logos into tenant-scoped storage paths.';

    public function handle(TenantFileStorageService $storage): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $shops = DB::table('shops')
            ->whereNotNull('logo_url')
            ->get(['shop_id', 'logo_url']);

        foreach ($shops as $shop) {
            $source = $storage->relativePathFromPublicUrl((string) $shop->logo_url);
            if (! $source || ! Storage::disk('public')->exists($source)) {
                continue;
            }

            if (str_starts_with($source, sprintf('shops/%d/logos/', (int) $shop->shop_id))) {
                continue;
            }

            $target = sprintf('shops/%d/logos/%s', (int) $shop->shop_id, basename($source));
            $this->line("{$source} -> {$target}");

            if ($dryRun) {
                continue;
            }

            Storage::disk('public')->makeDirectory(dirname($target));
            Storage::disk('public')->copy($source, $target);
            Storage::disk('public')->delete($source);

            DB::table('shops')->where('shop_id', (int) $shop->shop_id)->update([
                'logo_url' => Storage::url($target),
                'updated_at' => now(),
            ]);
        }

        $this->info('Tenant logo backfill completed.');

        return self::SUCCESS;
    }
}
