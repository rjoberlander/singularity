#!/bin/bash
# Update nginx config to proxy /api requests to the Express backend

# Find the nginx config file
NGINX_CONF=""
for conf in "/etc/nginx/sites-available/singularity" "/etc/nginx/sites-enabled/singularity" "/etc/nginx/conf.d/singularity.conf" "/etc/nginx/sites-available/default" "/etc/nginx/sites-enabled/default"; do
  if [ -f "$conf" ]; then
    NGINX_CONF="$conf"
    break
  fi
done

if [ -z "$NGINX_CONF" ]; then
  echo "Could not find nginx config file, checking nginx.conf..."
  # Try to find the main config
  if grep -q 'server' /etc/nginx/nginx.conf; then
    NGINX_CONF="/etc/nginx/nginx.conf"
  else
    echo "ERROR: Could not find nginx config file"
    exit 1
  fi
fi

echo "Using nginx config: $NGINX_CONF"

# Check if /api location already exists
if grep -q 'location /api' "$NGINX_CONF" 2>/dev/null; then
  echo "Nginx /api location already configured"
  exit 0
fi

echo "Adding /api location to nginx config..."

# Create a temp file with the API block
cat > /tmp/api-location.txt << 'APIBLOCK'

    # API routes - proxy to Express backend on port 3001
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
APIBLOCK

# Backup and modify
sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"

# Insert the API block before the first "location / {" line
sudo awk '
  /location \/ \{/ && !done {
    while ((getline line < "/tmp/api-location.txt") > 0) print line
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
