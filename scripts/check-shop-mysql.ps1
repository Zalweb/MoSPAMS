# ============================================
# MoSPAMS Shop Database Checker (MySQL Direct)
# ============================================

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "MoSPAMS Shop Database Checker" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$subdomain = "dc-motorparts-and-accessories"

Write-Host "Checking shop: $subdomain" -ForegroundColor Yellow
Write-Host ""

# Check if MySQL is accessible
Write-Host "Connecting to MySQL..." -ForegroundColor Green
Write-Host ""

# Create temporary SQL file
$sqlFile = "$PSScriptRoot\temp-check.sql"

$sqlContent = @"
USE mospams_db;

SELECT '=== 1. CHECKING IF SHOP EXISTS ===' as '';
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status,
    email
FROM shops
WHERE subdomain = '$subdomain';

SELECT '' as '';
SELECT '=== 2. CHECKING SHOP OWNER ===' as '';
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.full_name,
    r.role_name
FROM users u
JOIN roles r ON u.role_id_fk = r.role_id
WHERE u.shop_id_fk = (
    SELECT shop_id 
    FROM shops 
    WHERE subdomain = '$subdomain'
)
AND r.role_name = 'Owner';

SELECT '' as '';
SELECT '=== 3. ALL SHOPS IN DATABASE ===' as '';
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status
FROM shops
ORDER BY created_at DESC;
"@

# Write SQL to temp file
$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8

# Run MySQL command
Write-Host "Running database queries..." -ForegroundColor Yellow
Write-Host ""

# Try to run MySQL
try {
    mysql -u root -p mospams_db < $sqlFile
} catch {
    Write-Host "ERROR: Could not connect to MySQL" -ForegroundColor Red
    Write-Host "Make sure MySQL is running and accessible" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Run this SQL manually in phpMyAdmin or MySQL Workbench:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $sqlContent -ForegroundColor White
}

# Clean up temp file
if (Test-Path $sqlFile) {
    Remove-Item $sqlFile
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If shop exists and status is ACTIVE:" -ForegroundColor Yellow
Write-Host "  Access at: http://$subdomain.mospams.local:5173" -ForegroundColor White
Write-Host ""
Write-Host "If shop doesn't exist:" -ForegroundColor Yellow
Write-Host "  1. Register shop at: http://mospams.local:5173/register-shop" -ForegroundColor White
Write-Host "  2. Or create via SuperAdmin at: http://admin.mospams.local:5173" -ForegroundColor White
Write-Host ""
