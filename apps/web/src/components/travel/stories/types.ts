import type { TripActivity, TripAccommodation } from "@singularity/shared-types";

// ─── Story card types ──────────────────────────────────────────────

export type StoryCardType =
  | "trip_title"
  | "segment_intro"
  | "accommodation"
  | "day_header"
  | "activity"
  | "restaurant";

export type StoryFilter = "full" | "highlights" | "kids" | "practical";

export interface StoryCardBase {
  id: string;
  type: StoryCardType;
  segmentIndex: number;
  segmentName: string;
  dayNumber?: number;
  dayDate?: string;
  photoUrl?: string;
  photoUrls: string[];
}

export interface TripTitleStoryCard extends StoryCardBase {
  type: "trip_title";
  tripName: string;
  destination: string;
  dateRange: string;
  totalDays: number;
  segmentCount: number;
  activityCount: number;
}

export interface SegmentIntroStoryCard extends StoryCardBase {
  type: "segment_intro";
  category: "city" | "trip";
  segmentNumber: number;
  locationName: string;
  dateRange: string;
  dayCount: number;
  // City category data
  cityIntro?: string;
  deepHistorySections?: Array<{ title: string; content: string; relevance?: string }>;
  cultureOverview?: string;
  cultureTraditions?: Array<{ name: string; story: string; whereTo?: string }>;
  cuisineOverview?: string;
  cuisineHighlights?: Array<{ name: string; story: string; whereTo?: string }>;
  weatherSummary?: string;
  languages?: string[];
  population?: number;
  localCurrency?: string;
  mainAttractions?: Array<{ name: string; description?: string }>;
  // Trip category data
  daySummaries?: Array<{ dayNumber: number; title: string; overview: string; date?: string }>;
  theme?: string;
  keyActivities?: string;
  segmentNarrative?: {
    summary?: string;
    activityHighlights?: string[];
    localTips?: string[];
    gettingAround?: string;
  };
  drivingFromPrevious?: string;
  drivingNotes?: string;
  packingItems?: Array<{ item: string; why?: string }>;
  bookingPriorities?: Array<{ item: string; reason?: string }>;
}

export interface AccommodationStoryCard extends StoryCardBase {
  type: "accommodation";
  name: string;
  propertyType?: string;
  starRating?: number;
  googleRating?: number;
  reviewCount?: number;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  nights?: number;
  neighborhood?: string;
  editorialSummary?: string;
  amenities: Array<{ icon: string; label: string; detail?: string }>;
  guestInsights?: {
    whatGuestsLove?: string;
    checkInTips?: string;
    roomTips?: string;
    thingsToKnow?: string;
    familyTips?: string;
    bestFeatures?: string[];
    reviewHighlights?: string[];
  };
  nearbyLandmarks?: Array<{ name: string; distance?: string; walkMinutes?: number }>;
  parkingInfo?: string;
  breakfastInfo?: string;
}

export interface DayHeaderStoryCard extends StoryCardBase {
  type: "day_header";
  dayTitle: string;
  dayTheme?: string;
  dayOverview?: string;
  dayNarrative?: string;
  activityCount: number;
  restaurantCount: number;
  activities: TripActivity[];
  accommodation?: TripAccommodation;
  /** Condensed timeline: name + time + type */
  timeline: Array<{ name: string; time?: string; type?: string }>;
  /** Weather for the day */
  weatherHigh?: number;
  weatherLow?: number;
  weatherConditions?: string;
  /** Photo tips */
  photoOpportunities?: Array<{ location: string; description: string; best_time?: string }>;
  /** Backup plans */
  backupPlan?: { if_rain?: string; if_tired?: string; if_kids_meltdown?: string };
  /** Segment accent color hex */
  accentColor: string;
}

export interface ActivityStoryCard extends StoryCardBase {
  type: "activity";
  name: string;
  startTime?: string;
  durationMinutes?: number;
  priority?: string;
  description?: string;
  whyItsGreat?: string;
  kidFriendliness?: string;
  deepDiveSnippet?: string;
  deepDiveStory?: string;
  whatYoullSee?: Array<{ name: string; description?: string }>;
  photoSpots?: Array<{ name: string; tip?: string }>;
  practicalTips?: string;
  googleRating?: number;
  funFact?: string;
  kidEngagement?: {
    age_7?: string[];
    age_5?: string[];
    age_3?: string[];
    general?: string[];
  };
}

export interface RestaurantStoryCard extends StoryCardBase {
  type: "restaurant";
  name: string;
  startTime?: string;
  cuisineType?: string;
  priceLevel?: number;
  googleRating?: number;
  signatureDishes: Array<{ name: string; description: string }>;
  localInsight?: string;
  familyTips?: string;
  ambience?: string;
  kidEngagement?: {
    age_7?: string[];
    age_5?: string[];
    age_3?: string[];
    general?: string[];
  };
}

export type StoryCard =
  | TripTitleStoryCard
  | SegmentIntroStoryCard
  | AccommodationStoryCard
  | DayHeaderStoryCard
  | ActivityStoryCard
  | RestaurantStoryCard;

// ─── Segment colors ────────────────────────────────────────────────

export const STORY_SEGMENT_COLORS = [
  { name: "emerald", bg: "bg-emerald-600", hex: "#059669" },
  { name: "blue", bg: "bg-blue-600", hex: "#2563eb" },
  { name: "amber", bg: "bg-amber-600", hex: "#d97706" },
  { name: "purple", bg: "bg-purple-600", hex: "#9333ea" },
  { name: "rose", bg: "bg-rose-600", hex: "#e11d48" },
  { name: "cyan", bg: "bg-cyan-600", hex: "#0891b2" },
  { name: "orange", bg: "bg-orange-600", hex: "#ea580c" },
  { name: "indigo", bg: "bg-indigo-600", hex: "#4f46e5" },
];
