param(
    [int]$BackendPort = 8002,
    [int]$FrontendPort = 3000,
    [string]$NgrokRegion = "us",
    [switch]$FreshSeed,
    [switch]$Seed,
    [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

# Check if ngrok is installed
$ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCommand) {
    Write-Error "ngrok is not installed or not in PATH."
    Write-Host "Install ngrok from: https://ngrok.com/download"
    exit 1
}

# Check if authenticated
try {
    $null = ngrok config check 2>&1
} catch {
    Write-Error "ngrok is not authenticated."
    Write-Host "Authenticate with: ngrok config add-authtoken YOUR_TOKEN"
    exit 1
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$FrontendPath = Join-Path $RepoRoot 'Frontend'

Write-Host "Starting MoSPAMS full stack with ngrok tunnels..."
Write-Host "Backend port: $BackendPort"
Write-Host "Frontend port: $FrontendPort"
Write-Host "Ngrok region: $NgrokRegion"
Write-Host ""

# Start backend in background
$backendArgs = @("-Port", $BackendPort)
if ($FreshSeed) { $backendArgs += "-FreshSeed" }
if ($Seed) { $backendArgs += "-Seed" }
if ($SkipMigrate) { $backendArgs += "-SkipMigrate" }

$backendScript = Join-Path $PSScriptRoot "start-backend-local.ps1"
$backendJob = Start-Job -ScriptBlock {
    param($Script, $Args)
    & $Script @Args 2>&1 | Out-String
} -ArgumentList $backendScript, $backendArgs

# Wait for backend to start
Start-Sleep -Seconds 5

if ($backendJob.State -ne "Running") {
    $backendOutput = Receive-Job $backendJob -ErrorAction SilentlyContinue
    Write-Error "Backend failed to start:"
    Write-Host $backendOutput
    exit 1
}

Write-Host "Backend is running on port $BackendPort"

# Check if node_modules exists
if (-not (Test-Path (Join-Path $FrontendPath 'node_modules'))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $FrontendPath
    npm install
    Pop-Location
}

# Start frontend dev server in background
Push-Location $FrontendPath
$frontendJob = Start-Job -ScriptBlock {
    param($Path, $Port)
    Set-Location $Path
    npm run dev -- --port $Port --host 2>&1 | Out-String
} -ArgumentList $FrontendPath, $FrontendPort

# Wait for frontend to start
Start-Sleep -Seconds 5

if ($frontendJob.State -ne "Running") {
    $frontendOutput = Receive-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Error "Frontend failed to start:"
    Write-Host $frontendOutput
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Frontend is running on port $FrontendPort"
Write-Host ""
Write-Host "Starting ngrok tunnel..."
Write-Host ""

# Start ngrok for frontend
try {
    ngrok http $FrontendPort --region=$NgrokRegion
} finally {
    # Cleanup jobs when ngrok stops
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
}
