#!/bin/bash
#
# Singularity Web - Deploy Script
# Run this to deploy/update the application
#
# Usage: bash deploy.sh [--skip-install]
#

set -e

# Configuration
APP_DIR="/var/www/singularity"
WEB_DIR="$APP_DIR/apps/web"
PM2_APP_NAME="singularity-web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo "  Singularity Web - Deployment"
echo "============================================"
echo "Started at: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "$WEB_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found in $WEB_DIR${NC}"
    echo "Make sure you've cloned the repository first"
    exit 1
fi

cd "$WEB_DIR"

# Pull latest code
echo -e "${YELLOW}Pulling latest code...${NC}"
git pull origin master

# Install dependencies (skip with --skip-install flag)
if [ "$1" != "--skip-install" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm ci --production=false
else
    echo -e "${YELLOW}Skipping npm install (--skip-install)${NC}"
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}Warning: .env.local not found!${NC}"
    echo "Create it with your environment variables:"
    echo ""
    echo "  NEXT_PUBLIC_API_URL=https://your-api.com/api/v1"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
fi

# Build the application
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Restart with PM2
echo -e "${YELLOW}Restarting application...${NC}"
if pm2 describe $PM2_APP_NAME > /dev/null 2>&1; then
    pm2 restart $PM2_APP_NAME
else
    echo "Starting new PM2 process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo "Finished at: $(date)"
echo ""

# Show status
pm2 status
