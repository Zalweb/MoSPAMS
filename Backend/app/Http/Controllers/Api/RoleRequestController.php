<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mechanic;
use App\Models\RoleRequest;
use App\Services\Identity\AccountProvisioner;
use App\Support\Auth\AuthenticatedContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');
        $shopId = (int) app(AuthenticatedContext::class)->shopId($request);

        $requests = RoleRequest::with(['user', 'requestedRole'])
            ->where('status', $status)
            ->whereHas('user', fn ($q) => $q->where('shop_id_fk', $shopId))
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'             => $r->id,
                'user_id'        => (string) $r->user_id_fk,
                'user_name'      => $r->user?->full_name,
                'user_email'     => $r->user?->email ?? $r->user?->username,
                'requested_role' => $r->requestedRole?->role_name,
                'status'         => $r->status,
                'created_at'     => $r->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $requests]);
    }

    public function approve(RoleRequest $roleRequest): JsonResponse
    {
        $shopId = (int) app(AuthenticatedContext::class)->shopId(request());
        abort_if((int) $roleRequest->shop_id_fk !== $shopId, 404, 'Role request not found.');

        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already resolved.'], 422);
        }

        DB::transaction(function () use ($roleRequest) {
            $user     = $roleRequest->user;
            $roleName = $roleRequest->requestedRole?->role_name;
            $provisioner = app(AccountProvisioner::class);
            $membership = $provisioner->createOrUpdateMembership((int) $user->account_id_fk, (int) $user->shop_id_fk, (int) $roleRequest->requested_role_id_fk);
            $user->update(['role_id_fk' => $roleRequest->requested_role_id_fk]);
            $provisioner->ensureTenantUser($user->account_id_fk, (int) $user->shop_id_fk, (int) $roleRequest->requested_role_id_fk);

            if ($roleName === 'Mechanic') {
                $mechanicStatusId = DB::table('mechanic_statuses')
                    ->where('status_code', 'ACTIVE')
                    ->value('mechanic_status_id');

                if (!$mechanicStatusId) {
                    throw new \RuntimeException('Mechanic status configuration is missing.');
                }

                Mechanic::firstOrCreate(
                    ['user_id_fk' => $user->user_id, 'shop_id_fk' => $user->shop_id_fk],
                    [
                        'shop_id_fk'             => $user->shop_id_fk,
                        'account_id_fk'          => $user->account_id_fk,
                        'full_name'             => $user->full_name,
                        'email'                 => $user->email ?? $user->username,
                        'mechanic_status_id_fk' => $mechanicStatusId,
                    ]
                );
            }

            $roleRequest->update([
                'status'         => 'approved',
                'reviewed_by_fk' => auth()->id(),
                'reviewed_at'    => now(),
            ]);

            $this->log(auth()->id(), "Approved role request #{$roleRequest->id} for user {$user->user_id}", 'role_requests', $roleRequest->id);
        });

        $this->notifyOwner(
            'role_approved',
            'Role Request Approved',
            ($roleRequest->user?->full_name ?? 'A user') . " has been approved as {$roleRequest->requestedRole?->role_name}.",
            'role_requests',
            $roleRequest->id
        );

        return response()->json(['message' => 'Request approved.']);
    }

    public function deny(RoleRequest $roleRequest): JsonResponse
    {
        $shopId = (int) app(AuthenticatedContext::class)->shopId(request());
        abort_if((int) $roleRequest->shop_id_fk !== $shopId, 404, 'Role request not found.');

        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already resolved.'], 422);
        }

        $roleRequest->update([
            'status'         => 'denied',
            'reviewed_by_fk' => auth()->id(),
            'reviewed_at'    => now(),
        ]);

        $this->log(auth()->id(), "Denied role request #{$roleRequest->id} for user {$roleRequest->user_id_fk}", 'role_requests', $roleRequest->id);

        $this->notifyOwner(
            'role_denied',
            'Role Request Denied',
            ($roleRequest->user?->full_name ?? 'A user') . "'s request for {$roleRequest->requestedRole?->role_name} was denied.",
            'role_requests',
            $roleRequest->id
        );

        return response()->json(['message' => 'Request denied.']);
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk'  => app(AuthenticatedContext::class)->shopId(request()),
            'user_id_fk'  => $userId,
            'account_id_fk' => auth()->user()?->account_id_fk,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }

    private function notifyOwner(string $type, string $title, string $message, ?string $refType = null, ?int $refId = null): void
    {
        $shopId = app(AuthenticatedContext::class)->shopId(request());
        $ownerId = DB::table('users')
            ->join('roles', 'roles.role_id', '=', 'users.role_id_fk')
            ->where('users.shop_id_fk', $shopId)
            ->where('roles.role_name', 'Owner')
            ->value('users.user_id');

        if (!$ownerId) return;

        DB::table('notifications')->insert([
            'user_id_fk' => $ownerId,
            'notification_type' => $type,
            'title' => $title,
            'message' => $message,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'is_read' => 0,
            'created_at' => now(),
        ]);
    }
}
