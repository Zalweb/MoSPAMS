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
    $envContent = $envContent -replace 'ADMIN_FULL_NAME=.*', "ADMIN_FULL_NAME=`"$FullName`""
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
