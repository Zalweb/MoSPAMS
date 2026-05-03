<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('invitation_code', 20)->unique()->after('shop_name');
        });

        // Generate invitation codes for existing shops
        $shops = DB::table('shops')->get();
        foreach ($shops as $shop) {
            DB::table('shops')
                ->where('shop_id', $shop->shop_id)
                ->update(['invitation_code' => strtoupper(Str::random(8))]);
        }
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropUnique(['invitation_code']);
            $table->dropColumn('invitation_code');
        });
    }
};
