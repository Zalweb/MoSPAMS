<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_vehicles', function (Blueprint $table) {
            $table->id('vehicle_id');
            $table->foreignId('customer_id_fk')->constrained('customers', 'customer_id')->cascadeOnDelete();
            $table->unsignedBigInteger('shop_id_fk');
            $table->string('make', 100);
            $table->string('model', 100);
            $table->string('year', 4)->nullable();
            $table->string('plate_number', 30)->nullable();
            $table->string('color', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_vehicles');
    }
};
