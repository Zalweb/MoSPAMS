<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id('plan_id');
            $table->string('plan_code', 30)->unique();
            $table->string('plan_name', 100);
            $table->decimal('monthly_price', 10, 2);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('shop_subscriptions', function (Blueprint $table) {
            $table->id('shop_subscription_id');
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->foreignId('plan_id_fk')->constrained('subscription_plans', 'plan_id');
            $table->string('subscription_status', 30);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->dateTime('renews_at')->nullable();
            $table->foreignId('created_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->foreignId('updated_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamps();

            $table->index(['shop_id_fk', 'subscription_status'], 'shop_subscriptions_shop_status_idx');
            $table->index('ends_at', 'shop_subscriptions_ends_at_idx');
        });

        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id('subscription_payment_id');
            $table->foreignId('shop_subscription_id_fk')->constrained('shop_subscriptions', 'shop_subscription_id')->cascadeOnDelete();
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->string('payment_status', 30);
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 50)->nullable();
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamps();

            $table->index(['shop_id_fk', 'payment_status'], 'subscription_payments_shop_status_idx');
            $table->index('due_at', 'subscription_payments_due_at_idx');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->string('setting_key', 100)->primary();
            $table->text('setting_value')->nullable();
            $table->boolean('is_encrypted')->default(false);
            $table->foreignId('updated_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('shop_subscriptions');
        Schema::dropIfExists('subscription_plans');
    }
};
