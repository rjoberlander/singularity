# Singularity App — Complete PRD, Codebase Extraction & Claude Code Instructions

## Document Sections

1. [Claude Code Initial Instructions](#part-1-claude-code-initial-instructions)
1. [Codebase Analysis Questions](#part-2-codebase-analysis-questions)
1. [Code Extraction Specifications](#part-3-code-extraction-specifications)
1. [Full Product Requirements Document](#part-4-full-prd)
1. [Implementation Phases](#part-5-implementation-phases)
1. [Claude Code Prompts by Phase](#part-6-claude-code-prompts)

-----

# PART 1: CLAUDE CODE INITIAL INSTRUCTIONS

## First Prompt for Claude Code

Copy and paste this ENTIRE section into Claude Code as your first prompt:

```
I'm building a new health protocol tracking app called "Singularity". Before we build anything new, I need you to thoroughly analyze my existing codebase to identify reusable code.

## Your Tasks (In Order)

### Task 1: Read All Documentation
Search for and read ALL documentation files in the repo:
- README.md
- Any file ending in .md
- /docs folder (if exists)
- claude.md (specifically important)
- Any ARCHITECTURE, CONTRIBUTING, or similar files
- package.json files (to understand dependencies)
- Any config files (next.config.js, tailwind.config.js, etc.)

### Task 2: Map the Codebase Structure
Create a complete map of:
- Frontend folder structure
- Backend folder structure
- Shared/common code locations
- Database schema/models location
- API routes structure

### Task 3: Answer the Codebase Analysis Questions
I'll provide a detailed questionnaire. For each question:
- Provide your answer
- List the specific file paths that informed your answer
- Rate your confidence: HIGH (90%+), MEDIUM (70-89%), LOW (<70%)
- Note any ambiguities or things you'd need to verify

### Task 4: Identify Reusable Modules
For each of these systems, find the relevant code and document:
1. Authentication/Login system
2. Claude AI integration
3. KB (Knowledge Base) module
4. Chat/Agent system
5. File upload system
6. Theme/Dark mode system
7. Multi-user/account linking
8. API key management
9. Base UI components
10. Utility functions/helpers

For each module, provide:
- File paths (all relevant files)
- Dependencies required
- Database tables/collections used
- Environment variables needed
- Estimated effort to extract (Easy/Medium/Hard)

### Task 5: Create Extraction Plan
Based on your analysis, create a prioritized list of what to copy and in what order, considering dependencies.

## Output Format

Please structure your response as:

1. **Documentation Summary** - Key findings from docs
2. **Codebase Map** - Folder structure overview
3. **Questionnaire Answers** - Detailed answers with confidence
4. **Module Analysis** - Deep dive on each reusable system
5. **Extraction Plan** - Ordered list with file paths
6. **Recommendations** - Any suggestions for the new app

Begin by exploring the codebase. Take your time to be thorough.
```

-----

# PART 2: CODEBASE ANALYSIS QUESTIONS

## Questions for Claude Code to Answer

After Claude Code has explored the codebase, have it answer these questions:

```
## CODEBASE ANALYSIS QUESTIONNAIRE

Answer each question based on your analysis of the existing codebase. Format your answers as:

**Answer:** [Your answer]
**Evidence:** [File paths and code snippets that support your answer]
**Confidence:** HIGH / MEDIUM / LOW
**Notes:** [Any caveats or things to verify]

---

### SECTION A: Architecture & Stack

A1. What is the frontend framework?
- [ ] React (Create React App)
- [ ] Next.js
- [ ] React Native / Expo
- [ ] Vue / Nuxt
- [ ] Other: ___

A2. What is the backend framework?
- [ ] Node.js + Express
- [ ] Next.js API routes
- [ ] Fastify
- [ ] Other: ___

A3. What is the database?
- [ ] PocketBase
- [ ] PostgreSQL
- [ ] MongoDB
- [ ] Supabase
- [ ] Other: ___

A4. Is it a monorepo? What's the structure?

A5. What CSS/styling solution is used?
- [ ] TailwindCSS
- [ ] CSS Modules
- [ ] Styled Components
- [ ] Other: ___

A6. What UI component library (if any)?
- [ ] Custom components only
- [ ] shadcn/ui
- [ ] Radix UI
- [ ] MUI
- [ ] Other: ___

---

### SECTION B: Authentication System

B1. What auth solution is used?
- [ ] PocketBase auth
- [ ] NextAuth / Auth.js
- [ ] Custom JWT
- [ ] Clerk
- [ ] Auth0
- [ ] Other: ___

B2. List all auth-related files (paths):

B3. What OAuth providers are configured?
- [ ] Google
- [ ] Apple
- [ ] GitHub
- [ ] Other: ___

B4. Is there role-based access control (RBAC)?
- If yes, what roles exist?

B5. How is auth state managed on the frontend?
- [ ] React Context
- [ ] Redux/Zustand
- [ ] Cookies only
- [ ] Other: ___

B6. Is there a "remember me" or session persistence feature?

---

### SECTION C: Claude AI Integration

C1. Where is the Claude integration code located? (file paths)

C2. What is claude.md? Describe its contents and purpose.

C3. How is the Anthropic API called?
- Direct API calls?
- SDK (@anthropic-ai/sdk)?
- Through a wrapper service?

C4. Is there streaming support for responses?

C5. What Claude models are configured? (sonnet, opus, haiku?)

C6. Is there conversation history management? How?

C7. Are there system prompts? Where are they stored?

C8. Is there vision/image support in the Claude integration?

---

### SECTION D: Knowledge Base (KB) Module

D1. What is the KB module used for in the current app?

D2. How are KB documents stored?
- [ ] Database (which table/collection?)
- [ ] File system
- [ ] S3/Cloud storage
- [ ] Other: ___

D3. What file types are supported for KB?

D4. Is there document chunking or embedding for RAG?

D5. What does "card" refer to in the KB context?
- UI component?
- Data model?
- Both?

D6. List all KB-related files (frontend and backend):

D7. How does KB integrate with the chat/AI system?

---

### SECTION E: Chat Agent System

E1. Describe the chat agent architecture:

E2. How does the agent access KB/context?

E3. Is there multi-turn conversation support?

E4. Are there different agent "modes" or types?

E5. How are chat messages stored/persisted?

E6. List all chat-related files:

E7. Is there typing indicators, streaming UI, or other UX features?

---

### SECTION F: File Upload System

F1. Where do uploaded files get stored?
- [ ] DigitalOcean Spaces
- [ ] AWS S3
- [ ] Local filesystem
- [ ] Database (blob)
- [ ] Other: ___

F2. What's the upload flow?
- [ ] Direct to storage (presigned URLs)
- [ ] Through API server
- [ ] Other: ___

F3. What file types are allowed?

F4. What are the size limits?

F5. Is there image processing (resize, compress)?

F6. List all upload-related files:

F7. How are file URLs stored and referenced?

---

### SECTION G: Theming (Dark/Light Mode)

G1. How is theming implemented?
- [ ] CSS variables
- [ ] Tailwind dark: classes
- [ ] Theme context/provider
- [ ] Other: ___

G2. Where is theme state stored?
- [ ] localStorage
- [ ] Cookie
- [ ] User preferences in DB
- [ ] System preference only

G3. List all theme-related files:

G4. Are there custom color tokens/design system variables?

---

### SECTION H: Multi-User / Account Linking

H1. Is there a multi-user or account linking feature?

H2. How does it work?
- [ ] Invitation codes
- [ ] Email invites
- [ ] Share links
- [ ] Other: ___

H3. What permissions do linked users have?

H4. Is there a "team" or "family" or "organization" concept?

H5. Database tables/models for multi-user:

H6. List all relevant files:

---

### SECTION I: API Keys & Settings Management

I1. How are API keys stored?
- [ ] Environment variables only
- [ ] Database (encrypted?)
- [ ] User-configurable in UI

I2. What external services have API key configs?
- [ ] Anthropic (Claude)
- [ ] OpenAI
- [ ] DigitalOcean
- [ ] Other: ___

I3. Is there a settings/admin UI for managing keys?

I4. List all config/settings related files:

---

### SECTION J: Database Schema

J1. List ALL database tables/collections with their fields:

J2. Are there migrations? Where?

J3. Is there an ORM? Which one?

J4. Are there seed files or sample data?

---

### SECTION K: API Routes

K1. List ALL API routes with their HTTP methods:

K2. How is API authentication handled (middleware)?

K3. Is there API rate limiting?

K4. Is there request validation? How?

K5. How are errors handled?

---

### SECTION L: Utilities & Helpers

L1. List utility functions that could be reused:
- Date formatting
- API client/fetch wrapper
- Error handling
- Form validation
- Toast/notifications
- Other helpers

L2. Are there custom hooks? List them:

L3. Are there shared types/interfaces? Where?

---

### SECTION M: DevOps & Deployment

M1. How is the app currently deployed?

M2. Is there CI/CD? What system?

M3. What environment variables are required? List ALL:

M4. Is there Docker configuration?

M5. Are there different environments (dev/staging/prod)?

---

### SECTION N: Things to NOT Copy

N1. What modules are specific to the current app that should NOT be copied?
- Time tracking?
- Attendance?
- PTO?
- Other domain-specific features?

N2. Is there any known technical debt or issues to fix rather than copy?

N3. Are there deprecated or unused files/folders?

---

## SUMMARY QUESTIONS

S1. On a scale of 1-10, how reusable is this codebase for a new health app?

S2. What are the TOP 5 things that will save the most time by copying?

S3. What are potential challenges or gotchas in extraction?

S4. Estimated total time saved by copying vs building from scratch?

S5. Any recommendations for improvements during extraction?
```

-----

# PART 3: CODE EXTRACTION SPECIFICATIONS

## Extraction Instructions Template

After Claude Code answers the questions, use this template to create specific extraction instructions:

```
## CODE EXTRACTION PLAN

### Priority 1: Authentication System (Copy First)
These files form the foundation - everything depends on auth.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED BY CLAUDE CODE] | /apps/api/src/auth/* | [Notes] |
| [TO BE FILLED] | /apps/mobile/hooks/useAuth.ts | [Notes] |
| [TO BE FILLED] | /apps/mobile/contexts/AuthContext.tsx | [Notes] |

Dependencies to install:
- [TO BE FILLED]

Environment variables:
- [TO BE FILLED]

---

### Priority 2: Claude AI Integration
Core AI functionality for biomarker parsing and chat.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| claude.md | /apps/api/src/prompts/claude.md | Review prompts |
| [TO BE FILLED] | /apps/api/src/services/claude.ts | [Notes] |

---

### Priority 3: File Upload System
Needed for lab image uploads.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /apps/api/src/services/storage.ts | [Notes] |
| [TO BE FILLED] | /apps/mobile/components/ImageUpload.tsx | [Notes] |

---

### Priority 4: KB Module -> Singularity Storage
Adapt KB system for storing health protocol documents.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | Adapt for protocol docs | [Notes] |

---

### Priority 5: Chat Agent -> Health Assistant
Adapt chat system for biomarker context injection.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /apps/mobile/screens/Chat.tsx | [Notes] |
| [TO BE FILLED] | /apps/api/src/routes/chat.ts | [Notes] |

---

### Priority 6: Theming
Dark/light mode support.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /apps/mobile/contexts/ThemeContext.tsx | [Notes] |
| [TO BE FILLED] | tailwind.config.js | [Notes] |

---

### Priority 7: Multi-User System
Account linking for family/spouse access.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | [Notes] | [Notes] |

---

### Priority 8: Base UI Components
Reusable component library.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /apps/mobile/components/ui/* | May need RN conversion |

---

### Priority 9: API Configuration
API keys and settings management.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /apps/api/.env.example | [Notes] |
| [TO BE FILLED] | /apps/api/src/config/* | [Notes] |

---

### Priority 10: Utilities & Helpers
Reusable utility functions.

| Source Path | Destination Path | Adaptation Needed |
|-------------|------------------|-------------------|
| [TO BE FILLED] | /packages/shared/utils/* | [Notes] |
```

-----

# PART 4: FULL PRD

## Product Overview

**Product Name:** Singularity
**Version:** 1.0 MVP
**Last Updated:** December 28, 2025

### Vision

A personal health optimization platform that allows users to track biomarkers, manage supplement protocols, and receive AI-powered insights — all from structured health data parsed automatically via conversational AI.

### Core Value Proposition

- **AI-First Data Entry:** Upload lab images or paste raw text -> AI extracts and stores biomarker data
- **Singularity Management:** Track supplements, routines, and lifestyle interventions
- **Trend Analysis:** Visualize biomarker trends over time with reference ranges
- **Goal Tracking:** Link health goals to interventions and monitor progress
- **Multi-User:** Share with spouse, family, health coach

-----

## Platform Requirements

|Platform|Distribution        |
|--------|--------------------|
|iOS     |App Store           |
|Android |Google Play Store   |
|Web     |Browser (responsive)|

-----

## Tech Stack

|Layer            |Technology                             |
|-----------------|---------------------------------------|
|**Frontend**     |Expo (React Native) for iOS/Android/Web|
|**UI Framework** |NativeWind (TailwindCSS for RN)        |
|**Navigation**   |Expo Router                            |
|**Backend**      |Node.js + Express                      |
|**Database**     |Supabase (PostgreSQL + Auth + Storage) |
|**AI/LLM**       |Claude API (claude-sonnet-4-20250514)  |
|**Image Storage**|Supabase Storage                       |
|**Hosting**      |DigitalOcean App Platform              |

-----

## Data Models

### users

```javascript
{
  id: string,
  email: string,
  name: string,
  avatar: string,
  created: datetime,
  updated: datetime
}
```

### user_links (for family/spouse sharing)

```javascript
{
  id: string,
  owner_user: relation(users),      // Primary account
  linked_user: relation(users),     // Linked account
  permission: string,               // "read" | "write" | "admin"
  status: string,                   // "pending" | "active" | "revoked"
  invite_code: string,
  created: datetime
}
```

### biomarkers

```javascript
{
  id: string,
  user: relation(users),
  name: string,                    // "ALT", "HDL", "A1C"
  category: string,                // "Liver", "Lipids", "Metabolic"
  value: number,
  unit: string,
  date_tested: datetime,
  lab_source: string,
  reference_range_low: number,
  reference_range_high: number,
  optimal_range_low: number,
  optimal_range_high: number,
  notes: string,
  source_image: string,            // URL to uploaded image
  ai_extracted: boolean,
  created: datetime,
  updated: datetime
}
```

### supplements

```javascript
{
  id: string,
  user: relation(users),
  name: string,
  brand: string,
  dose: string,
  dose_per_serving: number,
  dose_unit: string,
  servings_per_container: number,
  price: number,
  price_per_serving: number,
  purchase_url: string,
  category: string,
  timing: string,
  frequency: string,
  is_active: boolean,
  notes: string,
  created: datetime,
  updated: datetime
}
```

### routines

```javascript
{
  id: string,
  user: relation(users),
  name: string,
  time_of_day: string,
  sort_order: number,
  created: datetime
}
```

### routine_items

```javascript
{
  id: string,
  routine: relation(routines),
  title: string,
  description: string,
  time: string,
  duration: string,
  days: json,                      // ["mon","wed","fri"] or all days
  linked_supplement: relation(supplements),
  sort_order: number,
  created: datetime
}
```

### goals

```javascript
{
  id: string,
  user: relation(users),
  title: string,
  category: string,
  target_biomarker: string,
  current_value: number,
  target_value: number,
  direction: string,               // "decrease" | "increase" | "maintain"
  status: string,                  // "active" | "achieved" | "paused"
  priority: number,
  notes: string,
  created: datetime,
  updated: datetime
}
```

### goal_interventions

```javascript
{
  id: string,
  goal: relation(goals),
  intervention: string,
  type: string,
  status: string,
  created: datetime
}
```

### change_log

```javascript
{
  id: string,
  user: relation(users),
  date: datetime,
  change_type: string,             // "started" | "stopped" | "modified"
  item_type: string,
  item_name: string,
  previous_value: string,
  new_value: string,
  reason: string,
  linked_concern: string,
  created: datetime
}
```

### protocol_docs (adapted from KB)

```javascript
{
  id: string,
  user: relation(users),
  title: string,
  content: text,                   // Markdown content
  category: string,                // "routine", "biomarkers", "supplements", etc.
  file_url: string,                // If uploaded as file
  created: datetime,
  updated: datetime
}
```

### ai_conversations

```javascript
{
  id: string,
  user: relation(users),
  context: string,
  messages: json,
  extracted_data: json,
  created: datetime,
  updated: datetime
}
```

-----

## Core Features

### Feature 1: AI-Powered Biomarker Entry (PRIMARY)

**Input Methods:**

1. **Image upload** — Photo of lab report -> AI extracts values
1. **Text paste** — Copy/paste raw lab text -> AI parses
1. **Conversational** — Chat with AI to add/update data
1. **Manual entry** — Update single metric via form

**AI Extraction Flow:**

```
User uploads image/text
    |
Image stored in DO Spaces
    |
Sent to Claude Vision API with extraction prompt
    |
AI returns structured JSON
    |
User reviews/edits extracted data
    |
Confirmed data saved to database
```

### Feature 2: Biomarker Dashboard

- Cards grouped by category
- Latest value with trend indicator (up/down/same)
- Status colors (green/yellow/red) based on ranges
- Detail view with historical chart
- Reference and optimal ranges displayed

### Feature 3: Supplement Manager

- List grouped by category
- Full details: brand, dose, price, purchase link
- Monthly cost auto-calculated
- Active/inactive status

### Feature 4: Routine Display

- Time-of-day blocks
- Day-specific logic (M/W/F vs T/Th/S)
- Cycle tracking (e.g., ashwagandha 2 weeks on/off)
- Reference only (no interactive checklist in MVP)

### Feature 5: Goals & Concerns

- Progress bars toward targets
- Linked interventions
- Status tracking (active/achieved/paused)

### Feature 6: Change Log

- Timeline of protocol changes
- Filter by type/category
- Link to related concerns

### Feature 7: Multi-User Sharing

- Invite family/spouse via code or email
- Permission levels (read/write/admin)
- Switch between linked accounts

### Feature 8: Data Export

- JSON, Markdown, CSV formats
- API endpoints for external access

-----

## API Endpoints

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# User Links
GET    /api/users/links
POST   /api/users/links/invite
POST   /api/users/links/accept
DELETE /api/users/links/:id

# Biomarkers
GET    /api/biomarkers
GET    /api/biomarkers/:id
GET    /api/biomarkers/marker/:name
GET    /api/biomarkers/latest
POST   /api/biomarkers
PUT    /api/biomarkers/:id
DELETE /api/biomarkers/:id

# Supplements
GET    /api/supplements
GET    /api/supplements/:id
POST   /api/supplements
PUT    /api/supplements/:id
DELETE /api/supplements/:id
GET    /api/supplements/costs/summary

# Routines
GET    /api/routines
GET    /api/routines/today
POST   /api/routines
PUT    /api/routines/:id
DELETE /api/routines/:id

# Goals
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id

# Change Log
GET    /api/changelog
POST   /api/changelog
DELETE /api/changelog/:id

# Singularity Docs (from KB)
GET    /api/docs
GET    /api/docs/:id
POST   /api/docs
PUT    /api/docs/:id
DELETE /api/docs/:id

# AI
POST   /api/ai/parse-image
POST   /api/ai/parse-text
POST   /api/ai/chat

# Export
GET    /api/export/json
GET    /api/export/markdown
GET    /api/export/csv
```

-----

## Infrastructure — DigitalOcean

### Resources

|Resource            |Spec         |Cost          |
|--------------------|-------------|--------------|
|App Platform (Basic)|1 vCPU, 512MB|$5/month      |
|Spaces              |250GB storage|$5/month      |
|**Total**           |             |**~$10/month**|

### Environment Variables

```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=https://your-app-domain.com
API_URL=https://api.yourdomain.com
```

-----

# PART 5: IMPLEMENTATION PHASES

## Phase 0: Codebase Extraction (Days 1-3) - NEW

**This phase MUST come first. Copy existing code before building anything new.**

- [ ] 0.1 Run Claude Code analysis on existing repo
- [ ] 0.2 Answer all questionnaire items
- [ ] 0.3 Create extraction mapping table
- [ ] 0.4 Copy authentication system (complete)
- [ ] 0.5 Copy Claude AI integration (complete)
- [ ] 0.6 Copy file upload system (complete)
- [ ] 0.7 Copy theming (dark/light mode)
- [ ] 0.8 Copy KB module -> adapt for protocol_docs
- [ ] 0.9 Copy chat agent -> adapt for health context
- [ ] 0.10 Copy multi-user system
- [ ] 0.11 Copy API key management
- [ ] 0.12 Copy base UI components
- [ ] 0.13 Copy utilities/helpers
- [ ] 0.14 Remove unused modules (time tracking, etc.)
- [ ] 0.15 Verify extracted code compiles

## Phase 1: Foundation (Week 1)

- [ ] 1.1 Initialize Expo project with TypeScript
- [ ] 1.2 Configure NativeWind
- [ ] 1.3 Set up Expo Router
- [ ] 1.4 Integrate copied auth system
- [ ] 1.5 Integrate copied theming
- [ ] 1.6 Configure Supabase project with all tables and RLS policies
- [ ] 1.7 Deploy to DigitalOcean

## Phase 2: AI Features (Week 2)

- [ ] 2.1 Adapt copied Claude integration
- [ ] 2.2 Adapt copied file upload for lab images
- [ ] 2.3 Build biomarker extraction prompts
- [ ] 2.4 Build Add Biomarkers screen (4 methods)
- [ ] 2.5 Build AI Data Review screen
- [ ] 2.6 Integrate copied chat agent

## Phase 3: Core Screens (Week 3)

- [ ] 3.1 Biomarker list screen
- [ ] 3.2 Biomarker detail with chart
- [ ] 3.3 Supplement list screen
- [ ] 3.4 Supplement form
- [ ] 3.5 Cost summary view

## Phase 4: Singularity Features (Week 4)

- [ ] 4.1 Routine display screen
- [ ] 4.2 Day-specific logic
- [ ] 4.3 Goals screen
- [ ] 4.4 Change log screen
- [ ] 4.5 Dashboard home

## Phase 5: Multi-User & Polish (Week 5)

- [ ] 5.1 Integrate copied multi-user system
- [ ] 5.2 Invite/link flow
- [ ] 5.3 Account switcher
- [ ] 5.4 Data export
- [ ] 5.5 Singularity docs (from KB)

## Phase 6: Deploy (Week 6)

- [ ] 6.1 Production deployment
- [ ] 6.2 iOS App Store submission
- [ ] 6.3 Android Play Store submission
- [ ] 6.4 Data migration from .md files

-----

# PART 6: CLAUDE CODE PROMPTS

## Prompt 0: Codebase Analysis (RUN FIRST)

```
[Copy the entire "First Prompt for Claude Code" from Part 1]
```

## Prompt 0.1: Answer Questionnaire

```
[Copy the entire questionnaire from Part 2]
```

## Prompt 0.2: Create Extraction Plan

```
Based on your analysis, create the complete extraction plan using this template:

[Copy the extraction template from Part 3]

Fill in ALL the [TO BE FILLED] sections with actual file paths from the existing codebase.

For each file, note:
1. Exact source path
2. Recommended destination path
3. What adaptations are needed
4. Dependencies it requires
5. Any gotchas or issues
```

## Prompt 1: Execute Extraction

```
Now execute the extraction plan. For each priority level:

1. Copy the files to the new project structure
2. Update import paths
3. Remove any code specific to the old app
4. Add TODO comments where adaptation is needed
5. Verify no syntax errors

Start with Priority 1 (Authentication) and confirm it's working before moving to Priority 2.

Create the new project structure:
/singularity
├── apps/
│   ├── mobile/          # Expo app
│   └── api/             # Node.js backend
├── packages/
│   └── shared/          # Shared types/utils
└── supabase/            # Supabase migrations and config
```

## Prompt 2: Adapt for Health App

```
Now adapt the copied code for the health protocol app:

1. Rename KB module to "Singularity Docs"
2. Update chat agent system prompt for health context
3. Add biomarker-specific types and validation
4. Configure Supabase tables per the PRD data models
5. Update any UI text/labels for health domain

Reference the PRD data models section for exact field names.
```

## Prompt 3: Build New Features

```
With the foundation in place, build the health-specific features:

1. Biomarker extraction prompts (image + text)
2. Biomarker dashboard with status indicators
3. Supplement cost calculator
4. Routine day-specific logic
5. Goals progress tracking

Use the copied UI components as the base.
```

-----

# APPENDIX: File Structure Target

```
singularity/
├── apps/
│   ├── mobile/
│   │   ├── app/                    # Expo Router pages
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   └── register.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx       # Dashboard
│   │   │   │   ├── biomarkers/
│   │   │   │   ├── supplements/
│   │   │   │   ├── routine.tsx
│   │   │   │   ├── goals.tsx
│   │   │   │   └── settings.tsx
│   │   │   ├── chat.tsx
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # Copied base components
│   │   │   ├── biomarkers/
│   │   │   ├── supplements/
│   │   │   ├── chat/               # Copied chat components
│   │   │   └── kb/                 # Copied KB -> Singularity Docs
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx     # Copied
│   │   │   └── ThemeContext.tsx    # Copied
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Copied
│   │   │   └── useTheme.ts         # Copied
│   │   └── lib/
│   │       ├── api.ts
│   │       └── supabase.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.js         # Copied
│       │   │   ├── biomarkers.js
│       │   │   ├── supplements.js
│       │   │   ├── ai.js           # Copied + adapted
│       │   │   └── upload.js       # Copied
│       │   ├── services/
│       │   │   ├── claude.js       # Copied
│       │   │   ├── supabase.js     # Copied
│       │   │   └── storage.js      # Copied
│       │   ├── middleware/
│       │   │   └── auth.js         # Copied
│       │   └── prompts/
│       │       └── claude.md       # Copied
│       └── .env
│
├── packages/
│   └── shared/
│       ├── types/                  # Copied + extended
│       └── utils/                  # Copied
│
├── supabase/
│   └── migrations/
│
└── docker-compose.yml
```

-----

# NEXT STEPS

1. **Copy this entire document** into your project or share with Claude Code
1. **Run the codebase analysis** (Part 1 prompts)
1. **Have Claude Code answer all questions** (Part 2)
1. **Review the answers together** - I'll help finalize the PRD
1. **Execute extraction** (Part 3 & 6)
1. **Build health-specific features**

Once Claude Code completes the analysis, share the answers with me and we'll finalize the extraction plan with exact file paths.
