-- ============================================
-- Run this in phpMyAdmin or MySQL Workbench
-- ============================================

USE mospams_db;

-- 1. Check if shop exists
SELECT '=== SHOP EXISTS? ===' as 'CHECK';
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status,
    email,
    phone
FROM shops
WHERE subdomain = 'dc-motorparts-and-accessories';

-- 2. Check shop owner
SELECT '=== SHOP OWNER ===' as 'CHECK';
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
    WHERE subdomain = 'dc-motorparts-and-accessories'
)
AND r.role_name = 'Owner';

-- 3. List all shops
SELECT '=== ALL SHOPS ===' as 'CHECK';
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status
FROM shops
ORDER BY created_at DESC;

-- 4. Check for similar subdomains
SELECT '=== SIMILAR SHOPS ===' as 'CHECK';
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code
FROM shops
WHERE subdomain LIKE '%motorparts%'
   OR subdomain LIKE '%dc%'
   OR shop_name LIKE '%motorparts%';
