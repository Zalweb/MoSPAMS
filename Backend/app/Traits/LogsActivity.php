<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

trait LogsActivity
{
    private function logActivity(int $userId, ?int $shopId, string $action, ?string $table = null, ?int $recordId = null, ?int $accountId = null): void
    {
        try {
            DB::table('activity_logs')->insert([
                'shop_id_fk'    => $shopId,
                'user_id_fk'    => $userId,
                'account_id_fk' => $accountId,
                'action'        => $action,
                'table_name'    => $table,
                'record_id'     => $recordId,
                'log_date'      => now(),
                'description'   => $action,
            ]);
        } catch (\Throwable $e) {
            Log::error('Activity log insert failed', [
                'user_id' => $userId,
                'shop_id' => $shopId,
                'action'  => $action,
                'error'   => $e->getMessage(),
            ]);
        }
    }
}
