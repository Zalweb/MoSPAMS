# Quick Setup for DC Motorparts and Accessories Shop

## Your Shop Details
- **Shop Name**: DC Motorparts and Accessories
- **Subdomain**: `dc-motorparts-and-accessories`
- **Full Domain**: `dc-motorparts-and-accessories.mospams.shop`
- **Local URL**: `http://dc-motorparts-and-accessories.mospams.shop:5173`

## Setup Steps (5 minutes)

### Step 1: Edit Hosts File

1. **Open Notepad as Administrator**:
   - Press Windows key
   - Type "Notepad"
   - Right-click → "Run as administrator"

2. **Open hosts file**:
   - File → Open
   - Navigate to: `C:\Windows\System32\drivers\etc\`
   - Change file type to "All Files (*.*)"
   - Open the file named `hosts`

3. **Add these two lines at the bottom**:
   ```
   127.0.0.1    admin.mospams.shop
   127.0.0.1    dc-motorparts-and-accessories.mospams.shop
   ```

4. **Save and close** (File → Save)

### Step 2: Restart Backend

```powershell
cd Backend
# Press Ctrl+C to stop the current server
php artisan serve
```

Wait for: `Server running on [http://127.0.0.1:8000]`

### Step 3: Start Frontend (if not running)

```powershell
cd Frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### Step 4: Access Your Shop

Open browser and visit:
```
http://dc-motorparts-and-accessories.mospams.shop:5173
```

You should see:
- ✅ Shop name: "DC Motorparts and Accessories" in the login page
- ✅ Shop-specific branding
- ✅ No "Tenant bootstrap failed" error

## Alternative Method (No Hosts File)

If you don't want to edit the hosts file, use the query parameter:
```
http://localhost:5173?shop=dc-motorparts-and-accessories
```

## Troubleshooting

### Still seeing "Tenant bootstrap failed"?

Run the diagnostic script:
```powershell
.\scripts\diagnose-tenant-bootstrap.ps1
```

When prompted, enter: `dc-motorparts-and-accessories`

### Common Issues

1. **Forgot to restart backend after .env changes**
   - Solution: Stop backend (Ctrl+C) and run `php artisan serve` again

2. **Hosts file not saved properly**
   - Solution: Make sure you ran Notepad as Administrator
   - Check if antivirus blocked the save

3. **Wrong subdomain**
   - Solution: Use exactly `dc-motorparts-and-accessories` (with hyphens, lowercase)

4. **Browser cache**
   - Solution: Hard refresh (Ctrl+Shift+R) or open in incognito mode

## Verify Setup

Check if everything is working:

1. **Backend running**: Visit `http://localhost:8000/up` → Should show "OK"

2. **Shop exists**: Run in Backend folder:
   ```powershell
   php artisan tinker --execute="DB::table('shops')->where('subdomain', 'dc-motorparts-and-accessories')->first();"
   ```
   Should show shop details

3. **API endpoint**: Test with curl or browser:
   ```
   http://localhost:8000/api/shop/info
   ```
   With header: `X-Tenant-Host: dc-motorparts-and-accessories.mospams.shop`

## Next Steps

Once the shop loads successfully:
1. Login with shop owner credentials
2. Configure shop branding (logo, colors)
3. Add inventory, services, and staff
4. Start using the system!

## Need Help?

Run diagnostics: `.\scripts\diagnose-tenant-bootstrap.ps1`
