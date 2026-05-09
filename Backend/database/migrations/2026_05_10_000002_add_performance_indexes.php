<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'sale_date'], 'sales_shop_date_idx');
        });

        Schema::table('service_jobs', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'job_date'], 'service_jobs_shop_date_idx');
            $table->index(['shop_id_fk', 'service_job_status_id_fk'], 'service_jobs_shop_status_idx');
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'category_id_fk'], 'parts_shop_category_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_id_fk', 'is_read'], 'notifications_user_unread_idx');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['part_id_fk', 'movement_date'], 'stock_movements_part_date_idx');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index(['shop_id_fk', 'log_date'], 'activity_logs_shop_date_idx');
        });

        Schema::table('password_resets', function (Blueprint $table) {
            $table->index('token_hash', 'password_resets_token_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_shop_date_idx');
        });

        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropIndex('service_jobs_shop_date_idx');
            $table->dropIndex('service_jobs_shop_status_idx');
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->dropIndex('parts_shop_category_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_unread_idx');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('stock_movements_part_date_idx');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('activity_logs_shop_date_idx');
        });

        Schema::table('password_resets', function (Blueprint $table) {
            $table->dropIndex('password_resets_token_idx');
        });
    }
};
