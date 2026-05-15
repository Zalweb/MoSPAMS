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
        [$token1, $email1, $otp1] = $this->initiateAndGetToken(['subdomain' => 'taken-sub2', 'ownerEmail' => 'first2@example.com']);
        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => $email1, 'code' => $otp1, 'pendingToken' => $token1,
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

        // Replay old OTP — must fail
        $this->postJson('http://mospams.local/api/shop-registration/confirm', [
            'email' => $email, 'code' => $otp, 'pendingToken' => $token,
        ])->assertUnprocessable();
    }

    // ── SuperAdmin approval flow still works for legacy PENDING shops ─────────

    public function test_superadmin_can_approve_a_pending_shop_created_before_this_feature(): void
    {
        $pendingStatusId = DB::table('shop_statuses')->where('status_code', 'PENDING')->value('shop_status_id');
        $planId          = DB::table('subscription_plans')->where('plan_code', 'BASIC')->value('plan_id');

        $shopId = DB::table('shops')->insertGetId([
            'shop_name'                => 'Legacy Pending Shop',
            'registration_owner_name'  => 'Legacy Owner',
            'registration_owner_email' => 'legacy@example.com',
            'subdomain'                => 'legacy-pending',
            'invitation_code'          => 'LEGACY00',
            'shop_status_id_fk'        => $pendingStatusId,
            'registration_status'      => 'PENDING_APPROVAL',
            'primary_color'            => '#000000',
            'secondary_color'          => '#ffffff',
            'created_at'               => now(),
            'updated_at'               => now(),
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
