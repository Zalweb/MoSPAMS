  # MoSPAMS Production Deployment Checklist
## Domain: mospams.shop

---

## Pre-Deployment

- [ ] Domain purchased: `mospams.shop` ✅
- [ ] Hostinger account access confirmed
- [ ] AWS account created
- [ ] Vercel account created
- [ ] GitHub repository ready

---

## Phase 1: AWS Server Setup (30-45 minutes)

- [ ] Create AWS Lightsail instance (Ubuntu 22.04, $5/month plan)
- [ ] Allocate static IP address
- [ ] Configure firewall (ports 22, 80, 443, 8000)
- [ ] Connect via SSH
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install PHP 8.3 + extensions
- [ ] Install Composer
- [ ] Install MySQL
- [ ] Create database: `mospams_production`
- [ ] Create database user: `mospams_user`
- [ ] Install Nginx
- [ ] Install Certbot (SSL)

**Server IP:** `_________________` (Write it down!)

---

## Phase 2: Hostinger DNS Configuration (10 minutes)

Login to Hostinger → Domains → mospams.shop → DNS

Add these records:

- [ ] A record: `@` → `YOUR_AWS_IP`
- [ ] A record: `api` → `YOUR_AWS_IP`
- [ ] A record: `*` → `76.76.21.21` (Vercel IP)
- [ ] CNAME: `www` → `cname.vercel-dns.com`

**Wait 5-60 minutes for DNS propagation**

Test with: `nslookup api.mospams.shop`

---

## Phase 3: Backend Deployment (20-30 minutes)

On AWS server:

- [ ] Clone repository: `git clone https://github.com/YOUR_USERNAME/MoSPAMS.git /var/www/mospams`
- [ ] Navigate to Backend: `cd /var/www/mospams/Backend`
- [ ] Install dependencies: `composer install --optimize-autoloader --no-dev`
- [ ] Copy production env: `cp .env.production .env`
- [ ] Edit `.env` with database credentials
- [ ] Confirm tenancy host envs:
  - `TENANCY_PLATFORM_HOSTS=admin.mospams.shop`
  - `TENANCY_PUBLIC_HOSTS=mospams.shop`
  - `TENANCY_API_HOSTS=api.mospams.shop`
- [ ] Generate app key: `php artisan key:generate`
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Run seeders: `php artisan db:seed --force`
- [ ] Cache config: `php artisan config:cache`
- [ ] Cache routes: `php artisan route:cache`
- [ ] Set permissions: `sudo chown -R www-data:www-data storage bootstrap/cache`
- [ ] Configure Nginx (see guide)
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/mospams /etc/nginx/sites-enabled/`
- [ ] Test Nginx: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Get SSL: `sudo certbot --nginx -d api.mospams.shop`

**Test:** Visit `https://api.mospams.shop/api/shop/info`

---

## Phase 4: Frontend Deployment (15 minutes)

On your local machine:

- [ ] Update `Frontend/.env.production` with API URL
- [ ] Set `VITE_PLATFORM_ADMIN_HOSTS=admin.mospams.shop`
- [ ] Set `VITE_PUBLIC_HOSTS=mospams.shop`
- [ ] Commit and push to GitHub
- [ ] Login to Vercel: https://vercel.com
- [ ] Import GitHub repository
- [ ] Configure project:
  - Framework: Vite
  - Root Directory: `Frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Add environment variables in Vercel
- [ ] Deploy
- [ ] Add custom domains in Vercel:
  - `mospams.shop`
  - `www.mospams.shop`
  - `*.mospams.shop`
- [ ] Update Hostinger DNS with Vercel's exact records (if different)

**Test:** Visit `https://mospams.shop`

---

## Phase 5: Production Testing (15 minutes)

- [ ] Test main site: `https://mospams.shop`
- [ ] Test API: `https://api.mospams.shop/api/shop/info`
- [ ] Test SuperAdmin login: `https://admin.mospams.shop`
- [ ] Create test shop via SuperAdmin
- [ ] Test shop subdomain: `https://testshop.mospams.shop`
- [ ] Test shop login
- [ ] Test data isolation (create part in one shop, verify not in another)
- [ ] Test cross-shop login prevention

---

## Phase 6: Production Setup (20 minutes)

On AWS server:

- [ ] Setup Supervisor for queue workers
- [ ] Setup daily backups (cron job)
- [ ] Create real shops via Tinker
- [ ] Create shop owner accounts
- [ ] Send invitation codes to shop owners
- [ ] Configure email settings (Hostinger SMTP)
- [ ] Test email sending

---

## Phase 7: Monitoring & Security (10 minutes)

- [ ] Verify SSL certificates are active (HTTPS)
- [ ] Check firewall rules
- [ ] Verify `APP_DEBUG=false` in production
- [ ] Test backup script
- [ ] Setup uptime monitoring (optional: UptimeRobot)
- [ ] Document all passwords securely

---

## Post-Deployment

- [ ] Share shop invitation codes with clients
- [ ] Monitor Laravel logs: `/var/www/mospams/Backend/storage/logs/laravel.log`
- [ ] Monitor Nginx logs: `/var/log/nginx/error.log`
- [ ] Check Vercel deployment logs
- [ ] Test all features end-to-end

---

## Credentials to Save Securely

```
AWS Server:
- IP: _________________
- SSH User: ubuntu
- SSH Key: _________________

Database:
- Host: 127.0.0.1
- Database: mospams_production
- Username: mospams_user
- Password: _________________

SuperAdmin:
- Email: superadmin@mospams.shop
- Password: _________________

Hostinger Email:
- Email: noreply@mospams.shop
- Password: _________________

Vercel:
- Project: _________________
- Team: _________________
```

---

## Estimated Total Time: 2-3 hours

## Estimated Monthly Cost: ~₱330/month
- Domain: ~₱50/month
- AWS Lightsail: ~₱280/month
- Vercel: FREE

---

## Emergency Contacts

- AWS Support: https://console.aws.amazon.com/support
- Vercel Support: https://vercel.com/support
- Hostinger Support: https://www.hostinger.com/contact

---

## Rollback Plan

If deployment fails:

1. Keep local development running
2. Debug using Laravel logs
3. Test API endpoints with Postman
4. Verify DNS records in Hostinger
5. Check Nginx configuration
6. Verify database connection

---

## Success Criteria

✅ All subdomains accessible via HTTPS
✅ SuperAdmin can login and manage shops
✅ Shop owners can login to their subdomains
✅ Data is isolated between shops
✅ Cross-shop login is prevented
✅ Email notifications work
✅ Backups are running daily

---

**Good luck with your deployment! 🚀**

For detailed steps, see: `PRODUCTION_DEPLOYMENT_GUIDE.md`
