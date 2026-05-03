<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mechanic;
use App\Models\RoleRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');
        $shopId = (int) $request->user()->shop_id_fk;

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
        abort_if((int) $roleRequest->user?->shop_id_fk !== (int) auth()->user()?->shop_id_fk, 404, 'Role request not found.');

        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already resolved.'], 422);
        }

        DB::transaction(function () use ($roleRequest) {
            $user     = $roleRequest->user;
            $roleName = $roleRequest->requestedRole?->role_name;

            $user->update(['role_id_fk' => $roleRequest->requested_role_id_fk]);

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

        return response()->json(['message' => 'Request approved.']);
    }

    public function deny(RoleRequest $roleRequest): JsonResponse
    {
        abort_if((int) $roleRequest->user?->shop_id_fk !== (int) auth()->user()?->shop_id_fk, 404, 'Role request not found.');

        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already resolved.'], 422);
        }

        $roleRequest->update([
            'status'         => 'denied',
            'reviewed_by_fk' => auth()->id(),
            'reviewed_at'    => now(),
        ]);

        $this->log(auth()->id(), "Denied role request #{$roleRequest->id} for user {$roleRequest->user_id_fk}", 'role_requests', $roleRequest->id);

        return response()->json(['message' => 'Request denied.']);
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'shop_id_fk'  => auth()->user()?->shop_id_fk,
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
