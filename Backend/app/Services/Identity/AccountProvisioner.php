<?php

namespace App\Services\Identity;

use App\Models\Account;
use App\Models\ShopMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AccountProvisioner
{
    public function activeAccountStatusId(): int
    {
        return (int) DB::table('account_statuses')->where('status_code', 'active')->value('account_status_id');
    }

    public function activeMembershipStatusId(): int
    {
        return (int) DB::table('membership_statuses')->where('status_code', 'active')->value('membership_status_id');
    }

    public function activeUserStatusId(): int
    {
        return (int) DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');
    }

    public function findAccountByLogin(string $email): ?Account
    {
        return Account::query()
            ->with(['status', 'platformAdmin.status'])
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->first();
    }

    public function findAccountByGoogle(string $googleId, string $email): ?Account
    {
        return Account::query()
            ->with(['status', 'platformAdmin.status'])
            ->where('google_id', $googleId)
            ->orWhere(fn ($query) => $query->whereRaw('LOWER(email) = ?', [strtolower($email)]))
            ->first();
    }

    public function createOrUpdateAccount(string $name, string $email, ?string $password = null, ?string $googleId = null, bool $updateExistingPassword = true): Account
    {
        $email = strtolower($email);

        $account = Account::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        $payload = [
            'full_name' => $name,
            'email' => $email,
            'account_status_id_fk' => $this->activeAccountStatusId(),
            'updated_at' => now(),
        ];

        if ($password !== null && ($updateExistingPassword || ! $account)) {
            $payload['password_hash'] = Hash::make($password);
        }

        if ($googleId !== null) {
            $payload['google_id'] = $googleId;
        }

        if ($account) {
            $account->fill(array_filter($payload, fn ($value) => $value !== null));
            $account->save();

            return $account->fresh(['status', 'platformAdmin.status']);
        }

        $payload['password_hash'] ??= Hash::make(Str::random(40));
        $payload['created_at'] = now();

        return Account::query()->create($payload)->load(['status', 'platformAdmin.status']);
    }

    public function membership(Account|int $account, int $shopId): ?ShopMembership
    {
        $accountId = $account instanceof Account ? (int) $account->account_id : $account;

        return ShopMembership::query()
            ->with(['account.status', 'shop.status', 'role', 'status'])
            ->where('account_id_fk', $accountId)
            ->where('shop_id_fk', $shopId)
            ->first();
    }

    public function createOrUpdateMembership(Account|int $account, int $shopId, string|int $role, string $statusCode = 'active'): ShopMembership
    {
        $accountId = $account instanceof Account ? (int) $account->account_id : $account;
        $roleId = is_int($role) ? $role : (int) DB::table('roles')->where('role_name', $role)->value('role_id');
        $statusId = (int) DB::table('membership_statuses')->where('status_code', strtolower($statusCode))->value('membership_status_id');

        ShopMembership::query()->updateOrCreate(
            ['account_id_fk' => $accountId, 'shop_id_fk' => $shopId],
            ['role_id_fk' => $roleId, 'membership_status_id_fk' => $statusId ?: $this->activeMembershipStatusId()]
        );

        return $this->membership($accountId, $shopId);
    }

    public function createOrUpdatePlatformAdmin(Account|int $account, string $statusCode = 'active'): void
    {
        $accountId = $account instanceof Account ? (int) $account->account_id : $account;
        $statusId = (int) DB::table('user_statuses')->where('status_code', strtolower($statusCode))->value('user_status_id');

        DB::table('platform_admins')->updateOrInsert(
            ['account_id_fk' => $accountId],
            [
                'user_status_id_fk' => $statusId ?: $this->activeUserStatusId(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function ensureTenantUser(Account|int $account, int $shopId, string|int $role, ?string $password = null): User
    {
        $accountModel = $account instanceof Account ? $account : Account::query()->findOrFail($account);
        $roleId = is_int($role) ? $role : (int) DB::table('roles')->where('role_name', $role)->value('role_id');
        $existing = User::query()
            ->where('account_id_fk', $accountModel->account_id)
            ->where('shop_id_fk', $shopId)
            ->first();

        $payload = [
            'account_id_fk' => $accountModel->account_id,
            'shop_id_fk' => $shopId,
            'role_id_fk' => $roleId,
            'full_name' => $accountModel->full_name,
            'email' => $accountModel->email,
            'google_id' => $accountModel->google_id,
            'password_hash' => $accountModel->password_hash ?: Hash::make(Str::random(40)),
            'user_status_id_fk' => $this->activeUserStatusId(),
            'updated_at' => now(),
        ];

        if ($password !== null) {
            $payload['password_hash'] = Hash::make($password);
        }

        if ($existing) {
            $existing->update($payload);

            return $existing->fresh(['account.status', 'role', 'status', 'shop.status']);
        }

        $payload['username'] = $this->uniqueUsername($accountModel->email, $shopId);
        $payload['created_at'] = now();

        return User::query()->create($payload)->load(['account.status', 'role', 'status', 'shop.status']);
    }

    public function ensurePlatformUser(Account|int $account, ?string $password = null): User
    {
        $accountModel = $account instanceof Account ? $account : Account::query()->findOrFail($account);
        $roleId = (int) DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');
        $existing = User::query()
            ->where('account_id_fk', $accountModel->account_id)
            ->whereNull('shop_id_fk')
            ->first();

        $payload = [
            'account_id_fk' => $accountModel->account_id,
            'shop_id_fk' => null,
            'role_id_fk' => $roleId,
            'full_name' => $accountModel->full_name,
            'email' => $accountModel->email,
            'google_id' => $accountModel->google_id,
            'password_hash' => $accountModel->password_hash ?: Hash::make(Str::random(40)),
            'user_status_id_fk' => $this->activeUserStatusId(),
            'updated_at' => now(),
        ];

        if ($password !== null) {
            $payload['password_hash'] = Hash::make($password);
        }

        if ($existing) {
            $existing->update($payload);

            return $existing->fresh(['account.status', 'role', 'status']);
        }

        $payload['username'] = $this->uniqueUsername($accountModel->email, null);
        $payload['created_at'] = now();

        return User::query()->create($payload)->load(['account.status', 'role', 'status']);
    }

    public function syncUser(User $user): User
    {
        if ($user->account_id_fk) {
            return $user;
        }

        $email = strtolower((string) ($user->email ?: $user->username ?: "legacy-user-{$user->user_id}@mospams.local"));
        $account = Account::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $account) {
            $account = Account::query()->create([
                'full_name' => $user->full_name,
                'email' => $email,
                'password_hash' => $user->password_hash,
                'google_id' => $user->google_id,
                'account_status_id_fk' => $this->activeAccountStatusId(),
                'created_at' => $user->created_at ?? now(),
                'updated_at' => now(),
            ]);
        }

        $user->update(['account_id_fk' => $account->account_id]);

        $superAdminRoleId = (int) DB::table('roles')->where('role_name', 'SuperAdmin')->value('role_id');

        if ((int) $user->role_id_fk === $superAdminRoleId || $user->shop_id_fk === null) {
            $this->createOrUpdatePlatformAdmin($account);
        } else {
            $this->createOrUpdateMembership($account, (int) $user->shop_id_fk, (int) $user->role_id_fk);
        }

        return $user->fresh(['account.status', 'role', 'status', 'shop.status']);
    }

    private function uniqueUsername(string $email, ?int $shopId): string
    {
        $base = $shopId ? "{$email}#shop-{$shopId}" : "{$email}#platform";
        $candidate = $base;
        $i = 2;

        while (User::query()->where('username', $candidate)->exists()) {
            $candidate = "{$base}-{$i}";
            $i++;
        }

        return $candidate;
    }
}
