<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 100)->nullable()->unique()->after('full_name');
            $table->string('google_id', 100)->nullable()->unique()->after('email');
        });

        Schema::create('role_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id_fk')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->foreignId('requested_role_id_fk')->constrained('roles', 'role_id');
            $table->enum('status', ['pending', 'approved', 'denied'])->default('pending');
            $table->foreignId('reviewed_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_requests');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email', 'google_id']);
        });
    }
};
