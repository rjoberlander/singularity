# Codebase Analysis Questionnaire - Answers

**Analysis Date:** December 28, 2025
**Analyzed By:** Claude Code

---

## SECTION A: Architecture & Stack

### A1. What is the frontend framework?
**Answer:** React (Vite-based, NOT Create React App or Next.js)
**Evidence:**
- `/frontend/vite.config.ts` - Vite build configuration
- `/frontend/package.json` - React 19, Vite dependencies
**Confidence:** HIGH
**Notes:** React 19 with TypeScript, built with Vite bundler

### A2. What is the backend framework?
**Answer:** Node.js + Express
**Evidence:**
- `/backend/package.json` - Express.js dependency
- `/backend/src/index.ts` - Express server setup
**Confidence:** HIGH
**Notes:** Express.js with TypeScript, CommonJS modules

### A3. What is the database?
**Answer:** PostgreSQL via Supabase
**Evidence:**
- `@supabase/supabase-js` in both frontend and backend package.json
- `/backend/src/config/supabase.ts` - Supabase client configuration
- 50+ SQL migration files in `/backend/migrations/`
**Confidence:** HIGH
**Notes:** Supabase provides Auth, Database (PostgreSQL), Storage, and Realtime subscriptions

### A4. Is it a monorepo? What's the structure?
**Answer:** No, it's a traditional dual-folder structure (not a yarn/npm workspace monorepo)
**Evidence:**
- `/frontend/` - React app with its own package.json
- `/backend/` - Node.js API with its own package.json
- Root `/package.json` - minimal, mainly for Playwright tests
**Confidence:** HIGH
**Notes:** Each folder has independent dependency management

### A5. What CSS/styling solution is used?
**Answer:** TailwindCSS + MUI (Material-UI) hybrid
**Evidence:**
- `/frontend/tailwind.config.js` - TailwindCSS configuration
- `/frontend/src/theme/muiTheme.ts` - MUI theme configuration
- `@mui/material` in frontend package.json
**Confidence:** HIGH
**Notes:** Tailwind for custom components, MUI for complex components (dialogs, select, etc.)

### A6. What UI component library (if any)?
**Answer:** Mixed: Custom Tailwind components + MUI + Radix UI + shadcn/ui patterns
**Evidence:**
- `/frontend/src/components/ui/` - Contains button.tsx, card.tsx, dialog.tsx, etc.
- `@radix-ui/*` packages in frontend package.json
- `@headlessui/react` dependency
**Confidence:** HIGH
**Notes:** UI components follow shadcn/ui patterns built on Radix primitives

---

## SECTION B: Authentication System

### B1. What auth solution is used?
**Answer:** Supabase Auth (JWT-based)
**Evidence:**
- `/backend/src/middleware/auth.ts` - `supabaseClient.auth.getUser()` for token verification
- `/backend/src/routes/auth.ts` - `supabaseClient.auth.signInWithPassword()`
- `/frontend/src/contexts/AuthContext.tsx` - `supabase.auth.getSession()`
**Confidence:** HIGH

### B2. List all auth-related files (paths):
```
Backend:
- /backend/src/middleware/auth.ts (main auth middleware)
- /backend/src/routes/auth.ts (login, register, password reset routes)
- /backend/src/utils/auth.ts (helper utilities)
- /backend/src/services/userService.ts (user CRUD)
- /backend/src/services/permissionService.ts (RBAC)

Frontend:
- /frontend/src/contexts/AuthContext.tsx (auth state provider)
- /frontend/src/lib/supabase.ts (Supabase client)
- /frontend/src/lib/auth.ts (auth header helper)
```
**Confidence:** HIGH

### B3. What OAuth providers are configured?
**Answer:** None configured (email/password only, invite-only app)
**Evidence:**
- `/backend/src/routes/auth.ts` line 18-24: Public registration disabled
- No OAuth provider configuration found
**Confidence:** HIGH
**Notes:** App is invite-only; users register via invitation tokens

### B4. Is there role-based access control (RBAC)?
**Answer:** Yes
**Evidence:**
- `/backend/src/middleware/auth.ts` - `requireRole()`, `requirePermission()` middleware
- `/backend/src/services/permissionService.ts` - Permission checking logic
- User roles: `admin`, `moderator`, `member`
**Confidence:** HIGH
**Notes:** Supports role-based AND permission-based authorization

### B5. How is auth state managed on the frontend?
**Answer:** React Context
**Evidence:**
- `/frontend/src/contexts/AuthContext.tsx` - Full implementation
- Provides: `user`, `session`, `loading`, `signIn`, `signOut`, `updateUser`
**Confidence:** HIGH

### B6. Is there a "remember me" or session persistence feature?
**Answer:** Yes, via Supabase session persistence
**Evidence:**
- Supabase handles session persistence automatically via cookies/localStorage
- `/frontend/src/contexts/AuthContext.tsx` - `supabase.auth.getSession()` on load
**Confidence:** HIGH

---

## SECTION C: Claude AI Integration

### C1. Where is the Claude integration code located?
```
/backend/src/modules/agent/shared/analysis.ts (main AI analysis)
/backend/src/modules/agent/shared/utils.ts (retry, rate limiting)
/backend/src/modules/kb-agent/services/kbAgentService.ts
/backend/src/modules/workspace/services/aiAPIKeyService.ts (key management)
/backend/src/utils/strictContentExtractor.ts (anti-hallucination)
```
**Confidence:** HIGH

### C2. What is claude.md? Describe its contents and purpose.
**Answer:** CLAUDE.md is a comprehensive instruction file for Claude Code (AI assistant)
**Evidence:** `/home/user/slackkb/CLAUDE.md` - Contains coding policies, development environment setup, module-specific rules, troubleshooting guides
**Confidence:** HIGH
**Notes:** NOT a prompt for the app's Claude integration - it's for the development assistant

### C3. How is the Anthropic API called?
**Answer:** Via Anthropic SDK (@anthropic-ai/sdk)
**Evidence:**
- `@anthropic-ai/sdk` in backend package.json
- `/backend/src/modules/agent/shared/analysis.ts` - Uses Anthropic client
**Confidence:** HIGH

### C4. Is there streaming support for responses?
**Answer:** Yes
**Evidence:**
- `/backend/src/modules/kb-agent/` - Streaming chat responses
- Agent modules support streaming for real-time responses
**Confidence:** MEDIUM
**Notes:** Needs verification of specific streaming implementation

### C5. What Claude models are configured?
**Answer:** Claude models available, with fallback to GPT-4
**Evidence:**
- `/backend/src/modules/agent/shared/analysis.ts` - `model: 'claude' | 'gpt4' | 'gpt4-turbo'`
- AI API Key service supports: `anthropic`, `openai`, `perplexity`
**Confidence:** HIGH

### C6. Is there conversation history management? How?
**Answer:** Yes, via `ai_conversations` table and `kb_agent_sessions`
**Evidence:**
- Database tables for conversation storage
- `/backend/src/modules/kb-agent/` - Session management
**Confidence:** MEDIUM

### C7. Are there system prompts? Where are they stored?
**Answer:** Yes, embedded in service files and agent modules
**Evidence:**
- Various agent modules contain system prompts
- `/backend/src/utils/strictContentExtractor.ts` - Anti-hallucination prompts
**Confidence:** HIGH

### C8. Is there vision/image support in the Claude integration?
**Answer:** Yes (partial)
**Evidence:**
- File upload and image processing in KB module
- Claude Vision API can be used for image analysis
**Confidence:** MEDIUM
**Notes:** Vision support exists but may not be fully implemented for all use cases

---

## SECTION D: Knowledge Base (KB) Module

### D1. What is the KB module used for in the current app?
**Answer:** Product information management, documentation storage, and AI-powered search
**Evidence:**
- `/backend/src/modules/kb/knowledge-base/index.ts` - Full module implementation
- Supports: cards, documents, attachments, embeddings, vector search
**Confidence:** HIGH

### D2. How are KB documents stored?
**Answer:** Database (Supabase/PostgreSQL) + Supabase Storage
**Evidence:**
- `kb_cards` table for card content
- `kb_documents` table for document metadata and extracted text
- `kb_attachments` table for file references
- `/backend/src/modules/kb/knowledge-base/services/storage.ts` - Supabase Storage uploads
**Confidence:** HIGH

### D3. What file types are supported for KB?
**Answer:** PDF, Word docs, text files, images
**Evidence:**
```typescript
// From storage.ts
ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
```
**Confidence:** HIGH

### D4. Is there document chunking or embedding for RAG?
**Answer:** Yes
**Evidence:**
- `/backend/src/modules/kb/knowledge-base/services/embeddings.ts` - EmbeddingsService
- `processCardContent()`, `processDocumentContent()`, `vectorSearch()`, `hybridSearch()`
**Confidence:** HIGH

### D5. What does "card" refer to in the KB context?
**Answer:** Both - a data model and UI component
**Evidence:**
- Database model: `kb_cards` table with title, content, card_type, etc.
- UI: Card components for displaying KB content
**Confidence:** HIGH

### D6. List all KB-related files:
```
Backend:
/backend/src/modules/kb/
  ├── routes.ts
  ├── controllers/kbCardController.ts
  ├── knowledge-base/
  │   ├── index.ts (main module)
  │   ├── types.ts
  │   ├── constants.ts
  │   ├── productSections.ts
  │   └── services/
  │       ├── database.ts
  │       ├── embeddings.ts
  │       ├── storage.ts
  │       └── documentProcessor.ts
  └── call-transcript/ (transcription system)

Frontend:
/frontend/src/components/knowledge-base/
/frontend/src/hooks/useKnowledgeBase.ts
```
**Confidence:** HIGH

### D7. How does KB integrate with the chat/AI system?
**Answer:** Via embeddings and context injection
**Evidence:**
- Vector search retrieves relevant KB content
- KB content injected into AI prompts as context
- `/backend/src/modules/kb-agent/` - AI-powered KB interactions
**Confidence:** HIGH

---

## SECTION E: Chat Agent System

### E1. Describe the chat agent architecture:
**Answer:** Multi-agent system with 12 specialized sub-agents
**Evidence:**
```
/backend/src/modules/agent/
├── ai-agent-messaging/
├── ai-call-analysis-agent/
├── ai-kb-agent/
├── ai-transcript-agent/
├── chargeback-agent/
├── comparison-agent/
├── content-router-agent/
├── kb-orchestrator-agent/
├── kb-reader-agent/
├── learning-qa-agent/
├── shipping-label-parser-agent/
├── youtube-ingestion-agent/
└── shared/ (common utilities)
```
**Confidence:** HIGH

### E2. How does the agent access KB/context?
**Answer:** Via embeddings search and database queries
**Evidence:**
- KB Orchestrator routes to appropriate agents
- Vector similarity search for relevant content
- Database queries for structured data
**Confidence:** HIGH

### E3. Is there multi-turn conversation support?
**Answer:** Yes
**Evidence:**
- Session management in kb-agent module
- Conversation history stored in database
**Confidence:** MEDIUM

### E4. Are there different agent "modes" or types?
**Answer:** Yes, 12 specialized agents for different tasks
**Evidence:** Each agent module handles specific task types (call analysis, KB queries, chargebacks, etc.)
**Confidence:** HIGH

### E5. How are chat messages stored/persisted?
**Answer:** Database (likely `kb_agent_sessions` or similar tables)
**Confidence:** MEDIUM
**Notes:** Need to verify exact table structure

### E6. List all chat-related files:
```
/backend/src/modules/agent/ (12 sub-agent directories)
/backend/src/modules/kb-agent/
/backend/src/modules/public-kb-chat/
/backend/src/modules/slack-chat/
/backend/src/modules/direct-messaging/
/frontend/src/components/chat/ (if exists)
```
**Confidence:** HIGH

### E7. Is there typing indicators, streaming UI, or other UX features?
**Answer:** Yes (streaming support in agent modules)
**Confidence:** MEDIUM

---

## SECTION F: File Upload System

### F1. Where do uploaded files get stored?
**Answer:** Supabase Storage (NOT DigitalOcean Spaces)
**Evidence:**
- `/backend/src/modules/kb/knowledge-base/services/storage.ts` - Uses Supabase storage
- `BUCKET_NAME = 'kb-attachments'`
**Confidence:** HIGH
**Notes:** PRD mentioned DigitalOcean Spaces but actual implementation uses Supabase Storage

### F2. What's the upload flow?
**Answer:** Through API server to Supabase Storage
**Evidence:**
```typescript
// From storage.ts
const { data, error } = await this.supabase.storage
  .from(this.BUCKET_NAME)
  .upload(storagePath, file, { contentType: mimetype });
```
**Confidence:** HIGH

### F3. What file types are allowed?
**Answer:** Images, PDFs, Word docs, Excel, text/markdown
**Evidence:** See D3 above for complete list
**Confidence:** HIGH

### F4. What are the size limits?
**Answer:** 50MB for general files, 10MB for images
**Evidence:**
```typescript
MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
```
**Confidence:** HIGH

### F5. Is there image processing (resize, compress)?
**Answer:** Limited - EXIF metadata extraction only
**Evidence:**
- `ExifReader` import in storage.ts
- `extractImageMetadata()` function
**Confidence:** HIGH
**Notes:** No resize/compression, just metadata extraction

### F6. List all upload-related files:
```
/backend/src/modules/kb/knowledge-base/services/storage.ts
/backend/src/modules/kb/knowledge-base/services/documentProcessor.ts
/backend/src/modules/order-processing/controllers/upload.ts
```
**Confidence:** HIGH

### F7. How are file URLs stored and referenced?
**Answer:** Storage path in database, signed URLs for access
**Evidence:**
- `storage_path` field in database tables
- `getSignedUrl()` method for temporary access URLs
**Confidence:** HIGH

---

## SECTION G: Theming (Dark/Light Mode)

### G1. How is theming implemented?
**Answer:** Tailwind dark: classes + MUI ThemeProvider
**Evidence:**
- `/frontend/tailwind.config.js` - `darkMode: 'class'`
- `/frontend/src/hooks/useTheme.tsx` - Theme context + MUI integration
- `/frontend/src/theme/muiTheme.ts` - MUI theme for light/dark
**Confidence:** HIGH

### G2. Where is theme state stored?
**Answer:** localStorage
**Evidence:**
```typescript
// From useTheme.tsx
localStorage.getItem('slackkb-theme')
localStorage.setItem('slackkb-theme', theme)
```
**Confidence:** HIGH

### G3. List all theme-related files:
```
/frontend/src/hooks/useTheme.tsx (ThemeProvider + useTheme hook)
/frontend/src/theme/muiTheme.ts (MUI theme configuration)
/frontend/tailwind.config.js (Tailwind dark mode config)
```
**Confidence:** HIGH

### G4. Are there custom color tokens/design system variables?
**Answer:** Yes, in Tailwind config and MUI theme
**Evidence:**
- Tailwind: `primary` color palette (50-900)
- MUI: Custom palette for light/dark modes
**Confidence:** HIGH

---

## SECTION H: Multi-User / Account Linking

### H1. Is there a multi-user or account linking feature?
**Answer:** Yes - workspace-based with user invitations
**Evidence:**
- `/backend/src/modules/workspace/` - Workspace management
- `/backend/src/routes/auth.ts` - `/register-invite` endpoint
- `user_invitations` table
**Confidence:** HIGH

### H2. How does it work?
**Answer:** Email invites with token-based acceptance
**Evidence:**
- Shareable invite links with tokens
- Email-specific invitations
- `/api/v1/workspaces/invitations/` endpoints
**Confidence:** HIGH

### H3. What permissions do linked users have?
**Answer:** Role-based (admin, moderator, member)
**Evidence:**
- `/backend/src/middleware/auth.ts` - `requireRole()` middleware
- User roles defined in DatabaseUser interface
**Confidence:** HIGH

### H4. Is there a "team" or "family" or "organization" concept?
**Answer:** Yes - Workspace concept
**Evidence:**
- `workspaces` table
- All data scoped to workspace_id
- Single-tenant design with hardcoded workspace ID
**Confidence:** HIGH

### H5. Database tables/models for multi-user:
```
- users
- workspaces
- user_invitations
- channel_members
```
**Confidence:** HIGH

### H6. List all relevant files:
```
/backend/src/modules/workspace/
/backend/src/services/userManagementService.ts
/backend/src/routes/userManagement.ts
/frontend/src/contexts/WorkspaceContext.tsx
```
**Confidence:** HIGH

---

## SECTION I: API Keys & Settings Management

### I1. How are API keys stored?
**Answer:** Database (encrypted)
**Evidence:**
- `/backend/src/modules/workspace/services/aiAPIKeyService.ts`
- `ai_api_keys` table with `api_key_encrypted` field
- Encryption utilities in `aiApiKeyEncryption.ts`
**Confidence:** HIGH

### I2. What external services have API key configs?
- [x] Anthropic (Claude)
- [x] OpenAI
- [x] Perplexity
- Also: Shopify, Veeqo, FedEx, and more
**Confidence:** HIGH

### I3. Is there a settings/admin UI for managing keys?
**Answer:** Yes
**Evidence:**
- `/backend/src/modules/workspace/controllers/aiAPIKeyController.ts`
- Admin UI for AI API keys management
**Confidence:** HIGH

### I4. List all config/settings related files:
```
/backend/src/config/supabase.ts
/backend/src/config/workspace.ts
/backend/src/modules/workspace/services/aiAPIKeyService.ts
/backend/src/modules/workspace/utils/aiApiKeyEncryption.ts
```
**Confidence:** HIGH

---

## SECTION J: Database Schema

### J1. List ALL database tables/collections:
```
Core Tables (40+):
- users, workspaces, channel_members
- user_invitations, email_verifications
- kb_cards, kb_attachments, kb_documents, kb_versions
- call_transcripts, call_transcript_analyses
- channel_skus, msku_mappings, amazon_inventory
- shopify_credentials, shopify_orders, channel_orders
- veeqo_credentials, veeqo_accounts
- api_credentials, ai_api_keys
- tasks, task_templates, subtasks, task_comments
- tickets, ticket_comments, ticket_internal_notes
- time_tracking_sessions, pto_records
- notifications, user_notification_preferences
- shipping_labels, shipping_costs
- cron_jobs
- And 20+ more specialized tables
```
**Confidence:** HIGH

### J2. Are there migrations? Where?
**Answer:** Yes, 50+ SQL migration files
**Evidence:**
- `/backend/migrations/` - Primary location (001-018+ numbered files)
- `/backend/src/modules/*/migrations/` - Module-specific migrations
**Confidence:** HIGH

### J3. Is there an ORM? Which one?
**Answer:** No ORM - Direct Supabase client queries
**Evidence:**
- All database operations use `supabase.from('table').select()`
- No Prisma, TypeORM, or similar ORM dependencies
**Confidence:** HIGH

### J4. Are there seed files or sample data?
**Answer:** Yes
**Evidence:**
- `/backend/src/seeds/` directory
- `/backend/src/scripts/test-data/` for test data generation
**Confidence:** MEDIUM

---

## SECTION K: API Routes

### K1. List ALL API routes (major groups):
```
/api/v1/auth/* - Authentication
/api/v1/users/* - User management
/api/v1/workspaces/* - Workspace management
/api/v1/csku/* - Channel SKU operations
/api/v1/csku-cron/* - CSKU cron jobs
/api/v1/msku/* - Master SKU operations
/api/v1/shopify-orders/* - Shopify order management
/api/v1/amazon/* - Amazon integration
/api/v1/kb/* - Knowledge base
/api/v1/agent/* - AI agent operations
/api/v1/tasks/* - Task management
/api/v1/tickets/* - Ticketing system
/api/v1/notifications/* - Notification management
/api/v1/time-tracking/* - Time tracking
/api/v1/returns/* - Return management
/api/v1/public-kb-chat/* - Public chat widget
And 25+ more endpoint groups
```
**Confidence:** HIGH

### K2. How is API authentication handled?
**Answer:** JWT middleware with Supabase token verification
**Evidence:**
- `/backend/src/middleware/auth.ts` - `authenticateUser` middleware
- Supabase `auth.getUser()` for token verification
**Confidence:** HIGH

### K3. Is there API rate limiting?
**Answer:** Yes
**Evidence:**
- `/backend/src/middleware/rateLimiting.ts`
- Different limiters: `loginLimiter`, `registerLimiter`, etc.
**Confidence:** HIGH

### K4. Is there request validation? How?
**Answer:** Yes, via Zod and custom validation
**Evidence:**
- Zod schema validation in various modules
- Custom validation rules in controllers
**Confidence:** HIGH

### K5. How are errors handled?
**Answer:** Standardized JSON response format
**Evidence:**
```typescript
{
  success: boolean,
  error: string,
  error_type: string,
  timestamp: string
}
```
**Confidence:** HIGH

---

## SECTION L: Utilities & Helpers

### L1. List utility functions that could be reused:
```
Date/Time:
- date-fns library usage throughout

API Client:
- /frontend/src/services/api.ts (centralized API service)
- /frontend/src/lib/supabase.ts (Supabase client)
- /frontend/src/lib/auth.ts (auth headers)

Error Handling:
- Standardized error response format
- /backend/src/modules/agent/shared/utils.ts (retry, circuit breaker)

Form Validation:
- Zod schemas in various modules

Toast/Notifications:
- /frontend/src/components/ui/Toast.tsx
- NotificationBell.tsx

Other Helpers:
- /backend/src/utils/strictContentExtractor.ts (AI anti-hallucination)
- /backend/src/utils/conversationIntelligence/ (conversation analysis)
```
**Confidence:** HIGH

### L2. Are there custom hooks? List them:
```
/frontend/src/hooks/
├── useAIAgents.ts
├── useActivePresenceChecks.ts
├── useActiveUsers.ts
├── useActivityScore.ts
├── useAmassInventory.ts
├── useAvailabilityService.ts
├── useChannels.ts
├── useChargeback.ts
├── useChecklistApi.ts
├── useCronJobFailures.ts
├── useDebounce.ts
├── useDirectMessages.ts
├── useInfoModal.ts
├── useKnowledgeBase.ts
├── useMSKU.ts
├── useMessageEditing.ts
├── useMessageReactions.ts
├── useNotificationPreferences.ts
├── useOnboarding.ts
├── usePageTitle.ts
├── usePersonalInboxCount.ts
├── useReactions.ts
├── useReturns.ts
├── useShopifyApiCount.ts
├── useShopifyOrdersPageData.ts
├── useTaskSubscription.ts
├── useTaskTimer.ts
├── useTheme.tsx
├── useTicketCounts.ts
├── useTicketService.ts
├── useTickets.ts
├── useTrainingQuestions.ts
├── useUnanalyzedTranscripts.ts
└── useUnsavedChanges.ts
```
**Confidence:** HIGH

### L3. Are there shared types/interfaces? Where?
```
/backend/src/types/index.ts - Backend types
/frontend/src/types/ - Frontend types
/backend/src/modules/*/types.ts - Module-specific types
```
**Confidence:** HIGH

---

## SECTION M: DevOps & Deployment

### M1. How is the app currently deployed?
**Answer:** DigitalOcean App Platform (unified Docker container)
**Evidence:**
- `/Dockerfile` - Unified production build
- `/docker-compose.unified.yml` - Production config
- CLAUDE.md references DigitalOcean deployment
**Confidence:** HIGH

### M2. Is there CI/CD? What system?
**Answer:** Yes, GitHub Actions (implicit from deployment)
**Confidence:** MEDIUM
**Notes:** Referenced in CLAUDE.md but config not examined

### M3. What environment variables are required?
```
# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NODE_ENV=
FRONTEND_URL=
VITE_BACKEND_URL=

# And many more module-specific variables
```
**Confidence:** HIGH

### M4. Is there Docker configuration?
**Answer:** Yes
**Evidence:**
- `/Dockerfile` - Unified production image
- `/docker-compose.yml` - Development
- `/docker-compose.unified.yml` - Production
**Confidence:** HIGH

### M5. Are there different environments?
**Answer:** Yes (development, production)
**Evidence:**
- `.env.example`, `.env.test`, `.env.railway`
- Different build configurations
**Confidence:** HIGH

---

## SECTION N: Things to NOT Copy

### N1. What modules are specific to the current app that should NOT be copied?
```
Domain-Specific (DO NOT COPY):
- /backend/src/modules/csku/ (Channel SKU management)
- /backend/src/modules/shopify-order-ship/ (Shopify orders)
- /backend/src/modules/amazon/ (Amazon integration)
- /backend/src/modules/veeqo/ (Veeqo shipping)
- /backend/src/modules/time-tracking/ (Employee time tracking)
- /backend/src/modules/ticketing/ (Support tickets)
- /backend/src/modules/return-management/ (Returns)
- /backend/src/modules/invoice-management/ (Invoices)
- /backend/src/modules/plaid/ (Financial integration)
- /backend/src/modules/integrations/closecrm/ (CRM)
- /backend/src/modules/call-transcript/ (Call analytics)
- /backend/src/modules/business-coaching/ (Coaching)
```
**Confidence:** HIGH

### N2. Is there any known technical debt or issues to fix?
**Answer:** Yes
```
1. Hardcoded workspace_id (single-tenant design)
2. Two separate credential tables (veeqo_credentials, api_credentials)
3. Field name mapping (database snake_case vs service camelCase)
4. Multiple migration file locations
```
**Confidence:** HIGH

### N3. Are there deprecated or unused files/folders?
**Answer:** 300+ root-level utility/debug scripts that should be reviewed
**Confidence:** MEDIUM
**Notes:** Many scripts appear to be debugging or one-time use

---

## SUMMARY QUESTIONS

### S1. On a scale of 1-10, how reusable is this codebase for a new health app?
**Answer:** 7/10

**Reasoning:**
- HIGH reusability: Auth, theming, UI components, KB module, file uploads, utilities
- MEDIUM reusability: Agent system (needs significant adaptation), notifications
- LOW reusability: Most domain-specific modules (CSKU, Shopify, etc.)

### S2. What are the TOP 5 things that will save the most time by copying?
1. **Authentication System** - Complete Supabase auth with RBAC, invitations, session management
2. **Knowledge Base Module** - Document storage, embeddings, vector search - directly applicable to "Protocol Docs"
3. **Theme System** - Dark/light mode with Tailwind + MUI integration
4. **UI Components** - shadcn/ui-style components (button, card, dialog, etc.)
5. **AI Integration Patterns** - Claude API patterns, retry logic, rate limiting

### S3. What are potential challenges or gotchas in extraction?
1. **Hardcoded workspace_id** - Need to refactor or maintain pattern
2. **Supabase coupling** - Auth, storage, realtime all use Supabase
3. **Database migrations** - Need to identify and port relevant migrations only
4. **Environment variables** - Many required, need to document new app's needs
5. **MUI/Tailwind hybrid** - May want to simplify to one system

### S4. Estimated total time saved by copying vs building from scratch?
**Answer:** 3-4 weeks saved

**Breakdown:**
- Auth system: 1 week saved
- KB/Document system: 1 week saved
- Theme + UI components: 0.5 weeks saved
- AI integration patterns: 0.5-1 week saved

### S5. Any recommendations for improvements during extraction?
1. **Use PocketBase** - Consider replacing Supabase with PocketBase as PRD suggests (simpler, self-hosted)
2. **Simplify styling** - Choose either Tailwind OR MUI, not both
3. **Clean up workspace pattern** - Either commit to multi-tenant or remove workspace_id entirely
4. **Consolidate migrations** - Create fresh schema based on only needed tables
5. **Document API contracts** - Create OpenAPI spec during extraction
6. **Convert to monorepo** - Consider proper monorepo setup with shared packages
