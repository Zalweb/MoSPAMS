# MoSPAMS - Technology Stack

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| PHP | ^8.3 | Runtime language |
| Laravel | ^13.0 | Web framework |
| Laravel Sanctum | ^4.3 | API token authentication |
| Laravel Tinker | ^3.0 | REPL for debugging |
| MySQL | Latest | Production database |
| SQLite | Bundled | Test/local fallback |

### Backend Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| PHPUnit | ^12.5 | Testing framework |
| Faker | ^1.23 | Test data generation |
| Laravel Pint | ^1.27 | PHP code style fixer |
| Mockery | ^1.6 | Mocking for tests |
| nunomaduro/collision | ^8.6 | Better error reporting |

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type-safe JavaScript |
| Vite | ^7.2.4 | Build tool and dev server |
| React Router | ^7.6.1 | Client-side routing |
| Tailwind CSS | ^3.4.19 | Utility-first CSS |

### UI Components
| Package | Version | Purpose |
|---------|---------|---------|
| Radix UI (full suite) | various | Accessible headless components |
| shadcn/ui pattern | - | Component library built on Radix |
| lucide-react | ^0.562.0 | Icon library |
| framer-motion | ^12.38.0 | Animations |
| next-themes | ^0.4.6 | Dark/light theme support |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.70.0 | Form state management |
| @hookform/resolvers | ^5.2.2 | Zod integration for forms |
| zod | ^4.3.5 | Schema validation |

### Data & Charts
| Package | Version | Purpose |
|---------|---------|---------|
| chart.js | ^4.5.1 | Chart rendering |
| react-chartjs-2 | ^5.3.1 | React wrapper for Chart.js |
| recharts | ^2.15.4 | React-native chart library |
| date-fns | ^4.1.0 | Date utilities |

### Auth
| Package | Version | Purpose |
|---------|---------|---------|
| @react-oauth/google | ^0.13.5 | Google OAuth integration |

### Notifications
| Package | Version | Purpose |
|---------|---------|---------|
| sonner | ^2.0.7 | Toast notifications |

## Infrastructure

| Tool | Purpose |
|------|---------|
| Docker Compose | Local MySQL database orchestration |
| Docker (Backend) | Backend containerization |
| Docker (Frontend) | Frontend containerization |
| Vercel | Frontend production deployment |
| GitHub Actions | CI pipeline (`.github/workflows/ci.yml`) |
| ngrok | Local backend tunneling for dev/testing |

## Development Commands

### Backend (run from `Backend/`)
```bash
# Install dependencies
composer install

# Start dev server (Laravel only)
php artisan serve

# Start full dev stack (server + queue + logs + vite)
composer run dev

# Run migrations
php artisan migrate

# Run tests
composer run test
# or
php artisan test

# Code style fix
./vendor/bin/pint

# Seed database
php artisan db:seed

# Create admin user (PowerShell)
../scripts/create-admin.ps1
```

### Frontend (run from `Frontend/`)
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

### Full Stack (from repo root)
```bash
# Start backend with ngrok tunnel
./scripts/start-fullstack-with-ngrok.ps1

# Start backend locally
./scripts/start-backend-local.ps1

# Start Docker services (MySQL)
docker-compose up -d
```

## Environment Variables

### Backend (`Backend/.env`)
```
APP_NAME=MoSPAMS
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mospams_db
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=https://mospams-frontend.vercel.app
FRONTEND_URL_PATTERN=

SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

### Frontend (`Frontend/.env`)
```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=
```

## Path Aliases
Frontend uses `@/` alias mapped to `Frontend/src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
