# Branding Implementation - Complete Overview

## Summary

**Branding is implemented GLOBALLY across ALL pages** in the application, not just the dashboard. The branding system uses CSS custom properties (CSS variables) that are applied at the root level, affecting every component throughout the entire app.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Root (main.tsx)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TenantBrandingProvider (Wraps entire app)            │ │
│  │  - Fetches branding from /api/shop/info               │ │
│  │  - Applies CSS variables to document.documentElement  │ │
│  │  - Sets page title, favicon, theme-color              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  App Component (All routes)                            │ │
│  │  - Landing Page                                        │ │
│  │  - Login Page                                          │ │
│  │  - Dashboard (All pages)                               │ │
│  │  - SuperAdmin Pages                                    │ │
│  │  - Customer Pages                                      │ │
│  │  ALL inherit branding via CSS variables               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Provider Placement (main.tsx)

The `TenantBrandingProvider` wraps the **entire application** at the root level:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantBrandingProvider>  {/* ← Wraps EVERYTHING */}
      <App />
    </TenantBrandingProvider>
  </StrictMode>,
)
```

### 2. Branding Fetch & Application

When the app loads, `TenantBrandingContext` automatically:

1. **Fetches branding** from `/api/shop/info` (public endpoint, no auth required)
2. **Applies CSS variables** to `document.documentElement` (the `<html>` tag)
3. **Sets metadata**: page title, favicon, theme-color

### 3. CSS Variables Applied

The following CSS variables are set globally:

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `--tenant-primary` | Primary brand color (hex) | `#3B82F6` |
| `--tenant-secondary` | Secondary brand color (hex) | `#10B981` |
| `--color-primary-rgb` | Primary color (RGB format) | `59 130 246` |
| `--color-secondary-rgb` | Secondary color (RGB format) | `16 185 129` |
| `--color-primary` | Primary color (HSL format) | `217 91% 60%` |
| `--color-secondary` | Secondary color (HSL format) | `160 84% 39%` |

### 4. Usage Across All Pages

These CSS variables are used throughout the **entire application**:

#### Dashboard Components
- **KPICard**: Uses `rgb(var(--color-primary-rgb))` for gradients and icons
- **RevenueChart**: Uses `rgb(var(--color-primary-rgb))` for chart lines
- **AIAssistant**: Uses `rgb(var(--color-primary-rgb))` for AI icon and input focus
- **DashboardHeader**: Uses `rgb(var(--color-primary-rgb))` for buttons and badges
- **TransactionTable**: Uses `rgb(var(--color-primary-rgb))` for loading spinner

## Pages Affected

### ✅ ALL Pages Use Branding

| Page Category | Branding Applied |
|---------------|------------------|
| **Landing Page** | ✅ Yes - via CSS variables |
| **Login Page** | ✅ Yes - via CSS variables |
| **Dashboard** | ✅ Yes - heavily used |
| **Inventory** | ✅ Yes - via global styles |
| **Services** | ✅ Yes - via global styles |
| **Sales** | ✅ Yes - via global styles |
| **Reports** | ✅ Yes - via global styles |
| **Users** | ✅ Yes - via global styles |
| **Settings** | ✅ Yes - via global styles |
| **Customer Portal** | ✅ Yes - via global styles |
| **SuperAdmin** | ✅ Yes - via global styles |

## Multi-Tenancy Support

The branding system supports **multi-tenancy** via subdomains:

| Domain | Shop | Branding |
|--------|------|----------|
| `mospams.shop` | Public landing | Default MoSPAMS branding |
| `admin.mospams.shop` | Platform admin | Default MoSPAMS branding |
| `joes-shop.mospams.shop` | Joe's Shop | Joe's custom branding |
| `mikes-garage.mospams.shop` | Mike's Garage | Mike's custom branding |

Each shop gets its own:
- Primary color
- Secondary color
- Logo
- Shop name (in page title)
- Favicon

## Conclusion

**Branding is NOT limited to the dashboard**—it's a **global system** that affects:
- Every page
- Every component
- Page title
- Favicon
- Theme color
- All gradients, buttons, icons, and accents

The branding is applied via CSS custom properties at the root level, making it available to the entire application without any additional configuration needed in individual components.
