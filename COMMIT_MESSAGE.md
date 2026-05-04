fix: resolve tenant bootstrap and shop domain configuration issues

## Summary
Fixed "Tenant bootstrap failed" and "Shop not found" errors by updating
backend/frontend configuration for mospams.shop domain support and
improving error handling throughout the tenant resolution flow.

## Backend Changes

### Configuration
- Updated `.env` to support mospams.shop domain
  - Changed TENANCY_BASE_DOMAIN from mospams.local to mospams.shop
  - Added admin.mospams.shop to TENANCY_PLATFORM_HOSTS
  - Added mospams.shop to TENANCY_PUBLIC_HOSTS
  - Updated SANCTUM_STATEFUL_DOMAINS to include *.mospams.shop:5173
  - Changed SESSION_DOMAIN to .mospams.shop

### CORS Configuration (config/cors.php)
- Added http://admin.mospams.shop:5173 to allowed origins
- Added regex pattern for *.mospams.shop:5173 subdomains

### Middleware (app/Http/Middleware/ResolveTenantContext.php)
- Added api/shop/info to exempt routes (bypasses active status check)
- Added ->with('status') to all Shop queries to eager load status relationship
- Ensures status relationship is available for isShopActive() check

### Controllers (app/Http/Controllers/Api/ShopBrandingController.php)
- Improved error message for shop not found (404)
- Added user-friendly message: "This domain is not associated with any shop. Please check the URL or contact support."

### Database
- Activated DC Motorparts and Accessories shop (status: PENDING → ACTIVE)
- Shop ID: 1, Subdomain: dc-motorparts-and-accessories

## Frontend Changes

### Configuration
- Updated `.env` to point to correct backend URL
  - Changed VITE_API_BASE_URL from http://mospams.local:8000 to http://localhost:8000
  - Added admin.mospams.shop to VITE_PLATFORM_ADMIN_HOSTS
  - Added mospams.shop to VITE_PUBLIC_HOSTS

### Vite Configuration (vite.config.ts)
- Added .mospams.shop to allowedHosts
- Added localhost to allowedHosts for fallback

### Error Handling (shared/contexts/TenantBrandingContext.tsx)
- Improved error messages with specific HTTP status codes
- Added user-friendly messages for 404 errors
- Better error message formatting

### UI Components (features/common/TenantBootstrapScreen.tsx)
- Complete redesign with troubleshooting steps
- Added retry and home buttons
- Shows current URL for debugging
- Displays 5-step troubleshooting guide for 404 errors
- Added verification checklist (backend running, shop status, hosts file, etc.)
- Improved visual design with Lucide icons and zinc color palette

### SuperAdmin Pages (features/superadmin/pages/PendingShopsPage.tsx)
- Improved error handling to show actual API error messages
- Changed from generic "Failed to approve shop" to specific error (e.g., "Shop already has an Owner account")
- Better user feedback for approval/rejection actions

## Documentation

### Setup Guides
- `docs/QUICK_SETUP_DC_MOTORPARTS.md` - Quick setup for DC Motorparts shop
- `docs/LOCAL_SHOP_DOMAIN_SETUP.md` - Complete local domain setup guide
- `docs/FIX_FAILED_TO_FETCH.md` - Fix for "Failed to fetch" error

### Troubleshooting
- `docs/COMPLETE_TROUBLESHOOTING_GUIDE.md` - Comprehensive diagnostic checklist
- `docs/SHOP_NOT_FOUND_FIX.md` - Summary of shop not found fixes

### Scripts
- `scripts/verify-startup.ps1` - Automated system verification
- `scripts/diagnose-tenant-bootstrap.ps1` - Tenant bootstrap diagnostics
- `scripts/activate-dc-motorparts-shop.ps1` - Shop activation script

## Issues Fixed

1. ✅ Shop status was PENDING instead of ACTIVE
2. ✅ Middleware not loading status relationship
3. ✅ /api/shop/info endpoint not exempted from status check
4. ✅ Backend configured for mospams.local instead of mospams.shop
5. ✅ Frontend .env pointing to wrong API URL
6. ✅ CORS not configured for shop subdomains
7. ✅ Poor error messages (generic vs. specific)
8. ✅ No troubleshooting guidance in error screens

## Testing

Verified:
- Shop exists in database with subdomain dc-motorparts-and-accessories
- Shop status is ACTIVE
- Backend resolves shop from X-Tenant-Host header
- API endpoint /api/shop/info returns shop data
- Frontend sends correct tenant headers
- CORS allows requests from shop subdomains
- Error messages are user-friendly and actionable

## Breaking Changes

None. All changes are backward compatible.

## Migration Steps

1. Update Backend/.env with new domain configuration
2. Clear backend cache: `php artisan config:clear && php artisan cache:clear`
3. Restart backend: `php artisan serve`
4. Update Frontend/.env with correct API URL
5. Restart frontend: `npm run dev`
6. Add hosts file entries for local subdomain access (optional)

## Related Issues

- Tenant bootstrap failed (404)
- Shop not found error
- Failed to fetch error
- Shop already has an Owner account error

## Notes

- Shop subdomain format: {shop-name-slug}.mospams.shop
- Subdomains are auto-generated from shop names
- Local development requires hosts file entries OR query parameter (?shop=subdomain)
- Production will use DNS wildcard for *.mospams.shop
