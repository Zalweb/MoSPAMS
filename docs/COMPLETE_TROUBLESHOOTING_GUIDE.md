# Complete Troubleshooting Guide - Tenant Bootstrap Issues

## Issue: "Shop not found" / "Tenant bootstrap failed (404)"

### Complete Request Flow

```
1. Browser → http://dc-motorparts-and-accessories.mospams.shop:5173
2. Frontend detects host mode: "tenant"
3. TenantBrandingContext loads
4. Frontend sends request to: http://localhost:8000/api/shop/info
5. Request headers include: X-Tenant-Host: dc-motorparts-and-accessories.mospams.shop
6. Backend middleware: ResolveTenantContext
7. Middleware extracts subdomain from X-Tenant-Host header
8. Middleware queries database: SELECT * FROM shops WHERE subdomain = 'dc-motorparts-and-accessories'
9. Middleware checks shop status: Must be ACTIVE
10. ShopBrandingController returns shop info
11. Frontend applies branding
```

### Checklist - Trace Every Step

#### ✅ Step 1: Verify Shop Exists in Database

```powershell
cd Backend
php artisan tinker --execute="echo json_encode(DB::table('shops')->where('subdomain', 'dc-motorparts-and-accessories')->first());"
```

**Expected**: Shop record with `shop_id`, `shop_name`, `subdomain`
**If NULL**: Shop doesn't exist - create it via SuperAdmin

#### ✅ Step 2: Verify Shop Status is ACTIVE

```powershell
cd Backend
php artisan tinker --execute="echo json_encode(DB::table('shops')->join('shop_statuses', 'shops.shop_status_id_fk', '=', 'shop_statuses.shop_status_id')->where('shops.subdomain', 'dc-motorparts-and-accessories')->select('shops.shop_id', 'shops.shop_name', 'shop_statuses.status_code')->first());"
```

**Expected**: `status_code: "ACTIVE"`
**If PENDING**: Run activation script:
```powershell
.\scripts\activate-dc-motorparts-shop.ps1
```

#### ✅ Step 3: Verify Backend Configuration

Check `Backend/.env`:
```ini
TENANCY_BASE_DOMAIN=mospams.shop
TENANCY_PLATFORM_HOSTS=admin.mospams.local,admin.mospams.shop
TENANCY_PUBLIC_HOSTS=mospams.local,mospams.shop
SANCTUM_STATEFUL_DOMAINS=mospams.local:5173,*.mospams.local:5173,mospams.shop:5173,*.mospams.shop:5173,localhost:5173
SESSION_DOMAIN=.mospams.shop
```

**If different**: Update and restart backend

#### ✅ Step 4: Clear Backend Cache

```powershell
cd Backend
php artisan config:clear
php artisan cache:clear
```

#### ✅ Step 5: Verify Backend is Running

```powershell
curl http://localhost:8000/up
```

**Expected**: Status 200
**If fails**: Start backend with `php artisan serve`

#### ✅ Step 6: Test Subdomain Extraction

```powershell
cd Backend
php artisan tinker --execute="$host = 'dc-motorparts-and-accessories.mospams.shop'; $base = config('tenancy.base_domain'); echo 'Host: ' . $host . PHP_EOL; echo 'Base: ' . $base . PHP_EOL; echo 'Subdomain: ' . substr($host, 0, -strlen('.'.$base));"
```

**Expected**: `Subdomain: dc-motorparts-and-accessories`

#### ✅ Step 7: Test Shop Resolution with Status

```powershell
cd Backend
php artisan tinker --execute="$shop = App\Models\Shop::query()->with('status')->where('subdomain', 'dc-motorparts-and-accessories')->first(); echo json_encode(['found' => $shop !== null, 'status' => $shop?->status?->status_code]);"
```

**Expected**: `{"found":true,"status":"ACTIVE"}`

#### ✅ Step 8: Test API Endpoint Directly

```powershell
curl http://localhost:8000/api/shop/info -H "X-Tenant-Host: dc-motorparts-and-accessories.mospams.shop" -H "Accept: application/json" -H "ngrok-skip-browser-warning: true"
```

**Expected**: JSON with shop details
**If 404**: Check middleware exemptions

#### ✅ Step 9: Verify Hosts File (for subdomain access)

Check `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1    dc-motorparts-and-accessories.mospams.shop
```

**If missing**: Add entry and restart browser

#### ✅ Step 10: Verify CORS Configuration

Check `Backend/config/cors.php`:
```php
'allowed_origins_patterns' => [
    '/^http:\/\/[a-z0-9-]+\.mospams\.shop:5173$/',
],
```

**If missing**: Add pattern and restart backend

### Common Issues & Solutions

#### Issue 1: "Shop already has an Owner account"

**Cause**: Trying to approve a shop that was already approved

**Solution**: 
- Shop is already ACTIVE, no need to approve again
- Check shop status in database
- If status is ACTIVE, shop is ready to use

#### Issue 2: "Tenant bootstrap failed (404)"

**Cause**: One of these:
1. Shop doesn't exist in database
2. Shop status is not ACTIVE
3. Subdomain mismatch
4. Backend not running
5. Wrong TENANCY_BASE_DOMAIN
6. Middleware not loading status relationship

**Solution**: Follow checklist above step by step

#### Issue 3: CORS Errors

**Cause**: Backend not allowing requests from shop subdomain

**Solution**:
1. Update `Backend/config/cors.php` with shop domain pattern
2. Restart backend
3. Clear browser cache

#### Issue 4: "Shop unavailable (503)"

**Cause**: Shop status is not ACTIVE (PENDING, SUSPENDED, INACTIVE)

**Solution**:
```powershell
cd Backend
php artisan tinker --execute="DB::table('shops')->where('shop_id', 1)->update(['shop_status_id_fk' => 1]);"
```

### Files Modified (Summary)

1. **Backend/.env**
   - `TENANCY_BASE_DOMAIN=mospams.shop`
   - Added `*.mospams.shop` to SANCTUM_STATEFUL_DOMAINS

2. **Backend/config/cors.php**
   - Added `*.mospams.shop:5173` pattern

3. **Backend/app/Http/Middleware/ResolveTenantContext.php**
   - Added `api/shop/info` to exempt routes
   - Added `->with('status')` to shop queries

4. **Backend/app/Http/Controllers/Api/ShopBrandingController.php**
   - Improved error message for shop not found

5. **Frontend/vite.config.ts**
   - Added `.mospams.shop` to allowed hosts

6. **Frontend/src/shared/contexts/TenantBrandingContext.tsx**
   - Improved error messages

7. **Frontend/src/features/common/TenantBootstrapScreen.tsx**
   - Added troubleshooting steps
   - Added retry and home buttons
   - Shows current URL

8. **Frontend/src/features/superadmin/pages/PendingShopsPage.tsx**
   - Shows actual error messages from API

### Diagnostic Commands

Run these in order:

```powershell
# 1. Check if backend is running
curl http://localhost:8000/up

# 2. Check shop exists
cd Backend
php artisan tinker --execute="DB::table('shops')->where('subdomain', 'dc-motorparts-and-accessories')->first();"

# 3. Check shop status
php artisan tinker --execute="DB::table('shops')->join('shop_statuses', 'shops.shop_status_id_fk', '=', 'shop_statuses.shop_status_id')->where('shops.subdomain', 'dc-motorparts-and-accessories')->select('shops.*', 'shop_statuses.status_code')->first();"

# 4. Test API endpoint
curl http://localhost:8000/api/shop/info -H "X-Tenant-Host: dc-motorparts-and-accessories.mospams.shop"

# 5. Clear caches
php artisan config:clear
php artisan cache:clear

# 6. Run diagnostic script
cd ..
.\scripts\diagnose-tenant-bootstrap.ps1
```

### Current Status

✅ Shop exists: `dc-motorparts-and-accessories`
✅ Shop status: `ACTIVE`
✅ Backend config: Updated for `mospams.shop`
✅ Middleware: Loads status relationship
✅ API endpoint: Exempted from status check
✅ Error messages: Improved and user-friendly

### Next Steps

1. **Restart backend** (REQUIRED after .env changes):
   ```powershell
   cd Backend
   # Press Ctrl+C to stop
   php artisan serve
   ```

2. **Add to hosts file** (if using subdomain):
   ```
   127.0.0.1    dc-motorparts-and-accessories.mospams.shop
   ```

3. **Access shop**:
   - With subdomain: `http://dc-motorparts-and-accessories.mospams.shop:5173`
   - With query param: `http://localhost:5173?shop=dc-motorparts-and-accessories`

4. **If still fails**: Run diagnostic script and share output

### Expected Result

✅ No "Tenant bootstrap failed" error
✅ Shop name appears: "DC Motorparts and Accessories"
✅ Login page shows shop branding
✅ Can login with shop owner credentials
