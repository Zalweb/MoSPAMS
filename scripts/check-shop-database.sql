-- ============================================
-- MoSPAMS Shop Diagnostic Query
-- ============================================
-- Run this in your MySQL client to check shop configuration

USE mospams_db;

-- 1. Check if shop exists
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status,
    created_at
FROM shops
WHERE subdomain = 'dc-motorparts-and-accessories';

-- 2. Check shop status details
SELECT 
    s.shop_id,
    s.shop_name,
    s.subdomain,
    ss.status_name as status,
    rs.status_name as registration_status,
    s.email,
    s.phone,
    s.address
FROM shops s
LEFT JOIN shop_statuses ss ON s.status_id_fk = ss.status_id
LEFT JOIN registration_statuses rs ON s.registration_status_id_fk = rs.status_id
WHERE s.subdomain = 'dc-motorparts-and-accessories';

-- 3. Check if shop has an Owner
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.full_name,
    r.role_name,
    us.status_name as user_status
FROM users u
JOIN roles r ON u.role_id_fk = r.role_id
JOIN user_statuses us ON u.status_id_fk = us.status_id
WHERE u.shop_id_fk = (
    SELECT shop_id 
    FROM shops 
    WHERE subdomain = 'dc-motorparts-and-accessories'
)
AND r.role_name = 'Owner';

-- 4. Check shop subscription
SELECT 
    sub.subscription_id,
    sub.shop_id_fk,
    p.plan_name,
    p.monthly_price,
    sub.status as subscription_status,
    sub.trial_ends_at,
    sub.current_period_start,
    sub.current_period_end
FROM subscriptions sub
JOIN subscription_plans p ON sub.plan_id_fk = p.plan_id
WHERE sub.shop_id_fk = (
    SELECT shop_id 
    FROM shops 
    WHERE subdomain = 'dc-motorparts-and-accessories'
);

-- 5. List ALL shops in database
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code,
    registration_status,
    email
FROM shops
ORDER BY created_at DESC;

-- 6. Check if subdomain exists with different format
SELECT 
    shop_id,
    shop_name,
    subdomain,
    status_code
FROM shops
WHERE subdomain LIKE '%motorparts%'
   OR subdomain LIKE '%dc%'
   OR shop_name LIKE '%motorparts%';
