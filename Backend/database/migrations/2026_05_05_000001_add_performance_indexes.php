<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for the most frequent query patterns:
 *   - All list queries filter by shop_id_fk first, then sort/filter by a second column.
 *   - Single-column shop_id_fk indexes already exist (from migration 000002).
 *   - These composites eliminate the need for MySQL to intersect two separate indexes.
 */
return new class extends Migration
{
    public function up(): void
    {
        // parts — low-stock queries sort by stock_quantity; list sorted by name or created_at
        Schema::table('parts', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'stock_quantity'], 'parts_shop_stock_idx');
            $table->index(['shop_id_fk', 'created_at'],    'parts_shop_created_idx');
        });

        // service_jobs — filtered by status (Pending/Ongoing/Completed) then sorted by date
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'service_job_status_id_fk'], 'jobs_shop_status_idx');
            $table->index(['shop_id_fk', 'created_at'],               'jobs_shop_created_idx');
        });

        // sales — dashboard revenue uses date range; list sorted by created_at
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'created_at'],            'sales_shop_created_idx');
            $table->index(['shop_id_fk', 'payment_status_id_fk'],  'sales_shop_payment_idx');
        });

        // stock_movements — history panel queries by part then date
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'created_at'], 'movements_shop_created_idx');
            $table->index(['part_id_fk',  'created_at'], 'movements_part_created_idx');
        });

        // activity_logs — paginated list always ordered by created_at per shop
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'created_at'], 'logs_shop_created_idx');
        });

        // customers — service job lookups join on customer_id per shop
        Schema::table('customers', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'created_at'], 'customers_shop_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('parts',           fn (Blueprint $t) => [$t->dropIndex('parts_shop_stock_idx'), $t->dropIndex('parts_shop_created_idx')]);
        Schema::table('service_jobs',    fn (Blueprint $t) => [$t->dropIndex('jobs_shop_status_idx'), $t->dropIndex('jobs_shop_created_idx')]);
        Schema::table('sales',           fn (Blueprint $t) => [$t->dropIndex('sales_shop_created_idx'), $t->dropIndex('sales_shop_payment_idx')]);
        Schema::table('stock_movements', fn (Blueprint $t) => [$t->dropIndex('movements_shop_created_idx'), $t->dropIndex('movements_part_created_idx')]);
        Schema::table('activity_logs',   fn (Blueprint $t) => $t->dropIndex('logs_shop_created_idx'));
        Schema::table('customers',       fn (Blueprint $t) => $t->dropIndex('customers_shop_created_idx'));
    }
};
