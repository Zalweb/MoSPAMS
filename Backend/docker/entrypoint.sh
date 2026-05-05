#!/bin/sh
set -e

echo "Starting MoSPAMS Backend..."

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
until mysqladmin ping -h"$DB_HOST" -u"$DB_USERNAME" -p"$DB_PASSWORD" --skip-ssl --silent 2>/dev/null; do
    echo "MySQL is unavailable - sleeping"
    sleep 2
done
echo "MySQL is up!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until php -r "new Redis(); \$redis = new Redis(); \$redis->connect('redis', 6379); \$redis->auth(getenv('REDIS_PASSWORD')); \$redis->ping();" 2>/dev/null; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is up!"

# Run migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force --no-interaction
fi

# Seed database (only if SEED_DATABASE is true)
if [ "$SEED_DATABASE" = "true" ]; then
    echo "Seeding database..."
    php artisan db:seed --force --no-interaction
fi

# Clear and cache config
echo "Optimizing application..."
echo "Clearing config cache..."
if ! php artisan config:clear 2>&1; then
    echo "ERROR: config:clear failed with above error"
    exit 1
fi
echo "Clearing app cache..."
php artisan cache:clear || { echo "cache:clear failed"; exit 1; }
echo "Clearing route cache..."
php artisan route:clear || { echo "route:clear failed"; exit 1; }
echo "Clearing view cache..."
php artisan view:clear || { echo "view:clear failed"; exit 1; }

echo "Caching config..."
php artisan config:cache || { echo "config:cache failed"; exit 1; }
echo "Caching routes..."
php artisan route:cache || { echo "route:cache failed"; exit 1; }
echo "Caching views..."
php artisan view:cache || { echo "view:cache failed"; exit 1; }

# Create storage link
php artisan storage:link || true

# Set permissions
echo "Setting permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "MoSPAMS Backend is ready!"

# Execute the main command
exec "$@"
