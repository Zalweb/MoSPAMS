# MoSPAMS Quick Reference Card

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| Main Site | https://mospams.shop |
| API Backend | https://api.mospams.shop |
| SuperAdmin Portal | https://admin.mospams.shop |
| Shop Example | https://motoworks.mospams.shop |

---

## 🔑 SSH Access

```bash
# Connect to AWS server
ssh ubuntu@YOUR_AWS_IP

# Or use Lightsail browser SSH
# Go to: https://lightsail.aws.amazon.com
```

---

## 📁 Important Paths

```bash
# Backend root
/var/www/mospams/Backend

# Laravel logs
/var/www/mospams/Backend/storage/logs/laravel.log

# Nginx config
/etc/nginx/sites-available/mospams

# Nginx logs
/var/log/nginx/error.log
/var/log/nginx/access.log

# Backups
/var/backups/mospams
```

---

## 🛠️ Common Commands

### Laravel

```bash
# Navigate to backend
cd /var/www/mospams/Backend

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Check logs
tail -f storage/logs/laravel.log

# Open Tinker (Laravel console)
php artisan tinker
```

### Nginx

```bash
# Test configuration
sudo nginx -t

# Reload (no downtime)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### MySQL

```bash
# Connect to database
sudo mysql -u mospams_user -p mospams_production

# Backup database
mysqldump -u mospams_user -p mospams_production > backup.sql

# Restore database
mysql -u mospams_user -p mospams_production < backup.sql
```

### Supervisor (Queue Workers)

```bash
# Check status
sudo supervisorctl status

# Restart workers
sudo supervisorctl restart mospams-worker:*

# Stop workers
sudo supervisorctl stop mospams-worker:*

# Start workers
sudo supervisorctl start mospams-worker:*

# View logs
sudo tail -f /var/www/mospams/Backend/storage/logs/worker.log
```

### SSL Certificates

```bash
# Renew SSL (auto-renews, but manual if needed)
sudo certbot renew

# Check certificate expiry
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🗄️ Database Operations

### Create New Shop

```bash
cd /var/www/mospams/Backend
php artisan tinker
```

```php
$activeStatusId = DB::table('shop_statuses')->where('status_code', 'active')->value('shop_status_id');

DB::table('shops')->insert([
    'shop_name' => 'New Shop Name',
    'subdomain' => 'newshop',
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

// Get invitation code
DB::table('shops')->where('subdomain', 'newshop')->value('invitation_code');
```

### List All Shops

```php
DB::table('shops')->select('shop_id', 'shop_name', 'subdomain', 'invitation_code')->get();
```

### Suspend Shop

```php
$suspendedStatusId = DB::table('shop_statuses')->where('status_code', 'suspended')->value('shop_status_id');
DB::table('shops')->where('subdomain', 'shopname')->update(['shop_status_id_fk' => $suspendedStatusId]);
```

### Activate Shop

```php
$activeStatusId = DB::table('shop_statuses')->where('status_code', 'active')->value('shop_status_id');
DB::table('shops')->where('subdomain', 'shopname')->update(['shop_status_id_fk' => $activeStatusId]);
```

---

## 🔍 Troubleshooting

### Check if services are running

```bash
# PHP-FPM
sudo systemctl status php8.3-fpm

# Nginx
sudo systemctl status nginx

# MySQL
sudo systemctl status mysql

# Supervisor
sudo systemctl status supervisor
```

### Restart all services

```bash
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
sudo systemctl restart mysql
sudo supervisorctl restart all
```

### Check disk space

```bash
df -h
```

### Check memory usage

```bash
free -h
```

### Check Laravel queue jobs

```bash
cd /var/www/mospams/Backend
php artisan queue:failed  # Show failed jobs
php artisan queue:retry all  # Retry failed jobs
```

### View real-time logs

```bash
# Laravel
tail -f /var/www/mospams/Backend/storage/logs/laravel.log

# Nginx error
sudo tail -f /var/log/nginx/error.log

# Nginx access
sudo tail -f /var/log/nginx/access.log

# PHP-FPM
sudo tail -f /var/log/php8.3-fpm.log
```

---

## 🚀 Deployment Updates

### Update Backend Code

```bash
cd /var/www/mospams/Backend
git pull origin main
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload php8.3-fpm
```

### Update Frontend (Vercel)

```bash
# On local machine
cd Frontend
git add .
git commit -m "Update message"
git push origin main

# Vercel auto-deploys on push
# Check: https://vercel.com/dashboard
```

---

## 📊 Monitoring

### Check API health

```bash
curl https://api.mospams.shop/api/shop/info
```

### Check database connection

```bash
cd /var/www/mospams/Backend
php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database connected!';"
```

### Check queue workers

```bash
sudo supervisorctl status mospams-worker:*
```

---

## 🔐 Security

### Update system packages

```bash
sudo apt update
sudo apt upgrade -y
```

### Check firewall

```bash
sudo ufw status
```

### Review failed login attempts

```bash
sudo grep "Failed password" /var/log/auth.log | tail -20
```

---

## 📞 Emergency Contacts

- **AWS Support:** https://console.aws.amazon.com/support
- **Vercel Support:** https://vercel.com/support
- **Hostinger Support:** https://www.hostinger.com/contact

---

## 💾 Backup & Restore

### Manual Backup

```bash
# Run backup script
sudo /usr/local/bin/backup-mospams.sh

# List backups
ls -lh /var/backups/mospams/
```

### Restore from Backup

```bash
# Restore database
mysql -u mospams_user -p mospams_production < /var/backups/mospams/db_YYYYMMDD_HHMMSS.sql

# Restore files
tar -xzf /var/backups/mospams/files_YYYYMMDD_HHMMSS.tar.gz -C /
```

---

## 📈 Performance

### Clear all caches

```bash
cd /var/www/mospams/Backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
sudo systemctl reload php8.3-fpm
sudo systemctl reload nginx
```

### Optimize for production

```bash
cd /var/www/mospams/Backend
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

**Keep this card handy for quick reference! 📋**
