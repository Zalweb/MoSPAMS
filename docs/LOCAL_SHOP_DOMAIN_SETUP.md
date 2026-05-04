# Local Shop Domain Setup Guide

## Overview
This guide explains how to use shop subdomains locally (e.g., `metro-moto-parts.mospams.shop:5173`).

## Prerequisites
- Backend running on `localhost:8000`
- Frontend running on port `5173`
- Shop created via SuperAdmin

## Setup Steps

### 1. Update Windows Hosts File

**Open Notepad as Administrator**:
```powershell
# Right-click Notepad → Run as Administrator
notepad C:\Windows\System32\drivers\etc\hosts
```

**Add these lines at the bottom**:
```
# MoSPAMS Local Shop Domains
127.0.0.1    admin.mospams.shop
127.0.0.1    dc-motorparts-and-accessories.mospams.shop
```

**Save and close** (you may need to disable antivirus temporarily if it blocks the save).

### 2. Backend Configuration (Already Done ✅)

The following files have been updated:

**Backend/.env**:
- `TENANCY_BASE_DOMAIN=mospams.shop`
- `TENANCY_PLATFORM_HOSTS=admin.mospams.local,admin.mospams.shop`
- `TENANCY_PUBLIC_HOSTS=mospams.local,mospams.shop`
- `SANCTUM_STATEFUL_DOMAINS` includes `*.mospams.shop:5173`
- `SESSION_DOMAIN=.mospams.shop`

**Backend/config/cors.php**:
- Added `http://admin.mospams.shop:5173` to allowed origins
- Added pattern `/^http:\/\/[a-z0-9-]+\.mospams\.shop:5173$/` to allowed origins patterns

### 3. Frontend Configuration (Already Done ✅)

**Frontend/vite.config.ts**:
- Added `.mospams.shop` to `allowedHosts`

**Frontend/src/shared/lib/api.ts**:
- Already sends `X-Tenant-Host` header with current host

### 4. Restart Backend

After updating `.env`, restart your Laravel backend:

```powershell
cd Backend
# Stop the current server (Ctrl+C)
php artisan serve
```

### 5. Start Frontend

```powershell
cd Frontend
npm run dev
```

## Usage

### Access SuperAdmin
```
http://admin.mospams.shop:5173
```

### Access Shop by Subdomain
```
http://dc-motorparts-and-accessories.mospams.shop:5173
```

### Alternative: Query Parameter (No Hosts File Needed)
```
http://localhost:5173?shop=dc-motorparts-and-accessories
```

## How It Works

1. **Frontend**: When you visit `dc-motorparts-and-accessories.mospams.shop:5173`, the frontend detects it's a tenant host
2. **API Request**: Frontend sends `X-Tenant-Host: dc-motorparts-and-accessories.mospams.shop` header to backend
3. **Backend Middleware**: `ResolveTenantContext` reads the header and resolves the shop
4. **Shop Resolution**: Backend extracts subdomain `dc-motorparts-and-accessories` and queries the database
5. **Branding**: Frontend receives shop info and applies branding (logo, colors, name)

## Troubleshooting

### "Tenant bootstrap failed"

**Cause**: Backend can't find the shop

**Solutions**:
1. Check if shop exists in database:
   ```sql
   SELECT shop_id, shop_name, subdomain FROM shops;
   ```

2. Verify subdomain matches:
   - URL: `dc-motorparts-and-accessories.mospams.shop`
   - Database: `subdomain = 'dc-motorparts-and-accessories'`

3. Check backend logs for errors

4. Verify hosts file entry exists

5. Clear browser cache and restart browser

### "Shop not found"

**Cause**: Subdomain doesn't match any shop in database

**Solutions**:
1. Create shop via SuperAdmin with correct name
2. Check subdomain in database matches URL
3. Use query parameter instead: `http://localhost:5173?shop=dc-motorparts-and-accessories`

### CORS Errors

**Cause**: Backend not allowing requests from shop subdomain

**Solutions**:
1. Verify `Backend/config/cors.php` includes the pattern
2. Restart backend after config changes
3. Check browser console for exact CORS error

### Session/Auth Issues

**Cause**: Session domain mismatch

**Solutions**:
1. Verify `SESSION_DOMAIN=.mospams.shop` in `.env`
2. Verify `SANCTUM_STATEFUL_DOMAINS` includes `*.mospams.shop:5173`
3. Clear browser cookies
4. Restart backend

## Production Deployment

In production, you won't need the hosts file. Instead:

1. **DNS Configuration**: Point `*.mospams.shop` to your server IP
2. **SSL Certificate**: Use wildcard SSL for `*.mospams.shop`
3. **Environment Variables**: Update production `.env` with production domains
4. **Reverse Proxy**: Configure Nginx/Apache to handle subdomains

## Notes

- The `base_domain` in `tenancy.php` is set to `mospams.shop`
- Subdomains are auto-generated from shop names (e.g., "DC Motorparts and Accessories" → "dc-motorparts-and-accessories")
- Custom domains can be configured later by shop owners
- SuperAdmin always uses `admin.mospams.shop` (or `admin.mospams.local`)
