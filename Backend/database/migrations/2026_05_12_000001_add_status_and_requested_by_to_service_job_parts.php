<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_job_parts', function (Blueprint $table) {
            $table->enum('status', ['requested', 'confirmed'])->default('confirmed')->after('job_id_fk');
            $table->unsignedBigInteger('requested_by_fk')->nullable()->after('status');
            $table->foreign('requested_by_fk')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_job_parts', function (Blueprint $table) {
            $table->dropForeign(['requested_by_fk']);
            $table->dropColumn(['status', 'requested_by_fk']);
        });
    }
};
