# Shop Registration OTP + Auto-Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SuperAdmin-approval shop creation flow with a two-step email OTP verification that auto-activates the trial immediately on confirmation, enforcing one trial per owner email.

**Architecture:** The single `POST /api/shop-registration` endpoint is replaced by three endpoints — `initiate` (validates + sends OTP + returns an encrypted pending token), `confirm` (verifies OTP + decrypts token + creates shop fully activated), and `resend` (60 s cooldown OTP resend). No DB rows are created until OTP is confirmed. The encrypted token carries all validated form data between the two steps so nothing is stored until verified.

**Tech Stack:** Laravel 11, MySQL, `email_otp_verifications` table (already exists), `App\Mail\EmailVerificationMail` pattern, `App\Services\Identity\AccountProvisioner`, React + TypeScript + Vite.

---

## File Map

| Action | File |
|--------|------|
| Create | `Backend/app/Mail/ShopRegistrationOtpMail.php` |
| Rewrite | `Backend/app/Http/Controllers/Api/ShopRegistrationController.php` |
| Modify | `Backend/routes/api.php` |
| Rewrite | `Backend/tests/Feature/ShopRegistrationApprovalTest.php` |
| Modify | `Frontend/src/features/registration/pages/ShopRegistrationPage.tsx` |

---

### Task 1: Create ShopRegistrationOtpMail

**Files:**
- Create: `Backend/app/Mail/ShopRegistrationOtpMail.php`

- [ ] **Step 1: Create the mailable**

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShopRegistrationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $otpCode,
        public readonly string $shopName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your MoSPAMS shop registration');
    }

    public function content(): Content
    {
        $html = <<<HTML
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#09090b;color:#fafafa;margin:0;padding:40px 20px;">
          <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:16px;padding:40px;border:1px solid #27272a;">
            <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;">MoSPAMS</h1>
            <p style="color:#a1a1aa;margin:0 0 32px;">Motorcycle Service &amp; Parts Management</p>
            <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Verify your shop registration</h2>
            <p style="color:#a1a1aa;margin:0 0 24px;">Hi {$this->ownerName}, enter this code to activate your <strong style="color:#fafafa;">{$this->shopName}</strong> shop and start your free trial:</p>
            <div style="background:#09090b;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;border:1px solid #27272a;">
              <span style="font-size:40px;font-weight:700;letter-spacing:12px;font-family:monospace;">{$this->otpCode}</span>
            </div>
            <p style="color:#71717a;font-size:13px;margin:0;">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
        HTML;

        return new Content(htmlString: $html);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Mail/ShopRegistrationOtpMail.php
git commit -m "feat: add ShopRegistrationOtpMail mailable"
```

---

### Task 2: Rewrite ShopRegistrationController — initiate() + resend()

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/ShopRegistrationController.php`

The controller needs three public methods (`initiate`, `confirm`, `resend`) and one private helper (`sendShopOtp`). This task covers `initiate` and `resend`. The old `register()` method is removed.

**One-trial-per-email rule:** Before sending OTP, query `shops` joined with `shop_subscriptions` where `registration_owner_email = $email` AND `subscription_status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')`. If found → 422.

**Encrypted pending token:** Use Laravel's `encrypt()` to serialise all validated form data + `initiatedAt` Unix timestamp. Returned to frontend; sent back with OTP on confirm. Token is tamper-proof via Laravel's MAC. No DB rows written during initiate.

- [ ] **Step 1: Replace the file with the new controller (initiate + resend only; confirm stub)**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ShopRegistrationOtpMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ShopRegistrationController extends Controller
{
    public function initiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shopName'   => ['required', 'string', 'max:100'],
            'subdomain'  => ['required', 'string', 'max:50', 'alpha_dash', 'unique:shops,subdomain'],
            'ownerName'  => ['required', 'string', 'max:100'],
            'ownerEmail' => ['required', 'email', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'address'    => ['nullable', 'string', 'max:500'],
            'planCode'   => ['required', 'in:BASIC,PREMIUM,ENTERPRISE'],
        ]);

        abort_unless(
            DB::table('subscription_plans')->where('plan_code', $data['planCode'])->exists(),
            422, 'Invalid subscription plan.'
        );

        $ownerEmail = strtolower($data['ownerEmail']);

        // One-trial-per-email enforcement
        $alreadyUsedTrial = DB::table('shops as s')
            ->join('shop_subscriptions as ss', 'ss.shop_id_fk', '=', 's.shop_id')
            ->whereRaw('LOWER(s.registration_owner_email) = ?', [$ownerEmail])
            ->whereIn('ss.subscription_status', ['ACTIVE', 'EXPIRED', 'CANCELLED'])
            ->exists();

        if ($alreadyUsedTrial) {
            return response()->json([
                'message' => 'This email has already been used for a shop trial. Each email address can only register one shop.',
            ], 422);
        }

        $this->sendShopOtp($ownerEmail, $data['ownerName'], $data['shopName']);

        $pendingToken = encrypt([
            'shopName'    => $data['shopName'],
            'subdomain'   => strtolower($data['subdomain']),
            'ownerName'   => $data['ownerName'],
            'ownerEmail'  => $ownerEmail,
            'phone'       => $data['phone'] ?? null,
            'address'     => $data['address'] ?? null,
            'planCode'    => $data['planCode'],
            'initiatedAt' => now()->unix(),
        ]);

        return response()->json([
            'requiresVerification' => true,
            'email'        => $ownerEmail,
            'shopName'     => $data['shopName'],
            'pendingToken' => $pendingToken,
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'        => ['required', 'email'],
            'pendingToken' => ['required', 'string'],
        ]);

        try {
            $pending = decrypt($data['pendingToken']);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid session. Please start again.'], 422);
        }

        if (strtolower($pending['ownerEmail'] ?? '') !== strtolower($data['email'])) {
            return response()->json(['message' => 'Invalid session.'], 422);
        }

        $last = DB::table('email_otp_verifications')
            ->where('email', strtolower($data['email']))
            ->orderByDesc('created_at')
            ->first();

        if ($last && now()->diffInSeconds($last->created_at) < 60) {
            return response()->json(['message' => 'Please wait before requesting another code.'], 429);
        }

        $this->sendShopOtp(strtolower($data['email']), $pending['ownerName'], $pending['shopName']);

        return response()->json(['message' => 'A new verification code has been sent to your email.']);
    }

    public function confirm(Request $request): JsonResponse
    {
        // implemented in Task 3
        return response()->json(['message' => 'not implemented'], 501);
    }

    private function sendShopOtp(string $email, string $ownerName, string $shopName): void
    {
        DB::table('email_otp_verifications')
            ->where('email', $email)
            ->where('used', false)
            ->update(['used' => true]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('email_otp_verifications')->insert([
            'email'      => $email,
            'otp_code'   => $code,
            'expires_at' => now()->addMinutes(15),
            'used'       => false,
            'created_at' => now(),
        ]);

        Mail::to($email)->send(new ShopRegistrationOtpMail($ownerName, $code, $shopName));
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ShopRegistrationController.php
git commit -m "feat: shop registration initiate — OTP send + one-trial-per-email guard"
```

---

### Task 3: ShopRegistrationController — confirm()

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/ShopRegistrationController.php`

`confirm()` decrypts the pending token, verifies the OTP, re-checks subdomain uniqueness (someone may have registered it while user was reading email), then creates the shop with `ACTIVE` status and an active trial subscription, and provisions the owner account via `AccountProvisioner`. No SuperAdmin involvement.

- [ ] **Step 1: Replace the stub confirm() with the full implementation**

Replace the `confirm()` stub (the `return response()->json(['message' => 'not implemented'], 501);` body) with:

```php
public function confirm(Request $request): JsonResponse
{
    $data = $request->validate([
        'email'        => ['required', 'email'],
        'code'         => ['required', 'string', 'size:6'],
        'pendingToken' => ['required', 'string'],
    ]);

    $email = strtolower($data['email']);

    $otp = DB::table('email_otp_verifications')
        ->where('email', $email)
        ->where('otp_code', $data['code'])
        ->where('used', false)
        ->where('expires_at', '>', now())
        ->first();

    if (! $otp) {
        return response()->json([
            'message' => 'Invalid or expired verification code.',
            'errors'  => ['code' => ['Invalid or expired verification code.']],
        ], 422);
    }

    try {
        $pending = decrypt($data['pendingToken']);
    } catch (\Throwable) {
        return response()->json(['message' => 'Invalid session. Please start the registration again.'], 422);
    }

    if ((now()->unix() - (int) ($pending['initiatedAt'] ?? 0)) > 1800) {
        return response()->json(['message' => 'Registration session expired. Please start again.'], 422);
    }

    if (strtolower($pending['ownerEmail'] ?? '') !== $email) {
        return response()->json(['message' => 'Invalid session. Please start again.'], 422);
    }

    // Mark OTP used before the transaction so it cannot be replayed on DB rollback
    DB::table('email_otp_verifications')->where('id', $otp->id)->update(['used' => true]);

    $trialDays         = max(1, (int) config('tenancy.shop_trial_days', 14));
    $ownerRoleId       = (int) DB::table('roles')->where('role_name', 'Owner')->value('role_id');
    $activeStatusId    = (int) DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');
    $planId            = (int) DB::table('subscription_plans')->where('plan_code', $pending['planCode'])->value('plan_id');

    abort_unless($ownerRoleId && $activeStatusId && $planId, 422, 'Configuration error. Please try again.');

    return DB::transaction(function () use ($pending, $email, $trialDays, $ownerRoleId, $activeStatusId, $planId) {
        // Re-check subdomain — someone may have registered it while the user was reading email
        abort_if(
            DB::table('shops')->where('subdomain', $pending['subdomain'])->lockForUpdate()->exists(),
            422,
            'This subdomain was just taken by another registration. Please start again and choose a different subdomain.'
        );

        $invitationCode = strtoupper(Str::random(8));

        $shopId = DB::table('shops')->insertGetId([
            'shop_name'                    => $pending['shopName'],
            'registration_owner_name'      => $pending['ownerName'],
            'registration_owner_email'     => $email,
            'subdomain'                    => $pending['subdomain'],
            'invitation_code'              => $invitationCode,
            'phone'                        => $pending['phone'] ?? null,
            'address'                      => $pending['address'] ?? null,
            'shop_status_id_fk'            => $activeStatusId,
            'registration_status'          => 'APPROVED',
            'registration_rejection_reason'=> null,
            'registration_approved_at'     => now(),
            'registration_rejected_at'     => null,
            'primary_color'                => '#3B82F6',
            'secondary_color'              => '#10B981',
            'business_hours'               => json_encode([
                'monday'    => ['open' => '08:00', 'close' => '18:00'],
                'tuesday'   => ['open' => '08:00', 'close' => '18:00'],
                'wednesday' => ['open' => '08:00', 'close' => '18:00'],
                'thursday'  => ['open' => '08:00', 'close' => '18:00'],
                'friday'    => ['open' => '08:00', 'close' => '18:00'],
                'saturday'  => ['open' => '08:00', 'close' => '16:00'],
                'sunday'    => ['closed' => true],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $endsAt = now()->addDays($trialDays);
        DB::table('shop_subscriptions')->insert([
            'shop_id_fk'          => $shopId,
            'plan_id_fk'          => $planId,
            'subscription_status' => 'ACTIVE',
            'starts_at'           => now(),
            'ends_at'             => $endsAt,
            'renews_at'           => $endsAt,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        $temporaryPassword = Str::random(12);
        /** @var \App\Services\Identity\AccountProvisioner $provisioner */
        $provisioner       = app(\App\Services\Identity\AccountProvisioner::class);
        $existingAccount   = $provisioner->findAccountByLogin($email);
        $account           = $provisioner->createOrUpdateAccount(
            $pending['ownerName'], $email, $temporaryPassword, null, ! $existingAccount
        );

        // Mark owner email verified — they just proved ownership via OTP
        DB::table('accounts')
            ->where('account_id', $account->account_id)
            ->update(['email_verified_at' => now(), 'updated_at' => now()]);

        abort_if($provisioner->membership($account, $shopId), 422, 'Account already has a membership in this shop.');
        $provisioner->createOrUpdateMembership($account, $shopId, $ownerRoleId);
        $owner = $provisioner->ensureTenantUser($account, $shopId, $ownerRoleId, $temporaryPassword);

        DB::table('activity_logs')->insert([
            'shop_id_fk'  => $shopId,
            'user_id_fk'  => $owner->user_id,
            'action'      => "Shop registered and trial activated: {$pending['shopName']}",
            'table_name'  => 'shops',
            'record_id'   => $shopId,
            'log_date'    => now(),
            'description' => "Self-service registration by {$pending['ownerName']} ({$email})",
        ]);

        return response()->json([
            'data' => [
                'shopId'            => $shopId,
                'shopName'          => $pending['shopName'],
                'subdomain'         => $pending['subdomain'],
                'invitationCode'    => $invitationCode,
                'ownerEmail'        => $email,
                'temporaryPassword' => $existingAccount ? null : $temporaryPassword,
                'trialDays'         => $trialDays,
                'trialEndsAt'       => $endsAt->toISOString(),
            ],
        ], 201);
    });
}
```

Also add the `AccountProvisioner` import at the top of the file (after the existing `use` statements):

```php
use App\Services\Identity\AccountProvisioner;
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/ShopRegistrationController.php
git commit -m "feat: shop registration confirm — verify OTP, create shop + active trial"
```

---

### Task 4: Update Routes

**Files:**
- Modify: `Backend/routes/api.php`

Replace the single old route with three new ones. Keep the same `throttle:shop-registration` middleware on `initiate`; use `throttle:10,1` on `confirm`; use `throttle:forgot-password` on `resend` (same rate as account OTP resend).

- [ ] **Step 1: Replace the old route**

Find:
```php
// Public shop registration
Route::post('/shop-registration', [ShopRegistrationController::class, 'register'])->middleware('throttle:shop-registration');
```

Replace with:
```php
// Public shop registration (two-step: initiate → OTP → confirm)
Route::post('/shop-registration/initiate', [ShopRegistrationController::class, 'initiate'])->middleware('throttle:shop-registration');
Route::post('/shop-registration/confirm',  [ShopRegistrationController::class, 'confirm'])->middleware('throttle:10,1');
Route::post('/shop-registration/resend',   [ShopRegistrationController::class, 'resend'])->middleware('throttle:forgot-password');
```

- [ ] **Step 2: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: replace shop-registration route with initiate/confirm/resend"
```

---

### Task 5: Update ShopRegistrationApprovalTest

**Files:**
- Rewrite: `Backend/tests/Feature/ShopRegistrationApprovalTest.php`

The old tests call `/api/shop-registration` (removed) and expect `PENDING_APPROVAL` status (no longer produced). Update them to use the new two-step flow. Add tests for one-trial-per-email and OTP expiry.

The test helper `$this->initiateAndGetToken()` calls `/initiate`, grabs the OTP from the DB, then returns `[pendingToken, email, otp]` to keep confirm tests readable.

- [ ] **Step 1: Rewrite the test file**

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ShopRegistrationApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('tenancy.platform_hosts', ['admin.mospams.local']);
        config()->set('tenancy.public_hosts', ['mospams.local']);
        config()->set('tenancy.api_hosts', ['api.mospams.local']);
        config()->set('tenancy.base_domain', 'mospams.local');
        config()->set('tenancy.shop_trial_days', 14);
        $this->seed();
        $this->withoutMiddleware(ThrottleRequests::class);
        Mail::fake();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private function initiatePayload(array $override = []): array
    {
        return array_merge([
            'shopName'   => 'Trial Moto Shop',
            'subdomain'  => 'trial-moto',
            'ownerName'  => 'Applicant Owner',
            'ownerEmail' => 'applicant@example.com',
            'planCode'   => 'BASIC',
        ], $override);
    }

    /** Calls /initiate, returns [pendingToken, email, otpCode]. */
    private function initiateAndGetToken(array $override = []): array
    {
        $payload  = $this->initiatePayload($override);
        $response = $this->postJson('http://mospams.local/api/shop-registration/initiate', $payload)
            ->assertOk()
            ->assertJsonStructure(['requiresVerification', 'email', 'pendingToken']);

        $email        = $response->json('email');
        $pendingToken = $response->json('pendingToken');
        $otpCode      = DB::table('email_otp_verifications')
            ->where('email', $email)
            ->where('used', false)
            ->orderByDesc('created_at')
            ->value('otp_code');

        return [$pendingToken, $email, $otpCode];
    }

    // ── initiate ─────────────────────────────────────────────────────────────

    public function test_initiate_sends_otp_and_returns_pending_token(): void
    {
        [$pendingToken, $email] = $this->initiateAndGetToken();

        $this->assertNotEmpty($pendingToken);
        $this->assertSame('applicant@example.com', $email);

        $this->assertDatabaseHas('email_otp_verifications', [
            'email' => 'applicant@example.com',
            'used'  => false,
        ]);

        // No shop created yet
        $this->assertDatabaseMissing('shops', [
            'registration_owner_email' => 'applicant@example.com',
        ]);
    }

    public function test_initiate_is_blocked_on_tenant_host(): void
    {
        $this->postJson('http://default.mospams.local/api/shop-registration/initiate', $this->initiatePayload())
            ->assertStatus(403);
    }

    public function test_initiate_blocks_duplicate_subdomain(): void
    {
        $this->initiateAndGetToken(['subdomain' => 'taken-sub', 'ownerEmail' => 'first@example.com']);
        // Confirm the first one so subdomain is actually in shops table
        [$token1,, $otp1] = $this->initiateAndGetToken(['subdomain' => 'taken-sub2', 'ownerEmail' => 'first2@example.com']);
        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => 'first2@example.com', 'code' => $otp1, 'pendingToken' => $token1,
        ])->assertCreated();

        // Second attempt with same subdomain
        $this->postJson('http://mospams.local/api/shop-registration/initiate', $this->initiatePayload([
            'subdomain'  => 'taken-sub2',
            'ownerEmail' => 'other@example.com',
        ]))->assertUnprocessable();
    }

    public function test_initiate_blocks_second_trial_for_same_email(): void
    {
        [$token, $email, $otp] = $this->initiateAndGetToken(['ownerEmail' => 'repeat@example.com', 'subdomain' => 'repeat-shop']);
        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => $email, 'code' => $otp, 'pendingToken' => $token,
        ])->assertCreated();

        // Second registration attempt with same email
        $this->postJson('http://mospams.local/api/shop-registration/initiate', $this->initiatePayload([
            'ownerEmail' => 'repeat@example.com',
            'subdomain'  => 'repeat-shop-2',
        ]))->assertUnprocessable()
            ->assertJsonFragment(['message' => 'This email has already been used for a shop trial. Each email address can only register one shop.']);
    }

    // ── confirm ───────────────────────────────────────────────────────────────

    public function test_confirm_creates_active_shop_with_trial_and_owner(): void
    {
        [$token, $email, $otp] = $this->initiateAndGetToken();

        $response = $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email'        => $email,
            'code'         => $otp,
            'pendingToken' => $token,
        ])->assertCreated()
            ->assertJsonStructure([
                'data' => ['shopId', 'shopName', 'subdomain', 'invitationCode', 'ownerEmail', 'temporaryPassword', 'trialDays', 'trialEndsAt'],
            ]);

        $shopId = (int) $response->json('data.shopId');

        $activeStatusId = DB::table('shop_statuses')->where('status_code', 'ACTIVE')->value('shop_status_id');

        $this->assertDatabaseHas('shops', [
            'shop_id'             => $shopId,
            'registration_status' => 'APPROVED',
            'shop_status_id_fk'   => $activeStatusId,
        ]);

        $this->assertDatabaseHas('shop_subscriptions', [
            'shop_id_fk'          => $shopId,
            'subscription_status' => 'ACTIVE',
        ]);

        $this->assertDatabaseHas('users', [
            'shop_id_fk' => $shopId,
            'email'      => 'applicant@example.com',
        ]);

        $this->assertSame(14, (int) $response->json('data.trialDays'));
        $this->assertNotEmpty($response->json('data.trialEndsAt'));
        $this->assertNotEmpty($response->json('data.temporaryPassword'));
    }

    public function test_confirm_rejects_wrong_otp(): void
    {
        [$token, $email] = $this->initiateAndGetToken();

        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email'        => $email,
            'code'         => '000000',
            'pendingToken' => $token,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Invalid or expired verification code.']);
    }

    public function test_confirm_rejects_expired_otp(): void
    {
        [$token, $email, $otp] = $this->initiateAndGetToken();

        // Expire the OTP
        DB::table('email_otp_verifications')
            ->where('email', $email)
            ->where('used', false)
            ->update(['expires_at' => now()->subMinute()]);

        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email'        => $email,
            'code'         => $otp,
            'pendingToken' => $token,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Invalid or expired verification code.']);
    }

    public function test_otp_cannot_be_used_twice(): void
    {
        [$token, $email, $otp] = $this->initiateAndGetToken();

        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => $email, 'code' => $otp, 'pendingToken' => $token,
        ])->assertCreated();

        // Second confirm attempt with same OTP — initiate a fresh session for a different subdomain
        [$token2] = $this->initiateAndGetToken(['subdomain' => 'other-shop', 'ownerEmail' => 'other@example.com']);

        // Replay old OTP for the original email — must fail
        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => $email, 'code' => $otp, 'pendingToken' => $token,
        ])->assertUnprocessable();
    }

    // ── SuperAdmin approval flow still works for existing PENDING shops ───────

    public function test_superadmin_can_approve_a_pending_shop_created_before_this_feature(): void
    {
        // Manually insert a legacy PENDING shop (simulates pre-feature registrations)
        $pendingStatusId = DB::table('shop_statuses')->where('status_code', 'PENDING')->value('shop_status_id');
        $planId          = DB::table('subscription_plans')->where('plan_code', 'BASIC')->value('plan_id');

        $shopId = DB::table('shops')->insertGetId([
            'shop_name'               => 'Legacy Pending Shop',
            'registration_owner_name' => 'Legacy Owner',
            'registration_owner_email'=> 'legacy@example.com',
            'subdomain'               => 'legacy-pending',
            'invitation_code'         => 'LEGACY00',
            'shop_status_id_fk'       => $pendingStatusId,
            'registration_status'     => 'PENDING_APPROVAL',
            'primary_color'           => '#000000',
            'secondary_color'         => '#ffffff',
            'created_at'              => now(),
            'updated_at'              => now(),
        ]);

        DB::table('shop_subscriptions')->insert([
            'shop_id_fk'          => $shopId,
            'plan_id_fk'          => $planId,
            'subscription_status' => 'PENDING',
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        $superAdmin = User::query()->where('username', env('SUPERADMIN_USERNAME', 'superadmin'))->firstOrFail();
        $token      = $superAdmin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson("http://admin.mospams.local/api/superadmin/shops/{$shopId}/approve-registration")
            ->assertOk()
            ->assertJsonStructure(['data' => ['ownerId', 'temporaryPassword', 'trialDays', 'trialEndsAt']]);

        $this->assertDatabaseHas('shops', [
            'shop_id'             => $shopId,
            'registration_status' => 'APPROVED',
        ]);
    }
}
```

- [ ] **Step 2: Run the tests**

```bash
cd Backend && php artisan test tests/Feature/ShopRegistrationApprovalTest.php --testdox
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add Backend/tests/Feature/ShopRegistrationApprovalTest.php
git commit -m "test: update ShopRegistrationApprovalTest for OTP two-step flow"
```

---

### Task 6: Update ShopRegistrationPage — add OTP verify step

**Files:**
- Modify: `Frontend/src/features/registration/pages/ShopRegistrationPage.tsx`

Add a `'verify'` step between form and success. The form submit now calls `/api/shop-registration/initiate`; on `requiresVerification: true` it transitions to the verify step. The verify step posts to `/api/shop-registration/confirm`. A 60 s countdown resend links to `/api/shop-registration/resend`. The success screen always shows credentials (no more "isPending" branch — shops are always immediately activated).

- [ ] **Step 1: Add new state and handlers to the component**

Replace everything from the opening of `ShopRegistrationPage()` through the end of `handleSubmit` with:

```tsx
export default function ShopRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState<'form' | 'verify' | 'success'>('form');

  // verify step state
  const [pendingEmail, setPendingEmail]         = useState('');
  const [pendingShopName, setPendingShopName]   = useState('');
  const [pendingToken, setPendingToken]         = useState('');
  const [otp, setOtp]                           = useState('');
  const [otpError, setOtpError]                 = useState('');
  const [verifying, setVerifying]               = useState(false);
  const [resendCountdown, setResendCountdown]   = useState(60);
  const [resending, setResending]               = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [registrationResult, setRegistrationResult] = useState<{
    shopName: string; subdomain: string; invitationCode: string;
    ownerEmail: string; temporaryPassword: string; trialDays: number; trialEndsAt: string;
  } | null>(null);

  const [form, setForm] = useState<RegistrationForm>({
    shopName: '', subdomain: '', ownerName: '', ownerEmail: '',
    phone: '', address: '', selectedPlan: 'PREMIUM', agreeToTerms: false,
  });

  useEffect(() => {
    if (step !== 'verify') return;
    setResendCountdown(60);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step]);

  const updateForm = (field: keyof RegistrationForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'shopName' && typeof value === 'string') {
      const subdomain = value.toLowerCase().replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 30);
      setForm(prev => ({ ...prev, subdomain }));
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim())  { toast.error('Shop name is required'); return; }
    if (!form.subdomain.trim()) { toast.error('Subdomain is required'); return; }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) {
      toast.error('Subdomain can only contain lowercase letters, numbers, and hyphens'); return;
    }
    if (!form.ownerName.trim()) { toast.error('Owner name is required'); return; }
    if (!form.ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      toast.error('Valid email is required'); return;
    }
    if (!form.agreeToTerms) { toast.error('You must agree to the Terms of Service'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          shopName: form.shopName, subdomain: form.subdomain,
          ownerName: form.ownerName, ownerEmail: form.ownerEmail,
          phone: form.phone || null, address: form.address || null,
          planCode: form.selectedPlan,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      setPendingEmail(data.email);
      setPendingShopName(data.shopName);
      setPendingToken(data.pendingToken);
      setStep('verify');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setVerifying(true);
    setOtpError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: otp, pendingToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpError(data.errors?.code?.[0] || data.message || 'Verification failed.');
        return;
      }
      setRegistrationResult({
        shopName: data.data.shopName, subdomain: data.data.subdomain,
        invitationCode: data.data.invitationCode, ownerEmail: data.data.ownerEmail,
        temporaryPassword: data.data.temporaryPassword || '',
        trialDays: data.data.trialDays || 14, trialEndsAt: data.data.trialEndsAt || '',
      });
      setStep('success');
      toast.success('Your shop is ready!');
    } catch {
      setOtpError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, pendingToken }),
      });
      if (response.ok) {
        setResendCountdown(60);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
        toast.success('A new code has been sent.');
      }
    } finally {
      setResending(false);
    }
  };
```

Also add `useRef` to the existing imports:
```tsx
import { useState, useEffect, useRef } from 'react';
```

And add `Mail` icon to the lucide import:
```tsx
import { Check, ArrowLeft, Loader2, Sparkles, Store, Mail } from 'lucide-react';
```

- [ ] **Step 2: Add the verify step JSX and update the success screen**

After the `if (step === 'success' && registrationResult)` block (which renders the success screen), add a new block for the verify step. Insert it **before** the success block return, **after** the closing `}` of the `handleResend` function:

```tsx
  if (step === 'verify') {
    return (
      <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-blue-400" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              We sent a 6-digit code to <span className="text-foreground font-medium">{pendingEmail}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="sr-only">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  placeholder="000000"
                  className="w-full px-4 py-4 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  disabled={verifying}
                />
                {otpError && <p className="text-red-400 text-sm mt-2 text-center">{otpError}</p>}
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || otp.length !== 6}
                className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Create Shop'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || resending}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  ← Back to registration form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
```

Also update the success screen to remove the `isPending` branch — shops are always immediately activated now. Replace the `isPending` conditional block in the success return:

Find and remove:
```tsx
    const isPending = !registrationResult.temporaryPassword;
```

And replace the conditional render:
```tsx
          {isPending ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-blue-400 mb-2">Next Steps</h2>
              <p className="text-sm text-muted-foreground">
                Once an administrator approves your request, you will receive an email at <span className="text-foreground font-medium">{registrationResult.ownerEmail}</span> with your temporary login password.
              </p>
            </div>
          ) : (
            /* Temporary login credentials */
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
              ...
            </div>
          )}
```

With just the credentials block (always shown):
```tsx
          {registrationResult.temporaryPassword ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-green-400 mb-4">Your Login Credentials</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-mono text-sm text-foreground bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30">
                    {registrationResult.ownerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Temporary Password</p>
                  <p className="font-mono font-bold text-lg text-foreground bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30 tracking-widest">
                    {registrationResult.temporaryPassword}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Save this password — it won't be shown again. Change it after your first login.
              </p>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-blue-400 mb-2">Sign In</h2>
              <p className="text-sm text-muted-foreground">
                You already have a MoSPAMS account. Sign in at your shop URL using your existing password.
              </p>
            </div>
          )}
```

Also update the success header text (always "Your Shop is Ready!" now):
```tsx
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Shop is Ready!</h1>
            <p className="text-muted-foreground">
              {registrationResult.trialDays}-day free trial active — expires {trialEnd}
            </p>
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/features/registration/pages/ShopRegistrationPage.tsx
git commit -m "feat: shop registration page — add OTP verify step, remove pending-approval branch"
```

---

### Task 7: Deploy and smoke test

- [ ] **Step 1: Deploy**

```bash
bash deploy.sh
```

Expected output ends with: `Backend deployed successfully.`

- [ ] **Step 2: Smoke test — initiate**

```bash
curl -sL -X POST https://api.mospams.shop/api/shop-registration/initiate \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"shopName":"Smoke Test Shop","subdomain":"smoke-test-shop","ownerName":"Test Owner","ownerEmail":"smoketest@gmail.com","planCode":"BASIC"}'
```

Expected: `{"requiresVerification":true,"email":"smoketest@gmail.com","shopName":"Smoke Test Shop","pendingToken":"..."}`

- [ ] **Step 3: Smoke test — wrong OTP**

```bash
curl -sL -X POST https://api.mospams.shop/api/shop-registration/confirm \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"smoketest@gmail.com","code":"000000","pendingToken":"<token from above>"}'
```

Expected: `422` with `"Invalid or expired verification code."`

- [ ] **Step 4: Smoke test — correct OTP from DB**

SSH into server and get OTP:
```bash
ssh -i ~/Documents/WEBTECH.pem ubuntu@16.176.210.53 \
  "docker exec mospams-app php artisan tinker --execute='echo DB::table(\"email_otp_verifications\")->where(\"email\",\"smoketest@gmail.com\")->where(\"used\",false)->orderByDesc(\"created_at\")->value(\"otp_code\");'"
```

Then confirm:
```bash
curl -sL -X POST https://api.mospams.shop/api/shop-registration/confirm \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"smoketest@gmail.com","code":"<OTP>","pendingToken":"<token>"}'
```

Expected: `201` with `data.trialEndsAt` set and `data.temporaryPassword` non-empty.

- [ ] **Step 5: Smoke test — one-trial-per-email block**

```bash
curl -sL -X POST https://api.mospams.shop/api/shop-registration/initiate \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"shopName":"Second Shop","subdomain":"second-smoke-shop","ownerName":"Test Owner","ownerEmail":"smoketest@gmail.com","planCode":"BASIC"}'
```

Expected: `422` — `"This email has already been used for a shop trial."`
