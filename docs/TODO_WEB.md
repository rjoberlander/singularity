# Singularity Web App - Implementation TODO List

**Platform:** Next.js 14 (App Router) with React
**Location:** `apps/web/` (to be created)
**Last Updated:** December 28, 2025

---

## Overview

This document contains all implementation tasks for the Singularity web application. This is a separate Next.js project that provides a responsive web experience with SSR/SEO capabilities.

### Why Separate Web App?
- Better SEO with server-side rendering
- Faster initial load times
- More flexibility for web-specific features
- Can use web-optimized charting libraries
- Better desktop UX with sidebar navigation

### Shared Resources
- Backend API: `apps/api/` (already complete)
- Database: Supabase (already configured)
- Types: Can share with mobile via `packages/shared/`

---

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project
**Priority:** Critical
**Effort:** Small

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Configuration choices:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: @/*

---

### 1.2 Install Dependencies
**Priority:** Critical
**Effort:** Small

```bash
cd apps/web

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI Components (shadcn/ui)
npx shadcn-ui@latest init

# Data fetching
npm install @tanstack/react-query axios

# Charts
npm install recharts

# Forms
npm install react-hook-form @hookform/resolvers zod

# Date handling
npm install date-fns

# Icons
npm install lucide-react

# Markdown
npm install react-markdown remark-gfm
```

---

### 1.3 Configure Environment Variables
**File:** `apps/web/.env.local`
**Priority:** Critical
**Effort:** Small

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

### 1.4 Set Up Supabase Auth (SSR)
**Priority:** Critical
**Effort:** Medium

Files to create:
- [ ] `src/lib/supabase/client.ts` - Browser client
- [ ] `src/lib/supabase/server.ts` - Server client
- [ ] `src/lib/supabase/middleware.ts` - Auth middleware
- [ ] `middleware.ts` - Next.js middleware for auth

Reference: https://supabase.com/docs/guides/auth/server-side/nextjs

---

### 1.5 Install shadcn/ui Components
**Priority:** Critical
**Effort:** Small

```bash
# Run after shadcn-ui init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add separator
```

---

### 1.6 Create Base Layout
**File:** `src/app/layout.tsx`
**Priority:** Critical
**Effort:** Small

- [ ] Add Providers (QueryClient, Theme, Auth)
- [ ] Add Toaster component
- [ ] Configure fonts (Inter)
- [ ] Set up metadata

---

### 1.7 Create API Client
**File:** `src/lib/api.ts`
**Priority:** Critical
**Effort:** Small

- [ ] Create axios instance with base URL
- [ ] Add auth token interceptor
- [ ] Add error handling
- [ ] Create typed API functions for all endpoints

---

### 1.8 Create React Query Hooks
**Location:** `src/hooks/`
**Priority:** Critical
**Effort:** Medium

- [ ] `useBiomarkers.ts`
- [ ] `useSupplements.ts`
- [ ] `useRoutines.ts`
- [ ] `useGoals.ts`
- [ ] `useAI.ts`
- [ ] `useChangeLog.ts`
- [ ] `useUserLinks.ts`
- [ ] `useProtocolDocs.ts`

---

## Phase 2: Authentication Pages

### 2.1 Create Login Page
**File:** `src/app/(auth)/login/page.tsx`
**Priority:** Critical
**Effort:** Medium

- [ ] Email/password form
- [ ] "Remember me" checkbox
- [ ] Forgot password link
- [ ] Register link
- [ ] Error handling
- [ ] Redirect on success

---

### 2.2 Create Register Page
**File:** `src/app/(auth)/register/page.tsx`
**Priority:** Critical
**Effort:** Medium

- [ ] Name, email, password form
- [ ] Password confirmation
- [ ] Terms acceptance checkbox
- [ ] Login link
- [ ] Error handling

---

### 2.3 Create Forgot Password Page
**File:** `src/app/(auth)/forgot-password/page.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Email input
- [ ] Send reset link button
- [ ] Success message

---

### 2.4 Create Reset Password Page
**File:** `src/app/(auth)/reset-password/page.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] New password form
- [ ] Confirm password
- [ ] Token validation

---

### 2.5 Create Auth Layout
**File:** `src/app/(auth)/layout.tsx`
**Priority:** Critical
**Effort:** Small

- [ ] Centered card layout
- [ ] App logo/branding
- [ ] No sidebar/header

---

## Phase 3: App Shell & Navigation

### 3.1 Create Dashboard Layout
**File:** `src/app/(dashboard)/layout.tsx`
**Priority:** Critical
**Effort:** Medium

- [ ] Sidebar navigation (desktop)
- [ ] Mobile drawer (Sheet component)
- [ ] Header with user menu
- [ ] Main content area
- [ ] Auth guard (redirect if not logged in)

---

### 3.2 Create Sidebar Component
**File:** `src/components/layout/Sidebar.tsx`
**Priority:** Critical
**Effort:** Medium

Navigation items:
- [ ] Dashboard (home icon)
- [ ] Biomarkers (activity icon)
- [ ] Supplements (pill icon)
- [ ] Routines (clock icon)
- [ ] Goals (target icon)
- [ ] Change Log (history icon)
- [ ] Protocol Docs (file-text icon)
- [ ] AI Chat (message-circle icon)
- [ ] Settings (settings icon)

Features:
- [ ] Active state highlighting
- [ ] Collapse/expand on desktop
- [ ] User profile at bottom

---

### 3.3 Create Header Component
**File:** `src/components/layout/Header.tsx`
**Priority:** Critical
**Effort:** Small

- [ ] Page title (dynamic)
- [ ] Search bar (optional)
- [ ] Account switcher dropdown
- [ ] Theme toggle
- [ ] User menu dropdown (profile, settings, logout)

---

### 3.4 Create Mobile Navigation
**File:** `src/components/layout/MobileNav.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Hamburger menu trigger
- [ ] Sheet with navigation links
- [ ] Same items as sidebar

---

## Phase 4: Dashboard Page

### 4.1 Create Dashboard Page
**File:** `src/app/(dashboard)/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Welcome message with user name
- [ ] Stats cards (biomarkers, supplements, goals, routines)
- [ ] Quick actions section
- [ ] Recent activity feed
- [ ] Today's routine summary

---

### 4.2 Create Stats Card Component
**File:** `src/components/dashboard/StatsCard.tsx`
**Priority:** High
**Effort:** Small

- [ ] Icon
- [ ] Value
- [ ] Label
- [ ] Trend indicator (optional)
- [ ] Click to navigate

---

### 4.3 Create Recent Activity Component
**File:** `src/components/dashboard/RecentActivity.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch from change_log
- [ ] Timeline display
- [ ] Click to view details

---

## Phase 5: Biomarkers Module

### 5.1 Create Biomarkers List Page
**File:** `src/app/(dashboard)/biomarkers/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Search input
- [ ] Category filter tabs
- [ ] Grid/list toggle
- [ ] Biomarker cards
- [ ] Add button (link to add page)
- [ ] Pagination or infinite scroll
- [ ] Loading skeletons
- [ ] Empty state

---

### 5.2 Create Biomarker Card Component
**File:** `src/components/biomarkers/BiomarkerCard.tsx`
**Priority:** High
**Effort:** Small

- [ ] Name and category
- [ ] Current value with unit
- [ ] Status badge (low/normal/high/optimal)
- [ ] Reference range display
- [ ] Date tested
- [ ] Trend indicator (mini sparkline)
- [ ] Click to view details

---

### 5.3 Create Add Biomarker Page
**File:** `src/app/(dashboard)/biomarkers/add/page.tsx`
**Priority:** High
**Effort:** Large

Tabs:
- [ ] **Manual Entry** - Form with all fields
- [ ] **Image Upload** - Drag & drop zone, camera capture
- [ ] **Text Paste** - Large text area
- [ ] **AI Chat** - Chat interface for guided entry

Common:
- [ ] Progress indicator
- [ ] Cancel button
- [ ] Submit/Extract button

---

### 5.4 Create AI Review Page
**File:** `src/app/(dashboard)/biomarkers/review/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Receive extracted data from session/URL
- [ ] Editable table of biomarkers
- [ ] Confidence indicators
- [ ] Remove individual items
- [ ] Edit values inline
- [ ] Confirm all button
- [ ] Lab info display

---

### 5.5 Create Biomarker Detail Page
**File:** `src/app/(dashboard)/biomarkers/[id]/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Current value card
- [ ] Status explanation
- [ ] Reference & optimal ranges
- [ ] **Historical chart (line chart with recharts)**
- [ ] Notes section
- [ ] Edit/Delete buttons
- [ ] Related goals (if any)

---

### 5.6 Create Biomarker Chart Component
**File:** `src/components/biomarkers/BiomarkerChart.tsx`
**Priority:** High
**Effort:** Medium

Using recharts:
- [ ] Line chart with data points
- [ ] Reference range as shaded area
- [ ] Optimal range as different color
- [ ] Tooltips on hover
- [ ] Date axis
- [ ] Responsive sizing

---

### 5.7 Create Edit Biomarker Page
**File:** `src/app/(dashboard)/biomarkers/[id]/edit/page.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Pre-populated form
- [ ] Same fields as add
- [ ] Update button
- [ ] Delete button with confirmation

---

## Phase 6: Supplements Module

### 6.1 Create Supplements List Page
**File:** `src/app/(dashboard)/supplements/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Summary card (count, daily cost, monthly cost)
- [ ] Show inactive toggle
- [ ] Category filter
- [ ] Supplement cards/table
- [ ] Add button
- [ ] Loading/empty states

---

### 6.2 Create Supplement Card Component
**File:** `src/components/supplements/SupplementCard.tsx`
**Priority:** High
**Effort:** Small

- [ ] Name and brand
- [ ] Dose badge
- [ ] Timing and frequency
- [ ] Active/inactive toggle switch
- [ ] Price per serving
- [ ] Purchase link icon

---

### 6.3 Create Supplement Table Component
**File:** `src/components/supplements/SupplementTable.tsx`
**Priority:** Medium
**Effort:** Medium

Alternative view:
- [ ] Sortable columns
- [ ] Inline toggle
- [ ] Actions column (edit, delete)

---

### 6.4 Create Add/Edit Supplement Page
**File:** `src/app/(dashboard)/supplements/add/page.tsx`
**File:** `src/app/(dashboard)/supplements/[id]/edit/page.tsx`
**Priority:** High
**Effort:** Medium

Form with:
- [ ] Name (required)
- [ ] Brand
- [ ] Dose
- [ ] Dose per serving + unit
- [ ] Servings per container
- [ ] Price
- [ ] Purchase URL
- [ ] Category (dropdown)
- [ ] Timing (dropdown)
- [ ] Frequency (dropdown)
- [ ] Notes

Auto-calculate:
- [ ] Price per serving on change

---

### 6.5 Create Cost Summary Component
**File:** `src/components/supplements/CostSummary.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Daily total
- [ ] Weekly total
- [ ] Monthly total
- [ ] Yearly projection

---

## Phase 7: Routines Module

### 7.1 Create Routines Page
**File:** `src/app/(dashboard)/routines/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Today's progress card
- [ ] Day selector (week view)
- [ ] Routine sections by time of day
- [ ] Routine items with checkboxes
- [ ] Add routine button
- [ ] Add item button per routine

---

### 7.2 Create Routine Section Component
**File:** `src/components/routines/RoutineSection.tsx`
**Priority:** High
**Effort:** Small

- [ ] Title (Morning, Evening, etc.)
- [ ] Progress indicator
- [ ] List of items
- [ ] Add item button
- [ ] Edit routine button

---

### 7.3 Create Routine Item Component
**File:** `src/components/routines/RoutineItem.tsx`
**Priority:** High
**Effort:** Small

- [ ] Checkbox
- [ ] Title
- [ ] Time and duration
- [ ] Linked supplement badge
- [ ] Click to edit

---

### 7.4 Create Add/Edit Routine Dialog
**File:** `src/components/routines/RoutineDialog.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Name input
- [ ] Time of day dropdown
- [ ] Submit/cancel buttons

---

### 7.5 Create Add/Edit Routine Item Dialog
**File:** `src/components/routines/RoutineItemDialog.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Title
- [ ] Description
- [ ] Time picker
- [ ] Duration
- [ ] Days multi-select
- [ ] Link to supplement (combobox)
- [ ] Submit/cancel

---

## Phase 8: Goals Module

### 8.1 Create Goals Page
**File:** `src/app/(dashboard)/goals/page.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Stats header (active, achieved)
- [ ] Filter tabs (all, active, achieved, paused)
- [ ] Goals list/grid
- [ ] Add goal button

---

### 8.2 Create Goal Card Component
**File:** `src/components/goals/GoalCard.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Title and category
- [ ] Status dot
- [ ] Target biomarker section (if set)
- [ ] Current → Target values
- [ ] Progress bar
- [ ] Direction indicator (up/down/maintain)
- [ ] Interventions list
- [ ] Click to view details

---

### 8.3 Create Goal Detail Page
**File:** `src/app/(dashboard)/goals/[id]/page.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Full goal details
- [ ] Progress visualization
- [ ] Linked biomarker chart (if applicable)
- [ ] Interventions management
- [ ] Status actions (mark achieved, pause)
- [ ] Edit/delete buttons

---

### 8.4 Create Add/Edit Goal Page
**File:** `src/app/(dashboard)/goals/add/page.tsx`
**File:** `src/app/(dashboard)/goals/[id]/edit/page.tsx`
**Priority:** High
**Effort:** Medium

Form:
- [ ] Title
- [ ] Category dropdown
- [ ] Target biomarker (combobox with user's biomarkers)
- [ ] Current value
- [ ] Target value
- [ ] Direction (increase/decrease/maintain)
- [ ] Priority
- [ ] Notes

---

### 8.5 Create Add Intervention Dialog
**File:** `src/components/goals/InterventionDialog.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Intervention name
- [ ] Type dropdown
- [ ] Submit

---

## Phase 9: AI Chat

### 9.1 Create Chat Page
**File:** `src/app/(dashboard)/chat/page.tsx`
**Priority:** High
**Effort:** Large

- [ ] Full-height layout
- [ ] Message history (scrollable)
- [ ] User/AI message bubbles
- [ ] Input area at bottom
- [ ] Send button
- [ ] Include health data toggle
- [ ] Conversation list sidebar (optional)

---

### 9.2 Create Message Bubble Component
**File:** `src/components/chat/MessageBubble.tsx`
**Priority:** High
**Effort:** Small

- [ ] User style (right aligned, colored)
- [ ] AI style (left aligned, gray)
- [ ] Timestamp
- [ ] Markdown rendering for AI

---

### 9.3 Create Chat Input Component
**File:** `src/components/chat/ChatInput.tsx`
**Priority:** High
**Effort:** Small

- [ ] Textarea (auto-resize)
- [ ] Send button
- [ ] Enter to send (Shift+Enter for newline)
- [ ] Loading state

---

### 9.4 Create Conversation List Component
**File:** `src/components/chat/ConversationList.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] List past conversations
- [ ] Date/context grouping
- [ ] Click to load conversation
- [ ] New conversation button

---

## Phase 10: Change Log

### 10.1 Create Change Log Page
**File:** `src/app/(dashboard)/changelog/page.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Timeline view
- [ ] Filter by type (started, stopped, modified)
- [ ] Filter by category
- [ ] Date range filter
- [ ] Change details cards

---

### 10.2 Create Change Log Entry Component
**File:** `src/components/changelog/ChangeLogEntry.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Icon by change type
- [ ] Date/time
- [ ] Item name and type
- [ ] Previous → New value
- [ ] Reason (if provided)

---

## Phase 11: Protocol Docs

### 11.1 Create Docs List Page
**File:** `src/app/(dashboard)/docs/page.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Category tabs
- [ ] Search input
- [ ] Doc cards/list
- [ ] Add button

---

### 11.2 Create Doc Viewer Page
**File:** `src/app/(dashboard)/docs/[id]/page.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Title and category badge
- [ ] Markdown content rendered
- [ ] Edit/delete buttons
- [ ] File download (if file attached)

---

### 11.3 Create Add/Edit Doc Page
**File:** `src/app/(dashboard)/docs/add/page.tsx`
**File:** `src/app/(dashboard)/docs/[id]/edit/page.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Title input
- [ ] Category dropdown
- [ ] Markdown editor (textarea with preview)
- [ ] File upload (optional)
- [ ] Save/cancel buttons

---

## Phase 12: Settings

### 12.1 Create Settings Page
**File:** `src/app/(dashboard)/settings/page.tsx`
**Priority:** High
**Effort:** Medium

Sections:
- [ ] Profile (avatar, name, email)
- [ ] Appearance (theme toggle)
- [ ] Linked Accounts (family sharing)
- [ ] Export Data
- [ ] Security (change password)
- [ ] Danger Zone (delete account)

---

### 12.2 Create Profile Section
**Priority:** High
**Effort:** Small

- [ ] Avatar upload
- [ ] Name input
- [ ] Email (read-only)
- [ ] Save button

---

### 12.3 Create Linked Accounts Section
**Priority:** Medium
**Effort:** Medium

- [ ] List of linked users
- [ ] Permission level badges
- [ ] Revoke access button
- [ ] Invite new user button
- [ ] Invite dialog (email + permission)

---

### 12.4 Create Export Data Section
**Priority:** Medium
**Effort:** Medium

- [ ] Export as JSON button
- [ ] Export as CSV button
- [ ] Export as Markdown button
- [ ] Select data types to include

---

### 12.5 Create Theme Toggle
**Priority:** Medium
**Effort:** Small

- [ ] System/Light/Dark options
- [ ] Save preference
- [ ] Apply immediately

---

## Phase 13: Multi-User Features

### 13.1 Create Account Switcher
**File:** `src/components/layout/AccountSwitcher.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Current user display
- [ ] Dropdown with linked users
- [ ] "Viewing as: X" indicator
- [ ] Click to switch context
- [ ] Pass user_id to API calls

---

### 13.2 Create Accept Invite Page
**File:** `src/app/invite/[code]/page.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Public page (no auth required)
- [ ] Show inviter info
- [ ] Accept button (requires login)
- [ ] Redirect to login if not authenticated

---

## Phase 14: Additional Features

### 14.1 Add Loading States
**Priority:** High
**Effort:** Medium

- [ ] Skeleton components for all list pages
- [ ] Loading spinners for actions
- [ ] Optimistic updates where appropriate

---

### 14.2 Add Error Handling
**Priority:** High
**Effort:** Medium

- [ ] Error boundary component
- [ ] Toast notifications for errors
- [ ] Retry buttons
- [ ] Graceful degradation

---

### 14.3 Add Keyboard Shortcuts
**Priority:** Low
**Effort:** Medium

- [ ] N for new item
- [ ] / for search
- [ ] Esc to close dialogs
- [ ] Help modal with shortcuts

---

### 14.4 Add Responsive Design
**Priority:** High
**Effort:** Medium

- [ ] Test all pages on mobile
- [ ] Adjust layouts for tablet
- [ ] Touch-friendly interactions

---

## File Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx (dashboard)
│   │   │   ├── layout.tsx
│   │   │   ├── biomarkers/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── add/page.tsx
│   │   │   │   ├── review/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── supplements/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── add/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/page.tsx
│   │   │   ├── routines/
│   │   │   │   └── page.tsx
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── add/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   ├── changelog/
│   │   │   │   └── page.tsx
│   │   │   ├── docs/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── add/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── invite/
│   │   │   └── [code]/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx (redirect to dashboard or login)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── AccountSwitcher.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── biomarkers/
│   │   │   ├── BiomarkerCard.tsx
│   │   │   ├── BiomarkerChart.tsx
│   │   │   ├── BiomarkerForm.tsx
│   │   │   └── AIReviewTable.tsx
│   │   ├── supplements/
│   │   │   ├── SupplementCard.tsx
│   │   │   ├── SupplementTable.tsx
│   │   │   ├── SupplementForm.tsx
│   │   │   └── CostSummary.tsx
│   │   ├── routines/
│   │   │   ├── RoutineSection.tsx
│   │   │   ├── RoutineItem.tsx
│   │   │   ├── RoutineDialog.tsx
│   │   │   └── RoutineItemDialog.tsx
│   │   ├── goals/
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   └── InterventionDialog.tsx
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ConversationList.tsx
│   │   ├── changelog/
│   │   │   └── ChangeLogEntry.tsx
│   │   └── docs/
│   │       ├── DocCard.tsx
│   │       └── MarkdownEditor.tsx
│   ├── hooks/
│   │   ├── useBiomarkers.ts
│   │   ├── useSupplements.ts
│   │   ├── useRoutines.ts
│   │   ├── useGoals.ts
│   │   ├── useAI.ts
│   │   ├── useChangeLog.ts
│   │   ├── useUserLinks.ts
│   │   └── useProtocolDocs.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── utils.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── middleware.ts
│   ├── providers/
│   │   ├── QueryProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── AuthProvider.tsx
│   └── types/
│       └── index.ts
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

---

## API Endpoints Reference

All endpoints are at `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001/api/v1`)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Biomarkers
- `GET /biomarkers` - List biomarkers (query: user_id, category, name, date_from, date_to, limit)
- `GET /biomarkers/:id` - Get single biomarker
- `GET /biomarkers/history/:name` - Get history for biomarker name
- `POST /biomarkers` - Create biomarker
- `POST /biomarkers/bulk` - Create multiple biomarkers
- `PUT /biomarkers/:id` - Update biomarker
- `DELETE /biomarkers/:id` - Delete biomarker

### Supplements
- `GET /supplements` - List supplements (query: user_id, category, is_active)
- `GET /supplements/:id` - Get single supplement
- `POST /supplements` - Create supplement
- `PUT /supplements/:id` - Update supplement
- `PATCH /supplements/:id/toggle` - Toggle active status
- `DELETE /supplements/:id` - Delete supplement

### Routines
- `GET /routines` - List routines
- `GET /routines/:id` - Get routine with items
- `POST /routines` - Create routine
- `PUT /routines/:id` - Update routine
- `DELETE /routines/:id` - Delete routine
- (Similar for routine_items)

### Goals
- `GET /goals` - List goals
- `GET /goals/:id` - Get goal with interventions
- `POST /goals` - Create goal
- `PUT /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal

### AI
- `POST /ai/extract-biomarkers` - Extract from image/text
- `POST /ai/chat` - Chat with AI assistant
- `GET /ai/conversations` - Get conversation history

### Protocol Docs
- `GET /protocol-docs` - List docs
- `GET /protocol-docs/:id` - Get doc
- `POST /protocol-docs` - Create doc
- `PUT /protocol-docs/:id` - Update doc
- `DELETE /protocol-docs/:id` - Delete doc

### Users & Sharing
- `GET /users/links` - Get linked users
- `POST /users/links/invite` - Create invite
- `POST /users/links/accept` - Accept invite
- `DELETE /users/links/:id` - Revoke access

---

## Testing Checklist

Before deploying, verify:

- [ ] User can register and login
- [ ] Password reset flow works
- [ ] Dashboard shows real data
- [ ] Biomarkers CRUD works
- [ ] AI biomarker extraction works (image + text)
- [ ] Biomarker charts display correctly
- [ ] Supplements CRUD works
- [ ] Toggle supplement active status works
- [ ] Cost calculations are accurate
- [ ] Routines CRUD works
- [ ] Routine items can be checked off
- [ ] Day filtering works
- [ ] Goals CRUD works
- [ ] Goal progress updates correctly
- [ ] AI chat works
- [ ] Chat includes health context when enabled
- [ ] Change log displays
- [ ] Protocol docs CRUD works
- [ ] Settings save correctly
- [ ] Theme toggle works
- [ ] Multi-user invite works
- [ ] Account switching works
- [ ] Data export downloads files
- [ ] Responsive design works on mobile
- [ ] Loading states display
- [ ] Error handling works

---

## Notes for Agent

1. **Start with Phase 1 & 2** - Project setup and auth are required first
2. **Use shadcn/ui components** - They're already styled and accessible
3. **Follow Next.js 14 patterns** - Use App Router, Server Components where possible
4. **Share types with mobile** - Consider creating `packages/shared/types`
5. **Test auth flow early** - Supabase SSR auth can be tricky
6. **Use environment variables** - Never hardcode API URLs or keys
7. **Dark theme default** - Match mobile app's dark theme
8. **Recharts for charts** - It's well-documented and React-friendly
