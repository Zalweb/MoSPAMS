<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id('role_id');
            $table->string('role_name', 50)->unique();
        });

        Schema::create('user_statuses', function (Blueprint $table) {
            $table->id('user_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id('user_id');
            $table->foreignId('role_id_fk')->constrained('roles', 'role_id');
            $table->string('full_name', 100);
            $table->string('username', 100)->unique();
            $table->string('password_hash');
            $table->foreignId('user_status_id_fk')->constrained('user_statuses', 'user_status_id');
            $table->timestamps();
        });

        Schema::create('category_statuses', function (Blueprint $table) {
            $table->id('category_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('part_statuses', function (Blueprint $table) {
            $table->id('part_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('service_job_statuses', function (Blueprint $table) {
            $table->id('service_job_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('service_type_statuses', function (Blueprint $table) {
            $table->id('service_type_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('mechanic_statuses', function (Blueprint $table) {
            $table->id('mechanic_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('payment_statuses', function (Blueprint $table) {
            $table->id('payment_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id('category_id');
            $table->string('category_name', 100);
            $table->text('description')->nullable();
            $table->foreignId('category_status_id_fk')->constrained('category_statuses', 'category_status_id');
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id('customer_id');
            $table->foreignId('user_id_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('full_name', 100);
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });

        Schema::create('mechanics', function (Blueprint $table) {
            $table->id('mechanic_id');
            $table->foreignId('user_id_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('full_name', 100);
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('mechanic_status_id_fk')->constrained('mechanic_statuses', 'mechanic_status_id');
            $table->timestamps();
        });

        Schema::create('parts', function (Blueprint $table) {
            $table->id('part_id');
            $table->foreignId('category_id_fk')->constrained('categories', 'category_id');
            $table->string('part_name', 100);
            $table->string('barcode', 100)->nullable()->unique();
            $table->text('description')->nullable();
            $table->decimal('unit_price', 10, 2);
            $table->integer('stock_quantity')->default(0);
            $table->integer('reorder_level')->default(0);
            $table->foreignId('part_status_id_fk')->constrained('part_statuses', 'part_status_id');
            $table->timestamps();
        });

        Schema::create('service_types', function (Blueprint $table) {
            $table->id('service_type_id');
            $table->string('service_name', 100);
            $table->text('description')->nullable();
            $table->decimal('labor_cost', 10, 2);
            $table->string('estimated_duration', 50)->nullable();
            $table->foreignId('service_type_status_id_fk')->constrained('service_type_statuses', 'service_type_status_id');
            $table->timestamps();
        });

        Schema::create('service_jobs', function (Blueprint $table) {
            $table->id('job_id');
            $table->foreignId('customer_id_fk')->constrained('customers', 'customer_id');
            $table->foreignId('assigned_mechanic_id_fk')->nullable()->constrained('mechanics', 'mechanic_id')->nullOnDelete();
            $table->foreignId('created_by_fk')->constrained('users', 'user_id');
            $table->foreignId('service_job_status_id_fk')->constrained('service_job_statuses', 'service_job_status_id');
            $table->date('job_date');
            $table->date('completion_date')->nullable();
            $table->string('motorcycle_model', 150)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('service_job_items', function (Blueprint $table) {
            $table->id('job_item_id');
            $table->foreignId('job_id_fk')->constrained('service_jobs', 'job_id')->cascadeOnDelete();
            $table->foreignId('service_type_id_fk')->constrained('service_types', 'service_type_id');
            $table->decimal('labor_cost', 10, 2);
            $table->text('remarks')->nullable();
        });

        Schema::create('service_job_parts', function (Blueprint $table) {
            $table->id('job_part_id');
            $table->foreignId('job_id_fk')->constrained('service_jobs', 'job_id')->cascadeOnDelete();
            $table->foreignId('part_id_fk')->constrained('parts', 'part_id');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id('sale_id');
            $table->foreignId('customer_id_fk')->nullable()->constrained('customers', 'customer_id')->nullOnDelete();
            $table->foreignId('job_id_fk')->nullable()->constrained('service_jobs', 'job_id')->nullOnDelete();
            $table->foreignId('processed_by_fk')->constrained('users', 'user_id');
            $table->string('sale_type', 30);
            $table->decimal('total_amount', 10, 2);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('net_amount', 10, 2);
            $table->dateTime('sale_date')->nullable();
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id('sale_item_id');
            $table->foreignId('sale_id_fk')->constrained('sales', 'sale_id')->cascadeOnDelete();
            $table->foreignId('part_id_fk')->constrained('parts', 'part_id');
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id('payment_id');
            $table->foreignId('sale_id_fk')->constrained('sales', 'sale_id')->cascadeOnDelete();
            $table->string('payment_method', 50);
            $table->decimal('amount_paid', 10, 2);
            $table->dateTime('payment_date')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->foreignId('payment_status_id_fk')->constrained('payment_statuses', 'payment_status_id');
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id('movement_id');
            $table->foreignId('part_id_fk')->constrained('parts', 'part_id');
            $table->foreignId('user_id_fk')->constrained('users', 'user_id');
            $table->string('movement_type', 30);
            $table->integer('quantity');
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->dateTime('movement_date')->nullable();
            $table->text('remarks')->nullable();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id('log_id');
            $table->foreignId('user_id_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->string('action', 100);
            $table->string('table_name', 100)->nullable();
            $table->unsignedBigInteger('record_id')->nullable();
            $table->dateTime('log_date')->nullable();
            $table->text('description')->nullable();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->foreignId('user_id_fk')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->string('notification_type', 50);
            $table->string('title', 150);
            $table->text('message');
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'notifications',
            'activity_logs',
            'stock_movements',
            'payments',
            'sale_items',
            'sales',
            'service_job_parts',
            'service_job_items',
            'service_jobs',
            'service_types',
            'parts',
            'mechanics',
            'customers',
            'categories',
            'payment_statuses',
            'mechanic_statuses',
            'service_type_statuses',
            'service_job_statuses',
            'part_statuses',
            'category_statuses',
            'users',
            'user_statuses',
            'roles',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
