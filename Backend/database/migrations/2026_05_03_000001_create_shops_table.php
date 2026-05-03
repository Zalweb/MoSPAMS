<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_statuses', function (Blueprint $table) {
            $table->id('shop_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('shops', function (Blueprint $table) {
            $table->id('shop_id');
            $table->string('shop_name', 100);
            $table->string('email', 100)->nullable()->unique();
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->foreignId('shop_status_id_fk')->constrained('shop_statuses', 'shop_status_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shops');
        Schema::dropIfExists('shop_statuses');
    }
};
