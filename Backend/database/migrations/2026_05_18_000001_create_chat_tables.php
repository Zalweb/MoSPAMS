<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id('conversation_id');
            $table->unsignedBigInteger('user_id_fk');
            $table->unsignedBigInteger('shop_id_fk');
            $table->string('session_id', 64)->unique();
            $table->string('title', 200)->nullable();
            $table->timestamps();
            $table->index(['user_id_fk', 'shop_id_fk']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id('message_id');
            $table->unsignedBigInteger('conversation_id_fk');
            $table->enum('role', ['user', 'assistant']);
            $table->text('content');
            $table->unsignedInteger('token_count')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->index('conversation_id_fk');
        });

        Schema::create('chat_daily_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id_fk');
            $table->unsignedBigInteger('shop_id_fk');
            $table->date('usage_date');
            $table->unsignedInteger('message_count')->default(0);
            $table->unique(['user_id_fk', 'shop_id_fk', 'usage_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_daily_usage');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_conversations');
    }
};
