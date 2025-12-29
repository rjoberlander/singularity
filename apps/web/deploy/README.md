# Singularity Web - Deployment Guide

## Quick Start (Digital Ocean $4 Droplet)

### 1. Create Droplet
- Go to [Digital Ocean](https://cloud.digitalocean.com)
- Create Droplet:
  - **Image**: Ubuntu 24.04 LTS
  - **Plan**: Basic → Regular → **$4/mo** (512MB RAM, 1 vCPU)
  - **Region**: Choose closest to users
  - **Auth**: SSH Key (recommended)
  - **Hostname**: `singularity-web`

### 2. Initial Server Setup
```bash
# SSH as root
ssh root@YOUR_DROPLET_IP

# Download and run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/apps/web/deploy/server-setup.sh | bash
```

Or manually:
```bash
# Clone repo first, then run
bash /var/www/singularity/apps/web/deploy/server-setup.sh
```

### 3. Deploy Application
```bash
# SSH as deploy user
ssh deploy@YOUR_DROPLET_IP

# Clone repository
cd /var/www/singularity
git clone https://github.com/YOUR_USERNAME/singularity.git .

# Create environment file
cd apps/web
nano .env.local
```

Add environment variables:
```env
NEXT_PUBLIC_API_URL=https://your-api.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run deploy:
```bash
bash deploy/deploy.sh
```

### 4. Setup Nginx
```bash
# Copy config (replace YOUR_DOMAIN)
sudo cp deploy/nginx.conf /etc/nginx/sites-available/singularity
sudo nano /etc/nginx/sites-available/singularity  # Edit domain

# Enable site
sudo ln -s /etc/nginx/sites-available/singularity /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSL (Free)
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6. Point Domain
In your domain registrar:
```
A Record: @ → YOUR_DROPLET_IP
A Record: www → YOUR_DROPLET_IP
```

---

## Updating the Application

```bash
ssh deploy@YOUR_DROPLET_IP
cd /var/www/singularity/apps/web
bash deploy/deploy.sh
```

Or quick update (skip npm install):
```bash
bash deploy/deploy.sh --skip-install
```

---

## Useful Commands

```bash
# Check app status
pm2 status
pm2 logs singularity-web

# Restart app
pm2 restart singularity-web

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check memory/disk
free -h
df -h

# View app logs
tail -f /var/log/pm2/singularity-web.log
```

---

## Troubleshooting

### App not starting?
```bash
pm2 logs singularity-web --lines 50
```

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Out of memory?
```bash
# Check swap
free -h

# If no swap, create it
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Monthly Cost

| Item | Cost |
|------|------|
| Droplet (512MB) | $4/mo |
| SSL Certificate | Free |
| **Total** | **$4/mo** |

Domain cost (~$10/year) not included.
