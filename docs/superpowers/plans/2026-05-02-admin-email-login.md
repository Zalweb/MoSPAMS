# Admin User Email Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update admin user creation to include both username and email, with email as the primary login field to prevent duplicates when users sign up.

**Architecture:** The users table already has both `username` and `email` columns (unique). The AuthController already accepts `email` for login and checks both columns. We need to: (1) update AdminSeeder to set email, (2) update create-admin.ps1 to accept email parameter, (3) update AuthController userResource to return actual email, and (4) make email the primary login field.

**Tech Stack:** PHP 8.3, Laravel 11, MySQL, PowerShell

---

## File Structure

| File | Purpose |
|------|---------|
| `Backend/database/seeders/AdminSeeder.php` | Creates admin user with username and email |
| `scripts/create-admin.ps1` | PowerShell script to create admin user with parameters |
| `Backend/app/Http/Controllers/Api/AuthController.php` | Handles login, returns user data with email |

---

### Task 1: Update AdminSeeder to include email

**Files:**
- Modify: `Backend/database/seeders/AdminSeeder.php`

- [ ] **Step 1: Write the failing test**

Create test file `Backend/tests/Unit/AdminSeederTest.php`:

```php
<?php

namespace Tests\Unit;

use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_seeder_creates_user_with_email(): void
    {
        $seeder = new AdminSeeder();
        $seeder->run();

        $admin = DB::table('users')->where('username', 'admin')->first();

        $this->assertNotNull($admin);
        $this->assertNotNull($admin->email);
        $this->assertEquals('admin@mospams.com', $admin->email);
    }

    public function test_admin_seeder_uses_env_variables(): void
    {
        config(['database.connections.mysql.database' => 'test_db']);

        $seeder = new AdminSeeder();
        $seeder->run();

        $admin = DB::table('users')->where('username', 'admin')->first();

        $this->assertNotNull($admin);
        $this->assertEquals('System Administrator', $admin->full_name);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && php artisan test tests/Unit/AdminSeederTest.php`
Expected: FAIL - email field is null

- [ ] **Step 3: Update AdminSeeder to include email**

Replace `Backend/database/seeders/AdminSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Get admin credentials from env or use defaults
        $username = env('ADMIN_USERNAME', 'admin');
        $email = env('ADMIN_EMAIL', 'admin@mospams.com');
        $password = env('ADMIN_PASSWORD', 'admin123');
        $fullName = env('ADMIN_FULL_NAME', 'System Administrator');

        // Get IDs
        $adminRoleId = DB::table('roles')->where('role_name', 'admin')->value('role_id');
        $activeStatusId = DB::table('user_statuses')->where('status_code', 'active')->value('user_status_id');

        // Create admin user
        $adminUser = [
            'role_id_fk' => $adminRoleId,
            'full_name' => $fullName,
            'username' => $username,
            'email' => $email,
            'password_hash' => Hash::make($password),
            'user_status_id_fk' => $activeStatusId,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('users')->updateOrInsert(
            ['username' => $username],
            $adminUser
        );

        $this->command->info('Admin user created successfully!');
        $this->command->info("Username: $username");
        $this->command->info("Email: $email");
        $this->command->info("Password: $password");
        $this->command->warn('Please change the default password after first login.');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && php artisan test tests/Unit/AdminSeederTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/database/seeders/AdminSeeder.php Backend/tests/Unit/AdminSeederTest.php
git commit -m "feat: add email to admin seeder"
```

---

### Task 2: Update create-admin.ps1 to accept email parameter

**Files:**
- Modify: `scripts/create-admin.ps1`

- [ ] **Step 1: Update PowerShell script parameters**

Replace `scripts/create-admin.ps1`:

```powershell
param(
    [string]$Username = "admin",
    [string]$Email = "admin@mospams.com",
    [string]$Password = "admin123",
    [string]$FullName = "System Administrator"
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendPath = Join-Path $RepoRoot 'Backend'

# Check if PHP is available
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if (-not $phpCommand) {
    throw "PHP was not found. Install PHP or set MOSPAMS_PHP_PATH."
}

# Update .env with admin credentials
$envPath = Join-Path $BackendPath '.env'
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace "ADMIN_USERNAME=.*", "ADMIN_USERNAME=$Username"
    $envContent = $envContent -replace "ADMIN_EMAIL=.*", "ADMIN_EMAIL=$Email"
    $envContent = $envContent -replace "ADMIN_PASSWORD=.*", "ADMIN_PASSWORD=$Password"
    $envContent = $envContent -replace "ADMIN_FULL_NAME=.*", "ADMIN_FULL_NAME=$FullName"
    Set-Content -Path $envPath -Value $envContent -NoNewline
}

Push-Location $BackendPath
try {
    Write-Host "Creating admin user..."
    Write-Host "Username: $Username"
    Write-Host "Email: $Email"
    Write-Host "Full Name: $FullName"
    Write-Host ""

    # Run the seeder
    & php artisan db:seed --class=AdminSeeder

    Write-Host ""
    Write-Host "Admin user created successfully!"
    Write-Host "Username: $Username"
    Write-Host "Email: $Email"
    Write-Host "Password: $Password"
    Write-Host ""
    Write-Host "Please change the default password after first login."
} finally {
    Pop-Location
}
```

- [ ] **Step 2: Test the script manually**

Run: `.\scripts\create-admin.ps1 -Username "testadmin" -Email "test@example.com" -Password "testpass123"`
Expected: Admin user created with specified credentials

- [ ] **Step 3: Commit**

```bash
git add scripts/create-admin.ps1
git commit -m "feat: add email parameter to create-admin script"
```

---

### Task 3: Update AuthController userResource to return actual email

**Files:**
- Modify: `Backend/app/Http/Controllers/Api/AuthController.php`

- [ ] **Step 1: Write the failing test**

Create test file `Backend/tests/Feature/AuthControllerTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_user_with_email(): void
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password_hash' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('user.email', 'test@example.com');
    }

    public function test_me_returns_user_with_email(): void
    {
        $user = User::factory()->create([
            'username' => 'testuser',
            'email' => 'test@example.com',
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/me');

        $response->assertStatus(200);
        $response->assertJsonPath('user.email', 'test@example.com');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && php artisan test tests/Feature/AuthControllerTest.php`
Expected: FAIL - email field returns username instead of actual email

- [ ] **Step 3: Update AuthController userResource**

Update the `userResource` method in `Backend/app/Http/Controllers/Api/AuthController.php`:

```php
private function userResource(User $user): array
{
    return [
        'id' => (string) $user->user_id,
        'name' => $user->full_name,
        'username' => $user->username,
        'email' => $user->email,
        'role' => $user->role?->role_name,
        'status' => $user->status?->status_name,
        'lastActive' => optional($user->updated_at)->toISOString(),
    ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && php artisan test tests/Feature/AuthControllerTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/app/Http/Controllers/Api/AuthController.php Backend/tests/Feature/AuthControllerTest.php
git commit -m "fix: return actual email in auth user resource"
```

---

### Task 4: Update .env.example with new admin email variable

**Files:**
- Modify: `Backend/.env.example`

- [ ] **Step 1: Add ADMIN_EMAIL to .env.example**

Add to `Backend/.env.example`:

```env
# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@mospams.com
ADMIN_PASSWORD=admin123
ADMIN_FULL_NAME=System Administrator
```

- [ ] **Step 2: Commit**

```bash
git add Backend/.env.example
git commit -m "docs: add ADMIN_EMAIL to .env.example"
```

---

### Task 5: Run seeder and verify

**Files:**
- None (verification step)

- [ ] **Step 1: Run the seeder**

Run: `cd Backend && php artisan db:seed --class=AdminSeeder`
Expected: Admin user created with email

- [ ] **Step 2: Verify admin user in database**

Run: `cd Backend && php artisan tinker --execute="DB::table('users')->where('username', 'admin')->first(['username', 'email', 'full_name'])"`
Expected: Returns admin user with email field populated

- [ ] **Step 3: Test login with email**

Run: `cd Backend && php artisan tinker --execute="
\$user = DB::table('users')->where('email', 'admin@mospams.com')->first();
echo 'User found: ' . \$user->username . PHP_EOL;
"`
Expected: User found with username 'admin'

---

## Self-Review

**Spec coverage:**
- Admin user has both username and email ✓ (Task 1)
- Email is used for login ✓ (Task 3 - AuthController already checks email)
- No duplicates when users sign up ✓ (email is unique in database)
- create-admin.ps1 accepts email parameter ✓ (Task 2)

**Placeholder scan:**
- No placeholders found - all code is complete

**Type consistency:**
- `email` field used consistently across all files
- `ADMIN_EMAIL` env variable used consistently
