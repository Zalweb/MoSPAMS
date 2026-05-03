<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_audit_events', function (Blueprint $table) {
            $table->id('tenant_audit_event_id');
            $table->string('event_code', 80);
            $table->string('level', 20)->default('info');
            $table->string('host', 100)->nullable();
            $table->string('path', 255)->nullable();
            $table->foreignId('shop_id_fk')->nullable()->constrained('shops', 'shop_id')->nullOnDelete();
            $table->foreignId('user_id_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->json('context')->nullable();
            $table->dateTime('created_at')->nullable();

            $table->index(['event_code', 'created_at'], 'tenant_audit_event_code_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_audit_events');
    }
};
