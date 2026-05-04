# MoSPAMS Production Deployment Guide

## Prerequisites

- PHP 8.3+
- MySQL 8.0+
- Redis (recommended)
- Node.js 18+
- Composer
- SSL Certificate
- Domain name

## Backend Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.3 and extensions
sudo apt install php8.3 php8.3-fpm php8.3-mysql php8.3-redis php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd

# Install MySQL
sudo apt install mysql-server

# Install Redis
sudo apt install redis-server

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/MoSPAMS.git
cd MoSPAMS/Backend

# Install dependencies
composer install --optimize-autoloader --no-dev

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 3. Configure Environment

Edit `.env` file:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_DATABASE=mospams_production
DB_USERNAME=mospams_user
DB_PASSWORD=your_secure_password

CACHE_STORE=redis
QUEUE_CONNECTION=redis

FRONTEND_URL=https://yourdomain.com

CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
CORS_ALLOWED_ORIGINS_PATTERNS="/^https:\\/\\/[a-z0-9-]+\\.yourdomain\\.com$/"

# Configure other settings...
```

### 4. Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE mospams_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mospams_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON mospams_production.* TO 'mospams_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run migrations
php artisan migrate --force

# Seed initial data (optional)
php artisan db:seed --force
```

### 5. Optimize for Production

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer dump-autoload --optimize
```

### 6. Set Permissions

```bash
# Set ownership
sudo chown -R www-data:www-data storage bootstrap/cache

# Set permissions
sudo chmod -R 775 storage bootstrap/cache
```

### 7. Configure Web Server (Nginx)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    root /var/www/MoSPAMS/Backend/public;
    index index.php;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

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

### 8. Setup Queue Worker

```bash
# Create supervisor config
sudo nano /etc/supervisor/conf.d/mospams-worker.conf
```

```ini
[program:mospams-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/MoSPAMS/Backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/MoSPAMS/Backend/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
# Start supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mospams-worker:*
```

### 9. Setup Cron Jobs

```bash
# Edit crontab
sudo crontab -e -u www-data

# Add Laravel scheduler
* * * * * cd /var/www/MoSPAMS/Backend && php artisan schedule:run >> /dev/null 2>&1
```

## Frontend Deployment (Vercel)

### 1. Build Configuration

Create `vercel.json` in Frontend directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. Environment Variables

In Vercel dashboard, add:

```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_PLATFORM_ADMIN_HOSTS=admin.yourdomain.com
VITE_PUBLIC_HOSTS=yourdomain.com
VITE_TENANT_HOSTS=*.yourdomain.com
```

### 3. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd Frontend
vercel --prod
```

### 4. Configure Custom Domain

1. Go to Vercel dashboard
2. Add custom domain: `yourdomain.com`
3. Add DNS records as instructed by Vercel

## Post-Deployment

### 1. Security Checklist

- [ ] SSL certificates installed and working
- [ ] Firewall configured (UFW/iptables)
- [ ] Database password is strong
- [ ] APP_KEY is generated and secure
- [ ] APP_DEBUG=false
- [ ] File permissions are correct
- [ ] Sensitive files are not publicly accessible
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

### 2. Monitoring Setup

```bash
# Install monitoring tools
sudo apt install htop iotop

# Setup log rotation
sudo nano /etc/logrotate.d/mospams
```

```
/var/www/MoSPAMS/Backend/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### 3. Backup Setup

```bash
# Create backup script
sudo nano /usr/local/bin/mospams-backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mospams"
DB_NAME="mospams_production"
DB_USER="mospams_user"
DB_PASS="your_secure_password"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/MoSPAMS/Backend/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/mospams-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/mospams-backup.sh >> /var/log/mospams-backup.log 2>&1
```

### 4. Health Checks

```bash
# Check application status
php artisan about

# Check queue workers
sudo supervisorctl status

# Check logs
tail -f storage/logs/laravel.log

# Check Redis
redis-cli ping

# Check MySQL
mysql -u mospams_user -p -e "SELECT 1"
```

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check `storage/logs/laravel.log`
   - Verify file permissions
   - Clear cache: `php artisan cache:clear`

2. **CORS Errors**
   - Verify CORS_ALLOWED_ORIGINS in `.env`
   - Check frontend URL matches exactly
   - Clear config cache: `php artisan config:clear`

3. **Database Connection Failed**
   - Verify database credentials
   - Check MySQL is running: `sudo systemctl status mysql`
   - Test connection: `php artisan tinker` then `DB::connection()->getPdo();`

4. **Queue Jobs Not Processing**
   - Check supervisor status: `sudo supervisorctl status`
   - Restart workers: `sudo supervisorctl restart mospams-worker:*`
   - Check logs: `tail -f storage/logs/worker.log`

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Update dependencies
composer install --optimize-autoloader --no-dev

# Run migrations
php artisan migrate --force

# Clear and cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart queue workers
sudo supervisorctl restart mospams-worker:*
```

### Database Maintenance

```bash
# Optimize tables
php artisan db:optimize

# Clear old sessions
php artisan session:gc

# Clear old cache
php artisan cache:prune-stale-tags
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/MoSPAMS/issues
- Documentation: https://docs.yourdomain.com
- Email: support@yourdomain.com
