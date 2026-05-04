<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 100)->nullable()->after('username');
        });
        
        // Copy username to email for existing users (username is actually email)
        DB::statement('UPDATE users SET email = username WHERE email IS NULL');
        
        // Make email unique and not nullable
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 100)->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
