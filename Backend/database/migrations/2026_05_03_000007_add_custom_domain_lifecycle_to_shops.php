<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('domain_status', 30)->default('UNVERIFIED')->after('custom_domain');
            $table->string('verification_token', 80)->nullable()->after('domain_status');
            $table->dateTime('verified_at')->nullable()->after('verification_token');
            $table->dateTime('last_checked_at')->nullable()->after('verified_at');

            $table->index('domain_status', 'shops_domain_status_idx');
            $table->unique('verification_token', 'shops_verification_token_unq');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropUnique('shops_verification_token_unq');
            $table->dropIndex('shops_domain_status_idx');
            $table->dropColumn(['domain_status', 'verification_token', 'verified_at', 'last_checked_at']);
        });
    }
};
