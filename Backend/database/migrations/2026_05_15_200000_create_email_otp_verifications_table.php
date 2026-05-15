<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->index();
            $table->char('otp_code', 6);
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        // Backfill: existing accounts have never been through OTP verification.
        // Mark them verified so they are not locked out when login blocking is added.
        // Only run on MySQL (the accounts table does not exist in SQLite test environments).
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                UPDATE accounts
                SET email_verified_at = COALESCE(created_at, NOW())
                WHERE email_verified_at IS NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('email_otp_verifications');
    }
};
