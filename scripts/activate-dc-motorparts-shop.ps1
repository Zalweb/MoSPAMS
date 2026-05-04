# Activate DC Motorparts Shop
# This script changes the shop status from PENDING to ACTIVE

Write-Host "=== Activating DC Motorparts and Accessories Shop ===" -ForegroundColor Cyan
Write-Host ""

cd "Backend"

Write-Host "Checking current shop status..." -ForegroundColor Yellow
$currentStatus = php artisan tinker --execute="echo json_encode(DB::table('shops')->where('shop_id', 1)->first());" 2>&1 | Select-String -Pattern '^\{' -Raw

if ($currentStatus) {
    $shop = $currentStatus | ConvertFrom-Json
    Write-Host "Shop ID: $($shop.shop_id)" -ForegroundColor Cyan
    Write-Host "Shop Name: $($shop.shop_name)" -ForegroundColor Cyan
    Write-Host "Subdomain: $($shop.subdomain)" -ForegroundColor Cyan
    Write-Host "Current Status ID: $($shop.shop_status_id_fk)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Updating shop status to ACTIVE (status_id = 1)..." -ForegroundColor Yellow
$result = php artisan tinker --execute="DB::table('shops')->where('shop_id', 1)->update(['shop_status_id_fk' => 1, 'updated_at' => now()]); echo 'Updated';" 2>&1

if ($result -match "Updated") {
    Write-Host "✓ Shop status updated to ACTIVE" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to update shop status" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host ""
Write-Host "Verifying new status..." -ForegroundColor Yellow
$newStatus = php artisan tinker --execute="echo json_encode(DB::table('shops')->join('shop_statuses', 'shops.shop_status_id_fk', '=', 'shop_statuses.shop_status_id')->where('shop_id', 1)->select('shops.*', 'shop_statuses.status_code', 'shop_statuses.status_name')->first());" 2>&1 | Select-String -Pattern '^\{' -Raw

if ($newStatus) {
    $shop = $newStatus | ConvertFrom-Json
    Write-Host "✓ Shop Status: $($shop.status_code) ($($shop.status_name))" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Shop Activation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now access your shop at:" -ForegroundColor Yellow
Write-Host "http://dc-motorparts-and-accessories.mospams.shop:5173" -ForegroundColor White
Write-Host ""
Write-Host "Or use query parameter:" -ForegroundColor Yellow
Write-Host "http://localhost:5173?shop=dc-motorparts-and-accessories" -ForegroundColor White
Write-Host ""

cd ..
