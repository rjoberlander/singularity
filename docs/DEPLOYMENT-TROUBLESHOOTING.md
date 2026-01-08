# Singularity Deployment Troubleshooting Guide

Technical reference for common deployment issues on DigitalOcean droplet (64.227.53.254).

## Server Details

```
Droplet: singularity-web-2 (540599477)
IP: 64.227.53.254
Path: /var/www/singularity
User: root (PM2 should run as root, NOT deploy)
RAM: 2GB + 2GB swap
```

## Issue 1: Duplicate PM2 Instances (Port Conflicts)

### Symptoms
- `Error: listen EADDRINUSE: address already in use :::3000`
- Web app restart loop (high restart count in `pm2 list`)
- `ss -tulpn | grep 3000` shows `next-server` process even after PM2 stop

### Root Cause
Two PM2 instances running - one as `root`, one as `deploy` user. Both trying to manage `singularity-web`.

### Diagnosis
```bash
# Check for deploy user PM2
su - deploy -c 'pm2 list'

# Check what's holding port 3000
ss -tulpn | grep 3000
ps aux | grep next
```

### Fix
```bash
# Stop and remove deploy user's PM2 apps
su - deploy -c 'pm2 delete all && pm2 save --force'

# Kill any zombie next-server processes
pkill -9 -f 'next-server'

# Verify port is free
ss -tulpn | grep 3000 || echo "Port free"

# Start root PM2
pm2 start singularity-web
```

### Prevention
Only use root PM2. The deploy user PM2 was likely created during initial setup and keeps auto-starting.

---

## Issue 2: Shared Package Build Failures

### Symptoms
```
Export useCreateScheduleItem doesn't exist in target module
```
Or similar "export not found" errors for hooks from `@singularity/shared-api`.

### Root Cause
The `packages/shared-api/dist` folder is gitignored. When deploying, the shared packages need to be built, but the server may lack dependencies (tsup, rollup platform binaries).

### Diagnosis
```bash
# Check if dist exists
ls -la /var/www/singularity/packages/shared-api/dist/

# Try building
cd /var/www/singularity/packages/shared-api && npm run build
```

### Fix (Option A - Build locally and copy)
```bash
# On local machine
cd packages/shared-api && npm run build
cd ../shared-types && npm run build

# Copy to server
scp -r packages/shared-api/dist root@64.227.53.254:/var/www/singularity/packages/shared-api/
scp -r packages/shared-types/dist root@64.227.53.254:/var/www/singularity/packages/shared-types/
```

### Fix (Option B - Install platform deps on server)
```bash
cd /var/www/singularity
npm install @rollup/rollup-linux-x64-gnu
cd packages/shared-api && npm run build
```

---

## Issue 3: Memory Issues During Build

### Symptoms
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

### Root Cause
Default Node.js heap limit (~512MB) insufficient for TypeScript compilation.

### Fix
```bash
# Build with increased memory
NODE_OPTIONS='--max-old-space-size=1536' npm run build

# For API build
cd /var/www/singularity/apps/api
NODE_OPTIONS='--max-old-space-size=1536' npm run build

# For web build
cd /var/www/singularity/apps/web
NODE_OPTIONS='--max-old-space-size=1536' npm run build
```

---

## Issue 4: Sharp Module Platform Mismatch

### Symptoms
```
Error: Could not load the "sharp" module using the linux-x64 runtime
```

### Root Cause
Sharp was compiled for macOS (darwin) but server is Linux.

### Fix
```bash
cd /var/www/singularity
npm install --os=linux --cpu=x64 sharp
```

---

## Issue 5: Type Errors in Build

### Common Type Fixes Made (2025-01-08)

#### 5.1 TrendHealth type missing 'warning'
**File:** `apps/web/src/app/(dashboard)/biomarkers/page.tsx:185-187`
```typescript
// WRONG
upHealth: [] as ('good' | 'bad' | 'neutral')[]

// CORRECT
upHealth: [] as ('good' | 'bad' | 'neutral' | 'warning')[]
```

#### 5.2 SupplementTiming invalid values
**Files:** `apps/web/src/components/schedule/AddExerciseModal.tsx`, `AddMealModal.tsx`, `apps/web/src/app/(dashboard)/schedule/page.tsx`

Valid `SupplementTiming` values (from `packages/shared-types/src/index.ts:55`):
```typescript
type SupplementTiming = 'wake_up' | 'am' | 'lunch' | 'pm' | 'dinner' | 'before_bed' | 'specific';
```

**WRONG:** `"evening"`, `"bed"`
**CORRECT:** `"before_bed"`

#### 5.3 Readonly queryKey type
**Files:** `apps/web/src/hooks/useEquipment.ts`, `useFacialProducts.ts`, `useSupplements.ts`
```typescript
// WRONG
const previousData: { queryKey: unknown[]; data: Equipment[] }[] = [];

// CORRECT
const previousData: { queryKey: readonly unknown[]; data: Equipment[] }[] = [];
```

#### 5.4 Promise return type mismatch
**Files:** `apps/web/src/components/schedule/ChangesBanner.tsx`, `SaveRoutineModal.tsx`
```typescript
// WRONG
onSave: (reason?: string) => Promise<void>;

// CORRECT (allows Promise<RoutineVersion> or any other return)
onSave: (reason?: string) => Promise<unknown>;
```

---

## Full Deployment Checklist

```bash
# 1. SSH to server
ssh root@64.227.53.254

# 2. Stop any deploy user PM2
su - deploy -c 'pm2 delete all && pm2 save --force' 2>/dev/null || true

# 3. Pull latest code
cd /var/www/singularity
git fetch origin && git reset --hard origin/master

# 4. Install dependencies
npm install

# 5. Copy shared package dist folders (from local)
# (run on local machine)
scp -r packages/shared-api/dist root@64.227.53.254:/var/www/singularity/packages/shared-api/
scp -r packages/shared-types/dist root@64.227.53.254:/var/www/singularity/packages/shared-types/

# 6. Build API
cd /var/www/singularity/apps/api
NODE_OPTIONS='--max-old-space-size=1536' npm run build

# 7. Build web
cd /var/www/singularity/apps/web
rm -rf .next
NODE_OPTIONS='--max-old-space-size=1536' npm run build

# 8. Kill zombies and restart
pkill -9 -f 'next-server' || true
pm2 restart all
pm2 save

# 9. Verify
sleep 10 && pm2 list
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000
```

---

## PM2 Ecosystem Configs

### API (`apps/api/ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'singularity-api',
    script: 'dist/index.js',
    cwd: '/var/www/singularity/apps/api',
    node_args: '--max-old-space-size=512',
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production', PORT: 3001 },
  }],
};
```

### Web (`apps/web/ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'singularity-web',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/singularity/apps/web',
    restart_delay: 5000,
    kill_timeout: 15000,
    max_memory_restart: '400M',
    env: { NODE_ENV: 'production', PORT: 3000 },
  }],
};
```
