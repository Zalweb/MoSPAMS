# MoSPAMS SuperAdmin - Complete Guide

## 🎯 Overview

The SuperAdmin portal is the **platform administration interface** for MoSPAMS. It allows platform administrators to manage all tenant shops, subscriptions, billing, and system-wide settings.

---

## 🔐 SuperAdmin Login

### Access Points

SuperAdmin login is **host-based** and requires specific domain configuration:

| Environment | Host | URL | Mode |
|-------------|------|-----|------|
| **Production** | `admin.mospams.shop` | `https://admin.mospams.shop/login` | Platform |
| **Local Dev** | `admin.mospams.local` | `http://admin.mospams.local:5173/login` | Platform |
| **Localhost** | `localhost:5173` | `http://localhost:5173/login` | Public (Landing) |

### Important Notes

⚠️ **Localhost Limitation**: When accessing via `localhost:5173`, the system operates in **PUBLIC mode** (landing page), NOT platform mode. SuperAdmin features are NOT accessible.

✅ **To Access SuperAdmin Locally**:
1. Configure your hosts file to map `admin.mospams.local` to `127.0.0.1`
2. Set environment variable: `VITE_PLATFORM_ADMIN_HOSTS=admin.mospams.local`
3. Access via: `http://admin.mospams.local:5173/login`

### Login Page Features

**Code Location**: `Frontend/src/features/auth/LoginPage.tsx`

The login page automatically detects the host mode and displays:
- **Platform Mode**: Shows "SuperAdmin Portal" with shield icon
- **Public/Tenant Mode**: Shows shop name or "Welcome Back"

**Login Form**:
- Email or Username field
- Password field (with show/hide toggle)
- Remember me checkbox
- Forgot password link (coming soon)
- Google Sign-In option (coming soon)

**Authentication Flow**:
```tsx
1. User enters credentials
2. System calls: POST /api/login
3. Backend validates and returns user with role
4. If role === 'SuperAdmin', redirect to /superadmin/analytics
5. If role !== 'SuperAdmin', redirect to appropriate dashboard
```

---

## 📊 SuperAdmin Dashboard Layout

**Code Location**: `Frontend/src/features/superadmin/pages/SuperAdminLayout.tsx`

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (260px)          │  Main Content Area          │
│  ┌──────────────────┐     │  ┌────────────────────────┐ │
│  │ MoSPAMS PLATFORM │     │  │ Top Navbar             │ │
│  ├──────────────────┤     │  ├────────────────────────┤ │
│  │ Navigation Menu  │     │  │                        │ │
│  │ - Main           │     │  │  Page Content          │ │
│  │ - Shops Mgmt     │     │  │                        │ │
│  │ - Billing        │     │  │                        │ │
│  │ - Platform Admins│     │  │                        │ │
│  │ - Analytics      │     │  │                        │ │
│  │ - Settings       │     │  │                        │ │
│  │ - Audit Logs     │     │  │                        │ │
│  │ - Support        │     │  │                        │ │
│  ├──────────────────┤     │  │                        │ │
│  │ Sign Out         │     │  │                        │ │
│  └──────────────────┘     │  └────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Top Navbar Features

- **Search Bar**: Search shops, users, or transactions
- **Notifications**: Bell icon with unread indicator
- **User Profile**: Shows SuperAdmin name and status
- **Mobile Menu**: Hamburger menu for responsive design

### Sidebar Navigation

The sidebar is organized into 8 main sections:

---

## 📑 SuperAdmin Pages

### 1. **MAIN**

#### Dashboard (Home)
- **Route**: `/superadmin/analytics`
- **File**: `SuperAdminAnalyticsPage.tsx`
- **Features**:
  - **KPI Cards**:
    - Total Active Shops
    - MRR (Monthly Recurring Revenue)
    - Total Shops
    - Pending Approvals
  - **Platform Revenue Trends**: Line chart showing MRR growth
  - **Subscription Distribution**: Pie chart of plan distribution
  - **Recently Registered Shops**: Table of latest shops
  - **Shop Health Metrics**: Status breakdown (Active, Pending, Suspended, Inactive)
  - **Activity Log**: Recent platform-wide actions
  - **Top Performers**: Leading shops by revenue

---

### 2. **SHOPS MANAGEMENT**

#### All Shops
- **Route**: `/superadmin/shops`
- **File**: `SuperAdminShopsPage.tsx`
- **Features**:
  - **Search**: Search shops by name or owner
  - **Statistics**:
    - Total Shops count
    - Pending approvals count
    - Healthy (active) shops count
  - **Shop Table**:
    - Shop name and subdomain
    - Owner/Applicant information
    - Subscription details
    - Status badge
    - Actions: Diagnostics, Approve, Reject, Suspend/Activate
  - **Shop Diagnostics Modal**:
    - Shop details
    - Metrics: Users, Parts, Jobs, Sales, Revenue
    - Recent activity logs
  - **Create Shop Modal**:
    - Shop information form
    - Owner information form
    - Instant provisioning

#### Pending Approvals
- **Route**: `/superadmin/shops/pending`
- **File**: `PendingShopsPage.tsx`
- **Features**:
  - List of shops awaiting approval
  - Applicant details
  - Approve/Reject actions
  - Rejection reason input

#### Create New Shop
- **Route**: `/superadmin/shops/new`
- **File**: `CreateShopPage.tsx`
- **Features**:
  - Shop provisioning form
  - Owner account creation
  - Automatic subdomain generation
  - Temporary password generation

#### Suspended Shops
- **Route**: `/superadmin/shops/suspended`
- **File**: `SuspendedShopsPage.tsx`
- **Features**:
  - List of suspended shops
  - Suspension reason
  - Reactivate action

---

### 3. **BILLING & REVENUE**

#### Subscription Plans
- **Route**: `/superadmin/subscriptions`
- **File**: `SuperAdminSubscriptionsPage.tsx`
- **Features**:
  - **Create Plan Section**:
    - Plan code input
    - Plan name input
    - Monthly price input
    - Save plan button
  - **Assign Subscription Section**:
    - Shop selector
    - Plan selector
    - Status selector (PENDING, ACTIVE, EXPIRED, CANCELLED)
    - End date picker
    - Assign button
  - **Record Payment Section**:
    - Subscription selector
    - Amount input
    - Payment status selector
    - Payment method input
    - Due date picker
    - Record button
  - **Plans Table**: List of all subscription plans
  - **Expiring Subscriptions**: Shops expiring in 7 days
  - **Subscriptions Table**: All active subscriptions
  - **Payment History Table**: All payment records

#### Payments History
- **Route**: `/superadmin/billing/payments`
- **File**: `PaymentsHistoryPage.tsx`
- **Features**:
  - Payment records table
  - Filter by status, date range
  - Export to CSV

#### Revenue Reports
- **Route**: `/superadmin/billing/reports`
- **File**: `RevenueReportsPage.tsx` (Placeholder)
- **Features**:
  - Monthly revenue breakdown
  - Revenue by plan
  - Revenue trends

#### Overdue Accounts
- **Route**: `/superadmin/billing/overdue`
- **File**: `OverdueAccountsPage.tsx` (Placeholder)
- **Features**:
  - List of overdue shops
  - Days overdue
  - Outstanding amount
  - Send reminder action

---

### 4. **PLATFORM ADMINS**

#### Admin Users
- **Route**: `/superadmin/access-control`
- **File**: `SuperAdminAccessControlPage.tsx`
- **Features**:
  - **Create Platform Admin Section**:
    - Full name input
    - Email input
    - Password input (optional - auto-generates if empty)
    - Create admin button
  - **Platform Admins Table**:
    - Name
    - Email
    - Status (Active/Inactive)
    - Last active timestamp
    - Activate/Deactivate action
  - **Temporary Password Display**: Shows generated password on creation

#### Add Platform Admin
- **Route**: `/superadmin/admins/new`
- **File**: `AddPlatformAdminPage.tsx`
- **Features**:
  - Dedicated form for adding new platform admins
  - Role assignment
  - Permission configuration

---

### 5. **ANALYTICS & REPORTS**

#### Revenue Analytics
- **Route**: `/superadmin/reports/revenue`
- **File**: `RevenueAnalyticsPage.tsx` (Placeholder)
- **Features**:
  - Revenue charts
  - MRR trends
  - Churn rate

#### Shop Growth Trends
- **Route**: `/superadmin/reports/growth`
- **File**: `ShopGrowthPage.tsx` (Placeholder)
- **Features**:
  - New shops per month
  - Growth rate
  - Retention metrics

#### User Statistics
- **Route**: `/superadmin/reports/users`
- **File**: `UserStatisticsPage.tsx` (Placeholder)
- **Features**:
  - Total users across all shops
  - User growth
  - Active users

#### System Performance
- **Route**: `/superadmin/reports/performance`
- **File**: `SystemPerformancePage.tsx`
- **Features**:
  - API response times
  - Database performance
  - Error rates

---

### 6. **PLATFORM SETTINGS**

#### Platform Settings
- **Route**: `/superadmin/settings`
- **File**: `SuperAdminSettingsPage.tsx`
- **Features**:
  - General platform settings
  - Feature flags
  - System configuration

#### System Maintenance
- **Route**: `/superadmin/settings/maintenance`
- **File**: `MaintenanceModePage.tsx` (Placeholder)
- **Features**:
  - Enable/disable maintenance mode
  - Maintenance message
  - Scheduled maintenance

#### API Keys
- **Route**: `/superadmin/settings/api`
- **File**: `ApiKeysPage.tsx` (Placeholder)
- **Features**:
  - Generate API keys
  - Revoke API keys
  - API usage statistics

#### Email Templates
- **Route**: `/superadmin/settings/email`
- **File**: `EmailTemplatesPage.tsx` (Placeholder)
- **Features**:
  - Edit email templates
  - Preview emails
  - Test email sending

---

### 7. **AUDIT LOGS**

#### Platform Activity History
- **Route**: `/superadmin/audit-logs`
- **File**: `SuperAdminAuditLogsPage.tsx`
- **Features**:
  - **Filters**:
    - Date range picker
    - Shop filter
    - User filter
    - Action type filter
  - **Audit Log Table**:
    - Timestamp
    - Shop name
    - Actor (user who performed action)
    - Action description
    - Table name
    - Record ID
  - **Export**: Export logs to CSV
  - **Search**: Search logs by keyword

---

### 8. **SUPPORT**

#### Support Tickets
- **Route**: `/superadmin/support/tickets`
- **File**: `SupportTicketsPage.tsx` (Placeholder)
- **Features**:
  - List of support tickets
  - Ticket status
  - Assign to admin
  - Reply to ticket

#### Shop Feedback
- **Route**: `/superadmin/support/feedback`
- **File**: `ShopFeedbackPage.tsx` (Placeholder)
- **Features**:
  - Shop feedback submissions
  - Feature requests
  - Bug reports

---

## 🔧 SuperAdmin API Endpoints

**API Client**: `Frontend/src/features/superadmin/lib/api.ts`

### Shop Management
- `GET /api/superadmin/shops` - Get all shops
- `POST /api/superadmin/shops` - Create shop
- `GET /api/superadmin/shops/{id}/diagnostics` - Get shop diagnostics
- `POST /api/superadmin/shops/{id}/approve` - Approve shop registration
- `POST /api/superadmin/shops/{id}/reject` - Reject shop registration
- `POST /api/superadmin/shops/{id}/status` - Set shop status (activate/suspend)

### Subscription Management
- `GET /api/superadmin/subscription-plans` - Get all plans
- `POST /api/superadmin/subscription-plans` - Create plan
- `GET /api/superadmin/shop-subscriptions` - Get all subscriptions
- `POST /api/superadmin/shop-subscriptions` - Assign subscription
- `GET /api/superadmin/shop-subscriptions/expiring` - Get expiring subscriptions
- `GET /api/superadmin/subscription-payments` - Get payment history
- `POST /api/superadmin/subscription-payments` - Record payment

### Platform Admin Management
- `GET /api/superadmin/platform-admins` - Get all platform admins
- `POST /api/superadmin/platform-admins` - Create platform admin
- `POST /api/superadmin/platform-admins/{id}/status` - Set admin status

### Analytics
- `GET /api/superadmin/analytics` - Get platform analytics
- `GET /api/superadmin/audit-logs` - Get audit logs

---

## 🎨 Design System

### Color Scheme
- **Background**: `bg-black`, `bg-zinc-950`, `bg-zinc-900`
- **Borders**: `border-zinc-800`, `border-zinc-700`
- **Text**: `text-white`, `text-zinc-300`, `text-zinc-400`
- **Accents**: 
  - Success: `text-green-400`, `bg-green-500/10`
  - Warning: `text-orange-400`, `bg-orange-500/10`
  - Error: `text-red-400`, `bg-red-500/10`

### Typography
- **Headings**: `text-[22px]`, `font-bold`, `text-white`
- **Subheadings**: `text-[16px]`, `font-bold`, `text-white`
- **Body**: `text-[13px]`, `text-zinc-300`
- **Labels**: `text-[11px]`, `text-zinc-400`

### Components
- **Cards**: `bg-zinc-950`, `rounded-2xl`, `border border-zinc-800`
- **Buttons**: `rounded-xl`, `h-9`, `text-[12px]`
- **Inputs**: `bg-zinc-900`, `border-zinc-700`, `rounded-xl`
- **Tables**: `border-zinc-800`, `divide-y divide-zinc-800`

---

## 🔐 Security & Permissions

### Role-Based Access Control

**SuperAdmin Role Requirements**:
```tsx
// Route protection
<Route element={<RequireSuperAdmin />}>
  <Route path="superadmin" element={<SuperAdminLayout />}>
    {/* SuperAdmin routes */}
  </Route>
</Route>

// RequireSuperAdmin component
function RequireSuperAdmin() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (normalizeRole(user.role) !== 'SuperAdmin') 
    return <Navigate to={defaultRouteForUser(user)} replace />;
  return <Outlet />;
}
```

### Authentication Flow

1. **Login**: User logs in with SuperAdmin credentials
2. **Token**: Backend returns JWT token with role
3. **Storage**: Token stored in AuthContext (memory)
4. **Validation**: Every API call includes token in Authorization header
5. **Redirect**: Non-SuperAdmin users redirected to their dashboard

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (md, lg)
- **Desktop**: `> 1024px` (xl)

### Mobile Features
- **Hamburger Menu**: Sidebar collapses to hamburger on mobile
- **Responsive Tables**: Horizontal scroll on small screens
- **Stacked Forms**: Form fields stack vertically on mobile
- **Touch-Friendly**: Larger touch targets for mobile

---

## 🧪 Testing SuperAdmin Features

### Local Development Setup

1. **Configure Hosts File**:
   ```
   # Windows: C:\Windows\System32\drivers\etc\hosts
   # Mac/Linux: /etc/hosts
   127.0.0.1 admin.mospams.local
   ```

2. **Set Environment Variables**:
   ```env
   # Frontend/.env
   VITE_PLATFORM_ADMIN_HOSTS=admin.mospams.local
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start Backend**:
   ```bash
   cd Backend
   php artisan serve
   ```

4. **Start Frontend**:
   ```bash
   cd Frontend
   npm run dev
   ```

5. **Access SuperAdmin**:
   ```
   http://admin.mospams.local:5173/login
   ```

### Create SuperAdmin User

**Option 1: PowerShell Script**
```powershell
cd Backend
php artisan tinker

# In Tinker:
$user = new App\Models\User();
$user->name = 'Super Admin';
$user->email = 'admin@mospams.shop';
$user->username = 'superadmin';
$user->password = Hash::make('password123');
$user->role_id_fk = 1; // SuperAdmin role ID
$user->status_id_fk = 1; // Active status ID
$user->save();
```

**Option 2: Database Seeder**
```bash
php artisan db:seed --class=SuperAdminSeeder
```

---

## 📊 SuperAdmin Workflows

### 1. **Approve New Shop Registration**

```
1. Navigate to: /superadmin/shops/pending
2. Review shop application details
3. Click "Approve" button
4. System provisions shop and creates owner account
5. Copy temporary password
6. Send credentials to shop owner via email
```

### 2. **Create Shop Manually**

```
1. Navigate to: /superadmin/shops
2. Click "Add New Shop" button
3. Fill in shop information:
   - Shop name
   - Email, phone, address
   - Owner name and email
4. Click "Create Shop"
5. Copy temporary owner password
6. Shop is instantly provisioned
```

### 3. **Assign Subscription**

```
1. Navigate to: /superadmin/subscriptions
2. In "Assign Subscription" section:
   - Select shop
   - Select plan (Basic, Premium, Enterprise)
   - Set status (ACTIVE)
   - Set end date (optional)
3. Click "Assign"
4. Subscription is activated
```

### 4. **Record Payment**

```
1. Navigate to: /superadmin/subscriptions
2. In "Record Payment" section:
   - Select subscription
   - Enter amount
   - Set payment status (PAID)
   - Enter payment method
   - Set due date
3. Click "Record"
4. Payment is logged
```

### 5. **Suspend Shop**

```
1. Navigate to: /superadmin/shops
2. Find shop in table
3. Click "Suspend" button
4. Shop status changes to SUSPENDED
5. Shop users cannot access dashboard
```

### 6. **View Shop Diagnostics**

```
1. Navigate to: /superadmin/shops
2. Find shop in table
3. Click "Diagnostics" button
4. View modal with:
   - Shop details
   - Metrics (users, parts, jobs, sales, revenue)
   - Recent activity logs
```

### 7. **Create Platform Admin**

```
1. Navigate to: /superadmin/access-control
2. Fill in form:
   - Full name
   - Email
   - Password (optional)
3. Click "Create Admin"
4. Copy temporary password if auto-generated
5. Send credentials to new admin
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Real-time notifications
- [ ] Advanced analytics dashboards
- [ ] Bulk operations (suspend multiple shops)
- [ ] Email automation (welcome emails, payment reminders)
- [ ] Custom domain management
- [ ] White-label branding per shop
- [ ] API rate limiting
- [ ] Two-factor authentication for SuperAdmin
- [ ] Audit log export
- [ ] Shop performance benchmarking

---

## 🐛 Troubleshooting

### Issue: Cannot Access SuperAdmin Portal

**Problem**: Accessing `localhost:5173` shows landing page instead of SuperAdmin login.

**Solution**: 
- SuperAdmin requires platform host configuration
- Use `admin.mospams.local` instead of `localhost`
- Configure hosts file and environment variables

### Issue: "403 Forbidden" After Login

**Problem**: User logs in but gets redirected or sees 403 error.

**Solution**:
- Verify user has `SuperAdmin` role in database
- Check `role_id_fk` points to SuperAdmin role
- Ensure backend returns correct role in login response

### Issue: Shops Not Loading

**Problem**: Shop list is empty or shows loading state forever.

**Solution**:
- Check backend API is running
- Verify API endpoint: `GET /api/superadmin/shops`
- Check browser console for errors
- Verify authentication token is valid

---

## 📚 Related Documentation

- [Landing Page Navigation](./LANDING_PAGE_NAVIGATION.md)
- [User Roles & Permissions](./PROJECT_MEMORY.md)
- [Development Guidelines](./DEVELOPMENT.md)
- [API Documentation](../Backend/README.md)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0  
**Status**: ✅ Production Ready
