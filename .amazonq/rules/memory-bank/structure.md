# MoSPAMS - Project Structure

## Repository Layout

```
MoSPAMS/
├── Backend/              # Laravel PHP API
├── Frontend/             # React + TypeScript SPA
├── docs/                 # Project documentation
│   ├── PROJECT_MEMORY.md # Product direction and role definitions
│   └── DEVELOPMENT.md    # Development notes
├── scripts/              # PowerShell utility scripts
├── .github/workflows/    # CI pipeline
├── docker-compose.yml    # Local MySQL + services orchestration
├── CLAUDE.md             # Agent rules and stack constraints
└── AGENTS.md             # Agent configuration
```

## Backend Structure (`Backend/`)

```
Backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── MospamsController.php   # Main resource controller (parts, services, transactions, users, reports)
│   │   │   ├── AuthController.php      # Login, logout, /me
│   │   │   ├── GoogleAuthController.php # Google OAuth login/register
│   │   │   ├── CustomerController.php  # Customer-specific endpoints
│   │   │   └── RoleRequestController.php # Role upgrade request workflow
│   │   └── Middleware/
│   │       └── RoleMiddleware.php      # Role-based route protection
│   ├── Models/
│   │   ├── User.php          # Auth user with role and status
│   │   ├── Part.php          # Inventory parts
│   │   ├── Category.php      # Part categories
│   │   ├── ServiceJob.php    # Service jobs
│   │   ├── ServiceType.php   # Service type catalog
│   │   ├── Sale.php          # Sales/transactions
│   │   ├── Role.php          # Role definitions
│   │   ├── RoleRequest.php   # Role upgrade requests
│   │   ├── Mechanic.php      # Mechanic profiles
│   │   ├── Customer.php      # Customer profiles
│   │   └── UserStatus.php    # User status enum/model
│   └── Providers/
│       └── AppServiceProvider.php
├── config/               # Laravel config files (cors, database, auth, etc.)
├── database/
│   ├── migrations/       # Schema migrations
│   ├── seeders/          # Database seeders
│   └── factories/        # Model factories for testing
├── routes/
│   ├── api.php           # All API routes (auth:sanctum protected)
│   └── web.php           # Minimal web routes
├── tests/
│   ├── Feature/          # Feature/integration tests
│   └── Unit/             # Unit tests
├── .env                  # Environment variables
├── composer.json         # PHP dependencies
└── Dockerfile            # Container definition
```

## Frontend Structure (`Frontend/`)

```
Frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx       # Root component, routing, providers
│   │   └── main.tsx      # Entry point
│   ├── features/         # Feature-sliced architecture
│   │   ├── auth/         # Login, Google OAuth, AuthContext
│   │   ├── dashboard/    # Overview/stats page
│   │   ├── inventory/    # Parts and stock management
│   │   ├── services/     # Service jobs management
│   │   ├── sales/        # Transactions and payments
│   │   ├── reports/      # Sales, inventory, services, income reports
│   │   ├── users/        # User management and approvals
│   │   ├── customers/    # Customer portal (book, history, payments)
│   │   ├── roles/        # Role management
│   │   ├── activity-logs/# Audit log viewer
│   │   ├── settings/     # App settings
│   │   ├── layout/       # DashboardLayout shell
│   │   ├── landing/      # Public landing page
│   │   └── common/       # Shared UI (NotFound, etc.)
│   ├── shared/
│   │   ├── contexts/
│   │   │   └── DataContext.tsx  # Global data state (parts, services, transactions, etc.)
│   │   ├── hooks/
│   │   │   ├── useAdminStats.ts
│   │   │   ├── usePublicStats.ts
│   │   │   └── use-mobile.ts
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios/fetch API client
│   │   │   ├── permissions.ts  # Role permission helpers
│   │   │   ├── utils.ts        # General utilities
│   │   │   ├── csv.ts          # CSV export helpers
│   │   │   └── period.ts       # Date/period utilities
│   │   └── types/
│   │       └── index.ts        # Shared TypeScript types
│   └── components/ui/          # shadcn/ui base components
├── public/               # Static assets
├── ScrewFast/            # Astro-based landing page (separate sub-project)
├── galaxy/               # UI component reference library
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.ts        # Vite build config
└── Dockerfile            # Container definition
```

## Architectural Patterns

### Backend
- **MVC via Laravel**: Controllers handle HTTP, Models handle data, routes define API surface
- **Single Resource Controller**: `MospamsController` consolidates most domain operations
- **Role Middleware**: `role:Admin,Staff` middleware applied per-route for RBAC
- **Sanctum Auth**: Token-based authentication via `auth:sanctum` middleware
- **RESTful API**: Standard HTTP verbs (GET, POST, PATCH, DELETE) on resource endpoints

### Frontend
- **Feature-Sliced Architecture**: Code organized by business domain under `features/`
- **Context-based State**: `AuthContext` for auth state, `DataContext` for shared domain data
- **Route-level Guards**: `RequireAuth`, `RequireRole`, `RequireCustomer` components protect routes
- **shadcn/ui + Radix UI**: Accessible component primitives with Tailwind styling
- **React Hook Form + Zod**: Form handling with schema validation

### Cross-Cutting
- **CORS**: Configured for localhost dev and Vercel production origins
- **Docker Compose**: Local MySQL database orchestration
- **Vercel**: Frontend deployment target
