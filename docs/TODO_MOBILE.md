# Singularity Mobile App - Implementation TODO List

**Platform:** Expo (React Native) - iOS, Android, and Web export
**Location:** `apps/mobile/`
**Last Updated:** December 28, 2025

---

## Overview

This document contains all implementation tasks for the Singularity mobile app. The app currently has UI shells with sample data but needs API integration and additional screens.

### Current State
- ✅ Expo project initialized with TypeScript
- ✅ Expo Router navigation configured
- ✅ Auth screens (login/register) exist
- ✅ Tab screens exist (dashboard, biomarkers, supplements, goals, routines)
- ✅ UI component library (17 components in `components/ui/`)
- ✅ AuthContext and Supabase client configured
- ❌ Screens use hardcoded sample data (not connected to API)
- ❌ Missing: Add/Edit forms, AI chat, settings, change log

### Backend API Reference
Base URL: `http://localhost:3001/api/v1`
All protected routes require `Authorization: Bearer <token>` header.

---

## Phase 1: API Integration Layer (MUST DO FIRST)

### 1.1 Create API Client Service
**File:** `apps/mobile/lib/api.ts`
**Priority:** Critical
**Effort:** Small

```typescript
// Tasks:
// - Create axios or fetch wrapper with base URL
// - Add auth token injection from AuthContext
// - Add request/response interceptors
// - Add error handling (401 redirect to login, etc.)
// - Add retry logic for network errors
```

**Endpoints to support:**
- `GET/POST/PUT/DELETE /biomarkers`
- `GET/POST/PUT/DELETE /supplements`
- `GET/POST/PUT/DELETE /routines`
- `GET/POST/PUT/DELETE /goals`
- `POST /ai/extract-biomarkers`
- `POST /ai/chat`
- `GET /ai/conversations`
- `GET/POST/PUT/DELETE /protocol-docs`
- `GET/POST/DELETE /users/links`

---

### 1.2 Create Data Fetching Hooks
**Location:** `apps/mobile/hooks/`
**Priority:** Critical
**Effort:** Medium

Install React Query:
```bash
npm install @tanstack/react-query
```

Create hooks:
- [ ] `hooks/useBiomarkers.ts` - CRUD operations for biomarkers
- [ ] `hooks/useSupplements.ts` - CRUD operations for supplements
- [ ] `hooks/useRoutines.ts` - CRUD operations for routines
- [ ] `hooks/useGoals.ts` - CRUD operations for goals
- [ ] `hooks/useAI.ts` - AI extraction and chat
- [ ] `hooks/useChangeLog.ts` - Change log operations
- [ ] `hooks/useUserLinks.ts` - Multi-user sharing
- [ ] `hooks/useProtocolDocs.ts` - Protocol docs CRUD

Each hook should provide:
- `data` - fetched data
- `isLoading` - loading state
- `error` - error state
- `refetch` - manual refetch
- `mutate` functions for create/update/delete

---

### 1.3 Set Up React Query Provider
**File:** `apps/mobile/app/_layout.tsx`
**Priority:** Critical
**Effort:** Small

- [ ] Wrap app with QueryClientProvider
- [ ] Configure default options (stale time, retry, etc.)

---

## Phase 2: Biomarkers Module

### 2.1 Connect Biomarkers List to API
**File:** `apps/mobile/app/(tabs)/biomarkers.tsx`
**Priority:** High
**Effort:** Small

- [ ] Replace `SAMPLE_BIOMARKERS` with `useBiomarkers()` hook
- [ ] Add loading skeleton
- [ ] Add error state
- [ ] Add pull-to-refresh
- [ ] Connect category filter chips to API query params

---

### 2.2 Create Add Biomarker Screen
**File:** `apps/mobile/app/biomarkers/add.tsx`
**Priority:** High
**Effort:** Large

Create a screen with 4 input method tabs:

#### Tab 1: Manual Entry
- [ ] Form fields: name, value, unit, date_tested, category
- [ ] Reference range inputs (low/high)
- [ ] Optimal range inputs (low/high)
- [ ] Notes field
- [ ] Submit to `POST /biomarkers`

#### Tab 2: Image Upload
- [ ] Camera button (expo-image-picker)
- [ ] Gallery button
- [ ] Preview uploaded image
- [ ] "Extract" button → `POST /ai/extract-biomarkers` with `source_type: 'image'`
- [ ] Navigate to Review screen with extracted data

#### Tab 3: Text Paste
- [ ] Large text input for pasting lab results
- [ ] "Extract" button → `POST /ai/extract-biomarkers` with `source_type: 'text'`
- [ ] Navigate to Review screen with extracted data

#### Tab 4: Chat Entry (Optional for MVP)
- [ ] Simple chat interface
- [ ] "Add from conversation" button

**Dependencies:**
```bash
npm install expo-image-picker
```

---

### 2.3 Create AI Review Screen
**File:** `apps/mobile/app/biomarkers/review.tsx`
**Priority:** High
**Effort:** Medium

- [ ] Receive extracted biomarkers as route params
- [ ] Display list of extracted biomarkers as editable cards
- [ ] Allow user to edit/delete individual items
- [ ] Show confidence scores from AI
- [ ] "Confirm All" button → `POST /biomarkers/bulk`
- [ ] Success → navigate to biomarkers list
- [ ] Show lab_info (lab name, test date) if extracted

---

### 2.4 Create Biomarker Detail Screen
**File:** `apps/mobile/app/biomarkers/[id].tsx`
**Priority:** High
**Effort:** Medium

- [ ] Fetch single biomarker by ID
- [ ] Display current value with status badge
- [ ] Show reference and optimal ranges
- [ ] Display notes
- [ ] Edit button → navigate to edit form
- [ ] Delete button with confirmation

---

### 2.5 Add Historical Chart
**File:** `apps/mobile/app/biomarkers/[id].tsx` (or separate component)
**Priority:** High
**Effort:** Medium

- [ ] Fetch history via `GET /biomarkers/history/:name`
- [ ] Line chart showing values over time
- [ ] Show reference range as shaded area
- [ ] Show optimal range as different shaded area

**Dependencies:**
```bash
npm install react-native-chart-kit
# OR
npm install victory-native
```

---

### 2.6 Create Edit Biomarker Screen
**File:** `apps/mobile/app/biomarkers/edit/[id].tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Pre-populate form with existing data
- [ ] Submit to `PUT /biomarkers/:id`
- [ ] Navigate back on success

---

## Phase 3: Supplements Module

### 3.1 Connect Supplements List to API
**File:** `apps/mobile/app/(tabs)/supplements.tsx`
**Priority:** High
**Effort:** Small

- [ ] Replace `SAMPLE_SUPPLEMENTS` with `useSupplements()` hook
- [ ] Connect toggle switch to `PATCH /supplements/:id/toggle`
- [ ] Add loading/error states
- [ ] Calculate totals from real data

---

### 3.2 Create Add/Edit Supplement Screen
**File:** `apps/mobile/app/supplements/add.tsx`
**File:** `apps/mobile/app/supplements/edit/[id].tsx`
**Priority:** High
**Effort:** Medium

Form fields:
- [ ] name (required)
- [ ] brand
- [ ] dose
- [ ] dose_per_serving (number)
- [ ] dose_unit
- [ ] servings_per_container (number)
- [ ] price (number)
- [ ] purchase_url
- [ ] category (picker: vitamins, minerals, amino acids, herbs, other)
- [ ] timing (picker: morning, afternoon, evening, with meals, etc.)
- [ ] frequency (picker: daily, twice daily, as needed, etc.)
- [ ] notes

- [ ] Auto-calculate price_per_serving on change
- [ ] Submit to `POST /supplements` or `PUT /supplements/:id`

---

### 3.3 Create Supplement Detail Screen
**File:** `apps/mobile/app/supplements/[id].tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Display all supplement details
- [ ] Purchase link (open in browser)
- [ ] Edit/Delete buttons

---

## Phase 4: Routines Module

### 4.1 Connect Routines to API
**File:** `apps/mobile/app/(tabs)/routines.tsx`
**Priority:** High
**Effort:** Small

- [ ] Fetch routines with `useRoutines()` hook
- [ ] Fetch routine_items for each routine
- [ ] Calculate progress from real data

---

### 4.2 Create Add/Edit Routine Screen
**File:** `apps/mobile/app/routines/add.tsx`
**File:** `apps/mobile/app/routines/edit/[id].tsx`
**Priority:** High
**Effort:** Medium

Form fields:
- [ ] name
- [ ] time_of_day (picker: morning, afternoon, evening, night)
- [ ] sort_order

---

### 4.3 Create Add/Edit Routine Item Screen
**File:** `apps/mobile/app/routines/items/add.tsx`
**File:** `apps/mobile/app/routines/items/edit/[id].tsx`
**Priority:** High
**Effort:** Medium

Form fields:
- [ ] title
- [ ] description
- [ ] time
- [ ] duration
- [ ] days (multi-select: Mon-Sun)
- [ ] linked_supplement (picker from user's supplements)
- [ ] sort_order

---

### 4.4 Implement Day Filtering
**Priority:** Medium
**Effort:** Medium

- [ ] Filter routine items by selected day
- [ ] Handle "days" field matching

---

## Phase 5: Goals Module

### 5.1 Connect Goals to API
**File:** `apps/mobile/app/(tabs)/goals.tsx`
**Priority:** High
**Effort:** Small

- [ ] Replace `SAMPLE_GOALS` with `useGoals()` hook
- [ ] Fetch goal_interventions for each goal

---

### 5.2 Create Add/Edit Goal Screen
**File:** `apps/mobile/app/goals/add.tsx`
**File:** `apps/mobile/app/goals/edit/[id].tsx`
**Priority:** High
**Effort:** Medium

Form fields:
- [ ] title
- [ ] category
- [ ] target_biomarker (optional - autocomplete from user's biomarkers)
- [ ] current_value
- [ ] target_value
- [ ] direction (picker: increase, decrease, maintain)
- [ ] priority (number)
- [ ] notes

---

### 5.3 Create Goal Detail Screen
**File:** `apps/mobile/app/goals/[id].tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Display goal details with progress
- [ ] List interventions
- [ ] Add intervention modal/screen
- [ ] Status change buttons (mark achieved, pause, resume)
- [ ] Link to related biomarker if set

---

### 5.4 Add Intervention Modal
**Priority:** Medium
**Effort:** Small

- [ ] Intervention name
- [ ] Type (supplement, lifestyle, diet, exercise, other)
- [ ] Status (active, completed)

---

## Phase 6: AI Chat Feature

### 6.1 Create Chat Screen
**File:** `apps/mobile/app/chat.tsx`
**Priority:** High
**Effort:** Large

- [ ] Message list (FlatList with user/AI bubbles)
- [ ] Text input with send button
- [ ] "Include my health data" toggle
- [ ] Send to `POST /ai/chat`
- [ ] Display AI response
- [ ] Auto-scroll to bottom on new message

---

### 6.2 Add Conversation History
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch past conversations from `GET /ai/conversations`
- [ ] Allow viewing/resuming past conversations
- [ ] Conversation list screen

---

### 6.3 Add Typing Indicator
**Priority:** Low
**Effort:** Small

- [ ] Show "AI is thinking..." while waiting for response

---

## Phase 7: Change Log

### 7.1 Create Change Log Screen
**File:** `apps/mobile/app/changelog.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch from `GET /changelog`
- [ ] Timeline display with icons by change_type
- [ ] Filter by type/category
- [ ] Show linked items

---

### 7.2 Auto-Log Changes
**Priority:** Medium
**Effort:** Medium

- [ ] When creating/updating supplements, create change_log entry
- [ ] When creating/updating routines, create change_log entry
- [ ] Include previous/new values

---

## Phase 8: Multi-User Sharing

### 8.1 Create Invite User Screen
**File:** `apps/mobile/app/settings/invite.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Generate invite code via `POST /users/links/invite`
- [ ] Display code for sharing
- [ ] Or send email invite
- [ ] Permission level picker (read, write, admin)

---

### 8.2 Create Accept Invite Flow
**File:** `apps/mobile/app/invite/[code].tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Deep link handling for invite codes
- [ ] Show who is inviting
- [ ] Accept button → `POST /users/links/accept`

---

### 8.3 Add Account Switcher
**File:** Component in header or settings
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch linked users via `GET /users/links`
- [ ] Dropdown/modal to switch accounts
- [ ] Pass `user_id` param to API calls when viewing other user's data

---

### 8.4 Permission-Based UI
**Priority:** Low
**Effort:** Small

- [ ] Hide edit/delete buttons when viewing linked user with read-only permission

---

## Phase 9: Settings & Profile

### 9.1 Create Settings Screen
**File:** `apps/mobile/app/(tabs)/settings.tsx` or `apps/mobile/app/settings/index.tsx`
**Priority:** High
**Effort:** Medium

Sections:
- [ ] Profile (name, email, avatar)
- [ ] Theme (dark/light toggle)
- [ ] Notifications (placeholder)
- [ ] Linked accounts
- [ ] Export data
- [ ] Logout button

---

### 9.2 Implement Logout
**Priority:** High
**Effort:** Small

- [ ] Call Supabase signOut
- [ ] Clear AsyncStorage
- [ ] Navigate to login

---

### 9.3 Implement Theme Toggle
**Priority:** Medium
**Effort:** Small

- [ ] Use existing `useTheme` hook
- [ ] Persist preference to AsyncStorage
- [ ] Apply dark/light classes

---

### 9.4 Create Export Data Screen
**File:** `apps/mobile/app/settings/export.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Buttons for JSON, CSV, Markdown export
- [ ] Call export endpoints (need to create in API)
- [ ] Share sheet to save/share file

---

### 9.5 Create Edit Profile Screen
**File:** `apps/mobile/app/settings/profile.tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Edit name
- [ ] Upload avatar (to Supabase Storage)
- [ ] Save to `PUT /users/me`

---

## Phase 10: Protocol Docs

### 10.1 Create Protocol Docs List Screen
**File:** `apps/mobile/app/docs/index.tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch from `GET /protocol-docs`
- [ ] List with title, category, updated date
- [ ] Category filter tabs

---

### 10.2 Create Add/Edit Doc Screen
**File:** `apps/mobile/app/docs/add.tsx`
**File:** `apps/mobile/app/docs/edit/[id].tsx`
**Priority:** Medium
**Effort:** Medium

- [ ] Title input
- [ ] Category picker
- [ ] Markdown content editor
- [ ] File upload (optional)

---

### 10.3 Create Doc Viewer Screen
**File:** `apps/mobile/app/docs/[id].tsx`
**Priority:** Medium
**Effort:** Small

- [ ] Render markdown content
- [ ] Edit/Delete buttons

---

## Phase 11: Dashboard Enhancements

### 11.1 Fetch Real Counts
**File:** `apps/mobile/app/(tabs)/index.tsx`
**Priority:** High
**Effort:** Small

- [ ] Replace "--" placeholders with real counts from API
- [ ] Biomarkers count
- [ ] Active supplements count
- [ ] Active goals count
- [ ] Today's routine items count

---

### 11.2 Add Recent Activity Feed
**Priority:** Medium
**Effort:** Medium

- [ ] Fetch recent change_log entries
- [ ] Display in Recent Activity section

---

### 11.3 Connect Quick Actions
**Priority:** High
**Effort:** Small

- [ ] "Add Lab Results" → navigate to biomarkers/add
- [ ] "Log Supplement" → navigate to supplements/add
- [ ] "Chat with AI" → navigate to chat

---

## Phase 12: Navigation Updates

### 12.1 Add Missing Tab
**Priority:** Medium
**Effort:** Small

Consider adding Settings as 5th tab or accessible from header.

---

### 12.2 Add Header Actions
**Priority:** Medium
**Effort:** Small

- [ ] Profile/settings icon in header
- [ ] Account switcher access
- [ ] Notifications icon (placeholder)

---

## Dependencies to Install

```bash
cd apps/mobile

# Data fetching
npm install @tanstack/react-query axios

# Charts
npm install react-native-chart-kit react-native-svg

# Image picker
npm install expo-image-picker

# File handling
npm install expo-file-system expo-sharing

# Markdown rendering (for protocol docs)
npm install react-native-markdown-display
```

---

## File Structure After Implementation

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx (dashboard)
│   │   ├── biomarkers.tsx
│   │   ├── supplements.tsx
│   │   ├── goals.tsx
│   │   └── routines.tsx
│   ├── biomarkers/
│   │   ├── add.tsx          ← NEW
│   │   ├── review.tsx       ← NEW
│   │   ├── [id].tsx         ← NEW
│   │   └── edit/[id].tsx    ← NEW
│   ├── supplements/
│   │   ├── add.tsx          ← NEW
│   │   ├── [id].tsx         ← NEW
│   │   └── edit/[id].tsx    ← NEW
│   ├── routines/
│   │   ├── add.tsx          ← NEW
│   │   ├── [id].tsx         ← NEW
│   │   ├── edit/[id].tsx    ← NEW
│   │   └── items/
│   │       ├── add.tsx      ← NEW
│   │       └── edit/[id].tsx ← NEW
│   ├── goals/
│   │   ├── add.tsx          ← NEW
│   │   ├── [id].tsx         ← NEW
│   │   └── edit/[id].tsx    ← NEW
│   ├── chat.tsx             ← NEW
│   ├── changelog.tsx        ← NEW
│   ├── docs/
│   │   ├── index.tsx        ← NEW
│   │   ├── add.tsx          ← NEW
│   │   ├── [id].tsx         ← NEW
│   │   └── edit/[id].tsx    ← NEW
│   ├── settings/
│   │   ├── index.tsx        ← NEW
│   │   ├── profile.tsx      ← NEW
│   │   ├── invite.tsx       ← NEW
│   │   └── export.tsx       ← NEW
│   ├── invite/
│   │   └── [code].tsx       ← NEW
│   └── _layout.tsx
├── components/
│   ├── ui/                  (existing)
│   ├── biomarkers/
│   │   ├── BiomarkerCard.tsx      ← REFACTOR from screen
│   │   ├── BiomarkerForm.tsx      ← NEW
│   │   └── BiomarkerChart.tsx     ← NEW
│   ├── supplements/
│   │   ├── SupplementCard.tsx     ← REFACTOR from screen
│   │   └── SupplementForm.tsx     ← NEW
│   ├── routines/
│   │   ├── RoutineCard.tsx        ← REFACTOR from screen
│   │   └── RoutineItemCard.tsx    ← REFACTOR from screen
│   ├── goals/
│   │   ├── GoalCard.tsx           ← REFACTOR from screen
│   │   └── GoalForm.tsx           ← NEW
│   └── chat/
│       ├── MessageBubble.tsx      ← NEW
│       └── ChatInput.tsx          ← NEW
├── hooks/
│   ├── useDebounce.ts       (existing)
│   ├── useTheme.tsx         (existing)
│   ├── useBiomarkers.ts     ← NEW
│   ├── useSupplements.ts    ← NEW
│   ├── useRoutines.ts       ← NEW
│   ├── useGoals.ts          ← NEW
│   ├── useAI.ts             ← NEW
│   ├── useChangeLog.ts      ← NEW
│   └── useUserLinks.ts      ← NEW
├── lib/
│   ├── supabase.ts          (existing)
│   ├── auth.ts              (existing)
│   └── api.ts               ← NEW
└── contexts/
    ├── AuthContext.tsx      (existing)
    └── QueryProvider.tsx    ← NEW
```

---

## Testing Checklist

Before deploying, verify:

- [ ] User can register and login
- [ ] User can add biomarkers via manual entry
- [ ] User can add biomarkers via image upload + AI extraction
- [ ] User can view biomarker history chart
- [ ] User can add/edit/delete supplements
- [ ] User can toggle supplement active status
- [ ] User can view supplement cost summary
- [ ] User can add/edit routines and routine items
- [ ] User can track routine completion
- [ ] User can add/edit goals with interventions
- [ ] User can chat with AI assistant
- [ ] User can view change log
- [ ] User can invite family members
- [ ] User can switch between linked accounts
- [ ] User can export data
- [ ] Dark/light theme works
- [ ] App works offline (cached data)
- [ ] Pull-to-refresh works on all lists

---

## Notes for Agent

1. **Start with Phase 1** - API integration layer is required for everything else
2. **Use existing UI components** in `components/ui/` - don't recreate
3. **Follow existing patterns** - look at how AuthContext works for state management
4. **Test on both iOS and Android** - use Expo Go for quick testing
5. **Keep dark theme** - the app uses dark mode by default (#0a0a0a background)
6. **API base URL** - use environment variable `EXPO_PUBLIC_API_URL`
