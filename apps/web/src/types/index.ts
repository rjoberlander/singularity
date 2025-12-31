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
  intake_quantity?: number;
  intake_form?: SupplementIntakeForm | string;
  dose_per_serving?: number;
  dose_unit?: SupplementDoseUnit | string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: SupplementTiming | string;
  timing_specific?: string; // HH:MM format when timing = 'specific'
  timing_reason?: string;   // Why at this time (e.g., "cognitive benefits during waking hours")
  reason?: string;          // Why taking (e.g., "Phospholipid-bound omega-3s + astaxanthin")
  mechanism?: string;       // How it works (e.g., "Phospholipid form integrates into cell membranes")
  frequency?: string;
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
  intake_quantity?: number;
  intake_form?: SupplementIntakeForm | string;
  dose_per_serving?: number;
  dose_unit?: SupplementDoseUnit | string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: SupplementTiming | string;
  timing_specific?: string;
  timing_reason?: string;
  reason?: string;
  mechanism?: string;
  frequency?: string;
  notes?: string;
  goal_ids?: string[]; // IDs of goals to link
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
  extracted_data?: any;
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
  specs?: Record<string, any>;
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
  specs?: Record<string, any>;
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
