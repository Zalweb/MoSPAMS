<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_job_mechanics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id_fk')->constrained('service_jobs', 'job_id')->cascadeOnDelete();
            $table->foreignId('mechanic_id_fk')->constrained('mechanics', 'mechanic_id')->cascadeOnDelete();
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->unique(['job_id_fk', 'mechanic_id_fk']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_job_mechanics');
    }
};
