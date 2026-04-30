param(
    [int]$Port = 8001
)

$ErrorActionPreference = 'Stop'

$HealthUrl = "http://127.0.0.1:$Port/up"

try {
    Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    throw "Backend is not responding at $HealthUrl. Start it first with: .\scripts\start-backend.ps1"
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    throw 'ngrok is not installed or is not available on PATH.'
}

$existingTunnel = $null
try {
    $existingTunnel = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
} catch {
    $existingTunnel = $null
}

if (-not $existingTunnel -or -not $existingTunnel.tunnels) {
    Start-Process -FilePath 'ngrok' -ArgumentList @('http', $Port) -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

$tunnels = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 10
$publicUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url

if (-not $publicUrl) {
    throw 'ngrok started, but no HTTPS tunnel URL was found.'
}

Write-Host ''
Write-Host "Ngrok API URL:"
Write-Host $publicUrl
Write-Host ''
Write-Host 'Use this as VITE_API_BASE_URL on Vercel, then redeploy the frontend.'
Write-Host 'Example:'
Write-Host "  npx vercel env rm VITE_API_BASE_URL production --yes"
Write-Host "  `"$publicUrl`" | npx vercel env add VITE_API_BASE_URL production"
Write-Host '  npx vercel deploy --prod'
