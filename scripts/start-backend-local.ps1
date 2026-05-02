param(
    [int]$Port = 8002,
    [switch]$FreshSeed,
    [switch]$Seed,
    [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

function Test-TcpPort {
    param([int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $connection.AsyncWaitHandle.WaitOne(300, $false)) {
            return $false
        }

        $client.EndConnect($connection)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendPath = Join-Path $RepoRoot 'Backend'
$EnvPath = Join-Path $BackendPath '.env'
$PublicPath = Join-Path $BackendPath 'public'

# Find PHP
$Php = if ($env:MOSPAMS_PHP_PATH) {
    $env:MOSPAMS_PHP_PATH
} else {
    $phpCommand = Get-Command php -ErrorAction SilentlyContinue
    if ($phpCommand) {
        $phpCommand.Source
    } else {
        throw "PHP was not found. Install PHP or set MOSPAMS_PHP_PATH."
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $BackendPath 'artisan'))) {
    throw "Laravel artisan was not found at $BackendPath."
}

if (-not (Test-Path -LiteralPath (Join-Path $BackendPath 'vendor'))) {
    throw "Backend/vendor is missing. Run 'composer install' inside Backend."
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
    Copy-Item -LiteralPath (Join-Path $BackendPath '.env.example') -Destination $EnvPath
    Write-Host "Created Backend/.env from .env.example."
}

if (Test-TcpPort -Port $Port) {
    throw "Port $Port is already in use. Stop the existing server or run with -Port 8003."
}

Push-Location $BackendPath
try {
    Write-Host "Using PHP: $Php"
    & $Php -v | Select-Object -First 1

    if (-not $SkipMigrate) {
        if ($FreshSeed) {
            Write-Host "Running fresh migrations with seed data..."
            & $Php artisan migrate:fresh --seed
        } else {
            Write-Host "Running migrations..."
            & $Php artisan migrate --force

            if ($Seed) {
                Write-Host "Running database seeders..."
                & $Php artisan db:seed --force
            }
        }
    }

    Write-Host ""
    Write-Host "MoSPAMS backend is starting at http://127.0.0.1:$Port"
    Write-Host "Press Ctrl+C to stop the backend."
    Write-Host ""

    Push-Location $PublicPath
    try {
        & $Php -S "127.0.0.1:$Port" -t $PublicPath
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}
