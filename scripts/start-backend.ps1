param(
    [int]$Port = 8001,
    [switch]$FreshSeed
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendPath = Join-Path $RepoRoot 'Backend'
$BundledPhp = 'C:\Users\frien\Documents\Web Technology Files\MoSPAMS\.tools\php\runtime\php.exe'
$Php = if ($env:MOSPAMS_PHP_PATH) {
    $env:MOSPAMS_PHP_PATH
} elseif (Test-Path $BundledPhp) {
    $BundledPhp
} else {
    'php'
}

Push-Location $RepoRoot
try {
    docker compose up -d db
} finally {
    Pop-Location
}

Push-Location $BackendPath
try {
    if (!(Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
    }

    $migrateArgs = if ($FreshSeed) {
        @('artisan', 'migrate:fresh', '--seed')
    } else {
        @('artisan', 'migrate', '--force')
    }

    & $Php -d extension=pdo_mysql @migrateArgs

    Write-Host "MoSPAMS backend is starting at http://127.0.0.1:$Port"
    & $Php -d extension=pdo_mysql -S "127.0.0.1:$Port" -t public
} finally {
    Pop-Location
}
