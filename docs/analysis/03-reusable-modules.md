# Reusable Modules Analysis

This document identifies all reusable code modules from the SlackKB codebase for the Protocol health tracking app.

---

## Module 1: Authentication System

### Purpose
Complete user authentication with email/password, JWT tokens, role-based access control, and invitation system.

### Files to Copy

**Backend:**
```
/backend/src/middleware/auth.ts
/backend/src/routes/auth.ts
/backend/src/services/userService.ts
/backend/src/services/permissionService.ts
/backend/src/services/userManagementService.ts
/backend/src/services/emailService.ts
/backend/src/middleware/rateLimiting.ts
/backend/src/config/supabase.ts
/backend/src/config/workspace.ts
```

**Frontend:**
```
/frontend/src/contexts/AuthContext.tsx
/frontend/src/lib/supabase.ts
/frontend/src/lib/auth.ts
```

### Dependencies Required
```json
{
  "backend": {
    "@supabase/supabase-js": "^2.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "crypto": "builtin"
  },
  "frontend": {
    "@supabase/supabase-js": "^2.x"
  }
}
```

### Database Tables Used
- `users`
- `user_invitations`
- `email_verifications`

### Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=
```

### Extraction Effort: EASY
- Self-contained module
- Minimal domain-specific code
- Clean separation of concerns

### Adaptations Needed
1. Update workspace_id handling (remove or make configurable)
2. Rename localStorage key from `slackkb-theme` to `protocol-theme`
3. Update email templates for Protocol branding

---

## Module 2: Claude AI Integration

### Purpose
Claude/Anthropic API integration with retry logic, rate limiting, and anti-hallucination patterns.

### Files to Copy

**Backend:**
```
/backend/src/modules/agent/shared/utils.ts (retry, circuit breaker, rate limiting)
/backend/src/modules/agent/shared/types.ts
/backend/src/modules/workspace/services/aiAPIKeyService.ts
/backend/src/modules/workspace/utils/aiApiKeyEncryption.ts
/backend/src/modules/workspace/controllers/aiAPIKeyController.ts
/backend/src/utils/strictContentExtractor.ts
```

### Dependencies Required
```json
{
  "@anthropic-ai/sdk": "^0.x",
  "openai": "^4.x"
}
```

### Database Tables Used
- `ai_api_keys`

### Environment Variables Needed
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

### Extraction Effort: MEDIUM
- Utility functions are portable
- API key management is reusable
- Need to create new biomarker-specific prompts

### Adaptations Needed
1. Create new system prompts for biomarker extraction
2. Build image parsing prompts for lab reports
3. Update AI API key UI for Protocol app

---

## Module 3: Knowledge Base (KB) -> Protocol Docs

### Purpose
Document storage, processing, embeddings generation, and vector search. Maps directly to Protocol's "Protocol Docs" feature.

### Files to Copy

**Backend:**
```
/backend/src/modules/kb/knowledge-base/index.ts
/backend/src/modules/kb/knowledge-base/types.ts
/backend/src/modules/kb/knowledge-base/services/database.ts
/backend/src/modules/kb/knowledge-base/services/storage.ts
/backend/src/modules/kb/knowledge-base/services/embeddings.ts
/backend/src/modules/kb/knowledge-base/services/documentProcessor.ts
/backend/src/modules/kb/routes.ts
/backend/src/modules/kb/controllers/kbCardController.ts
```

**Frontend:**
```
/frontend/src/hooks/useKnowledgeBase.ts
/frontend/src/components/knowledge-base/ (selective)
```

### Dependencies Required
```json
{
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "uuid": "^9.x",
  "exifreader": "^4.x"
}
```

### Database Tables Used
- `kb_cards` -> `protocol_docs`
- `kb_documents`
- `kb_attachments`
- `kb_embeddings`

### Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY= (for embeddings)
```

### Extraction Effort: MEDIUM
- Core logic is reusable
- Need to rename entities
- Vector search requires OpenAI embeddings

### Adaptations Needed
1. Rename `kb_cards` to `protocol_docs`
2. Update card types for health protocol categories
3. Simplify to focus on document storage (remove call transcript features)

---

## Module 4: File Upload System

### Purpose
File upload to Supabase Storage with validation, metadata extraction, and signed URLs.

### Files to Copy

**Backend:**
```
/backend/src/modules/kb/knowledge-base/services/storage.ts
/backend/src/modules/kb/knowledge-base/services/documentProcessor.ts
```

### Dependencies Required
```json
{
  "@supabase/supabase-js": "^2.x",
  "exifreader": "^4.x",
  "uuid": "^9.x"
}
```

### Database Tables Used
- `kb_attachments` (or new `uploads` table)

### Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Extraction Effort: EASY
- Self-contained storage service
- Generic file handling

### Adaptations Needed
1. Create new bucket name (`protocol-uploads`)
2. Update allowed file types for lab reports (add image types)
3. May add image optimization for lab photos

---

## Module 5: Theme System (Dark/Light Mode)

### Purpose
Dark/light mode toggle with localStorage persistence and Tailwind + MUI integration.

### Files to Copy

**Frontend:**
```
/frontend/src/hooks/useTheme.tsx
/frontend/src/theme/muiTheme.ts
/frontend/tailwind.config.js (dark mode config)
```

### Dependencies Required
```json
{
  "@mui/material": "^5.x",
  "tailwindcss": "^3.x"
}
```

### Database Tables Used
None (localStorage only)

### Environment Variables Needed
None

### Extraction Effort: EASY
- Completely self-contained
- No backend dependencies

### Adaptations Needed
1. Update localStorage key name
2. Adjust color palette for health/wellness theme
3. Consider removing MUI if not needed (simplify to Tailwind only)

---

## Module 6: Multi-User / Invitation System

### Purpose
Workspace invitations via email or shareable links with role assignment.

### Files to Copy

**Backend:**
```
/backend/src/modules/workspace/service.ts
/backend/src/modules/workspace/types.ts
/backend/src/services/userManagementService.ts (invitation logic)
/backend/src/routes/auth.ts (register-invite endpoint)
```

**Frontend:**
```
/frontend/src/contexts/WorkspaceContext.tsx
```

### Dependencies Required
```json
{
  "@supabase/supabase-js": "^2.x",
  "crypto": "builtin"
}
```

### Database Tables Used
- `workspaces`
- `user_invitations`
- `users`

### Environment Variables Needed
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL= (for invite links)
```

### Extraction Effort: MEDIUM
- Logic is reusable
- Need to adapt for "family" concept vs "workspace"

### Adaptations Needed
1. Rename "workspace" to "family" or "household"
2. Simplify roles (owner, member only vs admin/moderator/member)
3. Update permission levels for health data sharing

---

## Module 7: API Key Management

### Purpose
Encrypted storage and management of external API keys with health checking.

### Files to Copy

**Backend:**
```
/backend/src/modules/workspace/services/aiAPIKeyService.ts
/backend/src/modules/workspace/utils/aiApiKeyEncryption.ts
/backend/src/modules/workspace/controllers/aiAPIKeyController.ts
/backend/src/modules/workspace/routes.ts (AI key routes)
```

### Dependencies Required
```json
{
  "crypto": "builtin"
}
```

### Database Tables Used
- `ai_api_keys`

### Environment Variables Needed
```
ENCRYPTION_KEY= (for API key encryption)
```

### Extraction Effort: EASY
- Self-contained encryption/decryption
- Generic key management

### Adaptations Needed
1. May simplify to single key per provider (remove primary/backup)
2. Add health check for new providers if needed

---

## Module 8: Base UI Components

### Purpose
Reusable UI components following shadcn/ui patterns built on Radix primitives.

### Files to Copy

**Frontend:**
```
/frontend/src/components/ui/alert.tsx
/frontend/src/components/ui/badge.tsx
/frontend/src/components/ui/button.tsx
/frontend/src/components/ui/card.tsx
/frontend/src/components/ui/checkbox.tsx
/frontend/src/components/ui/dialog.tsx
/frontend/src/components/ui/dropdown-menu.tsx
/frontend/src/components/ui/input.tsx
/frontend/src/components/ui/label.tsx
/frontend/src/components/ui/progress.tsx
/frontend/src/components/ui/radio-group.tsx
/frontend/src/components/ui/select.tsx
/frontend/src/components/ui/switch.tsx
/frontend/src/components/ui/tabs.tsx
/frontend/src/components/ui/textarea.tsx
/frontend/src/components/ui/Toast.tsx
/frontend/src/components/ui/date-picker.tsx
```

### Dependencies Required
```json
{
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-dropdown-menu": "^1.x",
  "@radix-ui/react-label": "^1.x",
  "@radix-ui/react-progress": "^1.x",
  "@radix-ui/react-radio-group": "^1.x",
  "@radix-ui/react-select": "^1.x",
  "@radix-ui/react-switch": "^1.x",
  "@radix-ui/react-tabs": "^1.x",
  "lucide-react": "^0.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

### Database Tables Used
None

### Environment Variables Needed
None

### Extraction Effort: EASY
- Pure UI components
- No business logic

### Adaptations Needed
1. Convert to React Native/NativeWind for Expo (significant work)
2. Or keep web-first and add React Native components separately
3. Update styling for health app theme

---

## Module 9: Notification System

### Purpose
Toast notifications and notification bell with preferences.

### Files to Copy

**Frontend:**
```
/frontend/src/components/ui/Toast.tsx
/frontend/src/components/ui/NotificationBell.tsx
/frontend/src/hooks/useNotificationPreferences.ts
```

**Backend:**
```
/backend/src/modules/notifications/ (selective)
```

### Dependencies Required
```json
{
  "sonner": "^1.x" (or similar toast library)
}
```

### Database Tables Used
- `notifications`
- `user_notification_preferences`

### Extraction Effort: MEDIUM
- Toast component is simple
- Full notification system is more complex

### Adaptations Needed
1. Simplify notification types for health app
2. Add health-specific notifications (biomarker alerts, supplement reminders)

---

## Module 10: Utilities & Helpers

### Purpose
Reusable utility functions, custom hooks, and helper code.

### Files to Copy

**Backend:**
```
/backend/src/utils/strictContentExtractor.ts
/backend/src/modules/agent/shared/utils.ts (retry, circuit breaker)
```

**Frontend:**
```
/frontend/src/hooks/useDebounce.ts
/frontend/src/hooks/useUnsavedChanges.ts
/frontend/src/hooks/usePageTitle.ts
/frontend/src/hooks/useOnboarding.ts
```

### Dependencies Required
```json
{
  "date-fns": "^2.x"
}
```

### Database Tables Used
None (pure utilities)

### Extraction Effort: EASY
- Pure functions
- No dependencies on domain logic

### Adaptations Needed
1. Add health-specific utilities (unit conversions, biomarker calculations)
2. Create date formatting for health data display

---

## Summary: Extraction Priority Order

| Priority | Module | Effort | Time Saved |
|----------|--------|--------|------------|
| 1 | Authentication System | EASY | 1 week |
| 2 | Theme System | EASY | 2 days |
| 3 | Base UI Components | EASY* | 3 days |
| 4 | Utilities & Helpers | EASY | 1 day |
| 5 | File Upload System | EASY | 2 days |
| 6 | Claude AI Integration | MEDIUM | 1 week |
| 7 | API Key Management | EASY | 2 days |
| 8 | KB -> Protocol Docs | MEDIUM | 1 week |
| 9 | Multi-User System | MEDIUM | 3 days |
| 10 | Notification System | MEDIUM | 2 days |

*Note: UI components are EASY to copy but need significant adaptation for React Native/Expo

**Total Estimated Time Saved: 3-4 weeks**
