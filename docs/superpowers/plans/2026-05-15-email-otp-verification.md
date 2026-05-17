# Email OTP Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a user registers with email + password, send a 6-digit OTP via Resend; they must enter it before their account is active and they can log in.

**Architecture:** New `email_otp_verifications` table stores short-lived OTPs. Registration creates the account in an unverified state, sends OTP, and returns `requiresVerification: true`. A new `/api/verify-email` endpoint marks `accounts.email_verified_at`. Login blocks unverified accounts and returns the same flag so the frontend can re-show the OTP form. Google OAuth accounts are trusted and get `email_verified_at` set immediately on register. Existing accounts are backfilled so they are never locked out.

**Tech Stack:** Laravel 11 / PHP 8.3, MySQL, Resend (via `resend/resend-php`), React + TypeScript

---

## File Map

| File | Change |
|---|---|
| `Backend/database/migrations/2026_05_15_200000_create_email_otp_verifications_table.php` | Create — OTP storage + backfill existing accounts |
| `Backend/app/Mail/EmailVerificationMail.php` | Create — Resend-compatible Mailable |
| `Backend/app/Http/Controllers/Api/AuthController.php` | Modify — register (send OTP), login (block unverified), + verifyEmail, resendVerification |
| `Backend/app/Http/Controllers/Api/GoogleAuthController.php` | Modify — set `email_verified_at` on Google register |
| `Backend/routes/api.php` | Modify — 2 new public routes |
| `Frontend/src/features/auth/pages/UserRegistrationPage.tsx` | Modify — add `verify` step with OTP input + resend countdown |
| `Frontend/src/features/auth/LoginPage.tsx` | Modify — handle `requiresVerification` response, show inline banner |

---

## Task 1: Migration — OTP table + backfill existing accounts

**Files:**
- Create: `Backend/database/migrations/2026_05_15_200000_create_email_otp_verifications_table.php`

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->index();
            $table->char('otp_code', 6);
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        // Backfill: existing accounts have never been through OTP verification.
        // Mark them verified so they are not locked out when login blocking is added.
        DB::statement("
            UPDATE accounts
            SET email_verified_at = COALESCE(created_at, NOW())
            WHERE email_verified_at IS NULL
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('email_otp_verifications');
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add Backend/database/migrations/2026_05_15_200000_create_email_otp_verifications_table.php
git commit -m "feat: add email_otp_verifications table + backfill existing accounts"
```

---

## Task 2: EmailVerificationMail mailable

**Files:**
- Create: `Backend/app/Mail/EmailVerificationMail.php`

Pattern: inline HTML with `htmlString`, same as `PasswordResetMail`.

- [ ] **Step 1: Create the mailable**

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $otpCode,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your MoSPAMS email');
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name = e($this->userName);
        $code = e($this->otpCode);

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">Verify your email</h2>
            <p style="color:#52525b;margin:0 0 24px;">Hi {$name}, enter this code to verify your MoSPAMS account:</p>
            <div style="text-align:center;margin:0 0 24px;">
              <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:10px;color:#18181b;background:#f4f4f5;padding:16px 24px;border-radius:8px;border:1px solid #e4e4e7;">{$code}</span>
            </div>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">This code expires in <strong>15 minutes</strong>.</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0;">If you did not create a MoSPAMS account, you can ignore this email.</p>
            <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;">
            <p style="color:#d4d4d8;font-size:11px;margin:0;">MoSPAMS &mdash; Motorcycle Service &amp; Parts Management</p>
          </div>
        </body>
        </html>
        HTML;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Mail/EmailVerificationMail.php
git commit -m "feat: add EmailVerificationMail for OTP verification"
```

---

## Task 3: AuthController — register, login, verifyEmail, resendVerification

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/AuthController.php`

Four changes in this file:
1. `register` — block disposable domains, send OTP, return `requiresVerification`
2. `login` — block unverified accounts
3. New `verifyEmail` method
4. New `resendVerification` method

- [ ] **Step 1: Add the import for EmailVerificationMail at the top of the file**

Find the existing imports block. Add after `use App\Mail\PasswordResetMail;`:

```php
use App\Mail\EmailVerificationMail;
```

- [ ] **Step 2: Replace the `register` method**

Find `public function register(Request $request): JsonResponse` and replace the entire method with:

```php
public function register(Request $request): JsonResponse
{
    $shop = $request->attributes->get('shop');

    if (!$shop) {
        return response()->json([
            'message' => 'Could not determine which shop this registration belongs to. Please register from your shop\'s URL.',
        ], 422);
    }

    $data = $request->validate([
        'fullName' => ['required', 'string', 'max:100'],
        'email'    => ['required', 'email', 'max:100'],
        'password' => ['required', 'string', 'min:8'],
    ]);

    if ($this->isDisposableEmail($data['email'])) {
        return response()->json([
            'message' => 'Please use a real email address. Disposable email services are not allowed.',
        ], 422);
    }

    $shopStatus = DB::table('shop_statuses')
        ->where('shop_status_id', $shop->shop_status_id_fk)
        ->value('status_code');

    if (strtoupper($shopStatus) !== 'ACTIVE') {
        return response()->json([
            'message' => 'This shop is not currently accepting new members.',
        ], 403);
    }

    $customerRoleId = DB::table('roles')->where('role_name', 'Customer')->value('role_id');
    $activeStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

    $result = DB::transaction(function () use ($data, $shop, $customerRoleId, $activeStatusId) {
        $existingAccount = $this->accounts->findAccountByLogin($data['email']);

        if ($existingAccount) {
            if (! $existingAccount->password_hash || ! Hash::check($data['password'], $existingAccount->password_hash)) {
                return response()->json([
                    'message' => 'Wrong password. Please sign in first to join this shop as a Customer.',
                    'hint'    => 'sign_in_first',
                ], 422);
            }

            if ($this->accounts->membership($existingAccount, (int) $shop->shop_id)) {
                return response()->json([
                    'message' => 'You already have an account in this shop. Please sign in.',
                    'hint'    => 'already_member',
                ], 422);
            }

            $membership = $this->accounts->createOrUpdateMembership($existingAccount, (int) $shop->shop_id, (int) $customerRoleId);
            $user = $this->accounts->ensureTenantUser($existingAccount, (int) $shop->shop_id, (int) $customerRoleId);

            $this->logActivity($user->user_id, $shop->shop_id, "Joined shop {$shop->shop_name} as Customer via registration form", 'users', $user->user_id, (int) $existingAccount->account_id);

            // Already-verified existing account joining a new shop — no OTP needed.
            return response()->json([
                'message'              => 'Welcome back! You have joined this shop as a Customer.',
                'userId'               => (string) $user->user_id,
                'accountId'            => (string) $existingAccount->account_id,
                'membershipId'         => (string) $membership->membership_id,
                'shopName'             => $shop->shop_name,
                'requestedRole'        => 'Customer',
                'requiresVerification' => false,
            ], 201);
        }

        // New account — created unverified (email_verified_at stays null).
        $account = $this->accounts->createOrUpdateAccount($data['fullName'], $data['email'], $data['password'], null, true);

        $membership = $this->accounts->createOrUpdateMembership($account, (int) $shop->shop_id, (int) $customerRoleId);
        $user = $this->accounts->ensureTenantUser($account, (int) $shop->shop_id, (int) $customerRoleId, $data['password']);

        $this->logActivity($user->user_id, $shop->shop_id, "Registered as Customer in shop {$shop->shop_name}", 'users', $user->user_id, (int) $account->account_id);

        return [
            'accountId' => $account->account_id,
            'fullName'  => $data['fullName'],
            'email'     => $data['email'],
            'shopName'  => $shop->shop_name,
        ];
    });

    // If it's already a JsonResponse (existing account path), return it directly.
    if ($result instanceof \Illuminate\Http\JsonResponse) {
        return $result;
    }

    // New account — send OTP.
    $this->sendOtp($result['email'], $result['fullName']);

    return response()->json([
        'message'              => 'Account created. Please check your email for a verification code.',
        'shopName'             => $result['shopName'],
        'requiresVerification' => true,
        'email'                => $result['email'],
    ], 201);
}
```

- [ ] **Step 3: Add the unverified account check to the `login` method**

Find this block in `login` (after the credentials/hash check, before the shop/platform checks):

```php
if (! $account || ! $account->password_hash || ! Hash::check($credentials['password'], $account->password_hash)) {
    throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
}
```

Add immediately after it:

```php
// Block login for unverified email accounts (Google accounts are pre-verified).
if (! $account->email_verified_at && ! $account->google_id) {
    return response()->json([
        'message'              => 'Please verify your email before logging in.',
        'requiresVerification' => true,
        'email'                => $account->email,
    ], 403);
}
```

- [ ] **Step 4: Add the three new private/public methods to the class**

Add after the `resetPassword` method:

```php
public function verifyEmail(Request $request): JsonResponse
{
    $data = $request->validate([
        'email' => ['required', 'email'],
        'code'  => ['required', 'string', 'size:6'],
    ]);

    $email = strtolower($data['email']);

    $otp = DB::table('email_otp_verifications')
        ->where('email', $email)
        ->where('otp_code', $data['code'])
        ->where('used', false)
        ->where('expires_at', '>', now())
        ->orderByDesc('id')
        ->first();

    if (! $otp) {
        return response()->json(['message' => 'Invalid or expired code. Please request a new one.'], 422);
    }

    DB::table('email_otp_verifications')->where('id', $otp->id)->update(['used' => true]);

    DB::table('accounts')
        ->whereRaw('LOWER(email) = ?', [$email])
        ->whereNull('email_verified_at')
        ->update(['email_verified_at' => now(), 'updated_at' => now()]);

    return response()->json(['message' => 'Email verified successfully. You can now log in.']);
}

public function resendVerification(Request $request): JsonResponse
{
    $data = $request->validate([
        'email' => ['required', 'email'],
    ]);

    $email = strtolower($data['email']);

    $account = DB::table('accounts')->whereRaw('LOWER(email) = ?', [$email])->first();

    // Always return success — never reveal whether email exists.
    if (! $account || $account->email_verified_at) {
        return response()->json(['message' => 'If that email is pending verification, a new code has been sent.']);
    }

    // 60-second cooldown
    $recentlySent = DB::table('email_otp_verifications')
        ->where('email', $email)
        ->where('created_at', '>', now()->subSeconds(60))
        ->exists();

    if ($recentlySent) {
        return response()->json(['message' => 'Please wait before requesting another code.'], 429);
    }

    $this->sendOtp($email, $account->full_name);

    return response()->json(['message' => 'If that email is pending verification, a new code has been sent.']);
}

private function sendOtp(string $email, string $name): void
{
    // Invalidate any previous unused OTPs for this email.
    DB::table('email_otp_verifications')
        ->where('email', strtolower($email))
        ->where('used', false)
        ->update(['used' => true]);

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

    DB::table('email_otp_verifications')->insert([
        'email'      => strtolower($email),
        'otp_code'   => $code,
        'expires_at' => now()->addMinutes(15),
        'used'       => false,
        'created_at' => now(),
    ]);

    try {
        Mail::to($email)->send(new EmailVerificationMail($name, $code));
    } catch (\Throwable $e) {
        Log::error('OTP email failed', ['email' => $email, 'error' => $e->getMessage()]);
    }
}

private function isDisposableEmail(string $email): bool
{
    $domain = strtolower(substr($email, strpos($email, '@') + 1));

    $blocklist = [
        'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
        'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.info', 'grr.la',
        'sharklasers.com', 'guerrillamailblock.com', 'spam4.me', 'trashmail.com',
        'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.at',
        'temp-mail.org', 'tempmail.com', 'throwaway.email', 'throwam.com',
        'fakeinbox.com', 'mailnesia.com', 'dispostable.com', 'maildrop.cc',
        'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
        '10minutemail.com', '10minutemail.net', '20minutemail.com',
        'getairmail.com', 'filzmail.com', 'tempr.email', 'discard.email',
        'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
        'spamspot.com', 'spam.la', 'mailnull.com', 'spamfree24.org',
        'mohmal.com', 'tempomail.fr', 'mailscrap.com', 'mailmetrash.com',
        'spamevader.com', 'spambog.com', 'spamcero.com',
        'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
        'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
    ];

    return in_array($domain, $blocklist, true);
}
```

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/AuthController.php
git commit -m "feat: OTP email verification in register + login block + verify/resend endpoints"
```

---

## Task 4: GoogleAuthController — mark email verified on Google register

Google-authenticated emails are already verified by Google, so skip OTP and set `email_verified_at` immediately.

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/GoogleAuthController.php`

- [ ] **Step 1: Set email_verified_at after account creation in googleRegister**

Find this line inside the `DB::transaction` closure in `googleRegister`:

```php
$account = $this->accounts->createOrUpdateAccount($data['name'], $data['email'], $data['password'], $data['google_id'], ! $existingAccount);
```

Add immediately after it:

```php
// Google-verified emails are trusted — mark the account as verified.
if (! $account->email_verified_at) {
    DB::table('accounts')
        ->where('account_id', $account->account_id)
        ->update(['email_verified_at' => now(), 'updated_at' => now()]);
    $account->email_verified_at = now();
}
```

- [ ] **Step 2: Commit**

```bash
git add Backend/app/Http/Controllers/Api/GoogleAuthController.php
git commit -m "feat: mark email_verified_at on Google OAuth registration"
```

---

## Task 5: Register new routes

**Files:**
- Modify: `Backend/routes/api.php`

- [ ] **Step 1: Add the two new public routes**

Find:
```php
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
```

Add immediately after:

```php
Route::post('/verify-email', [AuthController::class, 'verifyEmail'])->middleware('throttle:10,1');
Route::post('/resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:forgot-password');
```

- [ ] **Step 2: Commit**

```bash
git add Backend/routes/api.php
git commit -m "feat: add /verify-email and /resend-verification routes"
```

---

## Task 6: Frontend — OTP verification step in UserRegistrationPage

**Files:**
- Modify: `Frontend/src/features/auth/pages/UserRegistrationPage.tsx`

The page currently has `step: 'form' | 'success'`. Add a `'verify'` step between them.

- [ ] **Step 1: Replace the full UserRegistrationPage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, Eye, EyeOff, LogIn, RefreshCw } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegistrationResult {
  message: string;
  userId: string;
  shopName: string;
  requestedRole: string;
  requiresVerification?: boolean;
  email?: string;
}

type RegistrationHint = 'sign_in_first' | 'already_member' | null;

const RESEND_COOLDOWN = 60;

export default function UserRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingShopName, setPendingShopName] = useState('');
  const [hint, setHint] = useState<RegistrationHint>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<RegistrationForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (step === 'verify') {
      setResendCountdown(RESEND_COOLDOWN);
      countdownRef.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step]);

  const updateField = (field: keyof RegistrationForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setHint(null);
    try {
      const data = await apiMutation<RegistrationResult & { hint?: RegistrationHint }>(
        '/api/register', 'POST',
        { fullName: form.fullName, email: form.email, password: form.password },
      );
      if (data.requiresVerification) {
        setPendingEmail(data.email ?? form.email);
        setPendingShopName(data.shopName ?? '');
        setStep('verify');
      } else {
        setResult(data);
        setStep('success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(message);
      try {
        const raw = (error as { hint?: string } | null);
        if (raw?.hint === 'sign_in_first' || raw?.hint === 'already_member') {
          setHint(raw.hint as RegistrationHint);
        } else if (message.toLowerCase().includes('wrong password') || message.toLowerCase().includes('sign in first')) {
          setHint('sign_in_first');
        } else if (message.toLowerCase().includes('already have an account in this shop') || message.toLowerCase().includes('already belong')) {
          setHint('already_member');
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setOtpError('Enter the 6-digit code from your email.'); return; }
    setOtpError('');
    setVerifying(true);
    try {
      await apiMutation('/api/verify-email', 'POST', { email: pendingEmail, code: otp });
      setResult({ message: 'Verified', userId: '', shopName: pendingShopName, requestedRole: 'Customer' });
      setStep('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid code. Please try again.';
      setOtpError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setResending(true);
    try {
      await apiMutation('/api/resend-verification', 'POST', { email: pendingEmail });
      toast.success('New code sent — check your email.');
      setResendCountdown(RESEND_COOLDOWN);
      setOtp('');
      setOtpError('');
      countdownRef.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error('Could not resend code. Please wait and try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
            <p className="text-muted-foreground text-sm mb-6">Your account is active. You can now sign in.</p>
            <div className="bg-zinc-800/40 rounded-2xl border border-zinc-700/40 p-5 text-left mb-6 space-y-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shop</p>
                <p className="text-sm text-foreground font-medium">{result?.shopName || pendingShopName}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account Type</p>
                <p className="text-sm text-foreground font-medium">Customer</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── OTP verification screen ─────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        </div>
        <button
          onClick={() => setStep('form')}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          <span>Back</span>
        </button>
        <div className="relative z-10 w-full max-w-md px-6 py-10">
          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/images/logo.svg" alt="MoSPAMS" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to<br />
                <span className="text-foreground font-medium">{pendingEmail}</span>
              </p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                  autoFocus
                  disabled={verifying}
                />
                {otpError && (
                  <p className="text-xs text-red-400 mt-1.5">{otpError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Verify Email</>
                )}
              </button>
            </form>
            <div className="mt-5 text-center">
              {resendCountdown > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Resend code in <span className="text-foreground font-medium">{resendCountdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-foreground font-medium hover:underline flex items-center gap-1.5 mx-auto disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Code expires in 15 minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
      </div>
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        <span>Back</span>
      </button>
      <div className="relative z-10 w-full max-w-md px-6 py-10">
        <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/images/logo.svg" alt="MoSPAMS" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Create an Account</h1>
            <p className="text-muted-foreground text-sm">Sign up to track your motorcycle service and repairs.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => updateField('fullName', e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-300 transition-colors" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          {hint === 'sign_in_first' && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <LogIn className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-300">This email already has an account.</p>
                <p className="mt-0.5 text-xs text-amber-400/80">Sign in with your existing credentials, then you will be prompted to join this shop automatically.</p>
                <button type="button" onClick={() => navigate('/login')} className="mt-2 text-xs font-semibold text-foreground underline hover:text-zinc-200 transition-colors">Go to Sign In →</button>
              </div>
            </div>
          )}

          {hint === 'already_member' && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-blue-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-300">You already belong to this shop.</p>
                <button type="button" onClick={() => navigate('/login')} className="mt-2 text-xs font-semibold text-foreground underline hover:text-zinc-200 transition-colors">Sign in instead →</button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-foreground font-medium hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/features/auth/pages/UserRegistrationPage.tsx
git commit -m "feat: add OTP verification step to registration page"
```

---

## Task 7: Frontend — LoginPage unverified email banner

If a user tries to log in before verifying, the backend returns `requiresVerification: true`. Show a banner with a link to go verify.

**Files:**
- Modify: `Frontend/src/features/auth/LoginPage.tsx`
- Modify: `Frontend/src/features/auth/context/AuthContext.tsx` — `login()` must surface the `requiresVerification` flag

- [ ] **Step 1: Check what login() returns in AuthContext**

Read `Frontend/src/features/auth/context/AuthContext.tsx` and find the `login` function. Check what it returns on a non-200 response from the backend. The backend now returns a 403 with `{ requiresVerification: true, email: '...' }` for unverified accounts.

The `login` function likely throws or returns an error object. We need it to return `{ requiresVerification: true, email: string }` instead of throwing so the LoginPage can handle it gracefully.

Find the `login` call in AuthContext. If it uses `apiMutation` (which throws on non-2xx), wrap the call and check the error for `requiresVerification`:

```typescript
// In the catch block of login() in AuthContext, before re-throwing:
const errBody = (error as { requiresVerification?: boolean; email?: string; message?: string });
if (errBody?.requiresVerification) {
  return { requiresVerification: true, email: errBody.email ?? '' };
}
```

Then return type of `login` should include `{ requiresVerification: boolean; email: string }`.

- [ ] **Step 2: Handle requiresVerification in LoginPage.tsx**

Add state for the verification banner:

```typescript
const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
```

In `handleSubmit`, update the catch/result handling:

```typescript
const result = await login(emailOrUsername, password, rememberMe);
if ('requiresVerification' in result && result.requiresVerification) {
  setUnverifiedEmail((result as { email: string }).email || emailOrUsername);
} else if ('success' in result && result.success) {
  toast.success('Login successful!');
} else if ('needsMembership' in result && result.needsMembership) {
  toast.message('Account found. Confirm to join this shop as Customer.');
} else {
  toast.error(('error' in result && result.error) || 'Invalid credentials');
}
```

Add the banner in the JSX (below the form, before the footer):

```tsx
{unverifiedEmail && (
  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
    <Shield className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
    <div className="flex-1">
      <p className="text-xs font-medium text-amber-300">Email not verified</p>
      <p className="mt-0.5 text-xs text-amber-400/80">
        Check your inbox for the verification code sent to <span className="font-medium">{unverifiedEmail}</span>.
      </p>
      <button
        type="button"
        onClick={() => navigate(`/register?verify=${encodeURIComponent(unverifiedEmail)}`)}
        className="mt-2 text-xs font-semibold text-foreground underline hover:text-zinc-200 transition-colors"
      >
        Enter verification code →
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: In UserRegistrationPage, check for ?verify= query param on mount**

At the top of `UserRegistrationPage`, add:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const verifyEmail = params.get('verify');
  if (verifyEmail) {
    setPendingEmail(verifyEmail);
    setStep('verify');
  }
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/features/auth/LoginPage.tsx Frontend/src/features/auth/context/AuthContext.tsx Frontend/src/features/auth/pages/UserRegistrationPage.tsx
git commit -m "feat: show unverified email banner on login, redirect to OTP step"
```

---

## Task 8: Deploy

- [ ] **Step 1: Deploy everything**

```bash
bash deploy.sh
```

Expected: server pulls all commits, rebuilds container, runs `php artisan migrate` (which creates `email_otp_verifications` table and backfills existing accounts), restarts. Vercel auto-deploys frontend.

- [ ] **Step 2: Smoke test**

1. Register a new account on any shop subdomain
2. Confirm the response transitions to the OTP screen (not the old success screen)
3. Check your email — the 6-digit code should arrive via Resend
4. Enter the code — should show "Email Verified!" success screen
5. Log in with the new account — should work
6. Try logging in with an unverified account — should show the amber banner

---

## Self-Review

**Spec coverage:**
- ✅ OTP sent on registration via Resend
- ✅ 6-digit code, 15-minute expiry
- ✅ Login blocked for unverified accounts
- ✅ Resend with 60s cooldown
- ✅ Google OAuth accounts skip OTP (pre-verified)
- ✅ Disposable email domain blocking
- ✅ Existing accounts backfilled (not locked out)
- ✅ Frontend OTP step with countdown
- ✅ Login page surfaces unverified state

**No placeholders:** All steps have complete code.

**Type consistency:** `requiresVerification: boolean` used consistently across backend response, AuthContext return type, and LoginPage handler.
