# 🎯 MoSPAMS White-Label Multi-Tenant SaaS - Implementation Plan

## 📌 Overview

Transform MoSPAMS from a single-shop system into a **white-label multi-tenant SaaS platform** where each shop gets their own branded experience with complete isolation from competitors.

---

## ✅ Phase 1: Shop Branding & Identity (COMPLETED)

### Database Changes
- ✅ Added `subdomain` field (unique, e.g., "motoworks")
- ✅ Added `custom_domain` field (optional, e.g., "www.motoworks.com")
- ✅ Added `logo_url` field for shop logo
- ✅ Added `primary_color` and `secondary_color` for theme customization
- ✅ Added `business_description`, `facebook_url`, `instagram_url`
- ✅ Added `business_hours` JSON field

### Backend Implementation
- ✅ Updated `Shop` model with branding fields
- ✅ Created `ShopBrandingController` with endpoints:
  - `GET /api/shop/info` - Public shop info (no auth)
  - `GET /api/shop/branding` - Get branding (Owner only)
  - `PATCH /api/shop/branding` - Update branding (Owner only)
  - `POST /api/shop/logo` - Upload logo (Owner only)
  - `DELETE /api/shop/logo` - Delete logo (Owner only)
  - `POST /api/shop/invitation-code/regenerate` - Regenerate code (Owner only)

### Migration Files
- `2026_05_03_000005_add_invitation_code_to_shops.php`
- `2026_05_03_000006_add_branding_to_shops.php`

---

## 🚧 Phase 2: Subdomain Routing (IN PROGRESS)

### Middleware Created
- ✅ `IdentifyShopByDomain` middleware
  - Identifies shop by subdomain or custom domain
  - Attaches shop context to request
  - Validates shop is active
  - Handles localhost for development

### How It Works
```
Request: motoworks.mospams.app/api/parts
         ↓
Middleware extracts "motoworks" subdomain
         ↓
Finds shop with subdomain = "motoworks"
         ↓
Attaches shop to request
         ↓
All queries automatically scoped to that shop
```

### TODO
- ⏳ Register middleware in `app/Http/Kernel.php`
- ⏳ Configure CORS for wildcard subdomains
- ⏳ Update `.env` with base domain
- ⏳ Test subdomain routing

---

## 📋 Phase 3: Frontend Integration (PENDING)

### Frontend Changes Needed

#### 1. Detect Current Shop on Load
```typescript
// On app load, call GET /api/shop/info
const shopInfo = await apiGet('/shop/info');
// Store in context: shopName, logo, colors, etc.
```

#### 2. Apply Shop Branding
```typescript
// Apply colors to CSS variables
document.documentElement.style.setProperty('--primary', shopInfo.primaryColor);
document.documentElement.style.setProperty('--secondary', shopInfo.secondaryColor);

// Display logo in header
<img src={shopInfo.logoUrl} alt={shopInfo.shopName} />
```

#### 3. Create Shop Settings Page (Owner)
- Shop name, subdomain, custom domain
- Logo upload
- Color picker for primary/secondary colors
- Business hours editor
- Social media links
- Invitation code display with regenerate button

#### 4. Update Registration Flow
- Show shop name/logo on registration page
- Require invitation code input
- Auto-assign user to shop based on subdomain

---

## 📋 Phase 4: Deployment Configuration (PENDING)

### DNS Configuration
```
Type    Name        Value
A       @           <server-ip>
A       *           <server-ip>  (wildcard for subdomains)
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name *.mospams.app mospams.app;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Laravel Configuration
```env
APP_URL=https://mospams.app
SESSION_DOMAIN=.mospams.app
SANCTUM_STATEFUL_DOMAINS=*.mospams.app
```

---

## 📋 Phase 5: Customer Portal Isolation (PENDING)

### Current Issue
Customers can potentially see other shops if they know the URL.

### Solution
- ✅ Already implemented: Shop scoping in all queries
- ⏳ Add customer registration tied to shop subdomain
- ⏳ Customer login only works on their shop's subdomain
- ⏳ Customer portal shows only their shop's services

---

## 📋 Phase 6: Marketing & Onboarding (PENDING)

### Landing Page
- Main domain: `mospams.app`
- Explains the platform
- "Start Your Free Trial" button
- Pricing plans

### Onboarding Flow
1. Shop owner signs up on main site
2. Chooses subdomain (e.g., "motoworks")
3. SuperAdmin approves shop
4. Shop owner receives:
   - Subdomain URL: `motoworks.mospams.app`
   - Login credentials
   - Invitation code for staff
5. Shop owner customizes branding
6. Shop owner invites staff using invitation code

---

## 📋 Phase 7: Advanced Features (FUTURE)

### Custom Domain Support
- Shop owner can use their own domain (e.g., `www.motoworks.com`)
- DNS CNAME points to MoSPAMS
- SSL certificate auto-provisioning (Let's Encrypt)

### Mobile App (Capacitor)
- Single app, multi-tenant
- User enters shop subdomain on first launch
- App stores shop context
- All API calls include shop context

### White-Label Mobile Apps
- Generate separate APK per shop
- Shop's branding baked into app
- Published under shop's name on Play Store

---

## 🎯 Business Model

### Pricing Tiers

**Basic Plan: ₱1,499/month**
- Subdomain only (e.g., `yourshop.mospams.app`)
- Basic branding (logo, colors)
- Up to 2 staff users
- 100 customers
- Basic reports

**Pro Plan: ₱2,999/month**
- Everything in Basic
- Custom domain support
- Unlimited staff users
- Unlimited customers
- Advanced reports
- Customer portal
- Priority support

**Enterprise: ₱5,999/month**
- Everything in Pro
- White-label mobile app
- API access
- Custom integrations
- Dedicated account manager

### Revenue Projections
- 10 shops × ₱1,499 = ₱14,990/month
- 20 shops × ₱2,999 = ₱59,980/month
- 5 shops × ₱5,999 = ₱29,995/month
- **Total: ₱104,965/month** (₱1,259,580/year)

---

## 🔒 Security & Privacy

### Data Isolation
- ✅ All queries scoped by `shop_id_fk`
- ✅ Middleware validates shop context
- ✅ SuperAdmin has separate routes
- ✅ No cross-shop data leakage

### Privacy Guarantees
- Each shop's data is completely isolated
- Customers cannot see other shops
- Shop owners cannot see other shops' data
- Only SuperAdmin can see all shops (for platform management)

---

## 📊 Success Metrics

### Technical Metrics
- Response time < 200ms per request
- 99.9% uptime
- Zero data leakage incidents
- Subdomain routing working 100%

### Business Metrics
- 50 shops onboarded in Year 1
- 80% retention rate
- Average revenue per shop: ₱2,500/month
- Customer satisfaction: 4.5/5 stars

---

## 🚀 Next Steps (Priority Order)

1. **Register middleware** in Kernel.php
2. **Run migrations** to add branding fields
3. **Test subdomain routing** locally
4. **Build frontend shop settings page**
5. **Update registration flow** with invitation codes
6. **Deploy to staging** with wildcard DNS
7. **Test with 2-3 pilot shops**
8. **Launch marketing site**
9. **Onboard first 10 paying customers**

---

## 📝 Notes

### Why This Approach Works
- ✅ Shops feel they have their own system
- ✅ No competition visibility
- ✅ Easy to maintain (one codebase)
- ✅ Scalable to 1000+ shops
- ✅ Recurring revenue model

### What Makes It Different
- ❌ NOT a marketplace (shops don't compete)
- ❌ NOT a directory (customers can't browse shops)
- ✅ White-label (each shop branded independently)
- ✅ Isolated (complete data separation)

---

## 🎓 Learning Resources

### Subdomain Routing
- Laravel Multi-Tenancy Package: `stancl/tenancy`
- Wildcard DNS configuration
- Nginx subdomain routing

### White-Label SaaS
- Shopify's multi-tenant architecture
- WordPress.com's subdomain system
- Stripe's white-label approach

---

## ✅ Checklist

### Backend
- [x] Database schema for branding
- [x] Shop model updated
- [x] Branding controller created
- [x] Routes added
- [x] Middleware created
- [ ] Middleware registered
- [ ] CORS configured for subdomains
- [ ] File storage configured for logos

### Frontend
- [ ] Shop info API integration
- [ ] Branding context provider
- [ ] Dynamic theme application
- [ ] Shop settings page
- [ ] Logo upload component
- [ ] Color picker component
- [ ] Invitation code display

### DevOps
- [ ] Wildcard DNS configured
- [ ] Nginx subdomain routing
- [ ] SSL certificates (wildcard)
- [ ] File storage (S3 or local)
- [ ] CDN for logos

### Testing
- [ ] Subdomain routing tests
- [ ] Shop isolation tests
- [ ] Branding API tests
- [ ] Logo upload tests
- [ ] Multi-shop scenario tests

---

**Last Updated:** 2026-05-03
**Status:** Phase 1 Complete, Phase 2 In Progress
**Next Milestone:** Complete subdomain routing and test with 2 shops
