// ==============================================
// SINGULARITY - Health Protocol Tracking Types
// ==============================================

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  timezone?: string;
  role: 'owner' | 'member';
  is_active: boolean;
  onboarding_completed?: boolean;
  onboarding_step?: 'profile' | 'goals' | 'supplements' | 'completed';
  created_at: string;
  updated_at: string;
}

// User Links (Family Sharing)
export interface UserLink {
  id: string;
  owner_user: string;
  linked_user?: string;
  permission: 'read' | 'write' | 'admin';
  status: 'pending' | 'active' | 'revoked';
  invite_code?: string;
  created_at: string;
  owner?: Pick<User, 'id' | 'name' | 'email'>;
  linked?: Pick<User, 'id' | 'name' | 'email'>;
}

// Biomarker Types
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
  created_at: string;
  updated_at: string;
}

export type BiomarkerStatus = 'low' | 'normal' | 'high' | 'optimal';

export interface BiomarkerWithStatus extends Biomarker {
  status: BiomarkerStatus;
  trend?: 'improving' | 'stable' | 'declining';
}

// Supplement Types
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

// Routine Types
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
  created_at: string;
  supplement?: Pick<Supplement, 'id' | 'name' | 'dose'>;
}

// Goal Types
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  target_biomarker?: string;
  current_value?: number;
  target_value?: number;
  direction: 'increase' | 'decrease' | 'maintain';
  status: 'active' | 'achieved' | 'paused';
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

// Change Log Types
export interface ChangeLogEntry {
  id: string;
  user_id: string;
  date: string;
  change_type: 'started' | 'stopped' | 'modified';
  item_type?: string;
  item_name?: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  linked_concern?: string;
  created_at: string;
}

// Protocol Docs Types
export interface ProtocolDoc {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category: 'routine' | 'biomarkers' | 'supplements' | 'goals' | 'reference' | 'other';
  file_url?: string;
  created_at: string;
  updated_at: string;
}

// AI Conversation Types
export interface AIConversation {
  id: string;
  user_id: string;
  context?: string;
  messages: AIMessage[];
  extracted_data?: ExtractedBiomarkerData;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExtractedBiomarkerData {
  biomarkers: Partial<Biomarker>[];
  lab_info?: {
    lab_name?: string;
    test_date?: string;
    patient_name?: string;
  };
  confidence: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Request Types
export interface CreateBiomarkerRequest {
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
  ai_extracted?: boolean;
  is_calculated?: boolean;
}

export interface CreateSupplementRequest {
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
  timing_reason?: string;
  frequency?: string;
  reason?: string;
  mechanism?: string;
  notes?: string;
}

export interface CreateRoutineRequest {
  name: string;
  time_of_day?: string;
  sort_order?: number;
}

export interface CreateRoutineItemRequest {
  routine_id: string;
  title: string;
  description?: string;
  time?: string;
  duration?: string;
  days?: string[];
  linked_supplement?: string;
  sort_order?: number;
}

export interface CreateGoalRequest {
  title: string;
  category?: string;
  target_biomarker?: string;
  current_value?: number;
  target_value?: number;
  direction: 'increase' | 'decrease' | 'maintain';
  priority?: number;
  notes?: string;
}

export interface InviteUserRequest {
  email: string;
  permission?: 'read' | 'write' | 'admin';
}

// AI Extraction Request Types
export interface ExtractBiomarkersRequest {
  image_base64?: string;
  text_content?: string;
  source_type: 'image' | 'text' | 'pdf';
}

export interface HealthChatRequest {
  message: string;
  context?: 'general' | 'biomarkers' | 'supplements' | 'routines' | 'goals';
  include_user_data?: boolean;
}

// Equipment Types
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
