# Singularity → SlackKB Supabase Organization Migration Plan

## Context

Singularity currently uses a **free-tier Supabase project** (`fcsiqoebtpfhzreamotp`). We are migrating it to a **new project** under the SlackKB **paid Supabase organization** so it sits alongside the existing SlackKB projects but as its own isolated project.

## Prerequisites

Before starting, you need these values from the **new Supabase project** (created under the SlackKB paid org):

```
NEW_SUPABASE_PROJECT_ID=<from new project>
NEW_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
NEW_SUPABASE_ANON_KEY=<from new project settings → API>
NEW_SUPABASE_SERVICE_ROLE_KEY=<from new project settings → API>
NEW_SUPABASE_DB_PASSWORD=<set during project creation>
NEW_SUPABASE_DB_CONNECTION_STRING=postgresql://postgres.<NEW_PROJECT_ID>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
OLD_SUPABASE_DB_CONNECTION_STRING=postgresql://postgres.fcsiqoebtpfhzreamotp:<OLD_DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
```

---

## Phase 1: Create the New Supabase Project

1. Go to https://supabase.com/dashboard
2. Select the **SlackKB organization** (paid org)
3. Click **"New Project"**
4. Name it `singularity` (or `singularity-prod`)
5. Set a strong database password — **save this password**
6. Choose the same region as your other projects (preferably `us-west-1` or closest to DigitalOcean `sfo2`)
7. Wait for the project to finish provisioning
8. Go to **Settings → API** and copy the `Project URL`, `anon key`, and `service role key`

---

## Phase 2: Migrate Schema (Run All Migrations)

### Option A: Using Supabase CLI (Recommended)

```bash
# Link the CLI to the new project
supabase link --project-ref <NEW_PROJECT_ID>

# Push all migrations to the new project
supabase db push
```

This will run all 52 migration files from `supabase/migrations/` in order.

### Option B: Manual Migration via SQL Editor

If the CLI approach fails, go to the Supabase Dashboard → SQL Editor for the new project, and run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_user_timezone.sql
supabase/migrations/002_eight_sleep.sql
... (all 52 files in order)
supabase/migrations/052_backfill_api_usage_v2.sql
```

### Additional Migrations (run after main migrations)

These are in separate directories and also need to be applied:

```sql
-- From apps/api/src/migrations/
apps/api/src/migrations/create_ai_api_keys_table.sql
apps/api/src/migrations/create_chat_tables.sql
apps/api/src/migrations/create_twilio_tables.sql

-- From apps/web/migrations/
apps/web/migrations/facial_products_schedule_columns.sql
```

---

## Phase 3: Migrate Data

### Step 3a: Export data from old project

```bash
# Full dump including data (exclude supabase internal schemas)
pg_dump "$OLD_SUPABASE_DB_CONNECTION_STRING" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=supabase_migrations \
  --exclude-schema=storage \
  --exclude-schema=supabase_functions \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=realtime \
  --exclude-schema=_realtime \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=vault \
  --exclude-schema=_analytics \
  -f singularity_data_export.sql
```

### Step 3b: Import data into new project

```bash
psql "$NEW_SUPABASE_DB_CONNECTION_STRING" < singularity_data_export.sql
```

### Step 3c: Verify data integrity

```sql
-- Run in new project SQL editor to verify row counts match
SELECT 'users' as table_name, count(*) FROM auth.users
UNION ALL SELECT 'profiles', count(*) FROM public.users
UNION ALL SELECT 'biomarkers', count(*) FROM public.biomarkers
UNION ALL SELECT 'supplements', count(*) FROM public.supplements;
```

### Important: Auth Users Migration

Supabase auth users live in the `auth` schema. To migrate them:

```bash
# Export auth users separately
pg_dump "$OLD_SUPABASE_DB_CONNECTION_STRING" \
  --data-only \
  --no-owner \
  --no-privileges \
  --schema=auth \
  --table=auth.users \
  --table=auth.identities \
  --table=auth.sessions \
  -f singularity_auth_export.sql
```

```bash
# Import auth users into new project
psql "$NEW_SUPABASE_DB_CONNECTION_STRING" < singularity_auth_export.sql
```

### Storage Buckets

If you have files in Supabase Storage, you'll need to:
1. Download all files from old project storage
2. Re-upload to new project storage
3. Or use `supabase storage` CLI commands

---

## Phase 4: Update Singularity Codebase

### 4a: Environment Files

Update **all** `.env` / `.env.local` files:

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
```

**`apps/api/.env`**
```env
SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
SUPABASE_ANON_KEY=<NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY>
```

**`apps/mobile/.env`**
```env
EXPO_PUBLIC_SUPABASE_URL=https://<NEW_PROJECT_ID>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<NEW_ANON_KEY>
```

### 4b: Hardcoded Supabase URLs and Keys

The following files have **hardcoded** Supabase credentials that MUST be updated:

| File | Line(s) | What to Change |
|------|---------|----------------|
| `scripts/seed.js` | ~lines 4-10 | URL + service role key |
| `scripts/register-user.js` | ~line 5 | URL + service role key |
| `scripts/create-user-profile.js` | top | URL + service role key |
| `scripts/create-unconfirmed-user.js` | top | URL + service role key |
| `tests/helpers/supabase-admin.ts` | ~line 12 | URL + service role key |
| `tests/verify-supplement.ts` | references `qicgwomxlffzlxffmjxw` | URL + key |
| `apps/web/scripts/run-migration.js` | top | URL + service role key |
| `apps/web/scripts/upload-portugal-images.ts` | top | URL |
| `apps/web/scripts/upload-portugal-images-to-activities.ts` | top | URL |
| `apps/web/scripts/import-portugal-itinerary.ts` | top | URL |
| `apps/api/scripts/apply-migration-and-import.ts` | top | URL |

**Recommended improvement**: Refactor these hardcoded values to read from environment variables instead. Replace patterns like:

```javascript
// BEFORE (hardcoded)
const supabaseUrl = 'https://fcsiqoebtpfhzreamotp.supabase.co'
const supabaseKey = 'eyJhbG...'

// AFTER (from env)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}
```

### 4c: Supabase CLI Config

**`supabase/config.toml`** — Update the project ID:

```toml
[general]
project_id = "<NEW_PROJECT_ID>"
```

### 4d: Update `.env.example` files (for documentation)

No values to change, but verify they still match the expected variable names.

---

## Phase 5: Update DigitalOcean Deployment

SSH into the droplet and update env vars:

```bash
ssh root@64.227.53.254

# Update web app env
nano /home/deploy/singularity/apps/web/.env.local
# Change NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Update API env
nano /home/deploy/singularity/apps/api/.env
# Change SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Restart services
pm2 restart singularity-web
pm2 restart singularity-api
```

---

## Phase 6: Verification Checklist

- [ ] New Supabase project created under SlackKB paid org
- [ ] All 52+ migrations applied successfully
- [ ] Data exported from old project
- [ ] Data imported into new project
- [ ] Auth users migrated
- [ ] Storage files migrated (if applicable)
- [ ] `apps/web/.env.local` updated
- [ ] `apps/api/.env` updated
- [ ] `apps/mobile/.env` updated
- [ ] All hardcoded URLs/keys updated (see table in Phase 4b)
- [ ] `supabase/config.toml` project ID updated
- [ ] Local dev server starts and connects to new project
- [ ] Can log in with existing user account
- [ ] Biomarkers, supplements, travel data all visible
- [ ] DigitalOcean deployment env vars updated
- [ ] Production site working on new project
- [ ] Old free-tier project can be archived/deleted

---

## Rollback Plan

If anything goes wrong:

1. The old Supabase project (`fcsiqoebtpfhzreamotp`) remains untouched throughout this process
2. Simply revert the env var changes to point back to the old project
3. On DigitalOcean, revert the env files and restart PM2

---

## Old Project Details (for reference)

```
OLD_PROJECT_ID=fcsiqoebtpfhzreamotp
OLD_URL=https://fcsiqoebtpfhzreamotp.supabase.co
```

## Notes

- The old free-tier project should be kept alive until you've fully verified the migration
- After confirming everything works, you can delete or pause the old project
- The `slackkb-theme` localStorage key in `apps/mobile/hooks/useTheme.tsx` (lines 19, 33) should be updated to `singularity-theme` as a cleanup item
