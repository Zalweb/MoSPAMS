#!/bin/bash

################################################################################
# MoSPAMS Backend Update Script
# Use this to deploy code updates after initial deployment
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/mospams-backend"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Updating MoSPAMS Backend${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

cd ${APP_DIR}/Backend

# Put application in maintenance mode
echo -e "${YELLOW}[1/8] Enabling maintenance mode...${NC}"
php artisan down

# Pull latest code
echo -e "${YELLOW}[2/8] Pulling latest code...${NC}"
git pull origin main

# Install/update dependencies
echo -e "${YELLOW}[3/8] Updating dependencies...${NC}"
composer install --no-dev --optimize-autoloader --no-interaction

# Run migrations
echo -e "${YELLOW}[4/8] Running migrations...${NC}"
php artisan migrate --force

# Clear and cache config
echo -e "${YELLOW}[5/8] Clearing caches...${NC}"
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear

echo -e "${YELLOW}[6/8] Caching config...${NC}"
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
echo -e "${YELLOW}[7/8] Restarting services...${NC}"
sudo systemctl restart php8.3-fpm
sudo supervisorctl restart mospams-worker:*

# Bring application back online
echo -e "${YELLOW}[8/8] Disabling maintenance mode...${NC}"
php artisan up

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Update Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your backend has been updated successfully"
echo ""
echo "Test your API:"
echo "  curl https://api.mospams.shop/up"
echo ""
