# MoSPAMS AWS Deployment Guide with Docker

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Docker installed locally
- Domain name configured

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              EC2 Instance (Backend)                 │    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │    │
│  │  │   Nginx +    │  │    MySQL     │  │  Redis  │ │    │
│  │  │   Laravel    │  │   Database   │  │  Cache  │ │    │
│  │  │   (Docker)   │  │   (Docker)   │  │(Docker) │ │    │
│  │  └──────────────┘  └──────────────┘  └─────────┘ │    │
│  │         :80              :3306           :6379     │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ HTTPS                            │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Application Load Balancer (ALB)             │    │
│  │              + SSL Certificate                      │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
                    ┌──────────────┐
                    │   Vercel     │
                    │  (Frontend)  │
                    └──────────────┘
```

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance

```bash
# Launch Ubuntu 22.04 LTS instance
# Recommended: t3.medium or larger (2 vCPU, 4GB RAM)
# Storage: 30GB+ SSD

# Instance type recommendations:
# - Development: t3.small (2GB RAM)
# - Production: t3.medium (4GB RAM) or larger
# - High traffic: t3.large (8GB RAM) or c5.large
```

### 1.2 Configure Security Group

Create security group with these inbound rules:

| Type  | Protocol | Port Range | Source          | Description        |
|-------|----------|------------|-----------------|--------------------|
| SSH   | TCP      | 22         | Your IP         | SSH access         |
| HTTP  | TCP      | 80         | 0.0.0.0/0       | HTTP traffic       |
| HTTPS | TCP      | 443        | 0.0.0.0/0       | HTTPS traffic      |
| Custom| TCP      | 8000       | ALB SG          | App traffic        |

### 1.3 Allocate Elastic IP

```bash
# Allocate and associate Elastic IP to your instance
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id i-xxxxx --allocation-id eipalloc-xxxxx
```

## Step 2: Install Docker on EC2

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-elastic-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

## Step 3: Deploy Application

### 3.1 Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/mospams
sudo chown ubuntu:ubuntu /var/www/mospams
cd /var/www/mospams

# Clone repository
git clone https://github.com/yourusername/MoSPAMS.git .

# Or upload via SCP
# scp -i your-key.pem -r ./MoSPAMS ubuntu@your-elastic-ip:/var/www/mospams/
```

### 3.2 Configure Environment

```bash
# Copy Docker environment file
cp .env.docker .env

# Edit environment variables
nano .env
```

Update these critical values:
```env
APP_KEY=  # Generate this (see below)
APP_URL=https://api.yourdomain.com

DB_ROOT_PASSWORD=your_secure_root_password
DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password

FRONTEND_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3.3 Generate Application Key

```bash
# Generate APP_KEY
docker-compose run --rm app php artisan key:generate --show

# Copy the output and update .env file
```

### 3.4 Build and Start Containers

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 3.5 Run Initial Setup

```bash
# Run migrations
docker-compose exec app php artisan migrate --force

# Create admin user (optional)
docker-compose exec app php artisan db:seed --class=AdminSeeder --force

# Check application health
curl http://localhost:8000/api/health
```

## Step 4: Configure SSL with Let's Encrypt

### 4.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 4.2 Stop Docker Nginx (temporarily)

```bash
docker-compose stop app
```

### 4.3 Get SSL Certificate

```bash
# Get certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
```

### 4.4 Configure Nginx for SSL

Create `Backend/docker/nginx/ssl.conf`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /var/www/html/public;
    index index.php;
    
    # ... rest of configuration from default.conf
}
```

### 4.5 Update docker-compose.yml

Add SSL volume mount:

```yaml
app:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 4.6 Restart Services

```bash
docker-compose up -d
```

### 4.7 Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will auto-renew via systemd timer
sudo systemctl status certbot.timer
```

## Step 5: Configure Domain DNS

Point your domain to the Elastic IP:

```
Type: A Record
Name: api
Value: your-elastic-ip
TTL: 300
```

## Step 6: Deploy Frontend to Vercel

### 6.1 Configure Frontend Environment

In Vercel dashboard, set environment variables:

```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_PLATFORM_ADMIN_HOSTS=admin.yourdomain.com
VITE_PUBLIC_HOSTS=yourdomain.com
VITE_TENANT_HOSTS=*.yourdomain.com
```

### 6.2 Deploy

```bash
cd Frontend
vercel --prod
```

### 6.3 Configure Custom Domain

1. Add domain in Vercel dashboard
2. Update DNS records as instructed

## Step 7: Monitoring & Maintenance

### 7.1 View Logs

```bash
# Application logs
docker-compose logs -f app

# MySQL logs
docker-compose logs -f mysql

# Redis logs
docker-compose logs -f redis

# All logs
docker-compose logs -f
```

### 7.2 Backup Database

```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

docker-compose exec -T mysql mysqldump \
  -u root \
  -p${DB_ROOT_PASSWORD} \
  ${DB_DATABASE} | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/ubuntu/backup-db.sh >> /var/log/backup.log 2>&1
```

### 7.3 Update Application

```bash
# Pull latest code
cd /var/www/mospams
git pull origin main

# Rebuild and restart
docker-compose build app
docker-compose up -d

# Run migrations
docker-compose exec app php artisan migrate --force

# Clear cache
docker-compose exec app php artisan config:clear
docker-compose exec app php artisan cache:clear
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
```

### 7.4 Monitor Resources

```bash
# Check disk usage
df -h

# Check memory
free -h

# Check Docker stats
docker stats

# Check container health
docker-compose ps
```

## Step 8: Scaling (Optional)

### 8.1 Separate Database (RDS)

For production, consider using AWS RDS:

```bash
# Create RDS MySQL instance
# Update .env with RDS endpoint
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306

# Remove mysql service from docker-compose.yml
```

### 8.2 Use ElastiCache for Redis

```bash
# Create ElastiCache Redis cluster
# Update .env
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
REDIS_PORT=6379

# Remove redis service from docker-compose.yml
```

### 8.3 Use S3 for File Storage

```bash
# Configure S3 in .env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check if ports are in use
sudo netstat -tulpn | grep :8000

# Restart services
docker-compose restart
```

### Database connection failed

```bash
# Check MySQL is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Test connection
docker-compose exec app php artisan db:monitor
```

### Permission errors

```bash
# Fix permissions
docker-compose exec app chown -R www-data:www-data storage bootstrap/cache
docker-compose exec app chmod -R 775 storage bootstrap/cache
```

## Cost Estimation (AWS)

| Service | Type | Monthly Cost |
|---------|------|--------------|
| EC2 | t3.medium | ~$30 |
| EBS | 30GB SSD | ~$3 |
| Elastic IP | 1 IP | Free (if attached) |
| Data Transfer | 100GB | ~$9 |
| **Total** | | **~$42/month** |

With RDS and ElastiCache:
- RDS db.t3.micro: +$15/month
- ElastiCache cache.t3.micro: +$12/month
- **Total: ~$69/month**

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL certificate installed
- [ ] Firewall configured (Security Groups)
- [ ] SSH key-based authentication only
- [ ] Regular backups configured
- [ ] Monitoring and alerts set up
- [ ] APP_DEBUG=false in production
- [ ] Database not publicly accessible
- [ ] Redis password protected
- [ ] CORS properly configured

## Support

For issues:
- Check logs: `docker-compose logs -f`
- GitHub Issues: https://github.com/yourusername/MoSPAMS/issues
- AWS Support: https://console.aws.amazon.com/support/
