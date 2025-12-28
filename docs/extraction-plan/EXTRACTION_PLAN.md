# Protocol App - Code Extraction Plan

This document provides the complete file mapping for extracting reusable code from SlackKB to the Protocol health tracking app.

**Database Decision: Supabase** (same as SlackKB = minimal refactoring needed!)

---

## Target Project Structure

```
singularity/
├── apps/
│   ├── mobile/                    # Expo (React Native) app
│   │   ├── app/                   # Expo Router pages
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── types/
│   │
│   └── api/                       # Node.js + Express backend
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── modules/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── types/
│       │   └── utils/
│       └── migrations/
│
├── packages/
│   └── shared/                    # Shared types and utilities
│       ├── types/
│       └── utils/
│
└── supabase/                      # Supabase migrations
    └── migrations/
```

---

## Priority 1: Authentication System

### Backend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/backend/src/middleware/auth.ts` | `/apps/api/src/middleware/auth.ts` | Remove CSKU/cron bypasses, update workspace handling |
| `/backend/src/routes/auth.ts` | `/apps/api/src/routes/auth.ts` | Keep login, register-invite, password reset |
| `/backend/src/services/userService.ts` | `/apps/api/src/services/userService.ts` | Simplify for Protocol app |
| `/backend/src/services/permissionService.ts` | `/apps/api/src/services/permissionService.ts` | Simplify roles (owner, member) |
| `/backend/src/middleware/rateLimiting.ts` | `/apps/api/src/middleware/rateLimiting.ts` | Copy as-is |
| `/backend/src/config/supabase.ts` | `/apps/api/src/config/supabase.ts` | Copy as-is, update project URL |

### Frontend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/frontend/src/contexts/AuthContext.tsx` | `/apps/mobile/contexts/AuthContext.tsx` | Copy as-is, works with Supabase |
| `/frontend/src/lib/supabase.ts` | `/apps/mobile/lib/supabase.ts` | Copy as-is, update project URL |
| `/frontend/src/lib/auth.ts` | `/apps/mobile/lib/auth.ts` | Copy as-is |

### Database Tables to Create

```sql
-- users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- user_links table (for family sharing)
CREATE TABLE user_links (
  id TEXT PRIMARY KEY,
  owner_user TEXT REFERENCES users(id),
  linked_user TEXT REFERENCES users(id),
  permission TEXT DEFAULT 'read',
  status TEXT DEFAULT 'pending',
  invite_code TEXT UNIQUE,
  created DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Environment Variables

```env
# Supabase (create new project at supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Priority 2: Theme System

### Frontend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/frontend/src/hooks/useTheme.tsx` | `/apps/mobile/hooks/useTheme.tsx` | Update localStorage key, adapt for React Native |
| `/frontend/src/theme/muiTheme.ts` | `/apps/mobile/theme/muiTheme.ts` | May remove if not using MUI |
| `/frontend/tailwind.config.js` | `/apps/mobile/tailwind.config.js` | Base config for NativeWind |

### Adaptation for React Native

```typescript
// React Native version of useTheme
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    AsyncStorage.getItem('protocol-theme').then((saved) => {
      if (saved) setTheme(saved as Theme);
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('protocol-theme', newTheme);
  };

  const resolvedTheme = theme === 'system' ? systemColorScheme : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Priority 3: Claude AI Integration

### Backend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/backend/src/modules/agent/shared/utils.ts` | `/apps/api/src/utils/aiUtils.ts` | Keep retry, circuit breaker, rate limiting |
| `/backend/src/modules/agent/shared/types.ts` | `/apps/api/src/types/ai.ts` | Extract relevant types |
| `/backend/src/modules/workspace/services/aiAPIKeyService.ts` | `/apps/api/src/services/aiAPIKeyService.ts` | Simplify for single-user |
| `/backend/src/modules/workspace/utils/aiApiKeyEncryption.ts` | `/apps/api/src/utils/encryption.ts` | Copy as-is |
| `/backend/src/utils/strictContentExtractor.ts` | `/apps/api/src/utils/strictContentExtractor.ts` | Essential for preventing hallucination |

### New Files to Create

```
/apps/api/src/services/claude.ts          # Main Claude service
/apps/api/src/prompts/biomarkerExtraction.md  # Lab parsing prompts
/apps/api/src/prompts/healthChat.md       # Chat assistant prompts
/apps/api/src/routes/ai.ts                # AI endpoints
```

### Sample Biomarker Extraction Prompt

```markdown
# Biomarker Extraction System Prompt

You are a precise biomarker extraction assistant. Your job is to extract health biomarker data from lab reports.

## Rules:
1. ONLY extract data that is explicitly visible in the source
2. NEVER guess or infer values
3. Return structured JSON with confidence scores
4. Flag any values outside normal ranges

## Output Format:
{
  "biomarkers": [
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "reference_range": { "low": number, "high": number },
      "status": "normal" | "high" | "low",
      "confidence": number
    }
  ],
  "lab_info": {
    "lab_name": "string",
    "test_date": "YYYY-MM-DD",
    "patient_name": "string (if visible)"
  }
}
```

---

## Priority 4: File Upload System

### Backend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/backend/src/modules/kb/knowledge-base/services/storage.ts` | `/apps/api/src/services/storageService.ts` | Update bucket name, simplify |
| `/backend/src/modules/kb/knowledge-base/services/documentProcessor.ts` | `/apps/api/src/services/documentProcessor.ts` | Focus on lab report parsing |

### New Configuration

```typescript
// storageService.ts adaptations
export class StorageService {
  private readonly BUCKET_NAME = 'protocol-uploads';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/heic',
    'application/pdf'
  ];

  // ... rest of implementation
}
```

---

## Priority 5: KB Module -> Protocol Docs

### Backend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/backend/src/modules/kb/knowledge-base/index.ts` | `/apps/api/src/modules/protocol-docs/index.ts` | Rename actions for protocol docs |
| `/backend/src/modules/kb/knowledge-base/types.ts` | `/apps/api/src/modules/protocol-docs/types.ts` | Update type names |
| `/backend/src/modules/kb/knowledge-base/services/database.ts` | `/apps/api/src/modules/protocol-docs/services/database.ts` | Update table names |
| `/backend/src/modules/kb/routes.ts` | `/apps/api/src/routes/protocolDocs.ts` | New route paths |

### Entity Mapping

| SlackKB Entity | Protocol Entity |
|----------------|-----------------|
| `kb_cards` | `protocol_docs` |
| `kb_documents` | `protocol_attachments` |
| `kb_attachments` | `doc_files` |
| `card_type` | `doc_category` |

### New Categories

```typescript
type DocCategory =
  | 'routine'       // Daily/weekly routines
  | 'biomarkers'    // Lab results documentation
  | 'supplements'   // Supplement research/notes
  | 'goals'         // Health goal documentation
  | 'reference'     // General health reference
  | 'other';
```

---

## Priority 6: Base UI Components

### Component Mapping (Web -> React Native)

| Web Component | React Native Equivalent | Notes |
|---------------|------------------------|-------|
| `button.tsx` | `Button.tsx` | Use Pressable + styled-components or NativeWind |
| `card.tsx` | `Card.tsx` | View with shadow styling |
| `input.tsx` | `Input.tsx` | TextInput wrapper |
| `dialog.tsx` | `Modal.tsx` | React Native Modal component |
| `Toast.tsx` | `Toast.tsx` | Use react-native-toast-message |
| `tabs.tsx` | `Tabs.tsx` | Use @react-navigation/material-top-tabs |
| `select.tsx` | `Select.tsx` | Use @react-native-picker/picker |

### Example Conversion

```typescript
// Web version (button.tsx)
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// React Native version (Button.tsx)
import { Pressable, Text, StyleSheet } from 'react-native';
import { styled } from 'nativewind';

const StyledPressable = styled(Pressable);
const StyledText = styled(Text);

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  onPress: () => void;
  children: React.ReactNode;
}

export function Button({ variant = 'default', size = 'default', onPress, children }: ButtonProps) {
  return (
    <StyledPressable
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-md
        ${variant === 'default' ? 'bg-blue-500' : ''}
        ${variant === 'destructive' ? 'bg-red-500' : ''}
        ${variant === 'outline' ? 'border border-gray-300 bg-transparent' : ''}
        ${size === 'default' ? 'h-10 px-4 py-2' : ''}
        ${size === 'sm' ? 'h-9 px-3' : ''}
        ${size === 'lg' ? 'h-11 px-8' : ''}
      `}
    >
      <StyledText className="text-sm font-medium text-white">
        {children}
      </StyledText>
    </StyledPressable>
  );
}
```

---

## Priority 7: Multi-User System

### Backend Files

| Source Path | Destination Path | Adaptation Notes |
|-------------|------------------|------------------|
| `/backend/src/modules/workspace/service.ts` | `/apps/api/src/services/familyService.ts` | Rename workspace -> family |
| `/backend/src/services/userManagementService.ts` | `/apps/api/src/services/userManagementService.ts` | Keep invitation logic |

### Database Schema

```sql
-- user_links (family sharing)
CREATE TABLE user_links (
  id TEXT PRIMARY KEY,
  owner_user TEXT REFERENCES users(id),
  linked_user TEXT REFERENCES users(id),
  permission TEXT CHECK (permission IN ('read', 'write', 'admin')),
  status TEXT CHECK (status IN ('pending', 'active', 'revoked')),
  invite_code TEXT UNIQUE,
  created DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Priority 8: Utilities & Helpers

### Files to Copy

| Source Path | Destination Path | Notes |
|-------------|------------------|-------|
| `/frontend/src/hooks/useDebounce.ts` | `/apps/mobile/hooks/useDebounce.ts` | Copy as-is |
| `/frontend/src/hooks/useUnsavedChanges.ts` | `/apps/mobile/hooks/useUnsavedChanges.ts` | Adapt for React Navigation |
| `/frontend/src/hooks/usePageTitle.ts` | N/A | Not needed for mobile |
| `/frontend/src/hooks/useOnboarding.ts` | `/apps/mobile/hooks/useOnboarding.ts` | Adapt for Protocol onboarding |

### New Utilities to Create

```typescript
// /packages/shared/utils/biomarkerUtils.ts
export function getBiomarkerStatus(value: number, low: number, high: number): 'low' | 'normal' | 'high' {
  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}

export function formatBiomarkerValue(value: number, unit: string): string {
  return `${value.toFixed(2)} ${unit}`;
}

// /packages/shared/utils/unitConversions.ts
export const conversions = {
  mmolToMgdl: (mmol: number) => mmol * 18.0182,
  mgdlToMmol: (mgdl: number) => mgdl / 18.0182,
  kgToLb: (kg: number) => kg * 2.20462,
  lbToKg: (lb: number) => lb / 2.20462,
  cmToIn: (cm: number) => cm / 2.54,
  inToCm: (inches: number) => inches * 2.54,
};
```

---

## Extraction Checklist

### Phase 0: Setup
- [ ] Initialize Expo project with TypeScript
- [ ] Initialize Express backend with TypeScript
- [ ] Set up PocketBase (or keep Supabase)
- [ ] Configure NativeWind for Expo
- [ ] Set up Expo Router

### Phase 1: Authentication
- [ ] Copy and adapt auth middleware
- [ ] Copy and adapt auth routes
- [ ] Create PocketBase/Supabase collections
- [ ] Adapt AuthContext for mobile
- [ ] Test login/register flow

### Phase 2: Theme & UI
- [ ] Copy theme configuration
- [ ] Adapt useTheme for React Native
- [ ] Convert UI components to React Native
- [ ] Test dark/light mode toggle

### Phase 3: Claude AI
- [ ] Copy AI utility functions
- [ ] Create biomarker extraction prompts
- [ ] Build AI routes
- [ ] Test image parsing

### Phase 4: Storage & Docs
- [ ] Copy storage service
- [ ] Set up storage bucket
- [ ] Adapt KB module for protocol docs
- [ ] Test file upload/download

### Phase 5: Multi-User
- [ ] Copy workspace service (rename to family)
- [ ] Create invitation flow
- [ ] Test family sharing

### Phase 6: Integration Testing
- [ ] End-to-end auth flow
- [ ] Biomarker upload and extraction
- [ ] Protocol doc management
- [ ] Family sharing

---

## Notes

1. **PocketBase vs Supabase**: The PRD specifies PocketBase, but the current codebase uses Supabase. Consider:
   - Keep Supabase (easier extraction, already working)
   - Migrate to PocketBase (simpler, self-hosted, cheaper)

2. **React Native Conversion**: UI components need significant work to convert from web to React Native. Consider using Expo's web support for a unified codebase.

3. **Database Schema**: Create fresh migrations based on Protocol's data models rather than copying SlackKB's 50+ migration files.

4. **Environment Variables**: Document all required env vars before starting extraction.
