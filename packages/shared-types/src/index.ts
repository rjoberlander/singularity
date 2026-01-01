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
  | 'oil'
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
