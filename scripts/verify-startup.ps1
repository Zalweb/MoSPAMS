# Startup Verification Script
# Run this before accessing the shop to ensure everything is ready

Write-Host "=== MoSPAMS Startup Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check 1: Backend Running
Write-Host "1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/up" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Backend is running on http://localhost:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ Backend is NOT running" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Start backend with:" -ForegroundColor Yellow
    Write-Host "   cd Backend" -ForegroundColor White
    Write-Host "   php artisan serve" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Check 2: Shop Status
Write-Host "2. Checking shop status..." -ForegroundColor Yellow
try {
    cd "Backend"
    $shopStatus = php artisan tinker --execute="echo json_encode(DB::table('shops')->join('shop_statuses', 'shops.shop_status_id_fk', '=', 'shop_statuses.shop_status_id')->where('shops.subdomain', 'dc-motorparts-and-accessories')->select('shops.shop_id', 'shops.shop_name', 'shops.subdomain', 'shop_statuses.status_code')->first());" 2>&1 | Select-String -Pattern '^\{' -Raw
    
    if ($shopStatus) {
        $shop = $shopStatus | ConvertFrom-Json
        Write-Host "   ✓ Shop found: $($shop.shop_name)" -ForegroundColor Green
        Write-Host "   ✓ Subdomain: $($shop.subdomain)" -ForegroundColor Green
        Write-Host "   ✓ Status: $($shop.status_code)" -ForegroundColor Green
        
        if ($shop.status_code -ne "ACTIVE") {
            Write-Host ""
            Write-Host "   ⚠ Shop is not ACTIVE. Activating now..." -ForegroundColor Yellow
            php artisan tinker --execute="DB::table('shops')->where('shop_id', $($shop.shop_id))->update(['shop_status_id_fk' => 1]);" | Out-Null
            Write-Host "   ✓ Shop activated" -ForegroundColor Green
        }
    } else {
        Write-Host "   ✗ Shop not found" -ForegroundColor Red
        cd ..
        exit 1
    }
    cd ..
} catch {
    Write-Host "   ✗ Failed to check shop status" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host ""

# Check 3: API Endpoint
Write-Host "3. Testing shop info API endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "X-Tenant-Host" = "dc-motorparts-and-accessories.mospams.shop"
        "Accept" = "application/json"
        "ngrok-skip-browser-warning" = "true"
    }
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/shop/info" -Method GET -Headers $headers -TimeoutSec 5
    
    if ($response.data) {
        Write-Host "   ✓ API endpoint working" -ForegroundColor Green
        Write-Host "   ✓ Shop ID: $($response.data.shopId)" -ForegroundColor Green
        Write-Host "   ✓ Shop Name: $($response.data.shopName)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ API endpoint failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Try restarting the backend:" -ForegroundColor Yellow
    Write-Host "   cd Backend" -ForegroundColor White
    Write-Host "   php artisan config:clear" -ForegroundColor White
    Write-Host "   php artisan cache:clear" -ForegroundColor White
    Write-Host "   php artisan serve" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Check 4: Frontend .env
Write-Host "4. Checking frontend configuration..." -ForegroundColor Yellow
$frontendEnv = Get-Content "Frontend\.env" -Raw
if ($frontendEnv -match "VITE_API_BASE_URL=(.+)") {
    $apiUrl = $matches[1].Trim()
    Write-Host "   ✓ API URL: $apiUrl" -ForegroundColor Green
    
    if ($apiUrl -ne "http://localhost:8000") {
        Write-Host "   ⚠ API URL should be http://localhost:8000" -ForegroundColor Yellow
        Write-Host "   Current: $apiUrl" -ForegroundColor Yellow
    }
}

Write-Host ""

# Check 5: Hosts File
Write-Host "5. Checking hosts file..." -ForegroundColor Yellow
$hostsFile = Get-Content "C:\Windows\System32\drivers\etc\hosts" -Raw
if ($hostsFile -match "dc-motorparts-and-accessories\.mospams\.shop") {
    Write-Host "   ✓ Hosts file entry found" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Hosts file entry missing" -ForegroundColor Yellow
    Write-Host "   Add this line to C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor Yellow
    Write-Host "   127.0.0.1    dc-motorparts-and-accessories.mospams.shop" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ All checks passed! You can now access your shop at:" -ForegroundColor Green
Write-Host ""
Write-Host "   http://dc-motorparts-and-accessories.mospams.shop:5173" -ForegroundColor White
Write-Host ""
Write-Host "   OR" -ForegroundColor Yellow
Write-Host ""
Write-Host "   http://localhost:5173?shop=dc-motorparts-and-accessories" -ForegroundColor White
Write-Host ""
Write-Host "If you still see errors:" -ForegroundColor Yellow
Write-Host "1. Restart frontend: cd Frontend && npm run dev" -ForegroundColor White
Write-Host "2. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor White
Write-Host "3. Try incognito mode" -ForegroundColor White
Write-Host ""
