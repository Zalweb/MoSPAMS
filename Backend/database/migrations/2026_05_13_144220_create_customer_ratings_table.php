<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_job_id_fk')->unique()->constrained('service_jobs', 'job_id')->cascadeOnDelete();
            $table->foreignId('mechanic_id_fk')->constrained('mechanics', 'mechanic_id');
            $table->foreignId('customer_id_fk')->constrained('customers', 'customer_id');
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id');
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index('mechanic_id_fk');
            $table->index('shop_id_fk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
