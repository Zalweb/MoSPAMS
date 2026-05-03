<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('registration_owner_name', 100)->nullable()->after('shop_name');
            $table->string('registration_owner_email', 100)->nullable()->after('registration_owner_name');
            $table->string('registration_status', 30)->default('SYSTEM_PROVISIONED')->after('domain_status');
            $table->text('registration_rejection_reason')->nullable()->after('registration_status');
            $table->dateTime('registration_approved_at')->nullable()->after('registration_rejection_reason');
            $table->dateTime('registration_rejected_at')->nullable()->after('registration_approved_at');

            $table->index('registration_status', 'shops_registration_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropIndex('shops_registration_status_idx');
            $table->dropColumn([
                'registration_owner_name',
                'registration_owner_email',
                'registration_status',
                'registration_rejection_reason',
                'registration_approved_at',
                'registration_rejected_at',
            ]);
        });
    }
};

