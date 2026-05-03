<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_invoices', function (Blueprint $table) {
            $table->id('subscription_invoice_id');
            $table->foreignId('shop_subscription_id_fk')->constrained('shop_subscriptions', 'shop_subscription_id')->cascadeOnDelete();
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->string('invoice_number', 80)->unique();
            $table->string('invoice_status', 30)->default('PENDING');
            $table->decimal('amount_due', 10, 2);
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['shop_id_fk', 'invoice_status'], 'subscription_invoices_shop_status_idx');
            $table->index('due_at', 'subscription_invoices_due_at_idx');
        });

        Schema::create('billing_webhook_events', function (Blueprint $table) {
            $table->id('billing_webhook_event_id');
            $table->string('provider', 40);
            $table->string('event_id', 120);
            $table->string('event_type', 120)->nullable();
            $table->boolean('signature_valid')->default(false);
            $table->string('processing_status', 30)->default('PENDING');
            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->dateTime('received_at')->nullable();
            $table->dateTime('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'event_id'], 'billing_webhooks_provider_event_unq');
            $table->index(['provider', 'processing_status'], 'billing_webhooks_provider_status_idx');
        });

        Schema::create('subscription_reconciliation_entries', function (Blueprint $table) {
            $table->id('reconciliation_entry_id');
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id', 'reco_shop_fk')->cascadeOnDelete();
            $table->foreignId('shop_subscription_id_fk')->nullable()->constrained('shop_subscriptions', 'shop_subscription_id', 'reco_subscription_fk')->nullOnDelete();
            $table->foreignId('subscription_payment_id_fk')->nullable()->constrained('subscription_payments', 'subscription_payment_id', 'reco_payment_fk')->nullOnDelete();
            $table->foreignId('subscription_invoice_id_fk')->nullable()->constrained('subscription_invoices', 'subscription_invoice_id', 'reco_invoice_fk')->nullOnDelete();
            $table->string('entry_type', 50);
            $table->decimal('amount', 10, 2);
            $table->text('notes')->nullable();
            $table->dateTime('occurred_at');
            $table->timestamps();

            $table->index(['shop_id_fk', 'occurred_at'], 'subscription_reco_shop_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_reconciliation_entries');
        Schema::dropIfExists('billing_webhook_events');
        Schema::dropIfExists('subscription_invoices');
    }
};
