# Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth sign-in with role-based sign-up, pending approval flow for Staff/Mechanic, and admin approvals UI.

**Architecture:** Frontend obtains a Google ID token via `@react-oauth/google`, posts it to `POST /api/auth/google` which verifies it against Google's tokeninfo API and returns a Sanctum token for existing users or a `needs_registration` flag for new ones. New users complete a sign-up modal that always creates a Customer account; Staff/Mechanic requests go into a `role_requests` table for Admin approval.

**Tech Stack:** Laravel 13 (Http facade for tokeninfo), Laravel Sanctum, React + TypeScript, `@react-oauth/google`, Tailwind CSS (ScrewFast design tokens), Radix UI Dialog + Tabs.

---

## File Map

**Backend — create:**
- `Backend/database/migrations/2026_04_30_170000_add_google_auth_to_users_and_create_role_requests.php`
- `Backend/app/Models/RoleRequest.php`
- `Backend/app/Http/Controllers/Api/GoogleAuthController.php`
- `Backend/app/Http/Controllers/Api/RoleRequestController.php`
- `Backend/tests/Feature/GoogleAuthTest.php`
- `Backend/tests/Feature/RoleRequestTest.php`

**Backend — modify:**
- `Backend/app/Models/User.php` — add `email`, `google_id` to `$fillable`
- `Backend/app/Http/Controllers/Api/AuthController.php` — update login to also match `email` column
- `Backend/routes/api.php` — add Google auth + role-request routes
- `Backend/config/services.php` — add `google.client_id` entry

**Frontend — create:**
- `Frontend/src/features/auth/components/GoogleSignUpModal.tsx`
- `Frontend/src/features/users/pages/ApprovalsPage.tsx`

**Frontend — modify:**
- `Frontend/src/shared/types/index.ts` — add `RoleRequest` type
- `Frontend/src/features/auth/context/AuthContext.tsx` — add `googleLogin`, `googleRegister`
- `Frontend/src/features/auth/pages/Login.tsx` — add Google button + modal trigger
- `Frontend/src/app/App.tsx` — `GoogleOAuthProvider` wrapper + `/approvals` route
- `Frontend/src/shared/lib/permissions.ts` — add `/approvals` to `NAV_ACCESS`
- `Frontend/src/features/users/pages/UsersPage.tsx` — add Pending Requests tab
- `Frontend/src/features/layout/pages/DashboardLayout.tsx` — add Approvals nav item

---

## Task 1: Backend — DB Migration

**Files:**
- Create: `Backend/database/migrations/2026_04_30_170000_add_google_auth_to_users_and_create_role_requests.php`

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email', 100)->nullable()->unique()->after('full_name');
            $table->string('google_id', 100)->nullable()->unique()->after('email');
        });

        Schema::create('role_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id_fk')->constrained('users', 'user_id')->cascadeOnDelete();
            $table->foreignId('requested_role_id_fk')->constrained('roles', 'role_id');
            $table->enum('status', ['pending', 'approved', 'denied'])->default('pending');
            $table->foreignId('reviewed_by_fk')->nullable()->constrained('users', 'user_id')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_requests');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email', 'google_id']);
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd Backend && php artisan migrate
```

Expected: `Migrating: 2026_04_30_170000_add_google_auth_to_users_and_create_role_requests` then `Migrated` with no errors.

- [ ] **Step 3: Update `Backend/config/services.php` — add Google client ID entry**

At the bottom of the returned array, before the closing `];`:

```php
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],
```

- [ ] **Step 4: Add `GOOGLE_CLIENT_ID` to `Backend/.env`**

Open `Backend/.env` and append:

```
GOOGLE_CLIENT_ID=your-google-oauth-client-id-here
```

> **Note:** Replace `your-google-oauth-client-id-here` with the OAuth 2.0 Client ID from Google Cloud Console → APIs & Services → Credentials. The Authorized JavaScript Origins must include your frontend URL (e.g. `http://localhost:5173`).

- [ ] **Step 5: Commit**

```bash
git add Backend/database/migrations/2026_04_30_170000_add_google_auth_to_users_and_create_role_requests.php Backend/config/services.php
git commit -m "feat: add google_id/email columns and role_requests table"
```

---

## Task 2: Backend — RoleRequest Model

**Files:**
- Create: `Backend/app/Models/RoleRequest.php`
- Modify: `Backend/app/Models/User.php`

- [ ] **Step 1: Write the failing test**

Create `Backend/tests/Feature/GoogleAuthTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->insert(['role_name' => $role]);
        }
        DB::table('user_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
            ['status_code' => 'INACTIVE', 'status_name' => 'Inactive', 'description' => null],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createUser(array $seed, string $role = 'Customer', array $extra = []): object
    {
        $id = DB::table('users')->insertGetId(array_merge([
            'full_name'          => 'Test User',
            'username'           => 'testuser',
            'password_hash'      => Hash::make('password'),
            'role_id_fk'         => $seed['roles'][$role],
            'user_status_id_fk'  => $seed['activeId'],
            'created_at'         => now(),
            'updated_at'         => now(),
        ], $extra));
        return DB::table('users')->where('user_id', $id)->first();
    }

    public function test_google_login_returns_needs_registration_for_new_user(): void
    {
        $this->seedBase();
        config(['services.google.client_id' => 'test-client-id']);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response([
                'sub'   => 'google_sub_new',
                'email' => 'new@example.com',
                'name'  => 'New User',
                'aud'   => 'test-client-id',
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/google', ['credential' => 'fake-token']);

        $response->assertOk()->assertJson([
            'needs_registration' => true,
            'google_data'        => ['email' => 'new@example.com', 'name' => 'New User'],
        ]);
    }

    public function test_google_login_returns_token_for_existing_user(): void
    {
        $seed = $this->seedBase();
        config(['services.google.client_id' => 'test-client-id']);

        $this->createUser($seed, 'Customer', [
            'email'     => 'existing@example.com',
            'google_id' => 'google_sub_existing',
        ]);

        Http::fake([
            'oauth2.googleapis.com/*' => Http::response([
                'sub'   => 'google_sub_existing',
                'email' => 'existing@example.com',
                'name'  => 'Existing User',
                'aud'   => 'test-client-id',
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/google', ['credential' => 'fake-token']);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_google_register_creates_customer_and_returns_token(): void
    {
        $seed = $this->seedBase();

        $response = $this->postJson('/api/auth/google/register', [
            'google_id'       => 'google_sub_123',
            'name'            => 'New Customer',
            'email'           => 'customer@example.com',
            'password'        => 'password123',
            'requested_role'  => 'customer',
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'user']);
        $this->assertDatabaseHas('users', ['email' => 'customer@example.com', 'google_id' => 'google_sub_123']);
        $this->assertDatabaseHas('customers', ['email' => 'customer@example.com']);
        $this->assertDatabaseMissing('role_requests', ['status' => 'pending']);
    }

    public function test_google_register_creates_role_request_for_staff(): void
    {
        $seed = $this->seedBase();

        $response = $this->postJson('/api/auth/google/register', [
            'google_id'      => 'google_sub_456',
            'name'           => 'New Staff',
            'email'          => 'staff@example.com',
            'password'       => 'password123',
            'requested_role' => 'staff',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('role_requests', ['status' => 'pending']);
        $user = DB::table('users')->where('email', 'staff@example.com')->first();
        $customerRoleId = $seed['roles']['Customer'];
        $this->assertEquals($customerRoleId, $user->role_id_fk);
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd Backend && php artisan test --filter=GoogleAuthTest
```

Expected: FAIL — `GoogleAuthController` not found.

- [ ] **Step 3: Create `Backend/app/Models/RoleRequest.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoleRequest extends Model
{
    protected $fillable = ['user_id_fk', 'requested_role_id_fk', 'status', 'reviewed_by_fk', 'reviewed_at'];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id_fk', 'user_id');
    }

    public function requestedRole()
    {
        return $this->belongsTo(Role::class, 'requested_role_id_fk', 'role_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by_fk', 'user_id');
    }
}
```

- [ ] **Step 4: Update `Backend/app/Models/User.php` — add `email` and `google_id` to fillable**

Replace the `$fillable` array:

```php
    protected $fillable = [
        'role_id_fk',
        'full_name',
        'username',
        'email',
        'google_id',
        'password_hash',
        'user_status_id_fk',
    ];
```

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Models/RoleRequest.php Backend/app/Models/User.php
git commit -m "feat: add RoleRequest model and email/google_id to User fillable"
```

---

## Task 3: Backend — GoogleAuthController

**Files:**
- Create: `Backend/app/Http/Controllers/Api/GoogleAuthController.php`

- [ ] **Step 1: Create the controller**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RoleRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class GoogleAuthController extends Controller
{
    public function googleLogin(Request $request): JsonResponse
    {
        $request->validate(['credential' => ['required', 'string']]);

        $payload = $this->verifyGoogleToken($request->credential);

        if (!$payload) {
            return response()->json(['message' => 'Invalid Google token.'], 401);
        }

        $user = User::with(['role', 'status'])
            ->where('google_id', $payload['sub'])
            ->orWhere('email', $payload['email'])
            ->first();

        if (!$user) {
            return response()->json([
                'needs_registration' => true,
                'google_data' => [
                    'google_id' => $payload['sub'],
                    'name'      => $payload['name'] ?? '',
                    'email'     => $payload['email'],
                ],
            ]);
        }

        if ($user->google_id === null) {
            $user->update(['google_id' => $payload['sub']]);
        }

        $this->log($user->user_id, 'Logged in via Google', 'users', $user->user_id);

        return response()->json([
            'token' => $user->createToken('frontend')->plainTextToken,
            'user'  => $this->userResource($user->fresh(['role', 'status'])),
        ]);
    }

    public function googleRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'google_id'      => ['required', 'string', 'unique:users,google_id'],
            'name'           => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'max:100', 'unique:users,email'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'password'       => ['required', 'string', 'min:8'],
            'requested_role' => ['required', 'in:customer,staff,mechanic'],
        ]);

        $customerRole  = Role::where('role_name', 'Customer')->first();
        $activeStatus  = UserStatus::where('status_code', 'ACTIVE')->first();

        $user = User::create([
            'role_id_fk'        => $customerRole->role_id,
            'full_name'         => $data['name'],
            'username'          => $data['email'],
            'email'             => $data['email'],
            'google_id'         => $data['google_id'],
            'password_hash'     => Hash::make($data['password']),
            'user_status_id_fk' => $activeStatus->user_status_id,
        ]);

        Customer::create([
            'user_id_fk' => $user->user_id,
            'full_name'  => $data['name'],
            'email'      => $data['email'],
            'phone'      => $data['phone'] ?? null,
        ]);

        if (in_array($data['requested_role'], ['staff', 'mechanic'])) {
            $requestedRole = Role::where('role_name', ucfirst($data['requested_role']))->first();
            RoleRequest::create([
                'user_id_fk'          => $user->user_id,
                'requested_role_id_fk' => $requestedRole->role_id,
                'status'              => 'pending',
            ]);
        }

        $this->log($user->user_id, 'Registered via Google', 'users', $user->user_id);

        return response()->json([
            'token' => $user->createToken('frontend')->plainTextToken,
            'user'  => $this->userResource($user->load(['role', 'status'])),
        ]);
    }

    private function verifyGoogleToken(string $credential): ?array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $credential,
        ]);

        if (!$response->ok()) {
            return null;
        }

        $payload = $response->json();

        if (($payload['aud'] ?? '') !== config('services.google.client_id')) {
            return null;
        }

        return $payload;
    }

    private function userResource(User $user): array
    {
        return [
            'id'         => (string) $user->user_id,
            'name'       => $user->full_name,
            'email'      => $user->email ?? $user->username,
            'role'       => $user->role?->role_name,
            'status'     => $user->status?->status_name,
            'lastActive' => optional($user->updated_at)->toISOString(),
        ];
    }

    private function log(int $userId, string $action, ?string $table = null, ?int $recordId = null): void
    {
        DB::table('activity_logs')->insert([
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
```

- [ ] **Step 2: Run the Google auth tests**

```bash
cd Backend && php artisan test --filter=GoogleAuthTest
```

Expected: All 4 tests pass. If `UserStatus` model is missing, create it (see note below).

> **Note:** If `UserStatus` model does not exist at `Backend/app/Models/UserStatus.php`, create it:
> ```php
> <?php
> namespace App\Models;
> use Illuminate\Database\Eloquent\Model;
> class UserStatus extends Model {
>     public $timestamps = false;
>     protected $primaryKey = 'user_status_id';
>     protected $fillable = ['status_code', 'status_name', 'description'];
> }
> ```

- [ ] **Step 3: Commit**

```bash
git add Backend/app/Http/Controllers/Api/GoogleAuthController.php
git commit -m "feat: add GoogleAuthController with login and register endpoints"
```

---

## Task 4: Backend — RoleRequestController

**Files:**
- Create: `Backend/app/Http/Controllers/Api/RoleRequestController.php`
- Create: `Backend/tests/Feature/RoleRequestTest.php`

- [ ] **Step 1: Write the failing tests**

Create `Backend/tests/Feature/RoleRequestTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleRequestTest extends TestCase
{
    use RefreshDatabase;

    private function seedBase(): array
    {
        foreach (['Admin', 'Staff', 'Mechanic', 'Customer'] as $role) {
            DB::table('roles')->insert(['role_name' => $role]);
        }
        DB::table('user_statuses')->insert([
            ['status_code' => 'ACTIVE',   'status_name' => 'Active',   'description' => null],
            ['status_code' => 'INACTIVE', 'status_name' => 'Inactive', 'description' => null],
        ]);
        DB::table('mechanic_statuses')->insert([
            ['status_code' => 'ACTIVE', 'status_name' => 'Active', 'description' => null],
        ]);
        return [
            'roles'    => DB::table('roles')->pluck('role_id', 'role_name'),
            'activeId' => DB::table('user_statuses')->where('status_code', 'ACTIVE')->value('user_status_id'),
        ];
    }

    private function createUser(array $seed, string $role, array $extra = []): object
    {
        $id = DB::table('users')->insertGetId(array_merge([
            'full_name'         => 'Test User',
            'username'          => 'user_' . uniqid(),
            'password_hash'     => Hash::make('password'),
            'role_id_fk'        => $seed['roles'][$role],
            'user_status_id_fk' => $seed['activeId'],
            'created_at'        => now(),
            'updated_at'        => now(),
        ], $extra));
        return DB::table('users')->where('user_id', $id)->first();
    }

    private function actingAsAdmin(array $seed): self
    {
        $admin = $this->createUser($seed, 'Admin');
        $token = \App\Models\User::find($admin->user_id)->createToken('test')->plainTextToken;
        return $this->withToken($token);
    }

    public function test_admin_can_list_pending_role_requests(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c@test.com']);
        DB::table('role_requests')->insert([
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->getJson('/api/role-requests');
        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_approve_role_request(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c2@test.com']);
        $requestId = DB::table('role_requests')->insertGetId([
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Staff'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("/api/role-requests/{$requestId}/approve");
        $response->assertOk();

        $updated = DB::table('users')->where('user_id', $customer->user_id)->first();
        $this->assertEquals($seed['roles']['Staff'], $updated->role_id_fk);
        $this->assertDatabaseHas('role_requests', ['id' => $requestId, 'status' => 'approved']);
    }

    public function test_admin_can_deny_role_request(): void
    {
        $seed = $this->seedBase();
        $customer = $this->createUser($seed, 'Customer', ['email' => 'c3@test.com']);
        $requestId = DB::table('role_requests')->insertGetId([
            'user_id_fk'           => $customer->user_id,
            'requested_role_id_fk' => $seed['roles']['Mechanic'],
            'status'               => 'pending',
            'created_at'           => now(),
            'updated_at'           => now(),
        ]);

        $response = $this->actingAsAdmin($seed)->patchJson("/api/role-requests/{$requestId}/deny");
        $response->assertOk();
        $this->assertDatabaseHas('role_requests', ['id' => $requestId, 'status' => 'denied']);
    }
}
```

- [ ] **Step 2: Run — confirm fail**

```bash
cd Backend && php artisan test --filter=RoleRequestTest
```

Expected: FAIL — route not found.

- [ ] **Step 3: Create the controller**

```php
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

        $requests = RoleRequest::with(['user', 'requestedRole'])
            ->where('status', $status)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'            => $r->id,
                'user_id'       => (string) $r->user_id_fk,
                'user_name'     => $r->user?->full_name,
                'user_email'    => $r->user?->email ?? $r->user?->username,
                'requested_role'=> $r->requestedRole?->role_name,
                'status'        => $r->status,
                'created_at'    => $r->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $requests]);
    }

    public function approve(RoleRequest $roleRequest): JsonResponse
    {
        if ($roleRequest->status !== 'pending') {
            return response()->json(['message' => 'Request already resolved.'], 422);
        }

        $user = $roleRequest->user;
        $roleName = $roleRequest->requestedRole?->role_name;

        $user->update(['role_id_fk' => $roleRequest->requested_role_id_fk]);

        if ($roleName === 'Mechanic') {
            $mechanicStatusId = DB::table('mechanic_statuses')
                ->where('status_code', 'ACTIVE')
                ->value('mechanic_status_id');

            Mechanic::firstOrCreate(
                ['user_id_fk' => $user->user_id],
                [
                    'full_name'               => $user->full_name,
                    'email'                   => $user->email ?? $user->username,
                    'mechanic_status_id_fk'   => $mechanicStatusId,
                ]
            );
        }

        $roleRequest->update([
            'status'         => 'approved',
            'reviewed_by_fk' => auth()->id(),
            'reviewed_at'    => now(),
        ]);

        $this->log(auth()->id(), "Approved role request #{$roleRequest->id} for user {$user->user_id}", 'role_requests', $roleRequest->id);

        return response()->json(['message' => 'Request approved.']);
    }

    public function deny(RoleRequest $roleRequest): JsonResponse
    {
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
            'user_id_fk'  => $userId,
            'action'      => $action,
            'table_name'  => $table,
            'record_id'   => $recordId,
            'log_date'    => now(),
            'description' => $action,
        ]);
    }
}
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
cd Backend && php artisan test --filter=RoleRequestTest
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/RoleRequestController.php Backend/tests/Feature/RoleRequestTest.php
git commit -m "feat: add RoleRequestController with list/approve/deny"
```

---

## Task 5: Backend — Routes + AuthController Login Update

**Files:**
- Modify: `Backend/routes/api.php`
- Modify: `Backend/app/Http/Controllers/Api/AuthController.php`

- [ ] **Step 1: Update routes — add Google auth + role-request routes**

Replace the contents of `Backend/routes/api.php` with:

```php
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\MospamsController;
use App\Http\Controllers\Api\RoleRequestController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/google', [GoogleAuthController::class, 'googleLogin']);
Route::post('/auth/google/register', [GoogleAuthController::class, 'googleRegister']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/parts', [MospamsController::class, 'parts'])->middleware('role:Admin,Staff');
    Route::post('/parts', [MospamsController::class, 'storePart'])->middleware('role:Admin');
    Route::patch('/parts/{part}', [MospamsController::class, 'updatePart'])->middleware('role:Admin,Staff');
    Route::delete('/parts/{part}', [MospamsController::class, 'deletePart'])->middleware('role:Admin');
    Route::get('/categories', [MospamsController::class, 'categories'])->middleware('role:Admin,Staff');
    Route::get('/stock-movements', [MospamsController::class, 'stockMovements'])->middleware('role:Admin,Staff');
    Route::post('/stock-movements', [MospamsController::class, 'storeStockMovement'])->middleware('role:Admin,Staff');

    Route::get('/services', [MospamsController::class, 'services'])->middleware('role:Admin,Staff');
    Route::post('/services', [MospamsController::class, 'storeService'])->middleware('role:Admin,Staff');
    Route::patch('/services/{service}', [MospamsController::class, 'updateService'])->middleware('role:Admin,Staff');
    Route::delete('/services/{service}', [MospamsController::class, 'deleteService'])->middleware('role:Admin');
    Route::get('/service-types', [MospamsController::class, 'serviceTypes'])->middleware('role:Admin,Staff');
    Route::post('/service-types', [MospamsController::class, 'storeServiceType'])->middleware('role:Admin');
    Route::patch('/service-types/{serviceType}', [MospamsController::class, 'updateServiceType'])->middleware('role:Admin');
    Route::delete('/service-types/{serviceType}', [MospamsController::class, 'deleteServiceType'])->middleware('role:Admin');
    Route::get('/mechanics', [MospamsController::class, 'mechanics'])->middleware('role:Admin,Staff');

    Route::get('/transactions', [MospamsController::class, 'transactions'])->middleware('role:Admin,Staff');
    Route::post('/transactions', [MospamsController::class, 'storeTransaction'])->middleware('role:Admin,Staff');
    Route::get('/payments', [MospamsController::class, 'payments'])->middleware('role:Admin,Staff');

    Route::get('/users', [MospamsController::class, 'users'])->middleware('role:Admin');
    Route::post('/users', [MospamsController::class, 'storeUser'])->middleware('role:Admin');
    Route::patch('/users/{user}', [MospamsController::class, 'updateUser'])->middleware('role:Admin');
    Route::patch('/users/{user}/status', [MospamsController::class, 'updateUserStatus'])->middleware('role:Admin');
    Route::delete('/users/{user}', [MospamsController::class, 'deleteUser'])->middleware('role:Admin');
    Route::get('/activity-logs', [MospamsController::class, 'activityLogs'])->middleware('role:Admin');

    Route::get('/reports/sales', [MospamsController::class, 'salesReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/inventory', [MospamsController::class, 'inventoryReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/services', [MospamsController::class, 'servicesReport'])->middleware('role:Admin,Staff');
    Route::get('/reports/income', [MospamsController::class, 'incomeReport'])->middleware('role:Admin,Staff');

    Route::get('/role-requests', [RoleRequestController::class, 'index'])->middleware('role:Admin');
    Route::patch('/role-requests/{roleRequest}/approve', [RoleRequestController::class, 'approve'])->middleware('role:Admin');
    Route::patch('/role-requests/{roleRequest}/deny', [RoleRequestController::class, 'deny'])->middleware('role:Admin');
});
```

- [ ] **Step 2: Update `AuthController::login` to also match by email**

In `Backend/app/Http/Controllers/Api/AuthController.php`, replace the `$user = User::query()` block inside `login()`:

```php
        $user = User::query()
            ->with(['role', 'status'])
            ->where('username', $credentials['email'])
            ->orWhere('email', $credentials['email'])
            ->first();
```

- [ ] **Step 3: Run all backend tests**

```bash
cd Backend && php artisan test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add Backend/routes/api.php Backend/app/Http/Controllers/Api/AuthController.php
git commit -m "feat: add google auth + role-request routes, update login email lookup"
```

---

## Task 6: Frontend — Install Package + Types + Env

**Files:**
- Modify: `Frontend/src/shared/types/index.ts`

- [ ] **Step 1: Install `@react-oauth/google`**

```bash
cd Frontend && npm install @react-oauth/google
```

Expected: `added 1 package` (or similar), no errors.

- [ ] **Step 2: Add `VITE_GOOGLE_CLIENT_ID` to `Frontend/.env`**

Create or open `Frontend/.env` and add:

```
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id-here
```

> Use the same Client ID from Task 1 Step 4. If `.env` already exists, just append the line.

- [ ] **Step 3: Add `RoleRequest` type to `Frontend/src/shared/types/index.ts`**

Append to the end of the file:

```typescript
export interface RoleRequest {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_role: 'Staff' | 'Mechanic';
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export interface GoogleData {
  google_id: string;
  name: string;
  email: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/shared/types/index.ts
git commit -m "feat: add RoleRequest and GoogleData types, install @react-oauth/google"
```

---

## Task 7: Frontend — Update AuthContext

**Files:**
- Modify: `Frontend/src/features/auth/context/AuthContext.tsx`

- [ ] **Step 1: Replace `Frontend/src/features/auth/context/AuthContext.tsx`**

```tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, GoogleData } from '@/shared/types';
import { apiMutation, setAuthToken } from '@/shared/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  googleLogin: (credential: string) => Promise<{ needsRegistration: true; googleData: GoogleData } | { needsRegistration: false }>;
  googleRegister: (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
  }) => Promise<boolean>;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface LoginResponse { token: string; user: User }
interface GoogleLoginResponse {
  needs_registration?: true;
  google_data?: GoogleData;
  token?: string;
  user?: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiMutation<LoginResponse>('/api/login', 'POST', { email, password });
      setAuthToken(response.token);
      setUser(response.user);
      return true;
    } catch {
      setAuthToken(null);
      setUser(null);
      return false;
    }
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    try {
      const response = await apiMutation<GoogleLoginResponse>('/api/auth/google', 'POST', { credential });
      if (response.needs_registration && response.google_data) {
        return { needsRegistration: true as const, googleData: response.google_data };
      }
      if (response.token && response.user) {
        setAuthToken(response.token);
        setUser(response.user);
      }
      return { needsRegistration: false as const };
    } catch {
      return { needsRegistration: false as const };
    }
  }, []);

  const googleRegister = useCallback(async (payload: {
    google_id: string;
    name: string;
    email: string;
    phone?: string;
    password: string;
    requested_role: 'customer' | 'staff' | 'mechanic';
  }) => {
    try {
      const response = await apiMutation<LoginResponse>('/api/auth/google/register', 'POST', payload);
      setAuthToken(response.token);
      setUser(response.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiMutation('/api/logout', 'POST');
    } catch {
      // A failed logout request should still clear this browser session.
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      googleLogin,
      googleRegister,
      logout: () => { void logout(); },
      ready: true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors related to AuthContext.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/auth/context/AuthContext.tsx
git commit -m "feat: add googleLogin and googleRegister to AuthContext"
```

---

## Task 8: Frontend — GoogleSignUpModal Component

**Files:**
- Create: `Frontend/src/features/auth/components/GoogleSignUpModal.tsx`

- [ ] **Step 1: Create the modal**

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { GoogleData } from '@/shared/types';

type RequestedRole = 'customer' | 'staff' | 'mechanic';

interface Props {
  open: boolean;
  googleData: GoogleData;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS: { value: RequestedRole; label: string; desc: string; instant: boolean }[] = [
  { value: 'customer', label: 'Customer',  desc: 'Book services and track your repairs.',         instant: true  },
  { value: 'staff',    label: 'Staff',     desc: 'Manage inventory, services, and sales.',       instant: false },
  { value: 'mechanic', label: 'Mechanic',  desc: 'Handle assigned service jobs.',                instant: false },
];

export default function GoogleSignUpModal({ open, googleData, onClose, onSuccess }: Props) {
  const { googleRegister } = useAuth();
  const [name, setName]         = useState(googleData.name);
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [role, setRole]         = useState<RequestedRole>('customer');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    const ok = await googleRegister({
      google_id:      googleData.google_id,
      name:           name.trim(),
      email:          googleData.email,
      phone:          phone.trim() || undefined,
      password,
      requested_role: role,
    });
    setSubmitting(false);

    if (!ok) { setError('Registration failed. Please try again.'); return; }
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-xl border border-neutral-200 bg-neutral-100 p-0 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 overflow-y-auto max-h-[90vh]">
        <div className="p-6 sm:p-7">
          <DialogHeader className="mb-5 text-center">
            <DialogTitle className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
              Complete Sign Up
            </DialogTitle>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Signed in as <span className="font-medium text-orange-400">{googleData.email}</span>
            </p>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-y-4">
            {/* Full Name */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Email</Label>
              <Input
                value={googleData.email}
                readOnly
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-500 cursor-not-allowed dark:border-neutral-600 dark:bg-neutral-700/30"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">
                Phone <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 912 345 6789"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            {/* Password */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="8+ characters"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your password"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            {/* Role Selector */}
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">I am signing up as</Label>
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      role === opt.value
                        ? 'border-neutral-800 bg-white shadow-sm dark:border-neutral-400 dark:bg-neutral-700'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{opt.label}</span>
                        {opt.instant ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-neutral-800">
                            <CheckCircle className="w-2.5 h-2.5" /> Instant access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300">
                            <Clock className="w-2.5 h-2.5" /> Pending approval
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</p>
                      {!opt.instant && role === opt.value && (
                        <p className="mt-1 text-xs text-orange-400">You'll start with Customer access while your request is reviewed.</p>
                      )}
                    </div>
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      role === opt.value ? 'border-neutral-800 dark:border-neutral-300' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {role === opt.value && <div className="w-2 h-2 rounded-full bg-neutral-800 dark:bg-neutral-300" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex w-full items-center justify-center gap-x-2 rounded-lg border border-transparent bg-yellow-400 px-4 py-3 text-sm font-bold text-neutral-700 transition duration-300 hover:bg-yellow-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/auth/components/GoogleSignUpModal.tsx
git commit -m "feat: add GoogleSignUpModal with role selector (ScrewFast design)"
```

---

## Task 9: Frontend — Update Login Page

**Files:**
- Modify: `Frontend/src/features/auth/pages/Login.tsx`

- [ ] **Step 1: Replace `Frontend/src/features/auth/pages/Login.tsx`**

```tsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { LayoutGrid, AlertCircle, ArrowRight } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/context/AuthContext';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import type { GoogleData } from '@/shared/types';

interface LocationState { from?: { pathname?: string } }

export default function Login() {
  const { login, googleLogin, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [signUpOpen, setSignUpOpen]     = useState(false);
  const [googleData, setGoogleData]     = useState<GoogleData | null>(null);

  const dest = () => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname && state.from.pathname !== '/login' ? state.from.pathname : '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(email.trim().toLowerCase(), password.trim());
    setSubmitting(false);
    if (!ok) { setError('Invalid email or password.'); return; }
    navigate(dest(), { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    const result = await googleLogin(credentialResponse.credential);
    if (result.needsRegistration) {
      setGoogleData(result.googleData);
      setSignUpOpen(true);
    } else {
      navigate(dest(), { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] relative">
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: `radial-gradient(circle, #1C1917 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
      />

      <div className="w-full max-w-[360px] px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="w-11 h-11 rounded-[14px] bg-[#1C1917] flex items-center justify-center mx-auto mb-4 shadow-md">
            <LayoutGrid className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">MoSPAMS</h1>
          <p className="text-[13px] text-[#A8A29E] mt-1.5 font-normal">Motorcycle Service & Parts Management</p>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.03)] border border-[#F5F5F4]">
          <h2 className="text-[15px] font-semibold text-[#1C1917] mb-5">Sign In</h2>

          {/* Google Sign-In Button — GoogleLogin renders Google's official button.
               Use theme="outline" + shape="rectangular" for cleanest look. */}
          <div className="mb-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap={false}
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
              text="continue_with"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center py-3 text-xs text-neutral-400 uppercase before:me-6 before:flex-[1_1_0%] before:border-t before:border-neutral-200 after:ms-6 after:flex-[1_1_0%] after:border-t after:border-neutral-200">
            Or
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50/80 text-red-600 text-[12px] mb-4 border border-red-100/50">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[12px] font-medium text-[#78716C] mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label className="text-[12px] font-medium text-[#78716C] mb-1.5 block">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !ready}
              className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[13px] font-medium transition-all hover:shadow-lg hover:shadow-stone-900/10 mt-1 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 opacity-60" />
            </Button>
          </form>
        </div>
      </div>

      {googleData && (
        <GoogleSignUpModal
          open={signUpOpen}
          googleData={googleData}
          onClose={() => { setSignUpOpen(false); setGoogleData(null); }}
          onSuccess={() => { setSignUpOpen(false); navigate(dest(), { replace: true }); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/auth/pages/Login.tsx
git commit -m "feat: add Google sign-in button and sign-up modal trigger to Login page"
```

---

## Task 10: Frontend — ApprovalsPage

**Files:**
- Create: `Frontend/src/features/users/pages/ApprovalsPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest } from '@/shared/types';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ data: RoleRequest[] }>('/api/role-requests?status=pending');
      setRequests(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/approve`, 'PATCH');
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDeny = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/deny`, 'PATCH');
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Role Approvals</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">Review pending Staff and Mechanic role requests</p>
        </div>
        {requests.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-neutral-800">
            <Clock className="w-3 h-3" /> {requests.length} pending
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#A8A29E] text-[13px]">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCheck className="w-10 h-10 text-[#D6D3D1]" strokeWidth={1} />
            <p className="text-[13px] text-[#A8A29E]">No pending role requests</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F5F5F4] bg-[#FAFAF9]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Requested Role</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-[#F5F5F4] last:border-0 hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#1C1917]">{req.user_name}</td>
                  <td className="px-5 py-3.5 text-[#78716C]">{req.user_email}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                      {req.requested_role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#A8A29E]">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-neutral-800 hover:bg-yellow-500 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        <XCircle className="w-3 h-3" /> Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/users/pages/ApprovalsPage.tsx
git commit -m "feat: add ApprovalsPage for admin role request management"
```

---

## Task 11: Frontend — Wire Everything Together

**Files:**
- Modify: `Frontend/src/app/App.tsx`
- Modify: `Frontend/src/shared/lib/permissions.ts`
- Modify: `Frontend/src/features/layout/pages/DashboardLayout.tsx`
- Modify: `Frontend/src/features/users/pages/UsersPage.tsx`

- [ ] **Step 1: Update `Frontend/src/app/App.tsx` — add GoogleOAuthProvider + /approvals route**

Replace the entire file:

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { DataProvider } from '@/shared/contexts/DataContext';
import Login from '@/features/auth/pages/Login';
import DashboardLayout from '@/features/layout/pages/DashboardLayout';
import Overview from '@/features/dashboard/pages/Overview';
import InventoryPage from '@/features/inventory/pages/InventoryPage';
import ServicesPage from '@/features/services/pages/ServicesPage';
import SalesPage from '@/features/sales/pages/SalesPage';
import ReportsPage from '@/features/reports/pages/ReportsPage';
import UsersPage from '@/features/users/pages/UsersPage';
import ApprovalsPage from '@/features/users/pages/ApprovalsPage';
import NotFound from '@/features/common/NotFound';
import type { Role } from '@/shared/types';

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Toaster position="top-right" richColors closeButton />
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<RequireAuth />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="sales" element={<SalesPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route element={<RequireRole role="Admin" />}>
                    <Route path="users" element={<UsersPage />} />
                    <Route path="approvals" element={<ApprovalsPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
```

- [ ] **Step 2: Update `Frontend/src/shared/lib/permissions.ts` — add /approvals to NAV_ACCESS**

Add one line to the `NAV_ACCESS` object (after the `/users` entry):

```typescript
export const NAV_ACCESS: Record<string, Role[]> = {
  '/': ['Admin', 'Staff'],
  '/inventory': ['Admin', 'Staff'],
  '/services': ['Admin', 'Staff'],
  '/sales': ['Admin', 'Staff'],
  '/reports': ['Admin', 'Staff'],
  '/users': ['Admin'],
  '/approvals': ['Admin'],
};
```

- [ ] **Step 3: Update `Frontend/src/features/layout/pages/DashboardLayout.tsx` — add Approvals nav item**

Find the `navItems` array (near the top of the file) and add the Approvals entry. First add the import — add `ClipboardCheck` to the lucide-react import line:

```tsx
import {
  LayoutDashboard, Package, Wrench, ShoppingCart,
  BarChart3, Shield, LogOut, Menu, X, Bell, ClipboardCheck,
} from 'lucide-react';
```

Then replace the `navItems` array:

```tsx
const navItems: { label: string; to: string; icon: typeof LayoutDashboard; end?: boolean }[] = [
  { label: 'Dashboard',  to: '/',           icon: LayoutDashboard, end: true },
  { label: 'Inventory',  to: '/inventory',  icon: Package },
  { label: 'Services',   to: '/services',   icon: Wrench },
  { label: 'Sales',      to: '/sales',      icon: ShoppingCart },
  { label: 'Reports',    to: '/reports',    icon: BarChart3 },
  { label: 'Users',      to: '/users',      icon: Shield },
  { label: 'Approvals',  to: '/approvals',  icon: ClipboardCheck },
];
```

- [ ] **Step 4: Add Pending Requests tab to `Frontend/src/features/users/pages/UsersPage.tsx`**

At the top of the file, add these imports after the existing imports:

```tsx
import { useCallback, useEffect, useState as useTabState } from 'react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import type { RoleRequest } from '@/shared/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
```

> **Note:** `useState` is already imported. Import `useCallback` and `useEffect` by adding them to the existing React import, and add the others as shown. The exact merge depends on what's already imported — add only what's missing.

Add a `pendingCount` state and fetch logic inside the `Users` component function, right after the existing state declarations:

```tsx
  const [pendingRequests, setPendingRequests] = useState<RoleRequest[]>([]);
  const [tab, setTab] = useState<'users' | 'requests'>('users');

  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await apiGet<{ data: RoleRequest[] }>('/api/role-requests?status=pending');
      setPendingRequests(data.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void fetchPendingRequests(); }, [fetchPendingRequests]);

  const handleApprove = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/approve`, 'PATCH');
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDeny = async (id: number) => {
    await apiMutation(`/api/role-requests/${id}/deny`, 'PATCH');
    setPendingRequests(prev => prev.filter(r => r.id !== id));
  };
```

Replace the `return (` block's opening `<div>` wrapper to add tabs. Add the tab switcher right after the header div (after the `</div>` that contains the "Add User" button):

```tsx
      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-[#F5F5F4]">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            tab === 'users'
              ? 'border-[#1C1917] text-[#1C1917]'
              : 'border-transparent text-[#A8A29E] hover:text-[#78716C]'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'requests'
              ? 'border-[#1C1917] text-[#1C1917]'
              : 'border-transparent text-[#A8A29E] hover:text-[#78716C]'
          }`}
        >
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>
```

Wrap the existing users table/content in `{tab === 'users' && (...)}` and add the requests panel:

```tsx
      {tab === 'requests' && (
        <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock className="w-10 h-10 text-[#D6D3D1]" strokeWidth={1} />
              <p className="text-[13px] text-[#A8A29E]">No pending role requests</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#F5F5F4] bg-[#FAFAF9]">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Requested Role</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-[#F5F5F4] last:border-0 hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1C1917]">{req.user_name}</td>
                    <td className="px-5 py-3.5 text-[#78716C]">{req.user_email}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
                        {req.requested_role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#A8A29E]">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-neutral-800 hover:bg-yellow-500 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/app/App.tsx Frontend/src/shared/lib/permissions.ts Frontend/src/features/layout/pages/DashboardLayout.tsx Frontend/src/features/users/pages/UsersPage.tsx
git commit -m "feat: wire GoogleOAuthProvider, approvals route, sidebar nav, and UsersPage pending tab"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd Backend && php artisan test
```

Expected: All tests pass.

- [ ] **Step 2: Start the frontend dev server**

```bash
cd Frontend && npm run dev
```

Expected: Server starts on `http://localhost:5173` with no compilation errors.

- [ ] **Step 3: Smoke test the happy path**

1. Navigate to `http://localhost:5173/login`
2. Verify "Continue with Google" button appears above the "Or" divider
3. Click "Continue with Google" — Google popup should appear (requires real `VITE_GOOGLE_CLIENT_ID`)
4. After Google sign-in for a new account: sign-up modal should appear with name/email pre-filled
5. Select a role, set a password, submit — should redirect to dashboard as Customer
6. Log in as Admin, go to `/users` — "Pending Requests" tab should show the new request
7. Go to `/approvals` sidebar link — same requests table, approve one
8. Verify the approved user's role changed in the Users table

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Google OAuth authentication with role request approval flow"
```
