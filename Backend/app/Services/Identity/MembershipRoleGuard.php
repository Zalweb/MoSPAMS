<?php

namespace App\Services\Identity;

use App\Models\ShopMembership;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MembershipRoleGuard
{
    private const WORK_ROLES = ['Owner', 'Staff', 'Mechanic'];

    public function isWorkRole(string|int $role): bool
    {
        return in_array($this->roleName($role), self::WORK_ROLES, true);
    }

    public function roleName(string|int $role): string
    {
        if (is_string($role) && ! ctype_digit($role)) {
            return $role;
        }

        $roleId = (int) $role;
        $name = DB::table('roles')->where('role_id', $roleId)->value('role_name');
        abort_unless($name, 422, 'Role configuration is missing.');

        return (string) $name;
    }

    public function roleId(string|int $role): int
    {
        if (is_int($role)) {
            return $role;
        }

        if (ctype_digit($role)) {
            return (int) $role;
        }

        $roleId = DB::table('roles')->where('role_name', $role)->value('role_id');
        abort_unless($roleId, 422, 'Role configuration is missing.');

        return (int) $roleId;
    }

    public function assertCanAssignRole(int $accountId, int $shopId, string|int $role, ?int $ignoreMembershipId = null): void
    {
        $roleName = $this->roleName($role);

        if (! $this->isWorkRole($roleName)) {
            return;
        }

        $existingWorkRole = $this->activeWorkRoleMembership($accountId, $ignoreMembershipId);

        if ($existingWorkRole && (int) $existingWorkRole->shop_id_fk !== $shopId) {
            throw ValidationException::withMessages([
                'role' => sprintf(
                    'This account already has %s access in another shop. Work roles are limited to one shop, but Customer access is allowed in other shops.',
                    $existingWorkRole->role_name
                ),
            ]);
        }

        if ($roleName === 'Owner') {
            $ownerConflict = DB::table('shop_memberships as memberships')
                ->join('roles', 'roles.role_id', '=', 'memberships.role_id_fk')
                ->join('membership_statuses', 'membership_statuses.membership_status_id', '=', 'memberships.membership_status_id_fk')
                ->where('memberships.shop_id_fk', $shopId)
                ->where('roles.role_name', 'Owner')
                ->whereRaw('LOWER(membership_statuses.status_code) = ?', ['active'])
                ->when($ignoreMembershipId, fn ($query) => $query->where('memberships.membership_id', '!=', $ignoreMembershipId))
                ->where('memberships.account_id_fk', '!=', $accountId)
                ->exists();

            if ($ownerConflict) {
                throw ValidationException::withMessages([
                    'role' => 'This shop already has an active Owner account.',
                ]);
            }
        }
    }

    public function activeWorkRoleMembership(int $accountId, ?int $ignoreMembershipId = null): ?object
    {
        return DB::table('shop_memberships as memberships')
            ->join('roles', 'roles.role_id', '=', 'memberships.role_id_fk')
            ->join('membership_statuses', 'membership_statuses.membership_status_id', '=', 'memberships.membership_status_id_fk')
            ->where('memberships.account_id_fk', $accountId)
            ->whereIn('roles.role_name', self::WORK_ROLES)
            ->whereRaw('LOWER(membership_statuses.status_code) = ?', ['active'])
            ->when($ignoreMembershipId, fn ($query) => $query->where('memberships.membership_id', '!=', $ignoreMembershipId))
            ->select([
                'memberships.membership_id',
                'memberships.shop_id_fk',
                'roles.role_name',
            ])
            ->first();
    }

    public function conflicts(): array
    {
        $multiWorkRoleAccounts = DB::table('shop_memberships as memberships')
            ->join('roles', 'roles.role_id', '=', 'memberships.role_id_fk')
            ->join('membership_statuses', 'membership_statuses.membership_status_id', '=', 'memberships.membership_status_id_fk')
            ->whereIn('roles.role_name', self::WORK_ROLES)
            ->whereRaw('LOWER(membership_statuses.status_code) = ?', ['active'])
            ->groupBy('memberships.account_id_fk')
            ->havingRaw('COUNT(*) > 1')
            ->get([
                'memberships.account_id_fk',
                DB::raw('COUNT(*) as membership_count'),
            ]);

        $multiOwnerShops = DB::table('shop_memberships as memberships')
            ->join('roles', 'roles.role_id', '=', 'memberships.role_id_fk')
            ->join('membership_statuses', 'membership_statuses.membership_status_id', '=', 'memberships.membership_status_id_fk')
            ->where('roles.role_name', 'Owner')
            ->whereRaw('LOWER(membership_statuses.status_code) = ?', ['active'])
            ->groupBy('memberships.shop_id_fk')
            ->havingRaw('COUNT(*) > 1')
            ->get([
                'memberships.shop_id_fk',
                DB::raw('COUNT(*) as owner_count'),
            ]);

        return [
            'multi_work_role_accounts' => $multiWorkRoleAccounts->map(fn ($row) => [
                'account_id' => (int) $row->account_id_fk,
                'membership_count' => (int) $row->membership_count,
            ])->all(),
            'multi_owner_shops' => $multiOwnerShops->map(fn ($row) => [
                'shop_id' => (int) $row->shop_id_fk,
                'owner_count' => (int) $row->owner_count,
            ])->all(),
        ];
    }
}
