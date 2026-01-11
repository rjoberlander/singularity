# PRD: Schedule & Change Log System

**Document Version:** 1.0
**Created:** January 6, 2026
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Goals & Requirements](#goals--requirements)
4. [Detailed Design](#detailed-design)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Frontend Components](#frontend-components)
8. [Change Detection Logic](#change-detection-logic)
9. [Implementation Plan](#implementation-plan)
10. [UI Specifications](#ui-specifications)

---

## Executive Summary

### What We're Building

A unified **Schedule/Routine** system that:
1. Displays all health protocol items (supplements, equipment, exercises, meals) in a time-based grid
2. Allows users to manage their **diet type** and optional **macros**
3. Tracks changes to the routine via a **Change Log** that only records when users explicitly save

### Key Principle

**The Change Log is 100% tied to the Schedule/Routine.**

- Adding a new supplement to the database = NOT a change log entry
- Scheduling that supplement (giving it a time + making it active) = change log entry
- Moving a supplement from AM to PM = change log entry
- Deactivating a supplement = change log entry (stopped)

### User Flow

1. User makes changes to their schedule (drag items, change diet, add exercise, etc.)
2. Changes save to database immediately (real-time updates)
3. Warning banner appears: "You have changes to your routine. [Save to Log] [Discard]"
4. User can continue making changes or click "Save to Log"
5. On save, a **Routine Version** is created with the diff from the previous version
6. Change Log page shows history of routine versions with their diffs

---

## Current State

### What Exists

| Feature | Status | Location |
|---------|--------|----------|
| Schedule Page | Exists | `apps/web/src/app/(dashboard)/schedule/page.tsx` |
| Supplements | Exists | `supplements` table, full CRUD |
| Equipment | Exists | `equipment` table, full CRUD |
| Routines | Exists | `routines` + `routine_items` tables |
| Change Log Page | Exists | `apps/web/src/app/(dashboard)/changelog/page.tsx` |
| Change Log Table | Exists | `change_log` table (per-item logging) |

### Current Schedule Features

- 7 time slots: Wake, AM, Lunch, PM, Dinner, Evening, Bed
- Two columns: Daily vs Special (specific days)
- Drag-and-drop to move items between time slots
- "No Schedule" section for unscheduled items
- Items: supplements (green), equipment (amber), routines (blue)

### Current Limitations

1. **No Diet tracking** - No way to record diet type or macros
2. **No Exercise tracking** - No way to add exercises to schedule
3. **No Meal tracking** - No way to add meals to schedule
4. **Auto-logging** - Changes auto-log to change_log (noisy, not user-confirmed)
5. **No "Inactive" section** - Inactive items just disappear from view
6. **Per-item logging** - No routine versioning/snapshots

---

## Goals & Requirements

### Primary Goals

1. **Add Diet Section** - Global diet type selector + optional macros
2. **Add Exercise** - New schedule item type with exercise type options
3. **Add Meals** - New schedule item type (meal, protein shake, snack)
4. **Unified Inactive Section** - Combine "No Schedule" + "Not Active" with visual differentiation
5. **User-Confirmed Change Log** - Only log changes when user explicitly saves

### User Stories

1. As a user, I want to **set my diet type** (keto, carnivore, etc.) and optionally track macros
2. As a user, I want to **add exercises** to my schedule (HIIT, Run, etc.)
3. As a user, I want to **add meals** to my schedule to track eating times
4. As a user, I want to **see inactive items** greyed out in a combined section
5. As a user, I want to **explicitly confirm** when my routine changes before it's logged
6. As a user, I want to **see a history** of my routine changes with what specifically changed

---

## Detailed Design

### Schedule Item Types

The schedule displays 5 types of items:

| Type | Source | Color | Icon |
|------|--------|-------|------|
| Supplement | `supplements` table | Emerald/Green | Category-based |
| Equipment | `equipment` table | Amber/Yellow | `Zap` |
| Routine | `routine_items` table | Blue | `ListTodo` |
| Exercise | `schedule_items` table (NEW) | Purple | Type-based |
| Meal | `schedule_items` table (NEW) | Orange | Type-based |

### Exercise Types (10 options)

| Type | Value | Icon |
|------|-------|------|
| HIIT | `hiit` | `Flame` |
| Run | `run` | `Footprints` |
| Bike | `bike` | `Bike` |
| Swim | `swim` | `Waves` |
| Strength | `strength` | `Dumbbell` |
| Yoga | `yoga` | `Flower2` (lotus) |
| Walk | `walk` | `Footprints` |
| Stretch | `stretch` | `Move` |
| Sports | `sports` | `Trophy` |
| Other | `other` | `Activity` |

### Meal Types (3 options)

| Type | Value | Icon |
|------|-------|------|
| Meal | `meal` | `Utensils` |
| Protein Shake | `protein_shake` | `Cup` |
| Snack | `snack` | `Cookie` |

### Diet Types

| Type | Value |
|------|-------|
| Untracked | `untracked` |
| Standard | `standard` |
| Keto | `keto` |
| Carnivore | `carnivore` |
| Vegan | `vegan` |
| Vegetarian | `vegetarian` |
| Mediterranean | `mediterranean` |
| Paleo | `paleo` |
| Low FODMAP | `low_fodmap` |
| Other | `other` |

### Macros (3 values, all optional)

- **Protein (P)** - grams
- **Carbs (C)** - grams
- **Fat (F)** - grams

Display format: `P: 150g | C: 20g | F: 150g`

---

## Database Schema

### New Table: `schedule_items`

Unified table for exercises and meals.

```sql
CREATE TABLE schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Item classification
  item_type TEXT NOT NULL CHECK (item_type IN ('exercise', 'meal')),

  -- Common fields
  name TEXT NOT NULL,  -- "Morning Run", "Breakfast", custom name

  -- Timing (same system as supplements/equipment)
  timing TEXT CHECK (timing IN ('wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed')),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'every_other_day', 'custom', 'as_needed')),
  frequency_days TEXT[],  -- ['mon', 'wed', 'fri'] for custom frequency

  -- Exercise-specific (NULL for meals)
  exercise_type TEXT CHECK (exercise_type IN ('hiit', 'run', 'bike', 'swim', 'strength', 'yoga', 'walk', 'stretch', 'sports', 'other')),
  duration TEXT,  -- "30 min", "1 hour", free text

  -- Meal-specific (NULL for exercises)
  meal_type TEXT CHECK (meal_type IN ('meal', 'protein_shake', 'snack')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schedule_items_user ON schedule_items(user_id);
CREATE INDEX idx_schedule_items_active ON schedule_items(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_schedule_items_type ON schedule_items(user_id, item_type);
```

### New Table: `user_diet`

Global diet settings per user.

```sql
CREATE TABLE user_diet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Diet type
  diet_type TEXT DEFAULT 'untracked' CHECK (diet_type IN (
    'untracked', 'standard', 'keto', 'carnivore', 'vegan',
    'vegetarian', 'mediterranean', 'paleo', 'low_fodmap', 'other'
  )),
  diet_type_other TEXT,  -- Custom name if 'other' selected

  -- Optional macros (all nullable)
  target_protein_g INTEGER,
  target_carbs_g INTEGER,
  target_fat_g INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_user_diet_user ON user_diet(user_id);
```

### New Table: `routine_versions`

Snapshots of complete routine for change log.

```sql
CREATE TABLE routine_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Version tracking
  version_number INTEGER NOT NULL,  -- Auto-increment per user

  -- Full snapshot (for time-travel/reconstruction)
  snapshot JSONB NOT NULL,

  -- Diff from previous version (for display)
  changes JSONB NOT NULL,

  -- User-provided context (optional)
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, version_number)
);

-- Indexes
CREATE INDEX idx_routine_versions_user ON routine_versions(user_id);
CREATE INDEX idx_routine_versions_user_version ON routine_versions(user_id, version_number DESC);
```

### Snapshot JSON Structure

```json
{
  "diet": {
    "type": "carnivore",
    "type_other": null,
    "macros": {
      "protein_g": 150,
      "carbs_g": 20,
      "fat_g": 150
    }
  },
  "items": [
    {
      "id": "uuid",
      "source": "supplement",
      "source_id": "supplement-uuid",
      "name": "Vitamin D",
      "timing": "wake_up",
      "frequency": "daily",
      "frequency_days": null,
      "category": "vitamin_mineral",
      "intake_quantity": 1,
      "intake_form": "capsule"
    },
    {
      "id": "uuid",
      "source": "equipment",
      "source_id": "equipment-uuid",
      "name": "Red Light Panel",
      "timing": "wake_up",
      "frequency": "daily",
      "frequency_days": null,
      "duration": "20 min"
    },
    {
      "id": "uuid",
      "source": "schedule_item",
      "source_id": "schedule-item-uuid",
      "name": "Morning HIIT",
      "item_type": "exercise",
      "exercise_type": "hiit",
      "timing": "am",
      "frequency": "custom",
      "frequency_days": ["mon", "wed", "fri"],
      "duration": "30 min"
    },
    {
      "id": "uuid",
      "source": "schedule_item",
      "source_id": "schedule-item-uuid",
      "name": "Breakfast",
      "item_type": "meal",
      "meal_type": "meal",
      "timing": "am",
      "frequency": "daily",
      "frequency_days": null
    }
  ]
}
```

### Changes JSON Structure

```json
{
  "diet_changed": {
    "from": "keto",
    "to": "carnivore"
  },
  "macros_changed": {
    "protein_g": { "from": 120, "to": 150 },
    "carbs_g": { "from": 50, "to": 20 }
  },
  "started": [
    {
      "source": "supplement",
      "name": "Vitamin D",
      "timing": "wake_up",
      "frequency": "daily"
    }
  ],
  "stopped": [
    {
      "source": "supplement",
      "name": "Melatonin"
    }
  ],
  "modified": [
    {
      "source": "supplement",
      "name": "Creatine",
      "changes": [
        { "field": "timing", "from": "am", "to": "pm" }
      ]
    },
    {
      "source": "schedule_item",
      "name": "Morning Run",
      "changes": [
        { "field": "frequency", "from": "daily", "to": "custom" },
        { "field": "frequency_days", "from": null, "to": ["mon", "wed", "fri"] }
      ]
    }
  ]
}
```

---

## API Routes

### Schedule Items

```
GET    /api/schedule-items
       Query params: item_type, is_active
       Returns: ScheduleItem[]

POST   /api/schedule-items
       Body: { item_type, name, timing?, frequency?, frequency_days?,
               exercise_type?, meal_type?, duration?, notes? }
       Returns: ScheduleItem

PATCH  /api/schedule-items/:id
       Body: Partial<ScheduleItem>
       Returns: ScheduleItem

DELETE /api/schedule-items/:id
       Returns: { success: true }
```

### User Diet

```
GET    /api/user-diet
       Returns: UserDiet (creates default if not exists)

PATCH  /api/user-diet
       Body: { diet_type?, diet_type_other?, target_protein_g?,
               target_carbs_g?, target_fat_g? }
       Returns: UserDiet
```

### Routine Versions

```
GET    /api/routine-versions
       Query params: limit (default 50), offset
       Returns: RoutineVersion[]

GET    /api/routine-versions/:id
       Returns: RoutineVersion

GET    /api/routine-versions/current-snapshot
       Returns: RoutineSnapshot (current state, not saved)

GET    /api/routine-versions/latest
       Returns: RoutineVersion | null (last saved version)

POST   /api/routine-versions
       Body: { reason?: string }
       Returns: RoutineVersion
       Note: Server computes snapshot and diff automatically
```

---

## Frontend Components

### File Structure

```
apps/web/src/
├── app/(dashboard)/schedule/
│   └── page.tsx                    # Main schedule page (update)
├── app/(dashboard)/changelog/
│   └── page.tsx                    # Change log page (update)
├── components/schedule/
│   ├── DietHeader.tsx              # NEW: Diet type + macros
│   ├── AddItemMenu.tsx             # NEW: Add exercise/meal dropdown
│   ├── AddExerciseModal.tsx        # NEW: Exercise creation form
│   ├── AddMealModal.tsx            # NEW: Meal creation form
│   ├── EditMacrosModal.tsx         # NEW: Macros editing
│   ├── ChangesBanner.tsx           # NEW: Unsaved changes warning
│   ├── SaveRoutineModal.tsx        # NEW: Confirm save with reason
│   └── UnscheduledSection.tsx      # NEW: Combined no-schedule + inactive
├── hooks/
│   ├── useScheduleItems.ts         # NEW: CRUD for schedule_items
│   ├── useUserDiet.ts              # NEW: Diet settings
│   ├── useRoutineVersions.ts       # NEW: Version history
│   └── useRoutineChanges.ts        # NEW: Change detection + dirty state
└── types/
    └── index.ts                    # Add new types
```

### New Types

```typescript
// types/index.ts additions

export type ExerciseType = 'hiit' | 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'walk' | 'stretch' | 'sports' | 'other';

export type MealType = 'meal' | 'protein_shake' | 'snack';

export type DietType = 'untracked' | 'standard' | 'keto' | 'carnivore' | 'vegan' | 'vegetarian' | 'mediterranean' | 'paleo' | 'low_fodmap' | 'other';

export interface ScheduleItem {
  id: string;
  user_id: string;
  item_type: 'exercise' | 'meal';
  name: string;
  timing: SupplementTiming | null;
  frequency: string;
  frequency_days: string[] | null;
  exercise_type: ExerciseType | null;
  meal_type: MealType | null;
  duration: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDiet {
  id: string;
  user_id: string;
  diet_type: DietType;
  diet_type_other: string | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineSnapshot {
  diet: {
    type: DietType;
    type_other: string | null;
    macros: {
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
    };
  };
  items: RoutineSnapshotItem[];
}

export interface RoutineSnapshotItem {
  id: string;
  source: 'supplement' | 'equipment' | 'schedule_item' | 'routine';
  source_id: string;
  name: string;
  timing: string;
  frequency: string;
  frequency_days: string[] | null;
  // Type-specific fields...
  [key: string]: any;
}

export interface RoutineChanges {
  diet_changed: { from: string; to: string } | null;
  macros_changed: Record<string, { from: number | null; to: number | null }> | null;
  started: RoutineSnapshotItem[];
  stopped: RoutineSnapshotItem[];
  modified: Array<{
    item: RoutineSnapshotItem;
    changes: Array<{ field: string; from: any; to: any }>;
  }>;
}

export interface RoutineVersion {
  id: string;
  user_id: string;
  version_number: number;
  snapshot: RoutineSnapshot;
  changes: RoutineChanges;
  reason: string | null;
  created_at: string;
}
```

---

## Change Detection Logic

### What Counts as "Scheduled" (Part of Routine)

An item is included in the routine snapshot if:

| Source | Condition |
|--------|-----------|
| Supplement | `is_active = true` AND `timings.length > 0` |
| Equipment | `is_active = true` AND `usage_timing IS NOT NULL` |
| Schedule Item | `is_active = true` AND `timing IS NOT NULL` |
| Routine Item | Always included if parent routine exists |

### Building Current Snapshot

```typescript
async function buildCurrentSnapshot(userId: string): Promise<RoutineSnapshot> {
  // 1. Get diet
  const diet = await getUserDiet(userId);

  // 2. Get scheduled supplements
  const supplements = await getSupplements({
    user_id: userId,
    is_active: true
  });
  const scheduledSupplements = supplements.filter(s =>
    s.timings && s.timings.length > 0
  );

  // 3. Get scheduled equipment
  const equipment = await getEquipment({
    user_id: userId,
    is_active: true
  });
  const scheduledEquipment = equipment.filter(e => e.usage_timing);

  // 4. Get scheduled items (exercises, meals)
  const scheduleItems = await getScheduleItems({
    user_id: userId,
    is_active: true
  });
  const scheduledItems = scheduleItems.filter(s => s.timing);

  // 5. Get routine items
  const routines = await getRoutines(userId);
  const routineItems = routines.flatMap(r => r.items || []);

  // 6. Build snapshot
  return {
    diet: {
      type: diet.diet_type,
      type_other: diet.diet_type_other,
      macros: {
        protein_g: diet.target_protein_g,
        carbs_g: diet.target_carbs_g,
        fat_g: diet.target_fat_g,
      },
    },
    items: [
      ...scheduledSupplements.map(s => ({
        id: `supplement-${s.id}`,
        source: 'supplement' as const,
        source_id: s.id,
        name: s.name,
        timing: s.timings[0], // Primary timing
        timings: s.timings,
        frequency: s.frequency || 'daily',
        frequency_days: s.frequency_days,
        category: s.category,
        intake_quantity: s.intake_quantity,
        intake_form: s.intake_form,
      })),
      ...scheduledEquipment.map(e => ({
        id: `equipment-${e.id}`,
        source: 'equipment' as const,
        source_id: e.id,
        name: e.name,
        timing: e.usage_timing,
        frequency: e.usage_frequency || 'daily',
        frequency_days: null,
        duration: e.usage_duration,
      })),
      ...scheduledItems.map(s => ({
        id: `schedule_item-${s.id}`,
        source: 'schedule_item' as const,
        source_id: s.id,
        name: s.name,
        item_type: s.item_type,
        exercise_type: s.exercise_type,
        meal_type: s.meal_type,
        timing: s.timing,
        frequency: s.frequency,
        frequency_days: s.frequency_days,
        duration: s.duration,
      })),
      ...routineItems.map(r => ({
        id: `routine-${r.id}`,
        source: 'routine' as const,
        source_id: r.id,
        name: r.title,
        timing: r.time,
        frequency: 'daily',
        frequency_days: r.days,
        duration: r.duration,
      })),
    ],
  };
}
```

### Computing Diff

```typescript
function computeChanges(
  previous: RoutineSnapshot | null,
  current: RoutineSnapshot
): RoutineChanges {
  const changes: RoutineChanges = {
    diet_changed: null,
    macros_changed: null,
    started: [],
    stopped: [],
    modified: [],
  };

  // If no previous, everything is "started"
  if (!previous) {
    changes.started = current.items;
    if (current.diet.type !== 'untracked') {
      changes.diet_changed = { from: 'untracked', to: current.diet.type };
    }
    return changes;
  }

  // Diet change
  if (previous.diet.type !== current.diet.type) {
    changes.diet_changed = {
      from: previous.diet.type,
      to: current.diet.type
    };
  }

  // Macros changes
  const macroFields = ['protein_g', 'carbs_g', 'fat_g'] as const;
  for (const field of macroFields) {
    const prevVal = previous.diet.macros[field];
    const currVal = current.diet.macros[field];
    if (prevVal !== currVal) {
      if (!changes.macros_changed) changes.macros_changed = {};
      changes.macros_changed[field] = { from: prevVal, to: currVal };
    }
  }

  // Items
  const prevMap = new Map(previous.items.map(i => [i.id, i]));
  const currMap = new Map(current.items.map(i => [i.id, i]));

  // Started (in current, not in previous)
  for (const [id, item] of currMap) {
    if (!prevMap.has(id)) {
      changes.started.push(item);
    }
  }

  // Stopped (in previous, not in current)
  for (const [id, item] of prevMap) {
    if (!currMap.has(id)) {
      changes.stopped.push(item);
    }
  }

  // Modified (in both, but different)
  for (const [id, currItem] of currMap) {
    const prevItem = prevMap.get(id);
    if (prevItem) {
      const fieldChanges = getFieldChanges(prevItem, currItem);
      if (fieldChanges.length > 0) {
        changes.modified.push({
          item: currItem,
          changes: fieldChanges,
        });
      }
    }
  }

  return changes;
}

function getFieldChanges(prev: any, curr: any): Array<{ field: string; from: any; to: any }> {
  const changes: Array<{ field: string; from: any; to: any }> = [];
  const fieldsToCompare = ['timing', 'timings', 'frequency', 'frequency_days', 'duration'];

  for (const field of fieldsToCompare) {
    const prevVal = JSON.stringify(prev[field]);
    const currVal = JSON.stringify(curr[field]);
    if (prevVal !== currVal) {
      changes.push({ field, from: prev[field], to: curr[field] });
    }
  }

  return changes;
}
```

### Frontend Dirty State Hook

```typescript
// hooks/useRoutineChanges.ts

export function useRoutineChanges() {
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<RoutineSnapshot | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: latestVersion } = useLatestRoutineVersion();
  const { data: currentSnapshot } = useCurrentRoutineSnapshot();

  // Initialize last saved snapshot
  useEffect(() => {
    if (latestVersion && !isInitialized) {
      setLastSavedSnapshot(latestVersion.snapshot);
      setIsInitialized(true);
    } else if (!latestVersion && currentSnapshot && !isInitialized) {
      // No saved versions yet, use current as baseline (but don't save it)
      setLastSavedSnapshot(null);
      setIsInitialized(true);
    }
  }, [latestVersion, currentSnapshot, isInitialized]);

  // Compute changes
  const changes = useMemo(() => {
    if (!currentSnapshot) return null;
    return computeChanges(lastSavedSnapshot, currentSnapshot);
  }, [lastSavedSnapshot, currentSnapshot]);

  // Check if there are meaningful changes
  const hasUnsavedChanges = useMemo(() => {
    if (!changes) return false;
    return (
      changes.diet_changed !== null ||
      changes.macros_changed !== null ||
      changes.started.length > 0 ||
      changes.stopped.length > 0 ||
      changes.modified.length > 0
    );
  }, [changes]);

  // Save routine
  const saveRoutineMutation = useSaveRoutineVersion();

  const saveRoutine = async (reason?: string) => {
    const result = await saveRoutineMutation.mutateAsync({ reason });
    setLastSavedSnapshot(result.snapshot);
    return result;
  };

  // Discard changes (refresh to last saved state)
  const discardChanges = () => {
    // This would trigger a page refresh or data refetch
    // The actual "discard" means reverting DB changes, which is complex
    // For MVP, just refresh the page
    window.location.reload();
  };

  return {
    hasUnsavedChanges,
    changes,
    saveRoutine,
    discardChanges,
    isSaving: saveRoutineMutation.isPending,
  };
}
```

---

## Implementation Plan

### Phase 1: Database (Est. 1-2 hours)

- [ ] **1.1** Create migration file for `schedule_items` table
- [ ] **1.2** Create migration file for `user_diet` table
- [ ] **1.3** Create migration file for `routine_versions` table
- [ ] **1.4** Run migrations locally
- [ ] **1.5** Verify tables in Supabase dashboard

### Phase 2: API Routes (Est. 2-3 hours)

- [ ] **2.1** Create `apps/api/src/routes/schedule-items.ts`
  - GET (list with filters)
  - POST (create)
  - PATCH (update)
  - DELETE (delete)
- [ ] **2.2** Create `apps/api/src/routes/user-diet.ts`
  - GET (get or create default)
  - PATCH (update)
- [ ] **2.3** Create `apps/api/src/routes/routine-versions.ts`
  - GET list (paginated)
  - GET by id
  - GET current-snapshot
  - GET latest
  - POST (create new version)
- [ ] **2.4** Add routes to main router
- [ ] **2.5** Test all endpoints with curl/Postman

### Phase 3: Frontend Hooks (Est. 2 hours)

- [ ] **3.1** Create `hooks/useScheduleItems.ts`
  - useScheduleItems(filters)
  - useCreateScheduleItem()
  - useUpdateScheduleItem()
  - useDeleteScheduleItem()
- [ ] **3.2** Create `hooks/useUserDiet.ts`
  - useUserDiet()
  - useUpdateUserDiet()
- [ ] **3.3** Create `hooks/useRoutineVersions.ts`
  - useRoutineVersions(limit)
  - useCurrentRoutineSnapshot()
  - useLatestRoutineVersion()
  - useSaveRoutineVersion()
- [ ] **3.4** Create `hooks/useRoutineChanges.ts`
  - Change detection logic
  - Dirty state management
- [ ] **3.5** Add new types to `types/index.ts`

### Phase 4: Schedule Page Components (Est. 4-5 hours)

- [ ] **4.1** Create `components/schedule/DietHeader.tsx`
  - Diet type dropdown
  - Macros display (P: Xg | C: Xg | F: Xg)
  - Edit macros button
- [ ] **4.2** Create `components/schedule/EditMacrosModal.tsx`
  - Simple form with 3 number inputs
  - Save/cancel buttons
- [ ] **4.3** Create `components/schedule/AddItemMenu.tsx`
  - Dropdown with "Exercise" and "Meal" options
- [ ] **4.4** Create `components/schedule/AddExerciseModal.tsx`
  - Exercise type dropdown (10 options)
  - Name input
  - Timing dropdown
  - Frequency dropdown
  - Duration input
- [ ] **4.5** Create `components/schedule/AddMealModal.tsx`
  - Meal type dropdown (3 options)
  - Name input (optional, defaults to type name)
  - Timing dropdown
- [ ] **4.6** Create `components/schedule/ChangesBanner.tsx`
  - Warning message
  - "Save to Log" button
  - "Discard" button
- [ ] **4.7** Create `components/schedule/SaveRoutineModal.tsx`
  - Show summary of changes
  - Optional reason textarea
  - Confirm/cancel buttons
- [ ] **4.8** Update `components/schedule/UnscheduledSection.tsx`
  - Combine no-schedule and inactive items
  - Grey out inactive items with `opacity-40 grayscale`

### Phase 5: Schedule Page Integration (Est. 2-3 hours)

- [ ] **5.1** Update `schedule/page.tsx` to include DietHeader
- [ ] **5.2** Update schedule grid to include exercises and meals
- [ ] **5.3** Add exercise/meal icons and colors
- [ ] **5.4** Integrate AddItemMenu
- [ ] **5.5** Integrate ChangesBanner with useRoutineChanges hook
- [ ] **5.6** Update UnscheduledSection with new combined logic
- [ ] **5.7** Add drag-drop support for exercises and meals
- [ ] **5.8** Test all interactions

### Phase 6: Change Log Page Updates (Est. 2 hours)

- [ ] **6.1** Update `changelog/page.tsx` to fetch routine_versions
- [ ] **6.2** Create RoutineVersionCard component
- [ ] **6.3** Display changes in each version:
  - Diet changes
  - Macros changes
  - Started items
  - Stopped items
  - Modified items
- [ ] **6.4** Show reason if provided
- [ ] **6.5** Keep/update filters for item type

### Phase 7: Testing & Polish (Est. 2 hours)

- [ ] **7.1** Test exercise CRUD
- [ ] **7.2** Test meal CRUD
- [ ] **7.3** Test diet type changes
- [ ] **7.4** Test macros editing
- [ ] **7.5** Test change detection (all scenarios)
- [ ] **7.6** Test save routine flow
- [ ] **7.7** Test change log display
- [ ] **7.8** Test drag-drop for all item types
- [ ] **7.9** Visual polish and responsive testing

---

## UI Specifications

### Diet Header

```
┌─────────────────────────────────────────────────────────────────┐
│ Diet: [Carnivore ▼]   P: 150g | C: 20g | F: 150g  [Edit]       │
└─────────────────────────────────────────────────────────────────┘
```

If no macros set:
```
┌─────────────────────────────────────────────────────────────────┐
│ Diet: [Carnivore ▼]   [+ Add Macros]                           │
└─────────────────────────────────────────────────────────────────┘
```

If diet is untracked:
```
┌─────────────────────────────────────────────────────────────────┐
│ Diet: [Untracked ▼]                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Schedule Grid with All Item Types

```
┌─────────────────────────────────────────────────────────────────┐
│       │ Daily                    │ Special                     │
├───────┼──────────────────────────┼─────────────────────────────┤
│ Wake  │ [🟢Vit D] [🟡Red Light]  │                             │
│ AM    │ [🟣HIIT] [🟢Creatine]    │ [🟣Run] Mo We Fr            │
│ Lunch │ [🟠Meal] [🟢Fish Oil]    │                             │
│ PM    │ [🟠Shake]                │ [🟣Strength] Tu Th          │
│Dinner │ [🟠Meal]                 │                             │
│ Bed   │ [🟢Magnesium]            │                             │
└─────────────────────────────────────────────────────────────────┘

Legend:
🟢 = Supplement (emerald)
🟡 = Equipment (amber)
🔵 = Routine (blue)
🟣 = Exercise (purple)
🟠 = Meal (orange)
```

### Unscheduled/Inactive Section

```
┌─────────────────────────────────────────────────────────────────┐
│ UNSCHEDULED / INACTIVE                                          │
├─────────────────────────────────────────────────────────────────┤
│ [🟢CoQ10] [🟢Zinc]                    ← Normal (no timing)     │
│ [░░Melatonin░░] [░░Old Thing░░]       ← Greyed (inactive)      │
└─────────────────────────────────────────────────────────────────┘
```

### Changes Banner

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ You have unsaved changes to your routine.                    │
│                                    [Discard]  [Save to Log]     │
└─────────────────────────────────────────────────────────────────┘
```

### Save Routine Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Save Routine Changes                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Changes to save:                                                │
│                                                                 │
│   + Started: Vitamin D (Wake, Daily)                           │
│   + Started: Morning HIIT (AM, Mon/Wed/Fri)                    │
│   - Stopped: Melatonin                                         │
│   ~ Modified: Creatine (timing: AM → PM)                       │
│   ~ Diet: Keto → Carnivore                                     │
│                                                                 │
│ Reason (optional):                                              │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Trying carnivore for 30 days based on blood work           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                              [Cancel]  [Save Routine]           │
└─────────────────────────────────────────────────────────────────┘
```

### Change Log Entry

```
┌─────────────────────────────────────────────────────────────────┐
│ ● Version 3                                    Jan 6, 2026     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ~ Diet: Keto → Carnivore                                     │
│   ~ Macros: P: 120g → 150g, C: 50g → 20g                       │
│   + Started: Vitamin D (Wake, Daily)                           │
│   + Started: Morning HIIT (AM, Mon/Wed/Fri)                    │
│   - Stopped: Melatonin                                         │
│   ~ Creatine: timing AM → PM                                   │
│                                                                 │
│   "Trying carnivore for 30 days based on blood work"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Open Questions / Future Enhancements

1. **Discard functionality** - Currently suggests page refresh. Could implement actual rollback.
2. **Version comparison** - UI to compare any two versions side-by-side
3. **Version rollback** - Restore routine to a previous version
4. **Export routine** - Export current routine as PDF/image for sharing
5. **Routine templates** - Save/load routine templates

---

## Appendix: Icon Mapping

### Exercise Icons (Lucide)

```typescript
const EXERCISE_ICONS: Record<ExerciseType, LucideIcon> = {
  hiit: Flame,
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  yoga: Flower2,
  walk: Footprints,
  stretch: Move,
  sports: Trophy,
  other: Activity,
};
```

### Meal Icons (Lucide)

```typescript
const MEAL_ICONS: Record<MealType, LucideIcon> = {
  meal: Utensils,
  protein_shake: Cup,
  snack: Cookie,
};
```

### Colors

```typescript
const ITEM_COLORS = {
  supplement: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
  equipment: "bg-amber-500/20 border-amber-500/50 text-amber-300",
  routine: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  exercise: "bg-purple-500/20 border-purple-500/50 text-purple-300",
  meal: "bg-orange-500/20 border-orange-500/50 text-orange-300",
};

const INACTIVE_STYLE = "opacity-40 grayscale";
```
