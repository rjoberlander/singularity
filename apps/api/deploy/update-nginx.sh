#!/bin/bash
# Update nginx config to proxy /api requests to the Express backend

NGINX_CONF="/etc/nginx/sites-available/singularity"

# Check if /api location already exists
if grep -q 'location /api' "$NGINX_CONF" 2>/dev/null; then
  echo "Nginx /api location already configured"
  exit 0
fi

echo "Adding /api location to nginx config..."
echo "Current config:"
cat "$NGINX_CONF"

# Use sed to insert after the first 'server {' line
sudo sed -i '/server {/a\
\
    # API routes - proxy to Express backend on port 3001\
    location /api {\
        proxy_pass http://localhost:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection '"'"'upgrade'"'"';\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
        proxy_read_timeout 86400;\
    }\
' "$NGINX_CONF"

echo "Updated config:"
cat "$NGINX_CONF"

# Test and reload nginx
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "Nginx updated and reloaded successfully"
else
  echo "Nginx config test failed"
  exit 1
fi
