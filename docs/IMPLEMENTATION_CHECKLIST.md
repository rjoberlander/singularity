# Singularity App - Implementation Checklist

This is the step-by-step implementation checklist for building the Singularity health tracking app.

---

## Phase 0: Project Setup

### 0.1 Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com) and create new project "Singularity"
- [ ] Note down: Project URL, Anon Key, Service Role Key
- [ ] Enable Email auth provider in Authentication settings

### 0.2 Initialize Expo Project
```bash
npx create-expo-app singularity --template expo-template-blank-typescript
cd singularity
npx expo install expo-router expo-linking expo-constants
```

### 0.3 Configure NativeWind
```bash
npm install nativewind tailwindcss
npx tailwindcss init
```

### 0.4 Initialize Backend
```bash
mkdir -p apps/api
cd apps/api
npm init -y
npm install express typescript @types/express @types/node ts-node nodemon
npm install @supabase/supabase-js @anthropic-ai/sdk
npx tsc --init
```

### 0.5 Set Up Environment Files
Create `.env` files with Supabase credentials for both frontend and backend.

---

## Phase 1: Authentication (Priority 1)

### 1.1 Backend Auth
- [ ] Copy `/backend/src/config/supabase.ts` → `/apps/api/src/config/supabase.ts`
- [ ] Copy `/backend/src/middleware/auth.ts` → `/apps/api/src/middleware/auth.ts`
- [ ] Copy `/backend/src/routes/auth.ts` → `/apps/api/src/routes/auth.ts`
- [ ] Copy `/backend/src/services/userService.ts` → `/apps/api/src/services/userService.ts`
- [ ] Copy `/backend/src/middleware/rateLimiting.ts` → `/apps/api/src/middleware/rateLimiting.ts`
- [ ] Remove SlackKB-specific route bypasses (CSKU, cron, etc.)
- [ ] Update workspace_id handling (remove hardcoding or make configurable)

### 1.2 Frontend Auth
- [ ] Copy `/frontend/src/lib/supabase.ts` → `/apps/mobile/lib/supabase.ts`
- [ ] Copy `/frontend/src/contexts/AuthContext.tsx` → `/apps/mobile/contexts/AuthContext.tsx`
- [ ] Copy `/frontend/src/lib/auth.ts` → `/apps/mobile/lib/auth.ts`
- [ ] Adapt for React Native (AsyncStorage instead of localStorage)

### 1.3 Database Schema
Run in Supabase SQL Editor:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 1.4 Test Auth Flow
- [ ] Test user registration (via invite or direct)
- [ ] Test login/logout
- [ ] Test password reset
- [ ] Test session persistence

---

## Phase 2: Theme System (Priority 2)

### 2.1 Copy Theme Files
- [ ] Copy `/frontend/src/hooks/useTheme.tsx` → `/apps/mobile/hooks/useTheme.tsx`
- [ ] Adapt for React Native (use AsyncStorage, useColorScheme)

### 2.2 Configure NativeWind
Update `tailwind.config.js`:
```javascript
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { /* health-themed palette */ }
      }
    }
  }
};
```

### 2.3 Test Theme Toggle
- [ ] Toggle between light/dark mode
- [ ] Verify persistence across app restarts

---

## Phase 3: Claude AI Integration (Priority 3)

### 3.1 Copy AI Utilities
- [ ] Copy `/backend/src/modules/agent/shared/utils.ts` → `/apps/api/src/utils/aiUtils.ts`
- [ ] Copy `/backend/src/utils/strictContentExtractor.ts` → `/apps/api/src/utils/strictContentExtractor.ts`

### 3.2 Create Biomarker Extraction Service
Create `/apps/api/src/services/biomarkerExtraction.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function extractBiomarkersFromImage(imageBase64: string) {
  // Implementation with Claude Vision API
}

export async function extractBiomarkersFromText(labText: string) {
  // Implementation with Claude text API
}
```

### 3.3 Create AI Routes
- [ ] `POST /api/ai/parse-image` - Extract biomarkers from lab image
- [ ] `POST /api/ai/parse-text` - Extract biomarkers from pasted text
- [ ] `POST /api/ai/chat` - Health assistant chat

### 3.4 Test AI Extraction
- [ ] Upload sample lab report image
- [ ] Verify biomarker extraction accuracy
- [ ] Test chat responses

---

## Phase 4: File Upload System (Priority 4)

### 4.1 Create Storage Bucket
In Supabase Dashboard:
- [ ] Create bucket `singularity-uploads`
- [ ] Set public/private access as needed
- [ ] Configure allowed file types (images, PDFs)

### 4.2 Copy Storage Service
- [ ] Copy `/backend/src/modules/kb/knowledge-base/services/storage.ts`
- [ ] Update bucket name to `singularity-uploads`
- [ ] Simplify for lab report uploads

### 4.3 Create Upload Routes
- [ ] `POST /api/upload/lab-image` - Upload lab report image
- [ ] `GET /api/upload/:id` - Get signed URL for file

---

## Phase 5: Core Data Models (Priority 5)

### 5.1 Create Database Tables
Run in Supabase SQL Editor:

```sql
-- Biomarkers table
CREATE TABLE biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  date_tested DATE NOT NULL,
  lab_source TEXT,
  reference_range_low DECIMAL,
  reference_range_high DECIMAL,
  optimal_range_low DECIMAL,
  optimal_range_high DECIMAL,
  notes TEXT,
  source_image TEXT,
  ai_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplements table
CREATE TABLE supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  dose TEXT,
  dose_per_serving DECIMAL,
  dose_unit TEXT,
  servings_per_container INTEGER,
  price DECIMAL,
  price_per_serving DECIMAL,
  purchase_url TEXT,
  category TEXT,
  timing TEXT,
  frequency TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines table
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  time_of_day TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routine items table
CREATE TABLE routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time TEXT,
  duration TEXT,
  days JSONB DEFAULT '[]',
  linked_supplement UUID REFERENCES supplements(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  target_biomarker TEXT,
  current_value DECIMAL,
  target_value DECIMAL,
  direction TEXT CHECK (direction IN ('increase', 'decrease', 'maintain')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change log table
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT CHECK (change_type IN ('started', 'stopped', 'modified')),
  item_type TEXT,
  item_name TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  linked_concern TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User links table (family sharing)
CREATE TABLE user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user UUID REFERENCES users(id) NOT NULL,
  linked_user UUID REFERENCES users(id) NOT NULL,
  permission TEXT DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can access own data + linked users' data)
-- (Add detailed policies based on sharing permissions)
```

### 5.2 Create API Routes
- [ ] `/api/biomarkers` - CRUD for biomarkers
- [ ] `/api/supplements` - CRUD for supplements
- [ ] `/api/routines` - CRUD for routines
- [ ] `/api/goals` - CRUD for goals
- [ ] `/api/changelog` - CRUD for change log

---

## Phase 6: UI Components (Priority 6)

### 6.1 Create Base Components
Convert web components to React Native:
- [ ] Button
- [ ] Card
- [ ] Input
- [ ] Dialog/Modal
- [ ] Toast
- [ ] Tabs
- [ ] Select/Picker

### 6.2 Create Feature Components
- [ ] BiomarkerCard - Display single biomarker with trend
- [ ] SupplementCard - Display supplement details
- [ ] RoutineBlock - Display routine time block
- [ ] GoalProgress - Progress bar toward goal
- [ ] LabUploader - Image/text upload interface

---

## Phase 7: Screens (Priority 7)

### 7.1 Auth Screens
- [ ] Login screen
- [ ] Register screen (via invite)
- [ ] Forgot password screen

### 7.2 Main Screens
- [ ] Dashboard (home)
- [ ] Biomarkers list
- [ ] Biomarker detail (with chart)
- [ ] Add biomarkers (4 input methods)
- [ ] Supplements list
- [ ] Supplement form
- [ ] Routine view
- [ ] Goals list
- [ ] Change log
- [ ] Settings

### 7.3 Navigation
Set up Expo Router:
```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx (dashboard)
│   ├── biomarkers/
│   ├── supplements/
│   ├── routine.tsx
│   ├── goals.tsx
│   └── settings.tsx
├── chat.tsx
└── _layout.tsx
```

---

## Phase 8: Multi-User Sharing (Priority 8)

### 8.1 Invitation System
- [ ] Copy workspace invitation logic
- [ ] Rename to "family" concept
- [ ] Create invite UI
- [ ] Create accept invite flow

### 8.2 Data Sharing
- [ ] Implement RLS policies for shared access
- [ ] Add account switcher UI
- [ ] Test data visibility between linked users

---

## Phase 9: Polish & Deploy (Priority 9)

### 9.1 Data Export
- [ ] JSON export
- [ ] CSV export
- [ ] Markdown export

### 9.2 Testing
- [ ] Unit tests for services
- [ ] E2E tests with Detox or Maestro

### 9.3 Deployment
- [ ] Deploy backend to DigitalOcean App Platform
- [ ] Build iOS app
- [ ] Build Android app
- [ ] Submit to app stores

---

## Quick Reference: Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=sk-ant-...

# App
FRONTEND_URL=http://localhost:8081
```

### Mobile (.env)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 0 | Project Setup | 1 day |
| 1 | Authentication | 2 days |
| 2 | Theme System | 0.5 days |
| 3 | Claude AI Integration | 3 days |
| 4 | File Upload | 1 day |
| 5 | Core Data Models | 2 days |
| 6 | UI Components | 3 days |
| 7 | Screens | 5 days |
| 8 | Multi-User Sharing | 2 days |
| 9 | Polish & Deploy | 3 days |
| **Total** | | **~22 days** |

---

## Next Action

**Start with Phase 0.1**: Create Supabase project at [supabase.com](https://supabase.com)
