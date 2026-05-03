param(
    [int]$Port = 8002,
    [switch]$FreshSeed,
    [switch]$Seed,
    [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendPath = Join-Path $RepoRoot 'Backend'

Set-Location $BackendPath

if (-not $SkipMigrate) {
    Write-Host "Running migrations..."
    php artisan migrate --force 2>&1
}

if ($FreshSeed) {
    Write-Host "Running fresh seed..."
    php artisan migrate:fresh --seed --force
} elseif ($Seed) {
    Write-Host "Seeding database..."
    php artisan db:seed --force
}

Write-Host "Starting Laravel backend on port $Port..."
php artisan serve --host=0.0.0.0 --port=$Port
