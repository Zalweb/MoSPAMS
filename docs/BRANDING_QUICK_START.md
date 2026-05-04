# Multi-Tenant Branding System - Quick Reference

## 🚀 Quick Start

### Backend Setup (5 minutes)

```bash
# 1. Run migration
cd Backend
php artisan migrate

# 2. Link storage
php artisan storage:link

# 3. Test endpoint
curl http://yourshop.mospams.shop/api/shop/info
```

### Frontend Setup (Already Done ✅)

The frontend is already integrated! Just use the new dashboard:
- Navigate to `/dashboard`
- Colors automatically apply from backend

---

## 📁 Files Created

### Backend
```
Backend/
├── database/migrations/
│   └── 2025_01_20_000001_add_branding_to_shops_table.php
├── app/Http/Middleware/
│   └── ResolveTenant.php
└── app/Http/Controllers/Api/
    └── ShopBrandingController.php
```

### Frontend
```
Frontend/src/
├── shared/contexts/
│   └── ShopContext.tsx (updated)
├── features/dashboard/pages/
│   └── NewDashboardWrapper.tsx (already exists)
└── features/settings/pages/
    └── ShopBrandingSettings.tsx (new)
```

---

## 🎨 How to Use Branding in Your Components

### Method 1: Tailwind Classes
```tsx
<button className="bg-[rgb(var(--color-primary-rgb))] text-white">
  Primary Button
</button>
```

### Method 2: Inline Styles
```tsx
<div style={{ 
  backgroundColor: `rgb(var(--color-primary-rgb))` 
}}>
  Content
</div>
```

### Method 3: Gradients
```tsx
<div className="bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))]">
  Gradient Background
</div>
```

### Method 4: Charts (Recharts)
```tsx
<Area 
  stroke="rgb(var(--color-primary-rgb))" 
  fill="url(#gradient)" 
/>
<defs>
  <linearGradient id="gradient">
    <stop offset="0%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity={0.3} />
    <stop offset="100%" stopColor="rgb(var(--color-primary-rgb))" stopOpacity={0} />
  </linearGradient>
</defs>
```

---

## 🔧 API Endpoints

### Public (No Auth)
```
GET /api/shop/info
→ Returns: { shopName, logoUrl, primaryColor, secondaryColor }
```

### Owner Only (Auth Required)
```
GET    /api/shop/branding              # Get full branding
PATCH  /api/shop/branding              # Update colors/name
POST   /api/shop/logo                  # Upload logo
DELETE /api/shop/logo                  # Delete logo
POST   /api/shop/invitation-code/regenerate  # New code
```

---

## 🎯 Testing Checklist

### Backend
- [ ] Migration ran successfully
- [ ] `/api/shop/info` returns shop data
- [ ] Logo upload works (max 2MB)
- [ ] Color validation works (hex format)
- [ ] Activity logs record changes

### Frontend
- [ ] Dashboard loads with shop colors
- [ ] Settings page shows current branding
- [ ] Color picker updates preview
- [ ] Logo upload/delete works
- [ ] Changes persist after refresh

---

## 🐛 Common Issues & Fixes

### Issue: Colors not applying
**Fix:** Check browser console for `/api/shop/info` response

### Issue: Logo not showing
**Fix:** Run `php artisan storage:link`

### Issue: 404 on /api/shop/info
**Fix:** Check subdomain DNS and middleware registration

### Issue: White screen on dashboard
**Fix:** ShopProvider has fallback - check console for actual error

---

## 📊 Database Schema

```sql
-- Added to shops table:
ALTER TABLE shops ADD COLUMN logo_url VARCHAR(500) NULL;
ALTER TABLE shops ADD COLUMN primary_color VARCHAR(7) DEFAULT '#ef4444';
ALTER TABLE shops ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#f97316';
```

---

## 🎨 Default Colors

If no branding is set:
- **Primary:** `#ef4444` (Red 500)
- **Secondary:** `#f97316` (Orange 500)

---

## 🔒 Security Features

✅ Tenant isolation (all queries scoped by shop_id_fk)
✅ File upload validation (type, size)
✅ Hex color validation
✅ Activity logging
✅ XSS prevention

---

## 📝 Next Steps

1. **Run migration** → `php artisan migrate`
2. **Test on dev** → Visit `yourshop.mospams.shop/dashboard`
3. **Update colors** → Go to Settings → Shop Branding
4. **Refactor pages** → Replace hardcoded colors with CSS variables
5. **Deploy** → Push to production

---

## 💡 Pro Tips

1. **Use the settings page** to test colors before hardcoding
2. **Check contrast** - ensure text is readable on colored backgrounds
3. **Test dark mode** - colors should work in both themes
4. **Use gradients** - combine primary + secondary for visual interest
5. **Keep it simple** - 2 colors is enough for most brands

---

## 📚 Full Documentation

See `docs/BRANDING_SYSTEM_GUIDE.md` for complete implementation details.

---

**Status:** ✅ Fully Implemented & Ready to Use
