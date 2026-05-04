# SuperAdmin Quick Reference

## 🔐 Login Access

### ⚠️ IMPORTANT: Localhost Limitation

**`localhost:5173` DOES NOT support SuperAdmin access!**

When you access `localhost:5173`, the system operates in **PUBLIC mode** (landing page), not platform mode.

### ✅ How to Access SuperAdmin Locally

**Step 1: Configure Hosts File**

Windows: `C:\Windows\System32\drivers\etc\hosts`
```
127.0.0.1 admin.mospams.local
```

Mac/Linux: `/etc/hosts`
```
127.0.0.1 admin.mospams.local
```

**Step 2: Set Environment Variable**

`Frontend/.env`:
```env
VITE_PLATFORM_ADMIN_HOSTS=admin.mospams.local
```

**Step 3: Access SuperAdmin**
```
http://admin.mospams.local:5173/login
```

---

## 📊 All SuperAdmin Pages (28 Pages)

### 1. MAIN (1 page)
- ✅ **Dashboard**: `/superadmin/analytics` - Platform overview, KPIs, charts

### 2. SHOPS MANAGEMENT (4 pages)
- ✅ **All Shops**: `/superadmin/shops` - Manage all tenant shops
- ✅ **Pending Approvals**: `/superadmin/shops/pending` - Approve/reject registrations
- ✅ **Create New Shop**: `/superadmin/shops/new` - Provision new shop
- ✅ **Suspended Shops**: `/superadmin/shops/suspended` - View suspended shops

### 3. BILLING & REVENUE (4 pages)
- ✅ **Subscription Plans**: `/superadmin/subscriptions` - Manage plans & subscriptions
- ✅ **Payments History**: `/superadmin/billing/payments` - Payment records
- 🚧 **Revenue Reports**: `/superadmin/billing/reports` - Revenue analytics (Placeholder)
- 🚧 **Overdue Accounts**: `/superadmin/billing/overdue` - Overdue payments (Placeholder)

### 4. PLATFORM ADMINS (2 pages)
- ✅ **Admin Users**: `/superadmin/access-control` - Manage platform admins
- ✅ **Add Platform Admin**: `/superadmin/admins/new` - Create new admin

### 5. ANALYTICS & REPORTS (4 pages)
- 🚧 **Revenue Analytics**: `/superadmin/reports/revenue` - Revenue trends (Placeholder)
- 🚧 **Shop Growth Trends**: `/superadmin/reports/growth` - Growth metrics (Placeholder)
- 🚧 **User Statistics**: `/superadmin/reports/users` - User analytics (Placeholder)
- ✅ **System Performance**: `/superadmin/reports/performance` - System metrics

### 6. PLATFORM SETTINGS (4 pages)
- ✅ **Platform Settings**: `/superadmin/settings` - General settings
- 🚧 **System Maintenance**: `/superadmin/settings/maintenance` - Maintenance mode (Placeholder)
- 🚧 **API Keys**: `/superadmin/settings/api` - API key management (Placeholder)
- 🚧 **Email Templates**: `/superadmin/settings/email` - Email templates (Placeholder)

### 7. AUDIT LOGS (1 page)
- ✅ **Platform Activity History**: `/superadmin/audit-logs` - Audit logs

### 8. SUPPORT (2 pages)
- 🚧 **Support Tickets**: `/superadmin/support/tickets` - Support system (Placeholder)
- 🚧 **Shop Feedback**: `/superadmin/support/feedback` - Feedback management (Placeholder)

**Legend**:
- ✅ = Fully implemented
- 🚧 = Placeholder (UI exists, needs backend integration)

---

## 🎯 Key Features by Page

### Dashboard (`/superadmin/analytics`)
- Total Active Shops KPI
- Monthly Recurring Revenue (MRR)
- Pending Approvals count
- Revenue trend chart
- Shop health metrics
- Recent activity feed

### All Shops (`/superadmin/shops`)
- Search shops by name/owner
- View all shop details
- Approve/Reject registrations
- Suspend/Activate shops
- View shop diagnostics
- Create new shop

### Subscriptions (`/superadmin/subscriptions`)
- Create subscription plans
- Assign subscriptions to shops
- Record payments
- View expiring subscriptions
- Payment history

### Access Control (`/superadmin/access-control`)
- Create platform admins
- Activate/Deactivate admins
- View admin activity
- Auto-generate passwords

### Audit Logs (`/superadmin/audit-logs`)
- Filter by date, shop, user, action
- View all platform actions
- Export logs to CSV
- Search logs

---

## 🔑 Default SuperAdmin Credentials

**Create via Tinker**:
```bash
cd Backend
php artisan tinker

$user = new App\Models\User();
$user->name = 'Super Admin';
$user->email = 'admin@mospams.shop';
$user->username = 'superadmin';
$user->password = Hash::make('password123');
$user->role_id_fk = 1; // SuperAdmin role
$user->status_id_fk = 1; // Active status
$user->save();
```

**Login**:
- URL: `http://admin.mospams.local:5173/login`
- Email: `admin@mospams.shop`
- Password: `password123`

---

## 🚀 Common Tasks

### Approve Shop Registration
1. Go to `/superadmin/shops/pending`
2. Click "Approve" on shop
3. Copy temporary password
4. Send to shop owner

### Create Shop Manually
1. Go to `/superadmin/shops`
2. Click "Add New Shop"
3. Fill form and submit
4. Copy temporary password

### Assign Subscription
1. Go to `/superadmin/subscriptions`
2. Select shop and plan
3. Set status to ACTIVE
4. Click "Assign"

### Suspend Shop
1. Go to `/superadmin/shops`
2. Find shop in table
3. Click "Suspend"

### Create Platform Admin
1. Go to `/superadmin/access-control`
2. Fill name and email
3. Click "Create Admin"
4. Copy temporary password

---

## 📁 File Locations

### Pages
- Layout: `Frontend/src/features/superadmin/pages/SuperAdminLayout.tsx`
- Analytics: `Frontend/src/features/superadmin/pages/SuperAdminAnalyticsPage.tsx`
- Shops: `Frontend/src/features/superadmin/pages/SuperAdminShopsPage.tsx`
- Subscriptions: `Frontend/src/features/superadmin/pages/SuperAdminSubscriptionsPage.tsx`
- Access Control: `Frontend/src/features/superadmin/pages/SuperAdminAccessControlPage.tsx`
- Audit Logs: `Frontend/src/features/superadmin/pages/SuperAdminAuditLogsPage.tsx`

### API Client
- `Frontend/src/features/superadmin/lib/api.ts`

### Routing
- `Frontend/src/app/App.tsx` (lines 90-140)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access SuperAdmin at localhost | Use `admin.mospams.local` instead |
| 403 Forbidden after login | Check user has SuperAdmin role in DB |
| Shops not loading | Verify backend API is running |
| Login redirects to landing | Check host mode configuration |

---

## 📚 Full Documentation

For complete details, see: [SUPERADMIN_GUIDE.md](./SUPERADMIN_GUIDE.md)
