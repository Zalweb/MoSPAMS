# ============================================
# MoSPAMS Shop Database Checker
# ============================================

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "MoSPAMS Shop Database Checker" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$subdomain = "dc-motorparts-and-accessories"

Write-Host "Checking shop: $subdomain" -ForegroundColor Yellow
Write-Host ""

# Navigate to Backend directory
Set-Location -Path "$PSScriptRoot\..\Backend"

Write-Host "1. Checking if shop exists..." -ForegroundColor Green
php artisan tinker --execute="
\$shop = DB::table('shops')->where('subdomain', '$subdomain')->first();
if (\$shop) {
    echo 'Shop Found: ' . \$shop->shop_name . PHP_EOL;
    echo 'Subdomain: ' . \$shop->subdomain . PHP_EOL;
    echo 'Status Code: ' . \$shop->status_code . PHP_EOL;
    echo 'Registration Status: ' . \$shop->registration_status . PHP_EOL;
    echo 'Shop ID: ' . \$shop->shop_id . PHP_EOL;
} else {
    echo 'ERROR: Shop not found with subdomain: $subdomain' . PHP_EOL;
}
"

Write-Host ""
Write-Host "2. Checking shop owner..." -ForegroundColor Green
php artisan tinker --execute="
\$shop = DB::table('shops')->where('subdomain', '$subdomain')->first();
if (\$shop) {
    \$owner = DB::table('users')
        ->join('roles', 'users.role_id_fk', '=', 'roles.role_id')
        ->where('users.shop_id_fk', \$shop->shop_id)
        ->where('roles.role_name', 'Owner')
        ->select('users.*', 'roles.role_name')
        ->first();
    
    if (\$owner) {
        echo 'Owner Found: ' . \$owner->full_name . PHP_EOL;
        echo 'Email: ' . \$owner->email . PHP_EOL;
        echo 'Username: ' . \$owner->username . PHP_EOL;
    } else {
        echo 'WARNING: No Owner found for this shop' . PHP_EOL;
    }
} else {
    echo 'ERROR: Shop not found' . PHP_EOL;
}
"

Write-Host ""
Write-Host "3. Listing all shops in database..." -ForegroundColor Green
php artisan tinker --execute="
\$shops = DB::table('shops')
    ->select('shop_id', 'shop_name', 'subdomain', 'status_code', 'registration_status')
    ->orderBy('created_at', 'desc')
    ->get();

echo 'Total shops: ' . \$shops->count() . PHP_EOL;
echo '-----------------------------------' . PHP_EOL;
foreach (\$shops as \$shop) {
    echo 'ID: ' . \$shop->shop_id . ' | ' . \$shop->shop_name . ' | ' . \$shop->subdomain . ' | ' . \$shop->status_code . ' | ' . \$shop->registration_status . PHP_EOL;
}
"

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If shop exists and status is ACTIVE:" -ForegroundColor Yellow
Write-Host "  Access at: http://$subdomain.mospams.shop:5173" -ForegroundColor White
Write-Host ""
Write-Host "If shop doesn't exist:" -ForegroundColor Yellow
Write-Host "  1. Register shop at: http://mospams.shop:5173/register-shop" -ForegroundColor White
Write-Host "  2. Or create via SuperAdmin at: http://admin.mospams.shop:5173" -ForegroundColor White
Write-Host ""
