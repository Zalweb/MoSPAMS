<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_resets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->string('token_hash', 64); // SHA-256 hex of the raw token
            $table->dateTime('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->index('token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_resets');
    }
};
