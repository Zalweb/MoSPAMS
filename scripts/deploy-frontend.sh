#!/bin/bash

# ============================================
# MoSPAMS Frontend Deployment Script
# ============================================

echo "Deploying Frontend..."

cd /var/www/mospams/Frontend

# Install dependencies
echo "Installing npm dependencies..."
npm ci --production

# Update environment for production
echo "Configuring production environment..."
cat > .env << EOF
VITE_API_BASE_URL=https://mospams.shop
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
VITE_PLATFORM_ADMIN_HOSTS=admin.mospams.shop
VITE_PUBLIC_HOSTS=mospams.shop
VITE_TENANT_HOSTS=*.mospams.shop
EOF

# Build for production
echo "Building production bundle..."
npm run build

# Copy build to web root
echo "Deploying build files..."
sudo rm -rf /var/www/mospams/public
sudo cp -r dist /var/www/mospams/public

# Set permissions
sudo chown -R www-data:www-data /var/www/mospams/public
sudo chmod -R 755 /var/www/mospams/public

echo "Frontend deployment complete!"
