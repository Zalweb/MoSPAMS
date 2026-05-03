<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'users',
        'parts',
        'categories',
        'service_jobs',
        'service_types',
        'sales',
        'stock_movements',
        'activity_logs',
        'customers',
        'mechanics',
        'notifications',
        'role_requests',
    ];

    public function up(): void
    {
        // Add nullable shop_id_fk to all domain tables
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->unsignedBigInteger('shop_id_fk')->nullable();
                $t->index('shop_id_fk');
            });
        }

        // Backfill existing rows to the default shop (shop_id = 1, seeded by ShopsSeeder)
        $shopId = DB::table('shops')->value('shop_id');
        if ($shopId) {
            foreach ($this->tables as $table) {
                DB::table($table)->whereNull('shop_id_fk')->update(['shop_id_fk' => $shopId]);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropIndex(['shop_id_fk']);
                $t->dropColumn('shop_id_fk');
            });
        }
    }
};
