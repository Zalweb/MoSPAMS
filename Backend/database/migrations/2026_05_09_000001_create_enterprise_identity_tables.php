<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_statuses', function (Blueprint $table) {
            $table->id('account_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('membership_statuses', function (Blueprint $table) {
            $table->id('membership_status_id');
            $table->string('status_code', 30)->unique();
            $table->string('status_name', 50);
            $table->text('description')->nullable();
        });

        Schema::create('accounts', function (Blueprint $table) {
            $table->id('account_id');
            $table->string('full_name', 100);
            $table->string('email', 100)->unique();
            $table->string('password_hash')->nullable();
            $table->string('google_id', 100)->nullable()->unique();
            $table->foreignId('account_status_id_fk')->constrained('account_statuses', 'account_status_id');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('shop_memberships', function (Blueprint $table) {
            $table->id('membership_id');
            $table->foreignId('account_id_fk')->constrained('accounts', 'account_id')->cascadeOnDelete();
            $table->foreignId('shop_id_fk')->constrained('shops', 'shop_id')->cascadeOnDelete();
            $table->foreignId('role_id_fk')->constrained('roles', 'role_id');
            $table->foreignId('membership_status_id_fk')->constrained('membership_statuses', 'membership_status_id');
            $table->timestamps();

            $table->unique(['account_id_fk', 'shop_id_fk'], 'shop_memberships_account_shop_unique');
            $table->index(['shop_id_fk', 'role_id_fk'], 'shop_memberships_shop_role_idx');
        });

        Schema::create('platform_admins', function (Blueprint $table) {
            $table->id('platform_admin_id');
            $table->foreignId('account_id_fk')->constrained('accounts', 'account_id')->cascadeOnDelete();
            $table->foreignId('user_status_id_fk')->constrained('user_statuses', 'user_status_id');
            $table->timestamps();

            $table->unique('account_id_fk', 'platform_admins_account_unique');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('account_id_fk')->nullable()->after('user_id')->constrained('accounts', 'account_id')->nullOnDelete();
            $table->index(['account_id_fk', 'shop_id_fk'], 'users_account_shop_idx');
        });

        $this->dropUniqueIfExists('users', 'users_email_unique');

        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('account_id_fk')->nullable()->after('user_id_fk')->constrained('accounts', 'account_id')->nullOnDelete();
            $table->index(['account_id_fk', 'shop_id_fk'], 'customers_account_shop_idx');
        });

        Schema::table('mechanics', function (Blueprint $table) {
            $table->foreignId('account_id_fk')->nullable()->after('user_id_fk')->constrained('accounts', 'account_id')->nullOnDelete();
            $table->index(['account_id_fk', 'shop_id_fk'], 'mechanics_account_shop_idx');
        });

        Schema::table('role_requests', function (Blueprint $table) {
            $table->foreignId('account_id_fk')->nullable()->after('user_id_fk')->constrained('accounts', 'account_id')->nullOnDelete();
            $table->foreignId('membership_id_fk')->nullable()->after('account_id_fk')->constrained('shop_memberships', 'membership_id')->nullOnDelete();
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('account_id_fk')->nullable()->after('user_id_fk')->constrained('accounts', 'account_id')->nullOnDelete();
            $table->index(['account_id_fk', 'shop_id_fk'], 'activity_logs_account_shop_idx');
        });

        DB::table('account_statuses')->insertOrIgnore([
            ['status_code' => 'active', 'status_name' => 'Active', 'description' => 'Account can authenticate.'],
            ['status_code' => 'inactive', 'status_name' => 'Inactive', 'description' => 'Account cannot authenticate.'],
        ]);

        DB::table('membership_statuses')->insertOrIgnore([
            ['status_code' => 'active', 'status_name' => 'Active', 'description' => 'Membership can access its shop.'],
            ['status_code' => 'inactive', 'status_name' => 'Inactive', 'description' => 'Membership cannot access its shop.'],
            ['status_code' => 'suspended', 'status_name' => 'Suspended', 'description' => 'Membership access is suspended.'],
        ]);

        $this->backfillIdentity();
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['account_id_fk']);
            $table->dropIndex('activity_logs_account_shop_idx');
            $table->dropColumn('account_id_fk');
        });

        Schema::table('role_requests', function (Blueprint $table) {
            $table->dropForeign(['membership_id_fk']);
            $table->dropForeign(['account_id_fk']);
            $table->dropColumn(['membership_id_fk', 'account_id_fk']);
        });

        Schema::table('mechanics', function (Blueprint $table) {
            $table->dropForeign(['account_id_fk']);
            $table->dropIndex('mechanics_account_shop_idx');
            $table->dropColumn('account_id_fk');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['account_id_fk']);
            $table->dropIndex('customers_account_shop_idx');
            $table->dropColumn('account_id_fk');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['account_id_fk']);
            $table->dropIndex('users_account_shop_idx');
            $table->dropColumn('account_id_fk');
        });

        Schema::dropIfExists('platform_admins');
        Schema::dropIfExists('shop_memberships');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('membership_statuses');
        Schema::dropIfExists('account_statuses');
    }

    private function backfillIdentity(): void
    {
        $activeAccountStatusId = (int) DB::table('account_statuses')->where('status_code', 'active')->value('account_status_id');
        $activeMembershipStatusId = (int) DB::table('membership_statuses')->where('status_code', 'active')->value('membership_status_id');
        $superAdminRoleId = (int) DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');

        DB::table('users')->orderBy('user_id')->get()->each(function (object $user) use ($activeAccountStatusId, $activeMembershipStatusId, $superAdminRoleId) {
            $email = strtolower((string) ($user->email ?: $user->username));
            if ($email === '') {
                $email = sprintf('legacy-user-%d@mospams.local', $user->user_id);
            }

            $accountId = DB::table('accounts')->whereRaw('LOWER(email) = ?', [$email])->value('account_id');

            if (! $accountId) {
                $accountId = DB::table('accounts')->insertGetId([
                    'full_name' => $user->full_name,
                    'email' => $email,
                    'password_hash' => $user->password_hash ?: Hash::make(Str::random(40)),
                    'google_id' => $user->google_id,
                    'account_status_id_fk' => $activeAccountStatusId,
                    'created_at' => $user->created_at ?? now(),
                    'updated_at' => $user->updated_at ?? now(),
                ]);
            } elseif ($user->google_id) {
                DB::table('accounts')
                    ->where('account_id', $accountId)
                    ->whereNull('google_id')
                    ->update(['google_id' => $user->google_id, 'updated_at' => now()]);
            }

            DB::table('users')->where('user_id', $user->user_id)->update(['account_id_fk' => $accountId]);

            if ((int) $user->role_id_fk === $superAdminRoleId || $user->shop_id_fk === null) {
                DB::table('platform_admins')->updateOrInsert(
                    ['account_id_fk' => $accountId],
                    [
                        'user_status_id_fk' => $user->user_status_id_fk,
                        'created_at' => $user->created_at ?? now(),
                        'updated_at' => now(),
                    ]
                );

                return;
            }

            $membershipId = DB::table('shop_memberships')->updateOrInsert(
                ['account_id_fk' => $accountId, 'shop_id_fk' => $user->shop_id_fk],
                [
                    'role_id_fk' => $user->role_id_fk,
                    'membership_status_id_fk' => $activeMembershipStatusId,
                    'created_at' => $user->created_at ?? now(),
                    'updated_at' => now(),
                ]
            );

            $resolvedMembershipId = DB::table('shop_memberships')
                ->where('account_id_fk', $accountId)
                ->where('shop_id_fk', $user->shop_id_fk)
                ->value('membership_id');

            DB::table('role_requests')->where('user_id_fk', $user->user_id)->update([
                'account_id_fk' => $accountId,
                'membership_id_fk' => $resolvedMembershipId,
            ]);
        });

        DB::table('customers')->whereNotNull('user_id_fk')->orderBy('customer_id')->get(['customer_id', 'user_id_fk'])->each(function (object $row) {
            $accountId = DB::table('users')->where('user_id', $row->user_id_fk)->value('account_id_fk');
            if ($accountId) {
                DB::table('customers')->where('customer_id', $row->customer_id)->update(['account_id_fk' => $accountId]);
            }
        });

        DB::table('mechanics')->whereNotNull('user_id_fk')->orderBy('mechanic_id')->get(['mechanic_id', 'user_id_fk'])->each(function (object $row) {
            $accountId = DB::table('users')->where('user_id', $row->user_id_fk)->value('account_id_fk');
            if ($accountId) {
                DB::table('mechanics')->where('mechanic_id', $row->mechanic_id)->update(['account_id_fk' => $accountId]);
            }
        });

        DB::table('activity_logs')->whereNotNull('user_id_fk')->orderBy('log_id')->get(['log_id', 'user_id_fk'])->each(function (object $row) {
            $accountId = DB::table('users')->where('user_id', $row->user_id_fk)->value('account_id_fk');
            if ($accountId) {
                DB::table('activity_logs')->where('log_id', $row->log_id)->update(['account_id_fk' => $accountId]);
            }
        });
    }

    private function dropUniqueIfExists(string $table, string $index): void
    {
        $indexes = collect(Schema::getIndexes($table))->pluck('name')->all();

        if (in_array($index, $indexes, true)) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropUnique($index));
        }
    }
};
