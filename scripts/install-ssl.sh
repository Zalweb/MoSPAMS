#!/bin/bash

################################################################################
# MoSPAMS SSL Certificate Installation Script
# Run this AFTER DNS has propagated (5-30 minutes after adding A record)
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="api.mospams.shop"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}SSL Certificate Installation${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check DNS propagation
echo -e "${YELLOW}Checking DNS propagation...${NC}"
DNS_IP=$(dig +short ${DOMAIN} | tail -n1)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}Warning: DNS not fully propagated yet${NC}"
    echo "DNS points to: ${DNS_IP}"
    echo "Server IP is: ${SERVER_IP}"
    echo ""
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Exiting. Run this script again after DNS propagates."
        exit 0
    fi
fi

# Install SSL certificate
echo -e "${GREEN}Installing SSL certificate...${NC}"
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email frienzalsumalpong@gmail.com --redirect

# Test auto-renewal
echo -e "${GREEN}Testing auto-renewal...${NC}"
sudo certbot renew --dry-run

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}SSL Installation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Your API is now secured with HTTPS"
echo ""
echo "Test your API:"
echo "  curl https://api.mospams.shop/up"
echo ""
echo "Certificate will auto-renew every 90 days"
echo ""
