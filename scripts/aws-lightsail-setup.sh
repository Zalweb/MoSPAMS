#!/bin/bash

# ============================================
# MoSPAMS AWS Lightsail Deployment Script
# ============================================

echo "=========================================="
echo "MoSPAMS Production Deployment"
echo "=========================================="
echo ""

# Update system
echo "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "2. Installing required packages..."
sudo apt install -y nginx mysql-server php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-xml php8.3-bcmath php8.3-curl php8.3-zip unzip git curl

# Install Composer
echo "3. Installing Composer..."
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js & npm
echo "4. Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
echo "5. Creating application directory..."
sudo mkdir -p /var/www/mospams
sudo chown -R $USER:$USER /var/www/mospams

# Clone repository (you'll need to set this up)
echo "6. Cloning repository..."
# git clone YOUR_REPO_URL /var/www/mospams

# Configure MySQL
echo "7. Configuring MySQL..."
sudo mysql -e "CREATE DATABASE mospams_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'mospams_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mospams_db.* TO 'mospams_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo ""
echo "=========================================="
echo "Basic setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/mospams"
echo "2. Run: cd /var/www/mospams && bash deploy-backend.sh"
echo "3. Run: cd /var/www/mospams && bash deploy-frontend.sh"
echo "4. Configure Nginx with the provided config"
echo ""
