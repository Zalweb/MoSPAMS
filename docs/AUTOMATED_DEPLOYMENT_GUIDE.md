# Backend Deployment Guide - Automated Scripts

This guide shows you how to deploy the MoSPAMS backend to AWS Lightsail using automated scripts.

---

## Prerequisites

- AWS Lightsail instance running Ubuntu 22.04
- MobaXterm connected to the instance
- Static IP assigned to instance
- Domain: `mospams.shop` purchased

---

## Step 1: Upload Deployment Script

### Option A: Using MobaXterm File Transfer

1. In MobaXterm, you'll see a file browser on the left side
2. Navigate to `/home/ubuntu/`
3. Drag and drop `deploy-backend.sh` from your computer to MobaXterm
4. The file will upload automatically

### Option B: Using wget (Recommended)

After pushing scripts to GitHub:

```bash
cd ~
wget https://raw.githubusercontent.com/Zalweb/MoSPAMS/main/scripts/deploy-backend.sh
wget https://raw.githubusercontent.com/Zalweb/MoSPAMS/main/scripts/install-ssl.sh
wget https://raw.githubusercontent.com/Zalweb/MoSPAMS/main/scripts/update-backend.sh
chmod +x deploy-backend.sh install-ssl.sh update-backend.sh
```

---

## Step 2: Run Deployment Script

```bash
./deploy-backend.sh
```

### What the Script Does:

1. ✅ Updates system packages
2. ✅ Installs PHP 8.3 with all extensions
3. ✅ Installs Composer
4. ✅ Installs MySQL
5. ✅ Creates database and user (you'll be prompted for password)
6. ✅ Installs Nginx
7. ✅ Installs Git
8. ✅ Installs Certbot (for SSL)
9. ✅ Clones your repository
10. ✅ Installs Laravel dependencies
11. ✅ Configures environment (.env)
12. ✅ Sets file permissions
13. ✅ Runs migrations and seeders
14. ✅ Configures Nginx
15. ✅ Sets up queue worker

### During Execution:

You'll be prompted once:
```
Enter MySQL password for mospams_user: ********
Confirm MySQL password: ********
```

**Choose a strong password** and save it somewhere safe.

### Deployment Time:

- **Total:** 15-20 minutes
- Most time spent on: Installing packages and Composer dependencies

---

## Step 3: Configure DNS

After deployment completes, the script will show your server IP:

```
Points to: 54.123.45.67
```

### Add DNS Record in Hostinger:

1. Go to Hostinger DNS Manager
2. Add this record:
   ```
   Type: A
   Name: api
   Points to: 54.123.45.67 (your server IP)
   TTL: 3600
   ```
3. Click **"Save"**

### Wait for DNS Propagation:

```bash
# Check DNS propagation (run on your local computer)
nslookup api.mospams.shop
```

Wait until it returns your server IP (5-30 minutes).

---

## Step 4: Install SSL Certificate

After DNS has propagated:

```bash
./install-ssl.sh
```

### What This Does:

1. ✅ Checks DNS propagation
2. ✅ Installs Let's Encrypt SSL certificate
3. ✅ Configures Nginx for HTTPS
4. ✅ Sets up auto-renewal
5. ✅ Redirects HTTP to HTTPS

### SSL Installation Time:

- **Total:** 1-2 minutes

---

## Step 5: Test Deployment

### Test 1: Health Check

```bash
curl https://api.mospams.shop/up
```

**Expected:** `{"status":"ok"}`

### Test 2: Public Stats

```bash
curl https://api.mospams.shop/api/stats
```

**Expected:** JSON with statistics

### Test 3: From Browser

Open: https://mospams.shop

The frontend should load and fetch data from the API.

---

## Step 6: Login Credentials

### SuperAdmin Account:

```
Email: superadmin@mospams.com
Password: superadmin123
```

**Login at:** https://admin.mospams.shop

### Database Credentials:

```
Host: localhost
Database: mospams_db
Username: mospams_user
Password: [the password you entered during deployment]
```

---

## Future Updates

When you push code changes to GitHub:

```bash
./update-backend.sh
```

### What This Does:

1. ✅ Enables maintenance mode
2. ✅ Pulls latest code from GitHub
3. ✅ Updates dependencies
4. ✅ Runs new migrations
5. ✅ Clears and rebuilds caches
6. ✅ Restarts services
7. ✅ Disables maintenance mode

### Update Time:

- **Total:** 2-3 minutes

---

## Useful Commands

### View Logs

```bash
# Laravel application logs
tail -f /var/www/mospams-backend/Backend/storage/logs/laravel.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Queue worker logs
sudo tail -f /var/www/mospams-backend/Backend/storage/logs/worker.log
```

### Restart Services

```bash
# Restart all services
sudo systemctl restart nginx
sudo systemctl restart php8.3-fpm
sudo supervisorctl restart mospams-worker:*
```

### Check Service Status

```bash
# Check Nginx
sudo systemctl status nginx

# Check PHP-FPM
sudo systemctl status php8.3-fpm

# Check queue workers
sudo supervisorctl status
```

### Database Access

```bash
# Connect to MySQL
mysql -u mospams_user -p mospams_db

# Run artisan commands
cd /var/www/mospams-backend/Backend
php artisan tinker
```

---

## Troubleshooting

### Issue: Script fails with "Permission denied"

```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```

### Issue: "502 Bad Gateway"

```bash
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
```

### Issue: Database connection failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test database connection
mysql -u mospams_user -p mospams_db
```

### Issue: Queue not processing

```bash
# Check worker status
sudo supervisorctl status

# Restart workers
sudo supervisorctl restart mospams-worker:*

# View worker logs
sudo tail -f /var/www/mospams-backend/Backend/storage/logs/worker.log
```

### Issue: SSL certificate failed

```bash
# Make sure DNS is propagated first
nslookup api.mospams.shop

# Try manual installation
sudo certbot --nginx -d api.mospams.shop
```

---

## File Locations

| Item | Location |
|------|----------|
| Application | `/var/www/mospams-backend/Backend` |
| Environment | `/var/www/mospams-backend/Backend/.env` |
| Logs | `/var/www/mospams-backend/Backend/storage/logs/` |
| Nginx Config | `/etc/nginx/sites-available/mospams-backend` |
| Supervisor Config | `/etc/supervisor/conf.d/mospams-worker.conf` |
| SSL Certificates | `/etc/letsencrypt/live/api.mospams.shop/` |

---

## Security Notes

### Change Default Passwords

After deployment, change these passwords:

1. **SuperAdmin password:**
   ```bash
   cd /var/www/mospams-backend/Backend
   php artisan tinker
   
   # In tinker:
   $user = App\Models\User::where('email', 'superadmin@mospams.com')->first();
   $user->password = bcrypt('your_new_secure_password');
   $user->save();
   ```

2. **Database password:** Already set during deployment

### Firewall Configuration

The script doesn't configure UFW firewall. To enable:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Disable Root SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

---

## Cost Summary

- **AWS Lightsail:** $5/month (1GB RAM, 1 vCPU, 40GB SSD)
- **SSL Certificate:** FREE (Let's Encrypt)
- **Domain:** Already purchased
- **Total:** ~₱330/month

---

## Deployment Checklist

- [ ] AWS Lightsail instance created
- [ ] Static IP assigned
- [ ] MobaXterm connected
- [ ] Deployment script uploaded
- [ ] `./deploy-backend.sh` executed successfully
- [ ] Database password saved securely
- [ ] DNS A record added in Hostinger
- [ ] DNS propagation verified (5-30 minutes)
- [ ] `./install-ssl.sh` executed successfully
- [ ] API health check passed: `curl https://api.mospams.shop/up`
- [ ] Frontend connected to backend
- [ ] SuperAdmin login tested
- [ ] Changed default SuperAdmin password

---

## Support

If you encounter issues:

1. Check the logs: `tail -f /var/www/mospams-backend/Backend/storage/logs/laravel.log`
2. Verify services are running: `sudo systemctl status nginx php8.3-fpm mysql`
3. Check queue workers: `sudo supervisorctl status`
4. Review deployment script output for errors

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Create test shop via registration page
3. ✅ Test SuperAdmin approval workflow
4. ✅ Test tenant login and operations
5. ✅ Monitor logs for errors
6. ✅ Set up monitoring (optional: New Relic, Sentry)
7. ✅ Configure automated backups
8. ✅ Set up staging environment (optional)

---

**Your backend is now live at `https://api.mospams.shop`!**

The entire deployment process is automated and takes about 20 minutes from start to finish.
