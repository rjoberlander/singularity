# Travel Module Implementation Checklist

**Module:** Travel
**Status:** Planning
**Created:** January 2026

This checklist tracks all implementation tasks across 6 phases. Each task has a corresponding Playwright test for validation.

---

## Phase 1: Core Trip CRUD

### Database (Migration: `018_trips_core.sql`)

- [ ] Create `trips` table with all fields
- [ ] Create `trip_flights` table
- [ ] Create `trip_driving` table
- [ ] Add RLS policies for trips
- [ ] Add RLS policies for flights
- [ ] Add RLS policies for driving
- [ ] Add indexes for performance
- [ ] Add updated_at trigger

### API Endpoints (Backend)

- [ ] `POST /api/v1/trips` - Create trip
- [ ] `GET /api/v1/trips` - List user's trips
- [ ] `GET /api/v1/trips/:id` - Get trip detail
- [ ] `PUT /api/v1/trips/:id` - Update trip
- [ ] `DELETE /api/v1/trips/:id` - Delete trip
- [ ] `POST /api/v1/trips/:id/flights` - Add flight
- [ ] `PUT /api/v1/trips/:id/flights/:flightId` - Update flight
- [ ] `DELETE /api/v1/trips/:id/flights/:flightId` - Delete flight
- [ ] `POST /api/v1/trips/:id/driving` - Add driving
- [ ] `PUT /api/v1/trips/:id/driving/:drivingId` - Update driving
- [ ] `DELETE /api/v1/trips/:id/driving/:drivingId` - Delete driving

### Shared Types (`@singularity/shared-types`)

- [ ] Add `Trip` type
- [ ] Add `TripFlight` type
- [ ] Add `TripDriving` type
- [ ] Add `CreateTripInput` type
- [ ] Add `UpdateTripInput` type

### API Hooks (`@singularity/shared-api`)

- [ ] `useTrips()` - List trips
- [ ] `useTrip(id)` - Get single trip
- [ ] `useCreateTrip()` - Create mutation
- [ ] `useUpdateTrip()` - Update mutation
- [ ] `useDeleteTrip()` - Delete mutation
- [ ] `useAddFlight()` - Add flight mutation
- [ ] `useUpdateFlight()` - Update flight mutation
- [ ] `useDeleteFlight()` - Delete flight mutation
- [ ] `useAddDriving()` - Add driving mutation
- [ ] `useUpdateDriving()` - Update driving mutation
- [ ] `useDeleteDriving()` - Delete driving mutation

### Frontend Components

- [ ] Add `/travel` route to sidebar navigation
- [ ] Create `/travel` page (trip list)
- [ ] Create `TripCard` component
- [ ] Create `TripCreateModal` component
- [ ] Create `FlightForm` component
- [ ] Create `DrivingForm` component
- [ ] Create `/travel/[id]` page (trip detail)
- [ ] Create trip detail header/hero section
- [ ] Create transportation summary card

### Playwright Tests (File: `travel-trips-crud.spec.ts`)

- [ ] Test 1.1: Page loads with all UI elements
- [ ] Test 1.2: Create trip with flying transportation
- [ ] Test 1.3: Create trip with driving transportation
- [ ] Test 1.4: View trip detail page
- [ ] Test 1.5: Edit existing trip
- [ ] Test 1.6: Delete trip
- [ ] Test 1.7: Filter trips by status
- [ ] Test 1.8: Trip cards display correct info

### Playwright Tests (File: `travel-transportation.spec.ts`)

- [ ] Test 1.T.1: Add outbound flight
- [ ] Test 1.T.2: Add return flight
- [ ] Test 1.T.3: Add flight with layover
- [ ] Test 1.T.4: Edit flight details
- [ ] Test 1.T.5: Delete flight
- [ ] Test 1.T.6: Add driving/rental details
- [ ] Test 1.T.7: Edit driving details
- [ ] Test 1.T.8: Delete driving details
- [ ] Test 1.T.9: Verify transportation summary
- [ ] Test 1.T.10: Verify seat assignments display

---

## Phase 2: Segments & Accommodations

### Database (Migration: `019_trip_segments.sql`)

- [ ] Create `trip_segments` table
- [ ] Create `trip_accommodations` table
- [ ] Add RLS policies for segments
- [ ] Add RLS policies for accommodations
- [ ] Add indexes
- [ ] Add updated_at triggers

### API Endpoints (Backend)

- [ ] `GET /api/v1/trips/:id/segments` - List segments
- [ ] `POST /api/v1/trips/:id/segments` - Create segment
- [ ] `PUT /api/v1/trips/:id/segments/:sid` - Update segment
- [ ] `DELETE /api/v1/trips/:id/segments/:sid` - Delete segment
- [ ] `POST /api/v1/trips/:id/segments/reorder` - Reorder segments
- [ ] `GET /api/v1/trips/:id/accommodations` - List accommodations
- [ ] `POST /api/v1/trips/:id/accommodations` - Create accommodation
- [ ] `PUT /api/v1/trips/:id/accommodations/:aid` - Update accommodation
- [ ] `DELETE /api/v1/trips/:id/accommodations/:aid` - Delete accommodation

### Shared Types

- [ ] Add `TripSegment` type
- [ ] Add `TripAccommodation` type
- [ ] Add `CityInfo` type (for segment city details)

### API Hooks

- [ ] `useSegments(tripId)` - List segments
- [ ] `useCreateSegment()` - Create mutation
- [ ] `useUpdateSegment()` - Update mutation
- [ ] `useDeleteSegment()` - Delete mutation
- [ ] `useReorderSegments()` - Reorder mutation
- [ ] `useAccommodations(tripId)` - List accommodations
- [ ] `useCreateAccommodation()` - Create mutation
- [ ] `useUpdateAccommodation()` - Update mutation
- [ ] `useDeleteAccommodation()` - Delete mutation

### Frontend Components

- [ ] Create `SegmentCard` component (collapsible)
- [ ] Create `SegmentEditModal` component
- [ ] Create `CityInfoPanel` component (history, culture, tips)
- [ ] Create `AccommodationCard` component
- [ ] Create `AccommodationEditModal` component
- [ ] Add segment list to trip detail page
- [ ] Add accommodation section to trip detail
- [ ] Implement segment drag-drop reordering

### Playwright Tests (File: `travel-segments.spec.ts`)

- [ ] Test 2.S.1: Add first segment
- [ ] Test 2.S.2: Add multiple segments
- [ ] Test 2.S.3: Add city info to segment
- [ ] Test 2.S.4: View segment list
- [ ] Test 2.S.5: View segment detail with city info
- [ ] Test 2.S.6: Edit segment details
- [ ] Test 2.S.7: Reorder segments via drag-drop
- [ ] Test 2.S.8: Delete segment
- [ ] Test 2.S.9: Verify segments show driving time
- [ ] Test 2.S.10: Verify segments are collapsible

### Playwright Tests (File: `travel-accommodations.spec.ts`)

- [ ] Test 2.A.1: Add accommodation with points
- [ ] Test 2.A.2: Add accommodation with cash
- [ ] Test 2.A.3: Add multiple accommodations
- [ ] Test 2.A.4: View accommodation list
- [ ] Test 2.A.5: View accommodation detail
- [ ] Test 2.A.6: Verify amenities display
- [ ] Test 2.A.7: Edit accommodation
- [ ] Test 2.A.8: Link accommodation to segment
- [ ] Test 2.A.9: Delete accommodation
- [ ] Test 2.A.10: Verify cost summary

---

## Phase 3: Days & Activities

### Database (Migration: `020_trip_days_activities.sql`)

- [ ] Create `trip_days` table
- [ ] Create `trip_activities` table
- [ ] Add RLS policies for days
- [ ] Add RLS policies for activities
- [ ] Add indexes
- [ ] Add updated_at triggers

### API Endpoints (Backend)

- [ ] `GET /api/v1/trips/:id/days` - List days
- [ ] `POST /api/v1/trips/:id/days` - Create day
- [ ] `POST /api/v1/trips/:id/days/generate` - Auto-generate days
- [ ] `PUT /api/v1/trips/:id/days/:did` - Update day
- [ ] `DELETE /api/v1/trips/:id/days/:did` - Delete day
- [ ] `GET /api/v1/trips/:id/activities` - List all activities
- [ ] `GET /api/v1/trips/:id/days/:did/activities` - List day's activities
- [ ] `POST /api/v1/trips/:id/days/:did/activities` - Create activity
- [ ] `PUT /api/v1/trips/:id/activities/:aid` - Update activity
- [ ] `DELETE /api/v1/trips/:id/activities/:aid` - Delete activity
- [ ] `POST /api/v1/trips/:id/activities/reorder` - Reorder activities

### Shared Types

- [ ] Add `TripDay` type
- [ ] Add `TripActivity` type
- [ ] Add `TimeBlock` enum (morning, midday, sunset, evening)
- [ ] Add `ActivityType` enum (hike, beach, restaurant, etc.)

### API Hooks

- [ ] `useDays(tripId)` - List days
- [ ] `useDay(dayId)` - Get single day
- [ ] `useCreateDay()` - Create mutation
- [ ] `useGenerateDays()` - Auto-generate mutation
- [ ] `useUpdateDay()` - Update mutation
- [ ] `useDeleteDay()` - Delete mutation
- [ ] `useActivities(tripId, dayId?)` - List activities
- [ ] `useActivity(activityId)` - Get single activity
- [ ] `useCreateActivity()` - Create mutation
- [ ] `useUpdateActivity()` - Update mutation
- [ ] `useDeleteActivity()` - Delete mutation
- [ ] `useReorderActivities()` - Reorder mutation

### Frontend Components

- [ ] Create `DayCard` component (collapsible)
- [ ] Create `DayEditModal` component
- [ ] Create `ActivityCard` component
- [ ] Create `ActivityDetailModal` component
- [ ] Create `ActivityEditModal` component (v3 format fields)
- [ ] Create `TimeBlockSection` component (morning/midday/sunset/evening)
- [ ] Create `BackupActivitiesSection` component
- [ ] Implement three-level collapsible view
- [ ] Implement activity drag-drop reordering

### Playwright Tests (File: `travel-days-activities.spec.ts`)

- [ ] Test 3.D.1: Add day manually
- [ ] Test 3.D.2: Auto-generate days from date range
- [ ] Test 3.A.1: Add activity with full v3 format
- [ ] Test 3.A.2: Add hike activity with AllTrails
- [ ] Test 3.A.3: Add backup activity
- [ ] Test 3.A.4: Verify time block organization
- [ ] Test 3.A.5: Test three-level expand/collapse
- [ ] Test 3.D.3: Edit day details
- [ ] Test 3.A.6: Edit activity
- [ ] Test 3.A.7: Reorder activities
- [ ] Test 3.A.8: Delete activity
- [ ] Test 3.D.4: Delete day

---

## Phase 4: Media Upload

### Database (Migration: `021_trip_media.sql`)

- [ ] Create `trip_media` table
- [ ] Add RLS policies for media
- [ ] Add indexes

### API Endpoints (Backend)

- [ ] `GET /api/v1/trips/:id/media` - List all trip media
- [ ] `POST /api/v1/trips/:id/media` - Upload media
- [ ] `PUT /api/v1/trips/:id/media/:mid` - Update caption/order
- [ ] `DELETE /api/v1/trips/:id/media/:mid` - Delete media
- [ ] `POST /api/v1/trips/:id/media/reorder` - Reorder media

### Shared Types

- [ ] Add `TripMedia` type
- [ ] Add `MediaParentType` enum (trip, segment, day, activity, accommodation)

### API Hooks (Reuse Journal Pattern)

- [ ] `useTripMedia(tripId, parentType?, parentId?)` - List media
- [ ] `useAddTripMedia()` - Upload mutation
- [ ] `useUpdateTripMedia()` - Update mutation
- [ ] `useDeleteTripMedia()` - Delete mutation
- [ ] `useReorderTripMedia()` - Reorder mutation

### Frontend Components (Reuse Journal Pattern)

- [ ] Create `TripMediaGallery` component
- [ ] Create `TripMediaUpload` component
- [ ] Add cover image upload to trip form
- [ ] Add media section to segment view
- [ ] Add media section to day view
- [ ] Add media section to activity view
- [ ] Implement media drag-drop reordering
- [ ] Implement lightbox view

### Supabase Storage

- [ ] Create `travel/` folder in storage bucket
- [ ] Set up storage policies

### Playwright Tests (File: `travel-media.spec.ts`)

- [ ] Test 4.M.1: Upload trip cover image
- [ ] Test 4.M.2: Upload images to segment
- [ ] Test 4.M.3: Upload images to activity
- [ ] Test 4.M.4: View media gallery
- [ ] Test 4.M.5: Add caption to media
- [ ] Test 4.M.6: Reorder media via drag-drop
- [ ] Test 4.M.7: Delete media
- [ ] Test 4.M.8: Verify storage path
- [ ] Test 4.M.9: Open image in lightbox
- [ ] Test 4.M.10: Verify multiple file upload

---

## Phase 5: Google Calendar Integration

### API Endpoints (Backend)

- [ ] `POST /api/v1/trips/:id/calendar/sync-day/:dayId` - Sync day
- [ ] `POST /api/v1/trips/:id/calendar/sync-activity/:activityId` - Sync activity
- [ ] `DELETE /api/v1/trips/:id/calendar/unsync-day/:dayId` - Unsync day
- [ ] `DELETE /api/v1/trips/:id/calendar/unsync-activity/:activityId` - Unsync activity

### API Hooks

- [ ] `useSyncDayToCalendar()` - Sync day mutation
- [ ] `useSyncActivityToCalendar()` - Sync activity mutation
- [ ] `useUnsyncDayFromCalendar()` - Unsync day mutation
- [ ] `useUnsyncActivityFromCalendar()` - Unsync activity mutation

### Frontend Components

- [ ] Create `CalendarSyncButton` component
- [ ] Add sync button to day card
- [ ] Add sync button to activity card
- [ ] Add sync status indicator
- [ ] Add bulk sync option to trip view

### Reuse Google Calendar Module

- [ ] Integrate with existing OAuth flow
- [ ] Use existing calendar event creation
- [ ] Store `calendar_event_id` in activities

### Playwright Tests (File: `travel-calendar-sync.spec.ts`)

- [ ] Test 5.C.1: Verify calendar connection status
- [ ] Test 5.C.2: Sync entire day to calendar
- [ ] Test 5.C.3: Sync individual activity
- [ ] Test 5.C.4: Verify event format
- [ ] Test 5.C.5: Unsync activity from calendar
- [ ] Test 5.C.6: Unsync entire day
- [ ] Test 5.C.7: Verify sync status indicators
- [ ] Test 5.C.8: Update synced activity
- [ ] Test 5.C.9: Bulk sync multiple days
- [ ] Test 5.C.10: Preview calendar event

---

## Phase 6: Sharing & Export

### Database (Migration: `022_trip_sharing.sql`)

- [ ] Create `trip_sharing` table
- [ ] Add RLS policies for sharing
- [ ] Update trips RLS for shared access
- [ ] Add indexes

### API Endpoints (Backend)

- [ ] `GET /api/v1/trips/:id/sharing` - Get sharing settings
- [ ] `POST /api/v1/trips/:id/sharing` - Share with user
- [ ] `DELETE /api/v1/trips/:id/sharing/:uid` - Remove sharing
- [ ] `PUT /api/v1/trips/:id/public` - Update public settings
- [ ] `GET /api/v1/trips/public/:slug` - Get public trip
- [ ] `GET /api/v1/trips/:id/export/pdf` - Export PDF
- [ ] `GET /api/v1/trips/:id/export/markdown` - Export Markdown

### Shared Types

- [ ] Add `TripSharing` type
- [ ] Add `SharePermission` enum (view, edit)

### API Hooks

- [ ] `useTripSharing(tripId)` - Get sharing settings
- [ ] `useShareTrip()` - Share mutation
- [ ] `useRemoveSharing()` - Remove sharing mutation
- [ ] `useUpdatePublicSettings()` - Public settings mutation
- [ ] `usePublicTrip(slug)` - Get public trip (no auth)
- [ ] `useExportTripPdf()` - Export PDF
- [ ] `useExportTripMarkdown()` - Export Markdown

### Frontend Components

- [ ] Create `TripShareSettings` component
- [ ] Create `ShareUserList` component
- [ ] Create `PublicLinkSection` component
- [ ] Create `/travel/public/[slug]` page
- [ ] Add share button to trip detail
- [ ] Add export menu/button
- [ ] Implement password protection for public links

### Playwright Tests (File: `travel-sharing.spec.ts`)

- [ ] Test 6.S.1: Open sharing settings
- [ ] Test 6.S.2: Share trip with family member
- [ ] Test 6.S.3: Enable public link sharing
- [ ] Test 6.S.4: Copy share link to clipboard
- [ ] Test 6.S.5: Add password protection
- [ ] Test 6.S.6: Remove shared user
- [ ] Test 6.S.7: View public trip without login
- [ ] Test 6.S.8: Export trip to PDF
- [ ] Test 6.S.9: Export trip to Markdown
- [ ] Test 6.S.10: Change sharing permission level

---

## Summary Statistics

| Phase | Database | API | Hooks | Components | Tests |
|-------|----------|-----|-------|------------|-------|
| 1 | 3 tables | 11 endpoints | 11 hooks | 9 components | 18 tests |
| 2 | 2 tables | 9 endpoints | 9 hooks | 8 components | 20 tests |
| 3 | 2 tables | 11 endpoints | 12 hooks | 8 components | 12 tests |
| 4 | 1 table | 5 endpoints | 5 hooks | 4 components | 10 tests |
| 5 | 0 tables | 4 endpoints | 4 hooks | 3 components | 10 tests |
| 6 | 1 table | 7 endpoints | 7 hooks | 5 components | 10 tests |
| **Total** | **9 tables** | **47 endpoints** | **48 hooks** | **37 components** | **80 tests** |

---

## Running Tests

```bash
# Run all travel tests
npx playwright test tests/travel-*.spec.ts

# Run specific phase tests
npx playwright test tests/travel-trips-crud.spec.ts
npx playwright test tests/travel-transportation.spec.ts
npx playwright test tests/travel-segments.spec.ts
npx playwright test tests/travel-accommodations.spec.ts
npx playwright test tests/travel-days-activities.spec.ts
npx playwright test tests/travel-media.spec.ts
npx playwright test tests/travel-calendar-sync.spec.ts
npx playwright test tests/travel-sharing.spec.ts

# Run with UI mode
npx playwright test tests/travel-*.spec.ts --ui

# Run with headed browser
npx playwright test tests/travel-*.spec.ts --headed
```

---

## Notes

1. **Test Order**: Tests are designed to run in phase order. Phase 2 depends on Phase 1, etc.

2. **Mock Data**: Each test file contains realistic mock data based on the Portugal 30-day trip example.

3. **Cleanup Tests**: Each test file includes a cleanup test at the end to remove test data.

4. **Screenshots**: Tests capture screenshots at key points for visual verification.

5. **Flexible Selectors**: Tests use multiple selector strategies to handle UI variations.
