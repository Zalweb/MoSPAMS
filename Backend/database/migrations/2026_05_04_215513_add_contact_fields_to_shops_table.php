<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->text('shop_description')->nullable()->after('shop_name');
            $table->string('contact_email', 100)->nullable()->after('shop_description');
            $table->string('contact_phone', 20)->nullable()->after('contact_email');
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn(['shop_description', 'contact_email', 'contact_phone']);
        });
    }
};
