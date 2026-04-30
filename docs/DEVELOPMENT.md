# MoSPAMS Development

## Backend

Start MySQL:

```powershell
docker compose up -d db
```

The project maps MySQL to host port `3307` because port `3306` may already be used by a local MySQL service.

Run Laravel migrations with the PHP runtime that has the required extensions. If `pdo_mysql` is not enabled by default, load it explicitly:

```powershell
cd Backend
& 'C:\Users\frien\Documents\Web Technology Files\MoSPAMS\.tools\php\runtime\php.exe' -d extension=pdo_mysql artisan migrate:fresh --seed
& 'C:\Users\frien\Documents\Web Technology Files\MoSPAMS\.tools\php\runtime\php.exe' -d extension=pdo_mysql -S 127.0.0.1:8001 -t public
```

Or start MySQL, run non-destructive migrations, and serve the API with:

```powershell
.\scripts\start-backend.ps1
```

Default local development accounts:

- `admin@mospams.com` / `password`
- `staff@mospams.com` / `password`

## Frontend

Copy `Frontend/.env.example` to `Frontend/.env` if needed and keep:

```text
VITE_API_BASE_URL=http://127.0.0.1:8001
```

## Vercel frontend to local backend through ngrok

Start the local backend:

```powershell
.\scripts\start-backend.ps1
```

In another PowerShell window, start the tunnel:

```powershell
.\scripts\start-ngrok.ps1
```

Copy the printed `https://...ngrok-free.app` URL to Vercel as `VITE_API_BASE_URL`, then redeploy the frontend. Vite reads `VITE_API_BASE_URL` at build time, so if the free ngrok URL changes, update the Vercel environment variable and redeploy again.

The Laravel CORS config allows the production Vercel frontend origin by default:

```text
https://mospams-frontend.vercel.app
```
