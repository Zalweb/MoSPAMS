# MoSPAMS Production Deployment Guide
## Domain: mospams.shop | DNS: Hostinger | Backend: AWS | Frontend: Vercel

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     mospams.shop (Hostinger DNS)            │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │   Frontend     │         │    Backend     │
        │   (Vercel)     │────────▶│   (AWS EC2)    │
        │                │   API   │                │
        │ *.mospams.shop │  Calls  │ api.mospams.shop│
        └────────────────┘         └────────────────┘
             │                              │
             │                              │
        Subdomains:                    MySQL DB
        - motoworks.mospams.shop       (Same server)
        - speedzone.mospams.shop
        - admin.mospams.shop
```

---

## Phase 1: Hostinger DNS Configuration

### Step 1.1: Login to Hostinger

1. Go to https://hostinger.com
2. Login to your account
3. Go to **Domains** → Select `mospams.shop`
4. Click **DNS / Name Servers**

### Step 1.2: Add DNS Records

**Wait to add these AFTER you have your AWS server IP!**

```
Type    Name                Value                       TTL
─────────────────────────────────────────────────────────────
A       @                   YOUR_AWS_IP                 3600
A       api                 YOUR_AWS_IP                 3600
A       *                   76.76.21.21 (Vercel)        3600
CNAME   www                 cname.vercel-dns.com        3600
```

**Explanation:**
- `@` → Main domain points to AWS (for backend)
- `api` → API subdomain points to AWS
- `*` → Wildcard for all shop subdomains points to Vercel
- `www` → CNAME to Vercel

### Step 1.3: Verify DNS Propagation

After adding records, wait 5-60 minutes, then check:
```bash
nslookup api.mospams.shop
nslookup motoworks.mospams.shop
```

---

## Phase 2: AWS Backend Setup

### Option A: AWS Lightsail (Recommended - Cheaper)

**Cost:** $5/month for 1GB RAM, 1 vCPU, 40GB SSD

#### Step 2A.1: Create Lightsail Instance

1. Go to https://lightsail.aws.amazon.com
2. Click **Create instance**
3. Select:
   - Platform: **Linux/Unix**
   - Blueprint: **OS Only** → **Ubuntu 22.04 LTS**
   - Plan: **$5/month** (1GB RAM)
   - Instance name: `mospams-backend`
4. Click **Create instance**
5. Wait 2-3 minutes for instance to start

#### Step 2A.2: Get Static IP

1. In Lightsail, go to **Networking** tab
2. Click **Create static IP**
3. Attach to `mospams-backend` instance
4. Name it: `mospams-static-ip`
5. **Copy the IP address** (e.g., `54.123.45.67`)

**NOW GO BACK TO HOSTINGER AND ADD THIS IP TO DNS RECORDS!**

#### Step 2A.3: Configure Firewall

1. In Lightsail instance, go to **Networking** tab
2. Under **Firewall**, add these rules:

```
Application     Protocol    Port range
─────────────────────────────────────
SSH             TCP         22
HTTP            TCP         80
HTTPS           TCP         443
Custom          TCP         8000        (Laravel dev - remove later)
MySQL           TCP         3306        (Only if external access needed)
```

#### Step 2A.4: Connect to Server

1. Click **Connect using SSH** (browser-based terminal)
2. Or use your own SSH client:
   ```bash
   ssh ubuntu@YOUR_AWS_IP
   ```

### Option B: AWS EC2 (More Control)

**Cost:** ~$10-15/month for t3.micro

1. Go to AWS EC2 Console
2. Launch instance with Ubuntu 22.04
3. Choose t3.micro (free tier eligible)
4. Configure security group (same ports as above)
5. Create/download key pair
6. Allocate Elastic IP
7. Connect via SSH

---

## Phase 3: Server Setup (Ubuntu 22.04)

### Step 3.1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3.2: Install PHP 8.3

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3 php8.3-cli php8.3-fpm php8.3-mysql php8.3-xml php8.3-mbstring php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd php8.3-intl
```

Verify:
```bash
php -v
# Should show: PHP 8.3.x
```

### Step 3.3: Install Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

### Step 3.4: Install MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

**During setup:**
- Set root password: `YOUR_STRONG_PASSWORD`
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

### Step 3.5: Create Database

```bash
sudo mysql -u root -p
```

In MySQL console:
```sql
CREATE DATABASE mospams_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mospams_user'@'localhost' IDENTIFIED BY 'YOUR_DB_PASSWORD';
GRANT ALL PRIVILEGES ON mospams_production.* TO 'mospams_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3.6: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Test: Visit `http://YOUR_AWS_IP` - should see Nginx welcome page

### Step 3.7: Install Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Phase 4: Deploy Backend

### Step 4.1: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/MoSPAMS.git mospams
sudo chown -R $USER:$USER /var/www/mospams
cd /var/www/mospams/Backend
```

### Step 4.2: Install Dependencies

```bash
composer install --optimize-autoloader --no-dev
```

### Step 4.3: Configure Environment

```bash
cp .env.example .env.production
nano .env.production
```

**Production `.env` content:**
```env
APP_NAME=MoSPAMS
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://api.mospams.shop

FRONTEND_URL=https://mospams.shop
FRONTEND_URL_PATTERN=https://*.mospams.shop

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mospams_production
DB_USERNAME=mospams_user
DB_PASSWORD=YOUR_DB_PASSWORD

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.mospams.shop

SANCTUM_STATEFUL_DOMAINS=mospams.shop,*.mospams.shop

# Tenancy Configuration
TENANCY_ENFORCEMENT_MODE=enforce
TENANCY_BASE_DOMAIN=mospams.shop
TENANCY_ALLOW_LOCALHOST_FALLBACK=false
DEFAULT_SHOP_SUBDOMAIN=default

CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=noreply@mospams.shop
MAIL_PASSWORD=YOUR_EMAIL_PASSWORD
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@mospams.shop
MAIL_FROM_NAME="${APP_NAME}"
```

### Step 4.4: Generate App Key

```bash
php artisan key:generate --env=production
```

### Step 4.5: Run Migrations

```bash
php artisan migrate --env=production --force
php artisan db:seed --env=production --force
```

### Step 4.6: Optimize Laravel

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Step 4.7: Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/mospams/Backend/storage
sudo chown -R www-data:www-data /var/www/mospams/Backend/bootstrap/cache
sudo chmod -R 775 /var/www/mospams/Backend/storage
sudo chmod -R 775 /var/www/mospams/Backend/bootstrap/cache
```

---

## Phase 5: Nginx Configuration

### Step 5.1: Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/mospams
```

**Content:**
```nginx
server {
    listen 80;
    server_name api.mospams.shop;
    
    root /var/www/mospams/Backend/public;
    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Step 5.2: Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/mospams /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5.3: Get SSL Certificate

```bash
sudo certbot --nginx -d api.mospams.shop
```

Follow prompts:
- Email: `your-email@example.com`
- Agree to terms: **Yes**
- Redirect HTTP to HTTPS: **Yes**

Test: Visit `https://api.mospams.shop/api/shop/info`

---

## Phase 6: Vercel Frontend Deployment

### Step 6.1: Prepare Frontend

Update `Frontend/.env.production`:
```env
VITE_API_BASE_URL=https://api.mospams.shop
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

### Step 6.2: Push to GitHub

```bash
cd Frontend
git add .
git commit -m "Production configuration"
git push origin main
```

### Step 6.3: Deploy to Vercel

1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `Frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     ```
     VITE_API_BASE_URL=https://api.mospams.shop
     VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
     ```
5. Click **Deploy**

### Step 6.4: Add Custom Domains in Vercel

1. In Vercel project, go to **Settings** → **Domains**
2. Add these domains:
   ```
   mospams.shop
   www.mospams.shop
   *.mospams.shop
   ```
3. Vercel will show DNS records to add

### Step 6.5: Update Hostinger DNS (Final)

Go back to Hostinger DNS and ensure:
```
Type    Name                Value                       TTL
─────────────────────────────────────────────────────────────
A       @                   YOUR_AWS_IP                 3600
A       api                 YOUR_AWS_IP                 3600
A       *                   76.76.21.21                 3600
CNAME   www                 cname.vercel-dns.com        3600
```

**Note:** Vercel will provide exact IPs/CNAMEs in their dashboard.

---

## Phase 7: Testing

### Test 1: Backend API
```bash
curl https://api.mospams.shop/api/shop/info
```
Should return shop info JSON.

### Test 2: Frontend (Main)
Visit: `https://mospams.shop`
Should show landing page.

### Test 3: Shop Subdomains
Visit: `https://motoworks.mospams.shop`
Should show MotoWorks branded landing page.

### Test 4: SuperAdmin
Visit: `https://admin.mospams.shop`
Login with SuperAdmin credentials.

### Test 5: Cross-Shop Isolation
1. Login to `https://motoworks.mospams.shop`
2. Create a part
3. Login to `https://speedzone.mospams.shop`
4. Verify part doesn't appear (data isolated)

---

## Phase 8: Production Shops Setup

### Create Real Shops

```bash
ssh ubuntu@YOUR_AWS_IP
cd /var/www/mospams/Backend
php artisan tinker
```

In Tinker:
```php
$activeStatusId = DB::table('shop_statuses')->where('status_code', 'active')->value('shop_status_id');

DB::table('shops')->insert([
    'shop_name' => 'MotoWorks Repair Shop',
    'subdomain' => 'motoworks',
    'invitation_code' => strtoupper(Str::random(8)),
    'shop_status_id_fk' => $activeStatusId,
    'primary_color' => '#3b82f6',
    'secondary_color' => '#1e40af',
    'business_hours' => json_encode([
        'monday' => ['open' => '08:00', 'close' => '18:00'],
        'tuesday' => ['open' => '08:00', 'close' => '18:00'],
        'wednesday' => ['open' => '08:00', 'close' => '18:00'],
        'thursday' => ['open' => '08:00', 'close' => '18:00'],
        'friday' => ['open' => '08:00', 'close' => '18:00'],
        'saturday' => ['open' => '08:00', 'close' => '16:00'],
        'sunday' => ['closed' => true]
    ]),
    'created_at' => now(),
    'updated_at' => now()
]);

echo "Shop created! Invitation code: " . DB::table('shops')->where('subdomain', 'motoworks')->value('invitation_code');
```

---

## Phase 9: Monitoring & Maintenance

### Setup Process Manager (Keep Laravel Running)

```bash
sudo apt install -y supervisor
sudo nano /etc/supervisor/conf.d/mospams.conf
```

**Content:**
```ini
[program:mospams-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/mospams/Backend/artisan queue:work --sleep=3 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/mospams/Backend/storage/logs/worker.log
```

Start:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mospams-worker:*
```

### Setup Automatic Backups

```bash
sudo nano /usr/local/bin/backup-mospams.sh
```

**Content:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mospams"
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u mospams_user -pYOUR_DB_PASSWORD mospams_production > $BACKUP_DIR/db_$DATE.sql

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/mospams/Backend/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/backup-mospams.sh
```

Add to crontab (daily at 2 AM):
```bash
sudo crontab -e
```
Add line:
```
0 2 * * * /usr/local/bin/backup-mospams.sh
```

---

## Cost Breakdown

| Service | Plan | Cost/Month |
|---------|------|------------|
| Domain (mospams.shop) | Hostinger | ₱500-800/year (~₱50/month) |
| AWS Lightsail | 1GB RAM | $5 (~₱280) |
| Vercel | Free tier | FREE |
| **Total** | | **~₱330/month** |

---

## Security Checklist

- ✅ SSL certificates installed (HTTPS)
- ✅ Firewall configured (only necessary ports open)
- ✅ Database password strong and secure
- ✅ APP_DEBUG=false in production
- ✅ File permissions set correctly
- ✅ Regular backups scheduled
- ✅ Supervisor monitoring Laravel queue
- ✅ Nginx security headers added

---

## Troubleshooting

### Issue: "502 Bad Gateway"
**Solution:**
```bash
sudo systemctl status php8.3-fpm
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
```

### Issue: Database connection failed
**Solution:**
```bash
sudo mysql -u root -p
SHOW DATABASES;
SHOW GRANTS FOR 'mospams_user'@'localhost';
```

### Issue: CORS errors
**Solution:**
Check `Backend/config/cors.php` includes production domains.

### Issue: Vercel deployment failed
**Solution:**
Check build logs in Vercel dashboard, verify environment variables.

---

## Next Steps

1. ✅ Complete DNS setup in Hostinger
2. ✅ Launch AWS Lightsail instance
3. ✅ Follow server setup steps
4. ✅ Deploy backend to AWS
5. ✅ Deploy frontend to Vercel
6. ✅ Test all subdomains
7. ✅ Create production shops
8. ✅ Setup monitoring & backups

---

## Support

If you encounter issues:
- Check Laravel logs: `/var/www/mospams/Backend/storage/logs/laravel.log`
- Check Nginx logs: `/var/log/nginx/error.log`
- Check PHP-FPM logs: `/var/log/php8.3-fpm.log`

Good luck with your deployment! 🚀
