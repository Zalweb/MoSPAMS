param(
    [string]$Username = "frienzalsumalpong@gmail.com",
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

Push-Location $BackendPath
try {
    Write-Host "Creating admin user..."
    Write-Host "Username: $Username"
    Write-Host "Full Name: $FullName"
    Write-Host ""

    # Run the seeder
    & php artisan db:seed --class=AdminSeeder

    Write-Host ""
    Write-Host "Admin user created successfully!"
    Write-Host "Username: $Username"
    Write-Host "Password: $Password"
    Write-Host ""
    Write-Host "Please change the default password after first login."
} finally {
    Pop-Location
}
