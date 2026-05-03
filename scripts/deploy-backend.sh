#!/bin/bash

################################################################################
# MoSPAMS Backend Deployment Script for AWS Lightsail
# This script automates the complete backend deployment process
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="https://github.com/Zalweb/MoSPAMS.git"
APP_DIR="/var/www/mospams-backend"
DOMAIN="api.mospams.shop"
DB_NAME="mospams_db"
DB_USER="mospams_user"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}MoSPAMS Backend Deployment${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Prompt for database password
read -sp "Enter MySQL password for mospams_user: " DB_PASSWORD
echo ""
read -sp "Confirm MySQL password: " DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}Passwords do not match. Exiting.${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting deployment...${NC}"
echo ""

################################################################################
# Step 1: Update System
################################################################################
echo -e "${GREEN}[1/15] Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

################################################################################
# Step 2: Install PHP 8.3
################################################################################
echo -e "${GREEN}[2/15] Installing PHP 8.3...${NC}"
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3 php8.3-fpm php8.3-cli php8.3-common php8.3-mysql \
    php8.3-zip php8.3-gd php8.3-mbstring php8.3-curl php8.3-xml php8.3-bcmath php8.3-intl

php -v

################################################################################
# Step 3: Install Composer
################################################################################
echo -e "${GREEN}[3/15] Installing Composer...${NC}"
cd ~
curl -sS https://getcomposer.org/installer -o composer-setup.php
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
rm composer-setup.php

composer --version

################################################################################
# Step 4: Install MySQL
################################################################################
echo -e "${GREEN}[4/15] Installing MySQL...${NC}"
sudo apt install -y mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

################################################################################
# Step 5: Create Database and User
################################################################################
echo -e "${GREEN}[5/15] Creating database and user...${NC}"
sudo mysql <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo -e "${GREEN}Database created successfully!${NC}"

################################################################################
# Step 6: Install Nginx
################################################################################
echo -e "${GREEN}[6/15] Installing Nginx...${NC}"
sudo apt install -y nginx

sudo systemctl start nginx
sudo systemctl enable nginx

################################################################################
# Step 7: Install Git
################################################################################
echo -e "${GREEN}[7/15] Installing Git...${NC}"
sudo apt install -y git

################################################################################
# Step 8: Install Certbot (SSL)
################################################################################
echo -e "${GREEN}[8/15] Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

################################################################################
# Step 9: Clone Repository
################################################################################
echo -e "${GREEN}[9/15] Cloning repository...${NC}"
sudo mkdir -p ${APP_DIR}
sudo chown -R ubuntu:ubuntu ${APP_DIR}
cd ${APP_DIR}
git clone ${GITHUB_REPO} .

################################################################################
# Step 10: Install Laravel Dependencies
################################################################################
echo -e "${GREEN}[10/15] Installing Laravel dependencies...${NC}"
cd ${APP_DIR}/Backend
composer install --no-dev --optimize-autoloader --no-interaction

################################################################################
# Step 11: Configure Environment
################################################################################
echo -e "${GREEN}[11/15] Configuring environment...${NC}"
cp .env.example .env

# Update .env file
sed -i "s|APP_ENV=.*|APP_ENV=production|g" .env
sed -i "s|APP_DEBUG=.*|APP_DEBUG=false|g" .env
sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|g" .env
sed -i "s|DB_DATABASE=.*|DB_DATABASE=${DB_NAME}|g" .env
sed -i "s|DB_USERNAME=.*|DB_USERNAME=${DB_USER}|g" .env
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|g" .env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://mospams.shop|g" .env
sed -i "s|SESSION_DOMAIN=.*|SESSION_DOMAIN=.mospams.shop|g" .env
sed -i "s|TENANCY_BASE_DOMAIN=.*|TENANCY_BASE_DOMAIN=mospams.shop|g" .env
sed -i "s|TENANCY_PLATFORM_HOSTS=.*|TENANCY_PLATFORM_HOSTS=admin.mospams.shop|g" .env
sed -i "s|TENANCY_PUBLIC_HOSTS=.*|TENANCY_PUBLIC_HOSTS=mospams.shop|g" .env
sed -i "s|TENANCY_API_HOSTS=.*|TENANCY_API_HOSTS=api.mospams.shop|g" .env
sed -i "s|TENANCY_ENFORCEMENT_MODE=.*|TENANCY_ENFORCEMENT_MODE=enforce|g" .env
sed -i "s|TENANCY_ALLOW_LOCALHOST_FALLBACK=.*|TENANCY_ALLOW_LOCALHOST_FALLBACK=false|g" .env

# Generate application key
php artisan key:generate --force

################################################################################
# Step 12: Set Permissions
################################################################################
echo -e "${GREEN}[12/15] Setting permissions...${NC}"
sudo chown -R www-data:www-data ${APP_DIR}/Backend/storage
sudo chown -R www-data:www-data ${APP_DIR}/Backend/bootstrap/cache
sudo chmod -R 775 ${APP_DIR}/Backend/storage
sudo chmod -R 775 ${APP_DIR}/Backend/bootstrap/cache

################################################################################
# Step 13: Run Migrations and Seeders
################################################################################
echo -e "${GREEN}[13/15] Running migrations and seeders...${NC}"
php artisan migrate --force
php artisan db:seed --class=RolesAndStatusesSeeder --force
php artisan db:seed --class=BillingSeeder --force
php artisan db:seed --class=ShopsSeeder --force
php artisan db:seed --class=CreateAdminUserSeeder --force

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

################################################################################
# Step 14: Configure Nginx
################################################################################
echo -e "${GREEN}[14/15] Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/mospams-backend > /dev/null <<'NGINX_CONFIG'
server {
    listen 80;
    server_name api.mospams.shop;
    root /var/www/mospams-backend/Backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

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
NGINX_CONFIG

# Enable site
sudo ln -sf /etc/nginx/sites-available/mospams-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl restart php8.3-fpm

################################################################################
# Step 15: Setup Queue Worker
################################################################################
echo -e "${GREEN}[15/15] Setting up queue worker...${NC}"
sudo apt install -y supervisor

sudo tee /etc/supervisor/conf.d/mospams-worker.conf > /dev/null <<'SUPERVISOR_CONFIG'
[program:mospams-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/mospams-backend/Backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/mospams-backend/Backend/storage/logs/worker.log
stopwaitsecs=3600
SUPERVISOR_CONFIG

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mospams-worker:*

################################################################################
# Deployment Complete
################################################################################
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Add DNS A record in Hostinger:"
echo "   Type: A"
echo "   Name: api"
echo "   Points to: $(curl -s ifconfig.me)"
echo "   TTL: 3600"
echo ""
echo "2. Wait 5-10 minutes for DNS propagation"
echo ""
echo "3. Install SSL certificate:"
echo "   sudo certbot --nginx -d api.mospams.shop"
echo ""
echo "4. Test API:"
echo "   curl https://api.mospams.shop/up"
echo ""
echo -e "${GREEN}Database Credentials:${NC}"
echo "   Database: ${DB_NAME}"
echo "   Username: ${DB_USER}"
echo "   Password: [saved in .env]"
echo ""
echo -e "${GREEN}SuperAdmin Credentials:${NC}"
echo "   Email: superadmin@mospams.com"
echo "   Password: superadmin123"
echo ""
echo -e "${YELLOW}Important Files:${NC}"
echo "   Application: ${APP_DIR}/Backend"
echo "   Logs: ${APP_DIR}/Backend/storage/logs/laravel.log"
echo "   Nginx Config: /etc/nginx/sites-available/mospams-backend"
echo "   Environment: ${APP_DIR}/Backend/.env"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "   View logs: tail -f ${APP_DIR}/Backend/storage/logs/laravel.log"
echo "   Restart services: sudo systemctl restart nginx php8.3-fpm"
echo "   Queue status: sudo supervisorctl status"
echo ""
