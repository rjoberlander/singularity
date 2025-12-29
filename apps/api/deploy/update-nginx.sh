#!/bin/bash
# Update nginx config to proxy /api requests to the Express backend

NGINX_CONF="/etc/nginx/sites-available/singularity"

# Check if /api location already exists
if grep -q 'location /api' "$NGINX_CONF" 2>/dev/null; then
  echo "Nginx /api location already configured"
  exit 0
fi

echo "Adding /api location to nginx config..."

# Create the API location block
API_BLOCK='    # API routes - proxy to Express backend on port 3001
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

'

# Insert before "location / {" in all server blocks
sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"
sudo awk -v block="$API_BLOCK" '
  /location \/ \{/ && !done {
    print block
    done=1
  }
  {print}
' "${NGINX_CONF}.bak" | sudo tee "$NGINX_CONF" > /dev/null

# Test and reload nginx
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "Nginx updated and reloaded successfully"
else
  echo "Nginx config test failed, restoring backup..."
  sudo cp "${NGINX_CONF}.bak" "$NGINX_CONF"
  exit 1
fi
