<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('subdomain', 50)->unique()->after('invitation_code');
            $table->string('custom_domain', 100)->nullable()->unique()->after('subdomain');
            $table->string('logo_url', 255)->nullable()->after('custom_domain');
            $table->string('primary_color', 7)->default('#3B82F6')->after('logo_url'); // Hex color
            $table->string('secondary_color', 7)->default('#10B981')->after('primary_color');
            $table->text('business_description')->nullable()->after('address');
            $table->string('facebook_url', 255)->nullable()->after('business_description');
            $table->string('instagram_url', 255)->nullable()->after('facebook_url');
            $table->json('business_hours')->nullable()->after('instagram_url');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropUnique(['subdomain']);
            $table->dropUnique(['custom_domain']);
            $table->dropColumn([
                'subdomain',
                'custom_domain',
                'logo_url',
                'primary_color',
                'secondary_color',
                'business_description',
                'facebook_url',
                'instagram_url',
                'business_hours',
            ]);
        });
    }
};
