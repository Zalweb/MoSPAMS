# Local White-Label Subdomain Demo Guide

## Overview
This guide shows how to run MoSPAMS with white-label subdomain isolation on your local machine for testing and school demonstration.

---

## Prerequisites
- ✅ Windows hosts file edited
- ✅ Backend configured for local subdomains
- ✅ Frontend configured for local subdomains
- ✅ Test shops created with unique subdomains

---

## Step 1: Verify Hosts File

**File:** `C:\Windows\System32\drivers\etc\hosts`

Ensure these lines exist:
```
127.0.0.1   mospams.local
127.0.0.1   motoworks.mospams.local
127.0.0.1   speedzone.mospams.local
127.0.0.1   bikerepair.mospams.local
127.0.0.1   admin.mospams.local
```

**How to edit:**
1. Open Notepad as Administrator
2. File → Open → `C:\Windows\System32\drivers\etc\hosts`
3. Change file type to "All Files"
4. Add the lines above
5. Save and close

---

## Step 2: Start Backend

```powershell
cd Backend
php artisan serve --host=0.0.0.0 --port=8000
```

Backend will be available at: `http://mospams.local:8000`

---

## Step 3: Start Frontend

```powershell
cd Frontend
npm run dev
```

Frontend will be available at: `http://mospams.local:5173`

---

## Step 4: Test Shops

### Shop 1: MotoWorks Repair Shop
- **URL:** http://motoworks.mospams.local:5173
- **Login:** motoworks@test.com
- **Password:** password123
- **Role:** Owner

### Shop 2: SpeedZone Motorcycle Services
- **URL:** http://speedzone.mospams.local:5173
- **Login:** speedzone@test.com
- **Password:** password123
- **Role:** Owner

### Shop 3: BikeRepair Pro
- **URL:** http://bikerepair.mospams.local:5173
- **Login:** bikerepair@test.com
- **Password:** password123
- **Role:** Owner

### SuperAdmin Portal
- **URL:** http://admin.mospams.local:5173
- **Login:** superadmin@mospams.com
- **Password:** superadmin123
- **Role:** SuperAdmin

---

## Step 5: Demo Flow for School Presentation

### Part 1: Show Shop Isolation (5 minutes)

1. **Open MotoWorks shop** in Chrome:
   - Visit: `http://motoworks.mospams.local:5173`
   - Show branded landing page (will show MotoWorks branding)
   - Login with: `motoworks@test.com` / `password123`
   - Show dashboard with MotoWorks data only

2. **Open SpeedZone shop** in Firefox (different browser):
   - Visit: `http://speedzone.mospams.local:5173`
   - Show different branding
   - Login with: `speedzone@test.com` / `password123`
   - Show dashboard with SpeedZone data only

3. **Demonstrate isolation:**
   - Create a part in MotoWorks
   - Switch to SpeedZone browser
   - Show that the part doesn't appear (data is isolated)

### Part 2: Show Cross-Shop Login Prevention (2 minutes)

1. **Try to login to wrong shop:**
   - Visit: `http://speedzone.mospams.local:5173`
   - Try to login with: `motoworks@test.com` / `password123`
   - Show "Invalid credentials" error
   - Explain: Users can only access their own shop

### Part 3: Show SuperAdmin Platform Management (5 minutes)

1. **Open SuperAdmin portal:**
   - Visit: `http://admin.mospams.local:5173`
   - Login with: `superadmin@mospams.com` / `superadmin123`

2. **Show platform analytics:**
   - Total shops: 4 (default + 3 test shops)
   - Monthly Recurring Revenue (MRR)
   - Total platform users
   - Recent shops

3. **Show shops management:**
   - Navigate to "Shops" page
   - Show list of all shops
   - Show ability to suspend/activate shops
   - Show subscription management

4. **Show audit logs:**
   - Navigate to "Audit Logs"
   - Show platform-wide activity across all shops

### Part 4: Show White-Label Benefits (3 minutes)

**Explain to audience:**

1. **Complete Isolation:**
   - Each shop has own subdomain
   - Data is completely separated
   - Users can't see other shops

2. **Branding Customization:**
   - Each shop can customize logo, colors
   - Feels like their own system
   - No competition visibility

3. **Scalability:**
   - Add unlimited shops
   - Each shop pays subscription
   - Recurring revenue model

4. **Easy Management:**
   - SuperAdmin manages all shops from one portal
   - Monitor revenue, users, activity
   - Suspend/activate shops instantly

---

## Troubleshooting

### Issue: "Shop not found" error

**Solution:**
```powershell
cd Backend
php artisan tinker --execute="DB::table('shops')->where('subdomain', 'default')->update(['subdomain' => 'default']);"
```

### Issue: CORS errors in browser console

**Solution:**
```powershell
cd Backend
php artisan config:clear
php artisan cache:clear
```

### Issue: Can't access subdomains

**Solution:**
1. Verify hosts file has all entries
2. Flush DNS cache:
   ```powershell
   ipconfig /flushdns
   ```
3. Restart browser

### Issue: Login doesn't work

**Solution:**
1. Check backend is running on port 8000
2. Check frontend is running on port 5173
3. Verify user exists:
   ```powershell
   cd Backend
   php artisan tinker --execute="DB::table('users')->where('email', 'motoworks@test.com')->first();"
   ```

---

## Demo Script for Presentation

**Opening (1 minute):**
> "Today I'll demonstrate MoSPAMS, a white-label multi-tenant SaaS platform for motorcycle repair shops. Each shop gets their own subdomain with complete data isolation."

**Demo (12 minutes):**
1. Show 3 different shops in different browsers
2. Demonstrate data isolation
3. Show cross-shop login prevention
4. Show SuperAdmin platform management
5. Explain white-label benefits

**Closing (2 minutes):**
> "This architecture allows unlimited shops to use the same platform while maintaining complete isolation. Each shop pays a monthly subscription, creating recurring revenue. SuperAdmin can manage everything from one portal."

**Q&A (5 minutes):**
- Be ready to explain: subdomains, multi-tenancy, data isolation, revenue model

---

## Technical Details for Q&A

### How does subdomain routing work?
- Middleware extracts subdomain from URL
- Queries database for shop with that subdomain
- Attaches shop context to all requests
- All queries automatically filtered by shop_id

### How is data isolated?
- Every table has `shop_id_fk` column
- Middleware ensures all queries include shop filter
- Users can only access data from their shop
- SuperAdmin has `shop_id_fk = NULL` (no shop)

### What happens if shop is suspended?
- Middleware checks shop status
- Returns 503 error if not active
- Users can't login or access data
- SuperAdmin can reactivate anytime

### Can shops have custom domains?
- Yes! Shops can use `www.motoworks.com`
- They add CNAME record pointing to platform
- SuperAdmin adds custom domain in settings
- Middleware checks custom_domain first

---

## Cleanup After Demo

```powershell
# Stop servers
Ctrl+C (in both terminal windows)

# Optional: Remove test shops
cd Backend
php artisan tinker --execute="DB::table('shops')->whereIn('subdomain', ['motoworks', 'speedzone', 'bikerepair'])->delete();"
```

---

## Next Steps for Production

1. Purchase domain: `mospams.app`
2. Setup wildcard DNS: `*.mospams.app`
3. Get wildcard SSL certificate
4. Deploy to VPS server
5. Configure Nginx for subdomains
6. Update environment variables
7. Launch platform!

---

## Support

If you encounter issues during demo:
- Check Backend terminal for errors
- Check Frontend terminal for errors
- Check browser console (F12) for errors
- Verify hosts file entries
- Restart both servers

Good luck with your presentation! 🎓
