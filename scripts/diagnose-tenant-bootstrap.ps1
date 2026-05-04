# Tenant Bootstrap Diagnostic Script
# Run this to diagnose "Tenant bootstrap failed" errors

Write-Host "=== MoSPAMS Tenant Bootstrap Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/up" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Backend is running on localhost:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Backend is NOT running on localhost:8000" -ForegroundColor Red
    Write-Host "   → Start backend: cd Backend && php artisan serve" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check database connection
Write-Host "2. Checking database connection..." -ForegroundColor Yellow
try {
    $env:DB_CHECK = "true"
    cd "Backend"
    $dbCheck = php artisan tinker --execute="DB::connection()->getPdo(); echo 'OK';" 2>&1
    if ($dbCheck -match "OK") {
        Write-Host "   ✓ Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Database connection failed" -ForegroundColor Red
        Write-Host "   → Check DB_* variables in Backend/.env" -ForegroundColor Yellow
    }
    cd ..
} catch {
    Write-Host "   ✗ Could not check database" -ForegroundColor Red
}

Write-Host ""

# List shops in database
Write-Host "3. Listing shops in database..." -ForegroundColor Yellow
try {
    cd "Backend"
    $shops = php artisan tinker --execute="DB::table('shops')->select('shop_id', 'shop_name', 'subdomain', 'shop_status_id_fk')->get()->toJson();" 2>&1 | Select-String -Pattern '^\[' -Raw
    
    if ($shops) {
        $shopsData = $shops | ConvertFrom-Json
        if ($shopsData.Count -eq 0) {
            Write-Host "   ⚠ No shops found in database" -ForegroundColor Yellow
            Write-Host "   → Create a shop via SuperAdmin" -ForegroundColor Yellow
        } else {
            Write-Host "   ✓ Found $($shopsData.Count) shop(s):" -ForegroundColor Green
            foreach ($shop in $shopsData) {
                Write-Host "     - ID: $($shop.shop_id) | Name: $($shop.shop_name) | Subdomain: $($shop.subdomain) | Status: $($shop.shop_status_id_fk)" -ForegroundColor Cyan
            }
        }
    }
    cd ..
} catch {
    Write-Host "   ✗ Could not query shops table" -ForegroundColor Red
}

Write-Host ""

# Check .env configuration
Write-Host "4. Checking .env configuration..." -ForegroundColor Yellow
$envFile = Get-Content "Backend\.env" -Raw
if ($envFile -match "TENANCY_BASE_DOMAIN=(.+)") {
    $baseDomain = $matches[1].Trim()
    Write-Host "   Base Domain: $baseDomain" -ForegroundColor Cyan
}
if ($envFile -match "TENANCY_PLATFORM_HOSTS=(.+)") {
    $platformHosts = $matches[1].Trim()
    Write-Host "   Platform Hosts: $platformHosts" -ForegroundColor Cyan
}
if ($envFile -match "TENANCY_PUBLIC_HOSTS=(.+)") {
    $publicHosts = $matches[1].Trim()
    Write-Host "   Public Hosts: $publicHosts" -ForegroundColor Cyan
}

Write-Host ""

# Check hosts file
Write-Host "5. Checking Windows hosts file..." -ForegroundColor Yellow
$hostsFile = Get-Content "C:\Windows\System32\drivers\etc\hosts" -Raw
if ($hostsFile -match "mospams\.shop") {
    Write-Host "   ✓ Found mospams.shop entries in hosts file" -ForegroundColor Green
    $hostsFile -split "`n" | Where-Object { $_ -match "mospams\.shop" } | ForEach-Object {
        Write-Host "     $_" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠ No mospams.shop entries found in hosts file" -ForegroundColor Yellow
    Write-Host "   → Add entries to C:\Windows\System32\drivers\etc\hosts" -ForegroundColor Yellow
    Write-Host "   → Example: 127.0.0.1    dc-motorparts-and-accessories.mospams.shop" -ForegroundColor Yellow
}

Write-Host ""

# Test shop/info endpoint
Write-Host "6. Testing /api/shop/info endpoint..." -ForegroundColor Yellow
$testSubdomain = Read-Host "   Enter shop subdomain to test (default: dc-motorparts-and-accessories)"
if (-not $testSubdomain) {
    $testSubdomain = "dc-motorparts-and-accessories"
}
if ($testSubdomain) {
    try {
        $headers = @{
            "X-Tenant-Host" = "$testSubdomain.mospams.shop"
            "Accept" = "application/json"
            "ngrok-skip-browser-warning" = "true"
        }
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/shop/info" -Method GET -Headers $headers
        Write-Host "   ✓ Shop info retrieved successfully:" -ForegroundColor Green
        Write-Host "     Shop ID: $($response.data.shopId)" -ForegroundColor Cyan
        Write-Host "     Shop Name: $($response.data.shopName)" -ForegroundColor Cyan
        Write-Host "     Subdomain: $($response.data.subdomain)" -ForegroundColor Cyan
    } catch {
        Write-Host "   ✗ Failed to retrieve shop info" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Diagnostics Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If no shops found → Create shop via SuperAdmin at http://admin.mospams.shop:5173" -ForegroundColor White
Write-Host "2. If hosts file missing entries → Edit C:\Windows\System32\drivers\etc\hosts as Administrator" -ForegroundColor White
Write-Host "3. If shop/info fails → Check subdomain matches database exactly" -ForegroundColor White
Write-Host "4. If backend not running → cd Backend && php artisan serve" -ForegroundColor White
Write-Host ""
