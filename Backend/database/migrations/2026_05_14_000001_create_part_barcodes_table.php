<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('part_barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts', 'part_id')->onDelete('cascade');
            $table->string('barcode_value', 255);
            $table->string('barcode_type', 50)->nullable(); // 'EAN-13', 'CODE128', 'QR', etc.
            $table->boolean('is_primary')->default(false);
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->onDelete('cascade');
            $table->timestamps();

            // Indexes for fast lookup
            $table->unique(['barcode_value', 'shop_id_fk'], 'unique_barcode_per_shop');
            $table->index(['barcode_value', 'shop_id_fk'], 'idx_barcode_lookup');
            $table->index('part_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('part_barcodes');
    }
};
