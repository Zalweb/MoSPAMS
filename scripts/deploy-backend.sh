#!/bin/bash

# ============================================
# MoSPAMS Backend Deployment Script
# ============================================

echo "Deploying Backend..."

cd /var/www/mospams/Backend

# Install dependencies
echo "Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader

# Setup environment
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    php artisan key:generate
fi

# Update .env for production
echo "Configuring production environment..."
sed -i 's/APP_ENV=local/APP_ENV=production/' .env
sed -i 's/APP_DEBUG=true/APP_DEBUG=false/' .env
sed -i "s|APP_URL=.*|APP_URL=https://mospams.shop|" .env
sed -i "s|DB_DATABASE=.*|DB_DATABASE=mospams_db|" .env
sed -i "s|DB_USERNAME=.*|DB_USERNAME=mospams_user|" .env
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=YOUR_DB_PASSWORD|" .env
sed -i "s|TENANCY_BASE_DOMAIN=.*|TENANCY_BASE_DOMAIN=mospams.shop|" .env

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Seed database (first time only)
# php artisan db:seed --force

# Clear and cache config
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data /var/www/mospams/Backend/storage
sudo chown -R www-data:www-data /var/www/mospams/Backend/bootstrap/cache
sudo chmod -R 775 /var/www/mospams/Backend/storage
sudo chmod -R 775 /var/www/mospams/Backend/bootstrap/cache

echo "Backend deployment complete!"
