<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_ratings', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('job_id', 36)->unique();
            $table->char('mechanic_id', 36);
            $table->char('customer_id', 36);
            $table->char('shop_id_fk', 36);
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->foreign('mechanic_id')->references('id')->on('users');
            $table->foreign('customer_id')->references('id')->on('users');
            $table->foreign('shop_id_fk')->references('id')->on('shops');

            $table->index('mechanic_id');
            $table->index('shop_id_fk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_ratings');
    }
};
