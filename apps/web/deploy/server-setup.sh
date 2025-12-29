#!/bin/bash
#
# Singularity Web - Server Setup Script
# Run this on a fresh Ubuntu 24.04 droplet as root
#
# Usage: bash server-setup.sh
#

set -e

echo "============================================"
echo "  Singularity Web - Server Setup"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Create deploy user${NC}"
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy

    # Copy SSH keys if they exist
    if [ -d "/root/.ssh" ]; then
        mkdir -p /home/deploy/.ssh
        cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
        chown -R deploy:deploy /home/deploy/.ssh
        chmod 700 /home/deploy/.ssh
        chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    fi
fi

echo -e "${YELLOW}Step 3: Setup Firewall${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw status

echo -e "${YELLOW}Step 4: Install Node.js 20${NC}"
if command -v node &> /dev/null; then
    echo "Node.js already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "Node.js installed: $(node --version)"
fi

echo -e "${YELLOW}Step 5: Install PM2${NC}"
if command -v pm2 &> /dev/null; then
    echo "PM2 already installed"
else
    npm install -g pm2
fi

echo -e "${YELLOW}Step 6: Install Nginx${NC}"
apt install -y nginx
systemctl enable nginx
systemctl start nginx

echo -e "${YELLOW}Step 7: Install Certbot${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}Step 8: Setup Swap (for 512MB droplets)${NC}"
if [ -f /swapfile ]; then
    echo "Swap already exists"
else
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "1GB Swap created"
fi

echo -e "${YELLOW}Step 9: Create App Directory${NC}"
mkdir -p /var/www/singularity
chown deploy:deploy /var/www/singularity

echo -e "${YELLOW}Step 10: Setup PM2 Startup${NC}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Server Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "1. SSH as deploy user: ssh deploy@$(curl -s ifconfig.me)"
echo "2. Clone your repo: cd /var/www/singularity && git clone YOUR_REPO ."
echo "3. Run deploy script: cd apps/web && bash deploy/deploy.sh"
echo "4. Setup SSL: sudo certbot --nginx -d your-domain.com"
echo ""
