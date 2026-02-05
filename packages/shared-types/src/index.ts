// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "owner" | "member";
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Biomarker types
export interface Biomarker {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  value: number;
  unit: string;
  date_tested: string;
  lab_source?: string;
  reference_range_low?: number;
  reference_range_high?: number;
  optimal_range_low?: number;
  optimal_range_high?: number;
  notes?: string;
  source_image?: string;
  ai_extracted: boolean;
  is_calculated?: boolean;
  status?: "low" | "normal" | "high" | "optimal";
  created_at: string;
  updated_at: string;
}

export interface CreateBiomarkerRequest {
  name: string;
  value: number;
  unit: string;
  date_tested: string;
  category?: string;
  lab_source?: string;
  reference_range_low?: number;
  reference_range_high?: number;
  optimal_range_low?: number;
  optimal_range_high?: number;
  notes?: string;
  source_image?: string;
  ai_extracted?: boolean;
  is_calculated?: boolean;
}

// Supplement timing options
export type SupplementTiming = 'wake_up' | 'am' | 'lunch' | 'pm' | 'dinner' | 'before_bed' | 'specific';

// Supplement frequency options
export type SupplementFrequency = 'daily' | 'every_other_day' | 'custom' | 'as_needed';

// Day of week for custom frequency
export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

// Supplement intake form options
export type SupplementIntakeForm =
  | 'pill' | 'capsule' | 'softgel' | 'tablet'
  | 'scoop' | 'dropper' | 'drop' | 'spray'
  | 'gummy' | 'lozenge' | 'chewable'
  | 'packet' | 'teaspoon' | 'tablespoon'
  | 'patch' | 'powder';

// Supplement dose unit options
export type SupplementDoseUnit = 'mg' | 'g' | 'mcg' | 'IU' | 'ml' | 'CFU' | '%';

// Supplement types
export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  intake_quantity?: number;    // How many units user takes per dose
  intake_form?: SupplementIntakeForm | string;  // Physical form: capsule, powder, etc.
  serving_size?: number;       // How many units = 1 serving (e.g., 2 capsules = 1 serving)
  dose_per_serving?: number;
  dose_unit?: SupplementDoseUnit | string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: SupplementTiming | string;  // Deprecated: use timings array
  timings?: SupplementTiming[];        // Multiple timing selections (multi-select)
  timing_specific?: string; // HH:MM format when timing = 'specific'
  timing_reason?: string;   // Why at this time (e.g., "cognitive benefits during waking hours")
  reason?: string;          // Why taking (e.g., "Phospholipid-bound omega-3s + astaxanthin")
  mechanism?: string;       // How it works (e.g., "Phospholipid form integrates into cell membranes")
  frequency?: SupplementFrequency | string;
  frequency_days?: DayOfWeek[];        // Days of week for custom frequency
  is_active: boolean;
  notes?: string;
  linked_goals?: SupplementGoal[]; // Populated via join
  created_at: string;
  updated_at: string;
}

export interface SupplementGoal {
  id: string;
  supplement_id: string;
  goal_id: string;
  goal?: Goal; // Populated via join
  created_at: string;
}

export interface CreateSupplementRequest {
  name: string;
  brand?: string;
  intake_quantity?: number;    // How many units user takes per dose
  intake_form?: SupplementIntakeForm | string;  // Physical form: capsule, powder, etc.
  serving_size?: number;       // How many units = 1 serving
  dose_per_serving?: number;
  dose_unit?: SupplementDoseUnit | string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: SupplementTiming | string;  // Deprecated: use timings array
  timings?: SupplementTiming[];        // Multiple timing selections
  timing_specific?: string;
  timing_reason?: string;
  reason?: string;
  mechanism?: string;
  frequency?: SupplementFrequency | string;
  frequency_days?: DayOfWeek[];        // Days of week for custom frequency
  notes?: string;
  goal_ids?: string[]; // IDs of goals to link
}

// Facial Product (Skincare) types
export type FacialProductRoutine = 'am' | 'pm';

export type FacialProductCategory =
  | 'cleanser'
  | 'toner'
  | 'essence_serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'eye_care'
  | 'treatment'
  | 'mask'
  | 'other';

export type FacialProductSubcategory =
  | 'oil_cleanser'
  | 'water_cleanser'
  | 'foam_cleanser'
  | 'micellar'
  | 'hydrating_toner'
  | 'exfoliating_toner'
  | 'essence'
  | 'serum'
  | 'ampoule'
  | 'retinoid'
  | 'vitamin_c'
  | 'niacinamide'
  | 'aha'
  | 'bha'
  | 'pha'
  | 'peptide'
  | 'hyaluronic_acid'
  | 'moisturizing_cream'
  | 'gel_cream'
  | 'sleeping_mask'
  | 'sheet_mask'
  | 'wash_off_mask'
  | 'eye_cream'
  | 'eye_serum'
  | 'lip_care'
  | 'spot_treatment'
  | 'other';

export type FacialProductForm =
  | 'cream'
  | 'gel'
  | 'lotion'
  | 'serum'
  | 'liquid'
  | 'spray'
  | 'mask'
  | 'balm'
  | 'foam'
  | 'powder';

export type FacialProductApplicationArea =
  | 'full_face'
  | 'full_face_and_neck'
  | 'under_eyes'
  | 't_zone'
  | 'targeted'
  | 'lips';

export interface FacialProduct {
  id: string;
  user_id: string;
  name: string;
  brand?: string;

  // Application details
  step_order?: number;
  application_form?: FacialProductForm | string;
  application_amount?: string;
  application_area?: FacialProductApplicationArea | string;
  application_method?: string;

  // Timing (AM/PM routine)
  routines?: FacialProductRoutine[];

  // Usage schedule
  usage_frequency?: string;
  usage_timing?: string;
  frequency_days?: string[];

  // Usage per application (for cost calculations)
  usage_amount?: number;  // How much product used per application (e.g., 1, 2, 0.5)
  usage_unit?: string;    // Unit: ml, pumps, drops, pea-sized

  // Product details
  size_amount?: number;
  size_unit?: string;
  price?: number;
  purchase_url?: string;

  // Categorization
  category?: FacialProductCategory | string;
  subcategory?: FacialProductSubcategory | string;

  // Active ingredients
  key_ingredients?: string[];

  // SPF for sunscreens
  spf_rating?: number;

  // Notes and purpose
  purpose?: string;
  notes?: string;

  // Status
  is_active: boolean;

  // Metadata
  product_data_source?: string;
  product_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFacialProductRequest {
  name: string;
  brand?: string;
  step_order?: number;
  application_form?: FacialProductForm | string;
  application_amount?: string;
  application_area?: FacialProductApplicationArea | string;
  application_method?: string;
  routines?: FacialProductRoutine[];
  usage_frequency?: string;
  usage_timing?: string;
  frequency_days?: string[];
  usage_amount?: number;  // How much product used per application
  usage_unit?: string;    // Unit: ml, pumps, drops
  size_amount?: number;
  size_unit?: string;
  price?: number;
  purchase_url?: string;
  category?: FacialProductCategory | string;
  subcategory?: FacialProductSubcategory | string;
  key_ingredients?: string[];
  spf_rating?: number;
  purpose?: string;
  notes?: string;
}

// Routine types
export interface Routine {
  id: string;
  user_id: string;
  name: string;
  time_of_day?: string;
  sort_order: number;
  items?: RoutineItem[];
  created_at: string;
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  title: string;
  description?: string;
  time?: string;
  duration?: string;
  days: string[];
  linked_supplement?: string;
  sort_order: number;
  completed?: boolean;
  created_at: string;
}

// Goal types
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  target_biomarker?: string;
  current_value?: number;
  target_value?: number;
  direction: "increase" | "decrease" | "maintain";
  status: "active" | "achieved" | "paused";
  priority: number;
  notes?: string;
  interventions?: GoalIntervention[];
  created_at: string;
  updated_at: string;
}

export interface GoalIntervention {
  id: string;
  goal_id: string;
  intervention: string;
  type?: string;
  status: string;
  created_at: string;
}

// Change Log types
export interface ChangeLogEntry {
  id: string;
  user_id: string;
  date: string;
  change_type: "started" | "stopped" | "modified";
  item_type?: string;
  item_name?: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  linked_concern?: string;
  created_at: string;
}

// Protocol Doc types
export interface ProtocolDoc {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category?: "routine" | "biomarkers" | "supplements" | "goals" | "reference" | "other";
  file_url?: string;
  created_at: string;
  updated_at: string;
}

// User Link types (family sharing)
export interface UserLink {
  id: string;
  owner_user: string;
  linked_user?: string;
  permission: "read" | "write" | "admin";
  status: "pending" | "active" | "revoked";
  invite_code?: string;
  created_at: string;
}

// AI types
export interface ExtractedReading {
  date: string;
  value: number;
  confidence: number;
  flag?: string | null;
  is_calculated?: boolean;
}

export interface ExtractedBiomarkerData {
  biomarkers: Array<{
    name: string;
    extracted_name?: string;
    unit: string;
    reference_range_low?: number;
    reference_range_high?: number;
    optimal_range_low?: number;
    optimal_range_high?: number;
    category?: string;
    confidence: number;
    match_confidence?: number;
    readings: ExtractedReading[];
  }>;
  lab_info: {
    lab_name?: string;
    default_date?: string;
    patient_name?: string;
  };
  extraction_notes?: string;
}

export interface ExtractedSupplementData {
  supplements: Array<{
    name: string;
    brand?: string;
    intake_quantity?: number;
    intake_form?: SupplementIntakeForm | string;
    serving_size?: number;  // How many units = 1 serving
    dose_per_serving?: number;
    dose_unit?: SupplementDoseUnit | string;
    servings_per_container?: number;
    price?: number;
    price_per_serving?: number;
    purchase_url?: string;
    category?: string;
    timing?: string;
    timing_specific?: string;
    timing_reason?: string;
    reason?: string;
    mechanism?: string;
    frequency?: string;
    goal_categories?: string[]; // e.g., ["Cardiovascular", "Cognitive", "Skin"]
    confidence: number;
  }>;
  source_info: {
    store_name?: string;
    purchase_date?: string;
    total_items?: number;
  };
  extraction_notes?: string;
}

export interface ExtractedEquipmentData {
  equipment: Array<{
    name: string;
    brand?: string;
    model?: string;
    category?: string;
    purpose?: string;
    specs?: Record<string, unknown>;
    usage_frequency?: string;
    usage_timing?: string;
    usage_duration?: string;
    usage_protocol?: string;
    contraindications?: string;
    confidence: number;
  }>;
  extraction_notes?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  context?: string;
  biomarker_name?: string;
  title?: string;
  messages: ChatMessage[];
  extracted_data?: unknown;
  created_at: string;
  updated_at: string;
}

// Biomarker Star types
export interface BiomarkerStar {
  id: string;
  user_id: string;
  biomarker_name: string;
  starred_at: string;
  starred_by: 'user' | 'ai';
  ai_reason?: string;
}

// Biomarker Note types
export interface BiomarkerNote {
  id: string;
  user_id: string;
  biomarker_name: string;
  content: string;
  created_by: 'user' | 'ai';
  ai_context?: string;
  created_at: string;
  updated_at: string;
}

// Equipment types
export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  model?: string;
  category?: string; // 'LLLT', 'microneedling', 'sleep', 'skincare', 'recovery'
  purpose?: string;
  specs?: Record<string, unknown>;
  usage_frequency?: string;
  usage_timing?: string;
  usage_duration?: string;
  usage_protocol?: string;
  contraindications?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_url?: string;
  warranty_expiry?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentRequest {
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  purpose?: string;
  specs?: Record<string, unknown>;
  usage_frequency?: string;
  usage_timing?: string;
  usage_duration?: string;
  usage_protocol?: string;
  contraindications?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_url?: string;
  warranty_expiry?: string;
  notes?: string;
}

// AI API Key types
export interface AIAPIKey {
  id: string;
  provider: string;
  key_name: string;
  api_key_masked: string;
  is_primary: boolean;
  is_active: boolean;
  health_status: string;
}

// Analysis types
export interface AnalyzeBiomarkerTrendInput {
  biomarkerName: string;
  currentValue: number;
  unit: string;
  optimalRange: { low: number; high: number };
  trendDirection: string;
  percentChange: number | null;
  history: Array<{ value: number; date: string }>;
}

export interface AnalyzeBiomarkerTrendResult {
  analysis: string;
}

export interface ProtocolAnalysisInput {
  biomarkerName?: string;
  question?: string;
}

export interface ProtocolAnalysisResult {
  analysis: string;
  correlations: {
    supplements: Array<{
      name: string;
      effect: string;
      strength: string;
      mechanism: string;
    }>;
    changes: Array<{
      item_name: string;
      change_type: string;
      changed_at: string;
    }>;
    relatedBiomarkers: Array<{
      name: string;
      value: number;
      unit: string;
      status: string;
    }>;
  };
  hepatotoxicityWarnings?: Array<{
    supplement: string;
    risk: string;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Chat state types
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
}

// Eight Sleep types
export interface EightSleepIntegrationStatus {
  connected: boolean;
  integration_id?: string;
  last_sync_at?: string;
  last_sync_status?: "success" | "failed" | "syncing" | "never";
  sync_enabled: boolean;
  sync_time?: string;
  sync_timezone?: string;
  consecutive_failures: number;
  error_message?: string;
}

export interface SleepSession {
  id: string;
  user_id: string;
  date: string;
  sleep_score: number | null;
  sleep_quality_score: number | null;
  time_slept: number | null;
  time_to_fall_asleep: number | null;
  time_in_bed: number | null;
  wake_events: number;
  wake_event_times: string[];
  woke_between_2_and_4_am: boolean;
  wake_time_between_2_and_4_am: string | null;
  avg_heart_rate: number | null;
  min_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_hrv: number | null;
  min_hrv: number | null;
  max_hrv: number | null;
  avg_breathing_rate: number | null;
  light_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  awake_minutes: number | null;
  light_sleep_pct: number | null;
  deep_sleep_pct: number | null;
  rem_sleep_pct: number | null;
  awake_pct: number | null;
  avg_bed_temp: number | null;
  avg_room_temp: number | null;
  sleep_start_time: string | null;
  sleep_end_time: string | null;
  toss_and_turn_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SleepAnalysis {
  total_nights: number;
  avg_sleep_score: number | null;
  avg_deep_sleep_pct: number | null;
  avg_rem_sleep_pct: number | null;
  avg_hrv: number | null;
  avg_time_slept_hours: number | null;
  nights_with_2_4_am_wake: number;
  wake_2_4_am_rate: number;
}

export interface SleepTrend {
  date: string;
  sleep_score: number | null;
  deep_sleep_pct: number | null;
  avg_hrv: number | null;
  time_slept_hours: number | null;
  woke_2_4_am: boolean;
}

export interface SupplementCorrelation {
  supplement_id: string;
  supplement_name: string;
  days_with: number;
  days_without: number;
  avg_score_with: number | null;
  avg_score_without: number | null;
  score_difference: number;
  avg_deep_with: number | null;
  avg_deep_without: number | null;
  deep_difference: number;
  avg_hrv_with: number | null;
  avg_hrv_without: number | null;
  hrv_difference: number;
  wake_rate_with: number;
  wake_rate_without: number;
  impact: "positive" | "negative" | "neutral";
  confidence: "high" | "medium" | "low";
}

export interface CorrelationSummary {
  supplements: SupplementCorrelation[];
  recommendations: string[];
  insights: string[];
  total_days_analyzed: number;
}

// =============================================
// JOURNAL TYPES
// =============================================

// Mood options for journal entries
export type JournalMood = 'happy' | 'calm' | 'neutral' | 'sad' | 'down' | 'frustrated';

// Entry mode options
export type JournalEntryMode = 'freeform' | 'guided';

// Prompt source options
export type JournalPromptSource = 'curated' | 'ai' | 'user';

// Media type options
export type JournalMediaType = 'image' | 'video';

// Journal Entry
export interface JournalEntry {
  id: string;
  user_id: string;

  // Content
  title?: string;
  content: string;
  content_html?: string;

  // Metadata
  entry_date: string;
  entry_time?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  weather_condition?: string;
  weather_temp_f?: number;
  weather_icon?: string;

  // Mood
  mood?: JournalMood | string;
  mood_custom?: string;

  // Organization
  tags: string[];

  // Entry mode
  entry_mode: JournalEntryMode;
  prompt_used?: string;

  // Sharing
  is_public: boolean;
  public_slug?: string;
  share_password?: string;
  show_author: boolean;
  show_location: boolean;
  show_date: boolean;

  // Time Capsule
  is_time_capsule: boolean;
  capsule_delivery_date?: string;
  capsule_delivered: boolean;
  capsule_reminder_30d_sent: boolean;
  capsule_reminder_7d_sent: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Related data (populated via joins)
  media?: JournalMedia[];
  capsule_recipients?: JournalCapsuleRecipient[];
}

export interface CreateJournalEntryRequest {
  title?: string;
  content: string;
  entry_date?: string;
  entry_time?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  weather_condition?: string;
  weather_temp_f?: number;
  weather_icon?: string;
  mood?: JournalMood | string;
  mood_custom?: string;
  tags?: string[];
  entry_mode?: JournalEntryMode;
  prompt_used?: string;
  is_public?: boolean;
  public_slug?: string;
  show_author?: boolean;
  show_location?: boolean;
  show_date?: boolean;
}

export interface UpdateJournalEntryRequest extends Partial<CreateJournalEntryRequest> {
  share_password?: string;
  is_time_capsule?: boolean;
  capsule_delivery_date?: string;
}

// Journal Media
export interface JournalMedia {
  id: string;
  entry_id: string;
  user_id: string;
  media_type: JournalMediaType;
  file_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  file_size_bytes?: number;
  sort_order: number;
  original_filename?: string;
  mime_type?: string;
  created_at: string;
}

export interface CreateJournalMediaRequest {
  entry_id: string;
  media_type: JournalMediaType;
  file_url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  file_size_bytes?: number;
  sort_order?: number;
  original_filename?: string;
  mime_type?: string;
}

// Journal Recipients (for time capsule)
export interface JournalRecipient {
  id: string;
  user_id: string;
  name: string;
  relationship?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJournalRecipientRequest {
  name: string;
  relationship?: string;
  email?: string;
  phone?: string;
}

// Junction table for time capsule recipients
export interface JournalCapsuleRecipient {
  id: string;
  entry_id: string;
  recipient_id: string;
  delivered_at?: string;
  delivery_email?: string;
  created_at: string;
  recipient?: JournalRecipient;
}

// Journal Prompts
export interface JournalPrompt {
  id: string;
  prompt_text: string;
  category?: string;
  source: JournalPromptSource;
  user_id?: string;
  is_active: boolean;
  times_used: number;
  created_at: string;
}

export interface CreateJournalPromptRequest {
  prompt_text: string;
  category?: string;
}

// Time Capsule assignment
export interface AssignTimeCapsuleRequest {
  recipient_ids: string[];
  delivery_date: string;
}

// Share settings
export interface UpdateShareSettingsRequest {
  is_public: boolean;
  password?: string;
  custom_slug?: string;
  show_author?: boolean;
  show_location?: boolean;
  show_date?: boolean;
}

// On This Day response
export interface OnThisDayEntry {
  entry: JournalEntry;
  years_ago: number;
}

// Journal tags with counts
export interface JournalTagCount {
  tag: string;
  count: number;
}

// =============================================
// SCHEDULE & ROUTINE VERSION TYPES
// =============================================

// Exercise types (10 options)
export type ExerciseType = 'hiit' | 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'walk' | 'stretch' | 'sports' | 'other';

// Meal types (3 options)
export type MealType = 'meal' | 'protein_shake' | 'snack';

// Diet types
export type DietType = 'untracked' | 'standard' | 'keto' | 'carnivore' | 'vegan' | 'vegetarian' | 'mediterranean' | 'paleo' | 'low_fodmap' | 'other';

// Schedule Item (exercises & meals)
export interface ScheduleItem {
  id: string;
  user_id: string;
  item_type: 'exercise' | 'meal';
  name: string;
  timing: SupplementTiming | null;
  frequency: SupplementFrequency | string;
  frequency_days: DayOfWeek[] | null;
  exercise_type: ExerciseType | null;
  meal_type: MealType | null;
  duration: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleItemRequest {
  item_type: 'exercise' | 'meal';
  name: string;
  timing?: SupplementTiming | string;
  frequency?: SupplementFrequency | string;
  frequency_days?: DayOfWeek[];
  exercise_type?: ExerciseType;
  meal_type?: MealType;
  duration?: string;
  notes?: string;
}

// User Diet
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

export interface UpdateUserDietRequest {
  diet_type?: DietType;
  diet_type_other?: string;
  target_protein_g?: number | null;
  target_carbs_g?: number | null;
  target_fat_g?: number | null;
}

// Routine Snapshot Item (for versioning)
export interface RoutineSnapshotItem {
  id: string;
  source: 'supplement' | 'equipment' | 'schedule_item' | 'routine';
  source_id: string;
  name: string;
  timing: string | null;
  timings?: string[];
  frequency: string;
  frequency_days: string[] | null;
  // Type-specific fields
  category?: string;
  intake_quantity?: number;
  intake_form?: string;
  duration?: string;
  item_type?: 'exercise' | 'meal';
  exercise_type?: ExerciseType;
  meal_type?: MealType;
}

// Routine Snapshot (full state)
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

// Routine Changes (diff)
export interface RoutineChanges {
  diet_changed: { from: string; to: string } | null;
  macros_changed: Record<string, { from: number | null; to: number | null }> | null;
  started: RoutineSnapshotItem[];
  stopped: RoutineSnapshotItem[];
  modified: Array<{
    item: RoutineSnapshotItem;
    changes: Array<{ field: string; from: unknown; to: unknown }>;
  }>;
}

// Routine Version
export interface RoutineVersion {
  id: string;
  user_id: string;
  version_number: number;
  snapshot: RoutineSnapshot;
  changes: RoutineChanges;
  reason: string | null;
  created_at: string;
}

// =============================================
// TRAVEL TYPES
// =============================================

// Trip status options
export type TripStatus = 'planning' | 'confirmed' | 'in_progress' | 'completed';

// =============================================
// ROUTE STOPS & ALTERNATIVES
// =============================================

// Route stop: a side detour along a driving route between locations
export interface RouteStop {
  id: string;
  name: string;
  between?: { from: string; to: string };  // V3.0 format: e.g., { from: "Lisbon", to: "Lagos" }
  // V3.2 format: Links to a scheduled travel activity
  for_travel_segment?: {
    scheduled_activity_id?: string;
    scheduled_activity_name?: string;
    slot_type?: string;  // e.g., "travel"
  };
  detour_time?: string;   // e.g., "5 min"
  visit_duration?: string;  // e.g., "30-45 min"
  reason?: string;  // Why visit this stop
  best_for?: string[];  // e.g., ["photo op", "stretch break", "quick swim"]
  skip_if?: string;  // e.g., "running late" or "kids are sleeping"
  location?: V3Location;
  tips?: string[];
}

// Alternative type for activities
export type AlternativeType = 'direct_replacement' | 'general_option';

// Segment-level alternative (general backups, not linked to specific activity)
export interface SegmentAlternative {
  id: string;
  name: string;
  item_type: ResearchItemType;
  trigger?: string;  // When to use this alternative
  why_not_scheduled?: string;  // Why it's not on main schedule
  priority?: ResearchItemPriority;
  practical?: V3Practical;
  deep_dive?: V3DeepDive;
  kid_engagement?: V3KidEngagement;
  location?: V3Location;
}

// Transportation type options
export type TripTransportationType = 'flying' | 'driving' | 'both';

// Flight direction
export type FlightDirection = 'outbound' | 'return';

// Activity types
export type TripActivityType = 'hike' | 'beach' | 'restaurant' | 'museum' | 'transport' | 'activity' | 'other';

// Time block options
export type TripTimeBlock = 'morning' | 'midday' | 'sunset' | 'evening';

// Media parent types
export type TripMediaParentType = 'trip' | 'segment' | 'day' | 'activity' | 'accommodation';

// Share permission
export type TripSharePermission = 'view' | 'edit';

// Planning Progress types
export interface PlanningStepProgress {
  auto_suggested: boolean;
  completed: boolean;
  completed_at?: string;
}

export interface TripPlanningProgress {
  basics: PlanningStepProgress;
  accommodations: PlanningStepProgress;
  segments: PlanningStepProgress;
  meals: PlanningStepProgress;
  days_activities: PlanningStepProgress;
}

// Trip (main container)
export interface Trip {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  origin?: string;
  destination?: string;
  transportation_type?: TripTransportationType;
  cover_image_url?: string;
  traveler_count: number;
  budget_estimate?: {
    total?: number;
    accommodation?: number;
    transport?: number;
    activities?: number;
    food?: number;
  };
  packing_checklist?: Array<{
    item: string;
    checked: boolean;
    category?: string;
  }>;
  status: TripStatus;
  is_public: boolean;
  public_slug?: string;
  share_password_hash?: string;
  notes?: string;
  planning_progress?: TripPlanningProgress;
  created_at: string;
  updated_at: string;
  // Populated via joins
  flights?: TripFlight[];
  driving?: TripDriving[];
  segments?: TripSegment[];
  accommodations?: TripAccommodation[];
}

export interface CreateTripRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  origin?: string;
  destination?: string;
  transportation_type?: TripTransportationType;
  cover_image_url?: string;
  traveler_count?: number;
  budget_estimate?: Trip['budget_estimate'];
  packing_checklist?: Trip['packing_checklist'];
  status?: TripStatus;
  notes?: string;
}

export interface UpdateTripRequest extends Partial<CreateTripRequest> {
  is_public?: boolean;
  public_slug?: string;
}

export interface UpdateTripPlanningProgressRequest {
  step: 'basics' | 'accommodations' | 'segments' | 'meals' | 'days_activities';
  auto_suggested?: boolean;
  completed?: boolean;
}

// Trip Flight
export interface TripFlight {
  id: string;
  trip_id: string;
  direction?: FlightDirection;
  airline?: string;
  flight_number?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  booking_reference?: string;
  seat_assignments?: Array<{
    name: string;
    seat: string;
  }>;
  layovers?: Array<{
    airport: string;
    duration: string;
    flight_number?: string;
  }>;
  notes?: string;
  created_at: string;
}

export interface CreateTripFlightRequest {
  direction?: FlightDirection;
  airline?: string;
  flight_number?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  booking_reference?: string;
  seat_assignments?: TripFlight['seat_assignments'];
  layovers?: TripFlight['layovers'];
  notes?: string;
}

// Trip Driving
export interface TripDriving {
  id: string;
  trip_id: string;
  rental_company?: string;
  vehicle_type?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_datetime?: string;
  dropoff_datetime?: string;
  booking_reference?: string;
  total_distance_km?: number;
  fuel_estimate?: number;
  toll_estimate?: number;
  daily_rate?: number;
  insurance_included: boolean;
  notes?: string;
  created_at: string;
}

export interface CreateTripDrivingRequest {
  rental_company?: string;
  vehicle_type?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_datetime?: string;
  dropoff_datetime?: string;
  booking_reference?: string;
  total_distance_km?: number;
  fuel_estimate?: number;
  toll_estimate?: number;
  daily_rate?: number;
  insurance_included?: boolean;
  notes?: string;
}

// Trip Segment
export interface TripSegment {
  id: string;
  trip_id: string;
  segment_number?: number;
  name: string;
  description?: string;
  theme?: string;  // V3: The story of this segment
  start_date: string;
  end_date: string;
  research_status?: 'not_started' | 'researching' | 'completed';
  location_name?: string;
  latitude?: number;
  longitude?: number;
  cover_image_url?: string;
  // V3 city_info supports both new structured format and legacy string format
  city_info?: V3CityInfo & {
    // Legacy fields for backwards compatibility
    fado?: string;          // Fado music section
    azulejos?: string;      // Tile tradition section
  };
  key_activities_summary?: string;
  driving_from_previous?: string;
  driving_notes?: string;
  // V3 accommodation
  accommodation?: {
    recommendation?: string;
    area?: string;
    why?: string;
    specific_hotels?: Array<{
      name: string;
      why_recommended?: string;
      points_or_paid?: string;
      booking_url?: string;
    }>;
  };
  // Rich content fields
  local_food?: Array<{
    name: string;
    description: string;
    where_to_find?: string;
  }>;
  packing_list?: Array<{
    item: string;
    category?: string;
    notes?: string;
    why?: string;  // V3
  }>;
  booking_priorities?: {
    book_now?: Array<{ item: string; reason?: string; url?: string }>;
    book_week_ahead?: Array<{ item: string; reason?: string }>;
    day_before?: Array<{ item: string; reason?: string }>;  // V3
  };
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Google Places data
  google_place_id?: string;
  google_rating?: number;
  population?: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  region?: string;
  main_attractions?: Array<{
    name: string;
    description?: string;
    type?: string;
  }>;
  weather_summary?: string;
  best_time_to_visit?: string;
  local_currency?: string;
  languages?: string[];
  photos_fetched?: boolean;
  // Route stops and alternatives
  route_stops?: RouteStop[];
  segment_alternatives?: SegmentAlternative[];
  // Populated via joins
  days?: TripDay[];
  accommodations?: TripAccommodation[];
}

export interface CreateTripSegmentRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  cover_image_url?: string;
  city_info?: TripSegment['city_info'];
  key_activities_summary?: string;
  driving_from_previous?: string;
  driving_notes?: string;
  // Rich content fields
  local_food?: TripSegment['local_food'];
  packing_list?: TripSegment['packing_list'];
  booking_priorities?: TripSegment['booking_priorities'];
  sort_order?: number;
}

// Trip Accommodation
export interface TripAccommodation {
  id: string;
  trip_id: string;
  segment_id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  nights?: number;
  room_type?: string;
  cost?: number;
  currency: string;
  points_used?: number;
  loyalty_program?: string;
  booking_reference?: string;
  amenities?: string[];
  website?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTripAccommodationRequest {
  segment_id?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  room_type?: string;
  cost?: number;
  currency?: string;
  points_used?: number;
  loyalty_program?: string;
  booking_reference?: string;
  amenities?: string[];
  website?: string;
  phone?: string;
  notes?: string;
}

// Trip Day
export interface TripDay {
  id: string;
  trip_id: string;
  segment_id?: string;
  date: string;
  day_number?: number;
  title?: string;
  theme?: string;  // Day theme (e.g., "Gentle landing day", "Castle exploration morning")
  overview?: string;
  weather_high_c?: number;
  weather_low_c?: number;
  weather_conditions?: string;
  photo_opportunities?: Array<{
    location: string;
    description: string;
    best_time?: string;
  }>;
  alternate_activities?: Array<{  // Backup activity suggestions for the day
    name: string;
    description?: string;
    why?: string;
  }>;
  // V3 fields
  schedule?: V3ScheduleItem[];  // V3: time-based schedule items
  meals?: V3Meals;  // V3: structured meal plans
  logistics?: V3DayLogistics;  // V3: driving, parking, tickets
  backup_plan?: V3BackupPlan;  // V3: if_rain, if_tired, if_kids_meltdown
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Populated via joins
  activities?: TripActivity[];
}

export interface CreateTripDayRequest {
  segment_id?: string;
  date: string;
  day_number?: number;
  title?: string;
  theme?: string;
  overview?: string;
  weather_high_c?: number;
  weather_low_c?: number;
  weather_conditions?: string;
  photo_opportunities?: TripDay['photo_opportunities'];
  alternate_activities?: TripDay['alternate_activities'];
  notes?: string;
  sort_order?: number;
}

// Activity priority levels
export type TripActivityPriority = 'must_do' | 'recommended' | 'optional' | 'if_time';

// Activity confirmation status
export type TripActivityConfirmation = 'unconfirmed' | 'pending' | 'confirmed' | 'cancelled';

// Trip Activity
export interface TripActivity {
  id: string;
  trip_id: string;
  day_id?: string;      // Optional - link to day record for metadata
  date?: string;        // Activity date (YYYY-MM-DD) - can use directly without day record
  segment_id?: string;  // Optional segment grouping
  name: string;
  description?: string;
  activity_type?: TripActivityType;
  time_block?: TripTimeBlock;
  start_time?: string;  // HH:MM format
  end_time?: string;    // HH:MM format
  duration_minutes?: number;  // Estimated duration when end_time not specified
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  why_its_great?: string;
  kid_friendliness?: string;
  kid_rating?: number;  // 1-5 star rating for kid-friendliness
  gear_prep?: string;
  cost_estimate?: number;
  cost_currency: string;
  website?: string;
  booking_url?: string;  // Direct booking/reservation URL
  phone?: string;
  reservation_required: boolean;
  reservation_details?: string;
  confirmation_status?: TripActivityConfirmation;
  confirmation_number?: string;
  priority?: TripActivityPriority;
  is_backup: boolean;
  alternate_to_activity_id?: string;  // If this is an alternate, links to main activity
  alltrails_url?: string;
  alltrails_rating?: number;
  alltrails_review_summary?: string;
  activity_details?: Record<string, unknown>;
  tips?: string;
  notes?: string;
  sort_order: number;
  calendar_event_id?: string;
  calendar_synced_at?: string;  // Last sync to Google Calendar
  created_at: string;
  updated_at: string;
  // Google Places data
  google_place_id?: string;
  google_rating?: number;
  google_review_count?: number;
  google_price_level?: number;  // 1-4 ($ to $$$$)
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
    weekday_text?: string[];
  };
  photos_fetched?: boolean;
  // Rich content fields
  estimated_duration_minutes?: number;
  practical_details?: {
    hours?: string;
    cost_breakdown?: {
      adults?: string;
      seniors?: string;
      kids?: string;
      under_x_free?: string;
    };
    // Ticket/admission pricing (auto-fetched during enrichment for attractions)
    ticket_price?: {
      adult?: string;
      child?: string;
      senior?: string;
      family?: string;
      free_under_age?: number;
      currency?: string;
      source?: string;
      fetched_at?: string;
    };
    time_needed?: string;
    avoid_times?: string[];
    best_times?: string[];
    getting_there?: string;
    combo_tickets?: string;
  };
  // Restaurant-specific details (enriched with AI review analysis)
  restaurant_details?: RestaurantDetails;
  kid_engagement?: {
    age_7?: string[];
    age_5?: string[];
    age_3?: string[];
    general?: string[];
  };
  deep_dive_content?: string;  // Long-form tour-guide narrative
  deep_dive?: {  // Structured deep dive content
    what_it_is?: string;
    why_it_matters?: string;
    the_story?: string;
    what_youll_see?: Array<{ name: string; description?: string; location_hint?: string }>;
    interesting_facts?: string[];
    photo_spots?: Array<{ name: string; tip?: string }>;
  };
  what_to_see?: Array<{
    name: string;
    description?: string;
    location_hint?: string;
  }>;
  historical_context?: string;
  architecture_notes?: string;
  accessibility_info?: {
    stroller_friendly?: boolean;
    notes?: string;
    alternatives?: string;
  };
  warnings?: string[];
  // Alternative tracking
  alternative_type?: AlternativeType;  // 'direct_replacement' | 'general_option'
  alternative_trigger?: string;  // When to use this alternative (e.g., "if rain")
  why_not_scheduled?: string;  // Why not on main schedule
}

export interface CreateTripActivityRequest {
  day_id?: string;      // Optional - provide day_id OR date
  date?: string;        // Activity date (YYYY-MM-DD) - alternative to day_id
  segment_id?: string;  // Optional segment grouping
  name: string;
  description?: string;
  activity_type?: TripActivityType;
  time_block?: TripTimeBlock;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  why_its_great?: string;
  kid_friendliness?: string;
  kid_rating?: number;
  gear_prep?: string;
  cost_estimate?: number;
  cost_currency?: string;
  website?: string;
  booking_url?: string;
  phone?: string;
  reservation_required?: boolean;
  reservation_details?: string;
  confirmation_status?: TripActivityConfirmation;
  confirmation_number?: string;
  priority?: TripActivityPriority;
  is_backup?: boolean;
  alternate_to_activity_id?: string;
  alltrails_url?: string;
  alltrails_rating?: number;
  alltrails_review_summary?: string;
  activity_details?: Record<string, unknown>;
  tips?: string;
  notes?: string;
  sort_order?: number;
  // Rich content fields
  estimated_duration_minutes?: number;
  practical_details?: TripActivity['practical_details'];
  kid_engagement?: TripActivity['kid_engagement'];
  deep_dive_content?: string;
  what_to_see?: TripActivity['what_to_see'];
  historical_context?: string;
  architecture_notes?: string;
  accessibility_info?: TripActivity['accessibility_info'];
  warnings?: string[];
  // Alternative tracking
  alternative_type?: AlternativeType;
  alternative_trigger?: string;
  why_not_scheduled?: string;
}

// Trip Media
export interface TripMedia {
  id: string;
  trip_id: string;
  user_id: string;
  parent_type: TripMediaParentType;
  parent_id: string;
  file_url: string;
  thumbnail_url?: string;
  media_type?: 'image' | 'video';
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  caption?: string;
  sort_order: number;
  created_at: string;
  // Google Places sourced media
  google_attribution_name?: string;
  google_attribution_uri?: string;
  is_google_sourced?: boolean;
  approved?: boolean | null;  // null = pending review, true = approved, false = rejected
}

export interface CreateTripMediaRequest {
  parent_type: TripMediaParentType;
  parent_id: string;
  file_url: string;
  thumbnail_url?: string;
  media_type?: 'image' | 'video';
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  caption?: string;
  sort_order?: number;
  // Google Places sourced media
  google_attribution_name?: string;
  google_attribution_uri?: string;
  is_google_sourced?: boolean;
  approved?: boolean | null;
}

// Trip Sharing
export interface TripSharing {
  id: string;
  trip_id: string;
  shared_with_user_id: string;
  permission: TripSharePermission;
  created_at: string;
  // Populated via join
  user?: User;
}

export interface CreateTripSharingRequest {
  shared_with_user_id: string;
  permission?: TripSharePermission;
}

// Public trip settings
export interface UpdateTripPublicSettingsRequest {
  is_public: boolean;
  public_slug?: string;
  password?: string;
}

// =============================================
// GOOGLE PLACES API TYPES
// =============================================

// Google Places photo reference
export interface GooglePlacePhoto {
  name: string;  // Resource name for photo reference (e.g., "places/xxx/photos/yyy")
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string;
    photoUri?: string;
  }>;
}

// Google Places details response
export interface GooglePlaceDetails {
  id: string;  // Place ID
  displayName: { text: string; languageCode: string };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: GooglePlacePhoto[];
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
}

// Response from fetch-google endpoints
export interface FetchGooglePlacesResponse {
  success: boolean;
  google_place_id: string;
  data: Partial<TripActivity | TripSegment>;
  photos_added: number;
  message?: string;
}

// =============================================
// TRAVEL SETTINGS & IMPORT TYPES
// Part of the trip import workflow - see docs/travel-module-prd.md
// =============================================

// Travel Settings - stored in travel_settings table
export interface TravelSettings {
  id: string;
  user_id: string;
  claude_instructions: string | null;
  claude_instructions_version: string;
  family_profile: FamilyTravelProfile | null;
  family_profile_version: string;
  output_template: ResearchOutputTemplate | null;
  output_template_version: string;
  created_at: string;
  updated_at: string;
}

// Family Travel Profile structure (matches family-travel-profile.json)
export interface FamilyTravelProfile {
  profile_version: string;
  last_updated: string;
  family: {
    name: string;
    home_base: string;
    home_airport: string;
    adults: Array<{
      name: string;
      role: string;
      notes?: string;
    }>;
    children: Array<{
      name: string;
      birth_year: number;
      age_at_travel: number;
      personality?: string;
      engagement_style?: string;
    }>;
  };
  travel_style: {
    philosophy?: string;
    daily_rhythm?: Record<string, {
      time: string;
      type: string;
      examples?: string[];
      notes?: string;
    }>;
    pace?: {
      level: string;
      max_activities_per_day?: number;
      rest_days_frequency?: string;
      driving_tolerance?: string;
      notes?: string;
    };
    accommodation?: {
      preferences?: string[];
      loyalty_programs?: string[];
      booking_strategy?: string;
      avoid?: string[];
    };
  };
  preferences?: {
    must_haves?: Array<{
      item: string;
      frequency?: string;
      notes?: string;
    }>;
    strong_preferences?: string[];
    avoid?: Array<{
      item: string;
      reason?: string;
      alternative?: string;
    }>;
    dietary?: {
      restrictions?: string;
      style?: string;
      kids_backup?: string;
    };
  };
  logistics?: {
    credit_cards?: Record<string, string>;
    points_balances?: Record<string, string>;
    travel_documents?: Record<string, unknown>;
    car_rental?: Record<string, unknown>;
    packing_philosophy?: string;
  };
  output_preferences?: {
    detail_level?: string;
    style?: string;
    include?: Record<string, boolean>;
    format?: Record<string, string>;
  };
  notes?: Record<string, string[]>;
}

// Research Output Template structure (matches research-output-template.json)
export interface ResearchOutputTemplate {
  _template_info: {
    name: string;
    version: string;
    description: string;
    usage: string;
  };
  metadata: unknown;
  segment: unknown;
  research_items: unknown[];
  days: unknown[];
  _example_research_item?: unknown;
}

// Research Item Status
export type ResearchItemStatus =
  | 'unprocessed'
  | 'reviewing'
  | 'approved'
  | 'expanded'
  | 'imported'
  | 'rejected'
  | 'deferred';

// Research Item Priority
export type ResearchItemPriority =
  | 'must_do'
  | 'recommended'
  | 'optional'
  | 'backup'
  | 'if_time';

// Research Item Type
export type ResearchItemType =
  | 'restaurant'
  | 'hike'
  | 'attraction'
  | 'beach'
  | 'hotel'
  | 'activity'
  | 'shop'
  | 'service'
  | 'viewpoint'
  | 'transport';

// =============================================
// EXPANSION TYPES (Phase 2 - generated by Claude API)
// =============================================

export interface KidEngagement {
  age_7: string[];
  age_5: string[];
  age_3: string[];
  conversation_starters: string[];
  games: string[];
}

export interface VisitScript {
  arrival: string;
  flow: string;
  highlight_moments: string[];
  exit_strategy: string;
}

export interface PhotoGuideItem {
  shot: string;
  where: string;
  when: string;
  how: string;
  with_kids: string;
}

export interface PracticalDetailsExtended {
  insider_tips: string[];
  warnings: string[];
  money_saving: string[];
  with_stroller: string;
  bathroom_locations: string;
  food_nearby: string;
  rest_spots: string;
}

export interface ExpansionOutput {
  deep_dive_content: string;
  kid_engagement: KidEngagement;
  visit_script: VisitScript;
  photo_guide: PhotoGuideItem[];
  practical_details_extended: PracticalDetailsExtended;
}

// =============================================
// V3 TYPES - Complete content in Phase 1 (no expansion phase)
// =============================================

// V3 Deep History with sections
export interface V3DeepHistorySection {
  title: string;  // e.g., "The Ancient Foundations (1200 BC - 711 AD)"
  content: string;  // 300-600 words of narrative
  relevance?: string;  // What this means for your visit
}

export interface V3DeepHistory {
  sections: V3DeepHistorySection[];
}

// V3 Culture info
export interface V3Tradition {
  name: string;
  story: string;  // 200-300 words
  where_to_experience?: string;
  kid_friendly?: boolean;
}

export interface V3Culture {
  overview?: string;
  traditions?: V3Tradition[];
}

// V3 Cuisine info
export interface V3SignatureFood {
  name: string;
  story: string;  // 100-200 words
  where_to_try?: string;
  kid_appeal?: string;
}

export interface V3Cuisine {
  overview?: string;
  signature_foods?: V3SignatureFood[];
}

// V3 City Info (complete structure)
export interface V3CityInfo {
  intro?: string;  // 2-3 paragraphs hook
  deep_history?: V3DeepHistory;
  culture?: V3Culture;
  cuisine?: V3Cuisine;
  // Legacy support
  overview?: string;
  history?: string;
  tips?: string;
}

// V3 Deep Dive for research items
export interface V3WhatToSeeHighlight {
  name: string;
  description: string;  // 50-100 words with story
}

export interface V3WhatToSeeArea {
  name: string;  // e.g., "The Church"
  highlights: V3WhatToSeeHighlight[];
}

export interface V3DeepDive {
  what_it_is?: string;  // 1-2 sentences
  why_it_matters?: {
    content: string;  // 200-400 words
  };
  the_story?: {
    content: string;  // 300-600 words
  };
  what_youll_see?: V3WhatToSeeArea[];
  how_it_survived?: string;
  interesting_facts?: string[];
  connections?: string;
}

// V3 Kid Engagement with named children
export interface V3ChildEngagement {
  birth_date?: string;
  age_at_trip?: number;
  scripts: string[];  // Actual sentences to say: "Parker, count how many..."
  activities?: string[];
  questions_to_ask?: string[];
  attention_span?: string;
  carrier_needed?: boolean;
}

export interface V3KidEngagement {
  parker?: V3ChildEngagement;
  charlotte?: V3ChildEngagement;
  xander?: V3ChildEngagement;
  conversation_starters?: string[];
  games?: string[];
}

// V3 Schedule item for days
export interface V3ScheduleItem {
  time: string;  // e.g., "9:00-11:00am"
  activity_name: string;  // matches research_item name
  activity_type?: string;  // main_activity | meal | rest | transport | free_time
  location?: string;
  notes?: string;
  is_deep_dive?: boolean;
}

// V3 Meal plan
export interface V3MealPlan {
  plan?: string;
  location?: string;
  restaurant_name?: string;
  notes?: string;
}

export interface V3Meals {
  breakfast?: V3MealPlan;
  lunch?: V3MealPlan;
  dinner?: V3MealPlan;
}

// V3 Day logistics
export interface V3DayLogistics {
  driving?: string;
  parking?: string;
  tickets_needed?: string[];
  tips?: string;
}

// V3 Backup plan
export interface V3BackupPlan {
  if_rain?: string;
  if_tired?: string;
  if_kids_meltdown?: string;
}

// V3 Practical details for research items
export interface V3Practical {
  hours?: string;
  cost?: {
    description?: string;
    adult?: string;
    child?: string;
    family_total?: string;
    tips?: string;
  };
  time_needed?: string;
  reservation?: {
    required?: boolean;
    how?: string;
    url?: string;
  };
  best_time?: string;
  avoid?: string;
  stroller?: string;
  tips?: string[];
}

// V3 Photo opportunity
export interface V3PhotoOpportunity {
  shot: string;
  where: string;
  when?: string;
  tip?: string;
}

// V3 Ratings
export interface V3Ratings {
  score?: number;
  count?: number;
  summary?: string;
}

// V3 Location
export interface V3Location {
  area?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
}

// v2 Schema Types

export interface WhyRelevant {
  for_family: string;
  unique_value: string;
}

export interface ReviewSummary {
  positive: string;
  negative: string;
  family_specific: string;
}

export interface KidAgeAssessment {
  suitable: boolean;
  engagement_level: 'high' | 'medium' | 'low';
  notes: string;
  carrier_needed?: boolean;
  stroller_works?: boolean;
}

export interface KidAssessment {
  age_7: KidAgeAssessment;
  age_5: KidAgeAssessment;
  age_3: KidAgeAssessment;
  challenges: string[];
  tips: string[];
}

export interface TimeNeeded {
  minimum: string;
  recommended: string;
  with_kids: string;
}

export interface BestTimes {
  ideal: string;
  avoid: string;
  why: string;
}

export interface CostBreakdown {
  adult: string;
  child_7: string;
  child_5: string;
  child_3: string;
  family_total: string;
}

export interface HistoricalContext {
  summary: string;
  significance: string;
  connections: string;
}

export interface WhatToSeeItem {
  name: string;
  description: string;
  location_hint: string;
  dont_miss: boolean;
  kid_interest: string;
}

export interface HikeDetails {
  alltrails_url: string;
  distance_km: number;
  elevation_gain_m: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  trail_type: 'loop' | 'out_and_back' | 'point_to_point';
  surface: string;
  shaded: boolean;
  shade_percentage: string;
  water_available: boolean;
  restrooms: boolean;
  parking: string;
  highlights: string[];
  kid_challenges: string;
}

export interface SignatureDish {
  name: string;
  description: string;
  price?: string;
  kid_friendly?: boolean;
  // Source of recommendation: 'ai_review_analysis' (auto-extracted from Google reviews) or 'imported' (from Claude research)
  source?: 'ai_review_analysis' | 'imported';
}

export interface RestaurantDetails {
  cuisine_type: string;
  signature_dishes: SignatureDish[];
  ambience: string;
  noise_level: 'quiet' | 'moderate' | 'loud';
  seating: 'indoor' | 'outdoor' | 'both';
  highchair: boolean;
  kids_menu: boolean;
  dietary_options: string[];
  reservation_tips: string;
}

export interface BeachDetails {
  water_conditions: 'calm' | 'moderate' | 'rough';
  sand_type: string;
  facilities: string[];
  parking: string;
  crowds: string;
  shade_available: boolean;
  food_nearby: boolean;
}

// Trip Research Item - stored in trip_research_items table
export interface TripResearchItem {
  id: string;
  trip_id: string;
  segment_id: string | null;

  // Classification
  item_type: ResearchItemType;
  category: string | null;

  // Core Info
  name: string;
  description: string | null;
  why_relevant: WhyRelevant | string | null;  // v2: {for_family, unique_value}

  // Source Tracking
  source_url: string | null;
  source_name: string | null;
  source_date: string | null;
  additional_sources: Array<{ url: string; name: string; what_it_provided?: string }> | null;

  // Location
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  google_place_id: string | null;

  // Quality Signals
  rating: number | null;
  review_count: number | null;
  review_summary: ReviewSummary | string | null;  // v2: {positive, negative, family_specific}
  price_level: number | null;

  // Family-Specific (v2 - detailed per-age assessment)
  kid_friendly: boolean | null;
  kid_assessment: KidAssessment | null;  // v2: detailed per-age assessment
  min_age: number | null;
  stroller_friendly: boolean | null;

  // Practical Info (v2 - enhanced)
  hours_text: string | null;
  hours_structured: Record<string, string> | null;
  cost_estimate_text: string | null;
  cost_estimate_value: number | null;
  cost_currency: string;
  cost_breakdown: CostBreakdown | null;  // v2
  reservation_required: boolean | null;
  reservation_details: string | null;  // v2
  booking_url: string | null;
  website: string | null;
  phone: string | null;
  time_needed: TimeNeeded | null;  // v2
  best_times: BestTimes | null;  // v2

  // Type-specific (v2 - stored as JSONB)
  hike_details: HikeDetails | null;
  restaurant_details: RestaurantDetails | null;
  beach_details: BeachDetails | null;

  // Historical/What to See (v2 - enhanced)
  historical_context: HistoricalContext | string | null;
  what_to_see: WhatToSeeItem[] | null;

  // Raw Data
  raw_data: Record<string, unknown> | null;

  // Workflow Status
  status: ResearchItemStatus;
  priority: ResearchItemPriority | null;

  // Day Assignment
  assigned_day: number | null;
  assigned_time_block: TripTimeBlock | null;
  assigned_date: string | null;

  // Import Tracking
  imported_to_activity_id: string | null;
  imported_at: string | null;
  import_notes: string | null;

  // Expansion Fields (Phase 2 - populated by Claude API)
  expanded_at: string | null;
  expanded_by: string | null;
  deep_dive_content: string | null;
  kid_engagement: KidEngagement | null;
  visit_script: VisitScript | null;
  photo_guide: PhotoGuideItem[] | null;
  practical_details_extended: PracticalDetailsExtended | null;

  // User Notes
  notes: string | null;
  tags: string[] | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data
  segment?: TripSegment;
}

// Trip Import Payload (JSON from Claude)
export interface TripImportMetadata {
  trip_name: string;
  segment_number: number;
  segment_name: string;
  dates: {
    start: string;
    end: string;
  };
  total_days?: number;
  total_nights?: number;
  generated_at: string;
  version: string;
  profile_used?: string;
}

export interface TripImportSegment {
  name: string;
  description?: string;
  theme?: string;  // V3: The story of this segment
  location?: {
    location_name?: string;
    country?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  accommodation?: {
    // V3 format
    recommendation?: string;
    area?: string;
    why?: string;
    specific_hotels?: Array<{
      name: string;
      why_recommended?: string;
      points_or_paid?: string;
      booking_url?: string;
    }>;
    // Legacy format
    recommended?: string;
    hotel_name?: string;
    booking_strategy?: string;
    notes?: string;
  };
  driving?: {
    from_previous_segment?: string;
    driving_notes?: string;
  };
  // V3 city_info supports both new and legacy formats
  city_info?: V3CityInfo;
  local_food?: Array<{
    name: string;
    description: string;
    where_to_find?: string;
  }>;
  packing_list?: Array<{
    item: string;
    category?: string;
    notes?: string;
    why?: string;  // V3: why this item is needed for this segment
  }>;
  booking_priorities?: {
    book_now?: Array<{ item: string; reason?: string; url?: string }>;
    book_week_ahead?: Array<{ item: string; reason?: string }>;
    day_before?: Array<{ item: string; reason?: string }>;  // V3 uses day_before
    book_day_before?: Array<{ item: string; reason?: string }>;  // Legacy
  };
  weather?: {
    expected_high_c?: number;
    expected_low_c?: number;
    conditions?: string;
    notes?: string;
  };
  // Route stops and alternatives
  route_stops?: RouteStop[];
  alternatives?: Array<{
    name: string;
    item_type: string;
    trigger?: string;
    why_not_scheduled?: string;
    priority?: string;
    replaces?: {
      scheduled_activity_name?: string;
      scheduled_activity_id?: string;
    };
    practical?: V3Practical;
    deep_dive?: V3DeepDive;
    kid_engagement?: V3KidEngagement;
    location?: V3Location;
  }>;
}

export interface TripImportDay {
  date: string;
  day_number: number;
  day_of_week?: string;  // V3: Monday, Tuesday, etc.
  day_of_trip?: number;
  title?: string;
  theme?: string;
  overview?: string;
  weather?: {
    high_c?: number;
    low_c?: number;
    conditions?: string;
    sunrise?: string;
    sunset?: string;
  };
  // V3 schedule with specific times
  schedule?: V3ScheduleItem[];
  // Legacy activities format
  activities?: Array<{
    research_item_name: string;
    time_block?: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
  }>;
  // V3 meals format
  meals?: V3Meals | {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  // V3 logistics
  logistics?: V3DayLogistics;
  // V3 backup plan
  backup_plan?: V3BackupPlan;
  photo_opportunities?: Array<{
    location: string;
    description: string;
    best_time?: string;
  }>;
  notes?: string;
}

export interface TripImportResearchItem {
  // Required
  item_type: string;
  name: string;
  source_url?: string;  // V3: Optional since we have additional_sources
  source_name?: string;
  why_relevant?: string;

  // Classification
  category?: string;
  priority?: string;  // must_do | recommended | optional | backup

  // V3 Location (structured)
  location?: V3Location;
  // Legacy location fields
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  google_place_id?: string;

  // V3 Ratings (structured)
  ratings?: V3Ratings;
  // Legacy quality fields
  rating?: number;
  review_count?: number;
  review_summary?: string;
  price_level?: number;

  // V3 Practical (structured)
  practical?: V3Practical;
  // Legacy practical fields
  hours_text?: string;
  cost_estimate_text?: string;
  cost_estimate_value?: number;
  cost_currency?: string;
  reservation_required?: boolean;
  booking_url?: string;
  website?: string;
  phone?: string;

  // V3 Deep Dive (structured, complete content)
  deep_dive?: V3DeepDive;

  // V3 Kid Engagement (named children with scripts)
  kid_engagement?: V3KidEngagement;
  // Legacy family fields
  kid_friendly?: boolean;
  kid_notes?: string;
  min_age?: number;
  stroller_friendly?: boolean;

  // V3 Photo opportunities
  photo_opportunities?: V3PhotoOpportunity[];

  // Type-specific
  alltrails_url?: string;
  distance_km?: number;
  elevation_gain_m?: number;
  difficulty?: string;
  trail_type?: string;
  shaded?: boolean;
  trail_surface?: string;
  cuisine_type?: string;
  signature_dishes?: string[];
  ambience?: string;
  dietary_options?: string[];
  attraction_type?: string;
  what_to_see?: Array<{ name: string; description?: string; location_hint?: string }>;
  historical_context?: string;
  typical_visit_duration?: number;
  water_conditions?: string;
  facilities?: string[];
  parking_notes?: string;

  // V3 Assignment with specific time
  assigned_day?: number;
  assigned_time?: string;  // V3: e.g., "9:00-11:00am"
  assigned_time_block?: string;  // Legacy
  assigned_date?: string;

  // Additional
  additional_sources?: Array<{ url: string; name: string; notes?: string }>;
  raw_data?: Record<string, unknown>;
}

export interface TripImportPayload {
  metadata: TripImportMetadata;
  segment: TripImportSegment;
  research_items: TripImportResearchItem[];
  days: TripImportDay[];
  // Route stops and alternatives at root level
  route_stops?: RouteStop[];
  alternatives?: Array<{
    id?: string;
    name: string;
    item_type: string;
    trigger?: string;
    why_not_scheduled?: string;
    priority?: string;
    replaces?: {
      scheduled_activity_name?: string;
      scheduled_activity_id?: string;
    } | null;
    practical?: V3Practical;
    deep_dive?: V3DeepDive;
    kid_engagement?: V3KidEngagement;
    location?: V3Location;
  }>;
}

export interface TripImportOptions {
  trip_id?: string;
  segment_id?: string; // Fill an existing segment shell instead of creating new
  create_trip?: boolean;
  create_segment?: boolean;
  create_days?: boolean;
  create_research_items?: boolean;
  import_approved_as_activities?: boolean;
  auto_approve_must_do?: boolean;
}

export interface TripImportResult {
  success: boolean;
  trip_id: string;
  segment_id: string;
  created: {
    trip?: boolean;
    segment: boolean;
    days: number;
    research_items: number;
    activities: number;
  };
  errors?: string[];
}

export interface TripImportValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  summary: {
    research_items: number;
    days: number;
    items_with_source: number;
    items_by_type: Record<string, number>;
    items_by_priority: Record<string, number>;
  };
}

// Create/Update requests
export interface CreateTravelSettingsRequest {
  claude_instructions?: string;
  family_profile?: FamilyTravelProfile;
  output_template?: ResearchOutputTemplate;
}

export interface UpdateTravelSettingsRequest extends Partial<CreateTravelSettingsRequest> {}

export interface UpdateResearchItemRequest {
  status?: ResearchItemStatus;
  priority?: ResearchItemPriority;
  assigned_day?: number;
  assigned_time_block?: TripTimeBlock;
  notes?: string;
  tags?: string[];
}

// ============================================================================
// Hotel Research Types (Phase 2 - Hotel Research Agent)
// ============================================================================

export type HotelRedemptionType = 'POINTS' | 'FHR' | 'THC' | 'PORTAL' | 'CASH' | 'CERT';
export type HotelPickType = 'BEST_OVERALL' | 'BEST_VALUE' | 'BEST_LUXURY' | 'CASH_BACKUP';
export type HotelPropertyType = 'hotel' | 'resort' | 'vacation_rental' | 'boutique' | 'apartment' | 'pousada' | 'quinta';

export interface HotelEvaluationScores {
  loyalty_and_value: {
    score: number;  // 1-10
    notes: string;
    cpp?: number;  // cents per point
    benefits_applied?: string[];
  };
  luxury_and_upgrade_potential: {
    score: number;  // 1-10
    notes: string;
    upgrade_likelihood?: string;
    view_risk?: string;
  };
  amenities_quality: {
    score: number;  // 1-10
    notes: string;
    pool_verified: boolean;
    pool_details?: string;
  };
  location: {
    score: number;  // 1-10
    notes: string;
    distance_to_attractions?: string;
    neighborhood?: string;
  };
  space_and_comfort: {
    score: number;  // 1-10
    notes: string;
    max_occupancy?: number;
    room_size_sqm?: number;
    bed_configuration?: string;
  };
  overall_score: number;  // Weighted average
}

export interface HotelPointsOption {
  program: string;  // Hyatt, Marriott, Hilton, etc.
  points_per_night: number;
  total_points: number;
  cpp: number;
  fifth_night_free?: boolean;
  transfer_from?: string;  // e.g., "Chase UR"
  transfer_ratio?: string;  // e.g., "1:1"
}

export interface HotelFHRBenefits {
  available: boolean;
  rate_per_night?: string;
  total_rate?: string;
  benefits?: string[];
  effective_rate?: string;  // After benefits calculated
  property_credit?: string;
  breakfast_value?: string;
  upgrade_value?: string;
}

export interface HotelOption {
  // Identity
  name: string;
  brand?: string;
  chain?: string;
  property_type: HotelPropertyType;
  star_rating?: number;

  // Classification
  redemption_type: HotelRedemptionType;
  pick_type: HotelPickType;
  recommendation_reason: string;

  // Location
  location: {
    address?: string;
    neighborhood?: string;
    city: string;
    latitude?: number;
    longitude?: number;
    google_maps_url?: string;
    distance_to_center?: string;
    walkability_notes?: string;
  };

  // Ratings & Reviews
  ratings: {
    overall_score?: number;
    source?: string;
    review_count?: number;
    family_sentiment?: string;
    upgrade_reputation?: string;
    recent_issues?: string[];
  };

  // Pricing
  pricing: {
    cash_rate_per_night?: string;
    cash_total?: string;
    currency?: string;
    points_option?: HotelPointsOption;
    fhr?: HotelFHRBenefits;
    best_booking_method?: string;
    booking_url?: string;
  };

  // Family Assessment
  family_assessment: {
    room_size_notes?: string;
    connecting_rooms?: boolean;
    cribs_available?: boolean;
    kid_friendly_amenities?: string[];
    pool: {
      exists: boolean;
      type?: 'indoor' | 'outdoor' | 'both' | 'rooftop';
      kid_pool?: boolean;
      notes?: string;
    };
    breakfast_included?: boolean;
    kitchen_facilities?: string;
    laundry?: boolean;
    parking?: string;
    overall_family_verdict?: string;
  };

  // Evaluation
  scores: HotelEvaluationScores;

  // Pros/Cons
  pros: string[];
  cons: string[];
  risks?: string[];

  // Booking
  booking_instructions?: string[];
  elite_benefits?: string[];

  // Sources
  source_url?: string;
  source_name?: string;
  additional_sources?: Array<{ url: string; name: string }>;
}

export interface HotelResearchMetadata {
  trip_name: string;
  segment_number: number;
  segment_name: string;
  dates: {
    check_in: string;
    check_out: string;
  };
  nights: number;
  generated_at: string;
  version: string;
}

export interface HotelResearchSegmentContext {
  location_name: string;
  region: string;
  theme?: string;
  budget_approach: 'splurge' | 'standard' | 'economize' | 'flexible';
  loyalty_preference?: string;
  neighborhood_recommendations?: string[];
  key_experiences?: string[];
  must_haves?: string[];
  nice_to_haves?: string[];
  notes?: string;
}

export interface HotelResearchSummary {
  top_recommendation: {
    hotel_name: string;
    reason: string;
    booking_method: HotelRedemptionType;
  };
  budget_pick?: {
    hotel_name: string;
    reason: string;
  };
  points_pick?: {
    hotel_name: string;
    program: string;
    cpp: number;
  };
  luxury_pick?: {
    hotel_name: string;
    reason: string;
  };
  decision_factors?: string[];
  booking_priority_note?: string;
}

export interface HotelResearchPayload {
  metadata: HotelResearchMetadata;
  segment_context: HotelResearchSegmentContext;
  hotels: HotelOption[];
  summary: HotelResearchSummary;
  comparison_table?: {
    headers: string[];
    rows: Array<Record<string, string>>;
  };
}

export interface HotelResearchImportOptions {
  trip_id: string;
  segment_id: string;
}

export interface HotelResearchImportResult {
  success: boolean;
  trip_id: string;
  segment_id: string;
  created: {
    research_items: number;
  };
  errors?: string[];
}

// ============================================================================
// SCHEDULE VALIDATION TYPES (Smart Schedule Assembly)
// ============================================================================

// Validation issue severity levels (all non-blocking)
export type ValidationIssueSeverity = 'error' | 'warning' | 'suggestion';

// Validation issue categories
export type ValidationIssueCategory =
  | 'opening_hours'
  | 'travel_time'
  | 'booking'
  | 'meal_gap'
  | 'duration'
  | 'amenity_mismatch'
  | 'google_data';

// Individual validation issue
export interface ValidationIssue {
  severity: ValidationIssueSeverity;
  category: ValidationIssueCategory;
  activityId?: string;
  activityName?: string;
  scheduleItemId?: string;
  dayId?: string;
  date?: string;
  time?: string;
  message: string;
  details?: string;
  autoFixAvailable?: boolean;
}

// Overall validation result
export interface ValidationResult {
  valid: boolean;
  canProceed: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
  };
}

// Schedule assembly response (includes validation)
export interface AssembleScheduleResponse {
  success: boolean;
  message: string;
  data: {
    days_scheduled: number;
    total_items: number;
    activities_enriched?: number;
    validation?: ValidationResult;
  };
  timestamp: string;
}

// Validation status for daily_schedule_items
export type ScheduleItemValidationStatus = 'pending' | 'valid' | 'warning' | 'error';

// ============================================================================
// RV LOCATIONS TYPES
// ============================================================================

// RV Location category options
export type RVLocationCategory =
  | 'harvest_hosts'
  | 'national_parks'
  | 'state_parks'
  | 'hot_springs'
  | 'lake_river'
  | 'boondocking'
  | 'couples_getaway'
  | 'other';

// RV Location status options
export type RVLocationStatus = 'researching' | 'want_to_visit' | 'visited' | 'not_interested';

// RV Land type - land management/ownership classification
export type RVLandType =
  | 'national_park'          // NPS managed
  | 'state_park'
  | 'national_monument'      // Can be NPS, BLM, or USFS managed
  | 'national_forest'        // US Forest Service
  | 'blm'                    // Bureau of Land Management
  | 'national_recreation_area'
  | 'national_wildlife_refuge'
  | 'army_corps'             // Army Corps of Engineers
  | 'county_park'
  | 'city_park'
  | 'private_rv_park'
  | 'private_campground'
  | 'casino'
  | 'other';

// RV hookup types
export type RVHookupType = 'full' | 'electric_only' | 'water_electric' | 'dry' | 'none';

// RV road accessibility levels
export type RVRoadAccessibility = 'paved' | 'gravel' | 'dirt' | 'rough_4x4';

// RV cell coverage levels
export type RVCellCoverage = 'excellent' | 'good' | 'spotty' | 'none';

// RV activity types
export type RVActivityType =
  | 'hike'
  | 'bike'
  | 'swim'
  | 'fish'
  | 'kayak'
  | 'paddleboard'
  | 'horseback'
  | 'wildlife_viewing'
  | 'stargazing'
  | 'hot_springs'
  | 'beach'
  | 'playground'
  | 'visitor_center'
  | 'ranger_program'
  | 'scenic_drive'
  | 'photography'
  | 'other';

// RV activity time of day
export type RVActivityTimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';

// RV Logistics JSONB structure
export interface RVLogistics {
  max_trailer_length_ft?: number;
  hookups?: RVHookupType;
  road_accessibility?: RVRoadAccessibility;
  cell_coverage?: RVCellCoverage;
  starlink_friendly?: boolean;
  dump_station?: boolean;
  fifth_wheel_accessible?: boolean;
  generator_allowed?: boolean;
  pet_friendly?: boolean;
  max_stay_nights?: number;
}

// RV Best Season JSONB structure
export interface RVBestSeason {
  best?: string[];  // ['spring', 'fall']
  avoid?: string[];  // ['summer'] (too hot)
  notes?: string;
}

// RV Vibe ratings (1-5 scale)
export interface RVVibe {
  solitude_level?: number;      // 1 = crowded, 5 = isolated
  other_kids_around?: number;   // 1 = rare, 5 = many families
  relaxation_factor?: number;   // 1 = active, 5 = pure relaxation
  scenic_beauty?: number;       // 1 = meh, 5 = breathtaking
  adventure_level?: number;     // 1 = chill, 5 = extreme adventure
  family_friendly?: number;     // 1 = adults only, 5 = perfect for kids
}

// RV Educational Value JSONB structure
export interface RVEducationalValue {
  visitor_center?: boolean;
  junior_ranger_program?: boolean;
  ranger_programs?: boolean;
  topics?: string[];  // ['geology', 'wildlife', 'history']
}

// Kid engagement per child
export interface RVChildEngagement {
  suitable?: boolean;
  engagement_level?: 'high' | 'medium' | 'low';
  activities?: string[];
  notes?: string;
}

// RV Kid Engagement JSONB structure
export interface RVKidEngagement {
  parker?: RVChildEngagement;    // 8 years old
  charlotte?: RVChildEngagement; // 5 years old
  xander?: RVChildEngagement;    // 3 years old
}

// RV Location main interface
export interface RVLocation {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  hook?: string;
  category?: RVLocationCategory;
  land_type?: RVLandType;
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  google_rating?: number;
  google_review_count?: number;
  google_price_level?: number;
  rv_logistics?: RVLogistics;
  reservation_required?: boolean;
  reservation_url?: string;
  reservation_notes?: string;
  cost_per_night?: number;
  cost_currency?: string;
  cost_notes?: string;
  best_season?: RVBestSeason;
  drive_time_from_la?: string;
  drive_distance_miles?: number;
  vibe?: RVVibe;
  educational_value?: RVEducationalValue;
  kid_engagement?: RVKidEngagement;
  website?: string;
  phone?: string;
  cover_image_url?: string;
  status?: RVLocationStatus;
  priority?: number;
  tags?: string[];
  pros?: string[];
  cons?: string[];
  notes?: string;
  converted_to_trip_id?: string;
  enriched_at?: string;
  share_token?: string;
  created_at: string;
  updated_at: string;
  // Populated via joins
  activities?: RVLocationActivity[];
  media?: RVLocationMedia[];
}

// RV Location Activity interface
export interface RVLocationActivity {
  id: string;
  location_id: string;
  name: string;
  description?: string;
  activity_type?: RVActivityType;
  time_of_day?: RVActivityTimeOfDay;
  kid_engagement?: RVKidEngagement;
  duration_minutes?: number;
  duration_text?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_from_campsite?: string;
  cost_estimate?: number;
  cost_notes?: string;
  google_place_id?: string;
  google_rating?: number;
  alltrails_url?: string;
  alltrails_rating?: number;
  difficulty?: string;
  distance_miles?: number;
  elevation_gain_ft?: number;
  tips?: string;
  notes?: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

// RV Location Media interface
export interface RVLocationMedia {
  id: string;
  location_id: string;
  activity_id?: string;
  user_id: string;
  file_url: string;
  thumbnail_url?: string;
  media_type?: 'image' | 'video';
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  caption?: string;
  google_attribution_name?: string;
  google_attribution_uri?: string;
  is_google_sourced?: boolean;
  is_favorite?: boolean;
  sort_order?: number;
  created_at: string;
}

// RV Research Settings interface
export interface RVResearchSettings {
  id: string;
  user_id: string;
  claude_instructions?: string;
  family_profile?: {
    members?: Array<{
      name: string;
      age?: number;
      engagement_style?: string;
    }>;
    equipment?: {
      trailer_model?: string;
      trailer_length_ft?: number;
      tow_vehicle?: string;
      has_starlink?: boolean;
      has_bikes?: boolean;
      has_kayak?: boolean;
      has_paddleboard?: boolean;
    };
  };
  output_template?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Create RV Location request
export interface CreateRVLocationRequest {
  name: string;
  description?: string;
  hook?: string;
  category?: RVLocationCategory;
  land_type?: RVLandType;
  location_name?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  rv_logistics?: RVLogistics;
  reservation_required?: boolean;
  reservation_url?: string;
  reservation_notes?: string;
  cost_per_night?: number;
  cost_currency?: string;
  cost_notes?: string;
  best_season?: RVBestSeason;
  drive_time_from_la?: string;
  drive_distance_miles?: number;
  vibe?: RVVibe;
  educational_value?: RVEducationalValue;
  kid_engagement?: RVKidEngagement;
  website?: string;
  phone?: string;
  cover_image_url?: string;
  status?: RVLocationStatus;
  priority?: number;
  tags?: string[];
  pros?: string[];
  cons?: string[];
  notes?: string;
}

// Create RV Location Activity request
export interface CreateRVLocationActivityRequest {
  name: string;
  description?: string;
  activity_type?: RVActivityType;
  time_of_day?: RVActivityTimeOfDay;
  kid_engagement?: RVKidEngagement;
  duration_minutes?: number;
  duration_text?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_from_campsite?: string;
  cost_estimate?: number;
  cost_notes?: string;
  google_place_id?: string;
  alltrails_url?: string;
  difficulty?: string;
  distance_miles?: number;
  elevation_gain_ft?: number;
  tips?: string;
  notes?: string;
  sort_order?: number;
}

// Create RV Location Media request
export interface CreateRVLocationMediaRequest {
  activity_id?: string;
  file_url: string;
  thumbnail_url?: string;
  media_type?: 'image' | 'video';
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  caption?: string;
  google_attribution_name?: string;
  google_attribution_uri?: string;
  is_google_sourced?: boolean;
  sort_order?: number;
}

// RV Location Import Payload (JSON from Claude)
export interface RVLocationImportPayload {
  locations: Array<{
    name: string;
    hook?: string;
    description?: string;
    category?: RVLocationCategory;
    land_type?: RVLandType;
    location_name?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    drive_time_from_la?: string;
    drive_distance_miles?: number;
    rv_logistics?: RVLogistics;
    best_season?: RVBestSeason;
    vibe?: RVVibe;
    educational_value?: RVEducationalValue;
    kid_engagement?: RVKidEngagement;
    cost_per_night?: number;
    cost_notes?: string;
    reservation_required?: boolean;
    reservation_url?: string;
    reservation_notes?: string;
    website?: string;
    phone?: string;
    pros?: string[];
    cons?: string[];
    tags?: string[];
    notes?: string;
    activities?: Array<{
      name: string;
      description?: string;
      activity_type?: RVActivityType;
      time_of_day?: RVActivityTimeOfDay;
      kid_engagement?: RVKidEngagement;
      duration_minutes?: number;
      duration_text?: string;
      distance_from_campsite?: string;
      cost_estimate?: number;
      alltrails_url?: string;
      difficulty?: string;
      distance_miles?: number;
      elevation_gain_ft?: number;
      tips?: string;
    }>;
  }>;
}

// RV Location Import Result
export interface RVLocationImportResult {
  success: boolean;
  created: {
    locations: number;
    activities: number;
  };
  errors?: string[];
  location_ids: string[];
}

// RV Location Convert to Trip request
export interface RVLocationConvertToTripRequest {
  start_date?: string;
  end_date?: string;
  traveler_count?: number;
}

// RV Location Convert to Trip result
export interface RVLocationConvertToTripResult {
  success: boolean;
  trip_id: string;
  segment_id: string;
  activity_count: number;
}

// RV Research Output Template (Claude's expected output format)
export interface RVResearchOutputTemplate {
  _template_info?: {
    name: string;
    version: string;
    description?: string;
  };
  locations: Array<{
    // Required
    name: string;
    hook: string;
    description: string;
    category: RVLocationCategory;
    land_type?: RVLandType;
    state: string;
    city: string;
    drive_time_from_la: string;

    // Logistics
    rv_logistics: {
      max_trailer_length_ft?: number;
      hookups: RVHookupType;
      cell_coverage: RVCellCoverage;
      road_accessibility?: string;
      fifth_wheel_accessible?: boolean;
    };

    // Vibe (Claude generates 1-5 ratings)
    vibe: RVVibe;

    // Season & Cost
    best_season: RVBestSeason;
    cost_per_night?: number;
    cost_notes?: string;
    reservation_required: boolean;
    reservation_notes?: string;

    // Kid Engagement (per child)
    kid_engagement: RVKidEngagement;

    // Educational
    educational_value?: RVEducationalValue;

    // Lists
    pros?: string[];
    cons?: string[];
    tags?: string[];

    // Activities (specific, not generic)
    activities: Array<{
      name: string;
      activity_type: RVActivityType;
      description: string;
      duration_text?: string;
      difficulty?: string;
      distance_miles?: number;
      elevation_gain_ft?: number;
      kid_engagement?: RVKidEngagement;
      tips?: string;
    }>;
  }>;
}

// RV Import Validation Result (for dry-run)
export interface RVImportValidationResult {
  valid: boolean;
  location_count: number;
  activity_count: number;
  warnings: Array<{
    type: 'duplicate_name' | 'missing_recommended' | 'invalid_value';
    message: string;
    location_name?: string;
    field?: string;
  }>;
  errors: Array<{
    type: 'missing_required' | 'invalid_type' | 'invalid_enum';
    message: string;
    location_name?: string;
    field?: string;
  }>;
}

// RV Review Highlights (from AI analysis)
export interface RVReviewHighlights {
  positive: Array<{
    text: string;
    author?: string;
    rating?: number;
  }>;
  negative: Array<{
    text: string;
    author?: string;
    rating?: number;
  }>;
  summary: string;
  last_updated: string;
}

// RV Enrichment Options
export interface RVEnrichmentOptions {
  fetch_reviews?: boolean;
  fetch_photos?: boolean;
  fetch_hours?: boolean;
  enrich_activities?: boolean;
  max_photos?: number;
}

// RV Enrichment Result
export interface RVEnrichmentResult {
  success: boolean;
  location_updated: boolean;
  activities_enriched: number;
  photos_added: number;
  reviews_fetched: number;
  errors?: string[];
}

// RV Activity Suggestion
export interface RVActivitySuggestion {
  name: string;
  activity_type: RVActivityType;
  description: string;
  duration_text?: string;
  difficulty?: string;
  distance_miles?: number;
  elevation_gain_ft?: number;
  why_recommended: string;
  kid_engagement?: RVKidEngagement;
  google_place_id?: string;
  alltrails_url?: string;
}
