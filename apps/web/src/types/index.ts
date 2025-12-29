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
}

// Supplement types
export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  dose?: string;
  dose_per_serving?: number;
  dose_unit?: string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: string;
  frequency?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplementRequest {
  name: string;
  brand?: string;
  dose?: string;
  dose_per_serving?: number;
  dose_unit?: string;
  servings_per_container?: number;
  price?: number;
  purchase_url?: string;
  category?: string;
  timing?: string;
  frequency?: string;
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
export interface ExtractedBiomarkerData {
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    reference_range_low?: number;
    reference_range_high?: number;
    optimal_range_low?: number;
    optimal_range_high?: number;
    category?: string;
    confidence: number;
  }>;
  lab_info: {
    lab_name?: string;
    test_date?: string;
    patient_name?: string;
  };
  extraction_notes?: string;
}

export interface ExtractedSupplementData {
  supplements: Array<{
    name: string;
    brand?: string;
    dose?: string;
    dose_per_serving?: number;
    dose_unit?: string;
    servings_per_container?: number;
    price?: number;
    category?: string;
    timing?: string;
    frequency?: string;
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
  messages: ChatMessage[];
  extracted_data?: any;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
