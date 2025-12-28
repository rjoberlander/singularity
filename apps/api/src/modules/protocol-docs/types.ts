import { HARD_CODED_PRODUCT_TYPES } from "./constants";

export type KnowledgeBaseAction =
  | "createCard"
  | "updateCard"
  | "search"
  | "getCard"
  | "deleteCard"
  | "reviewSuggestion"
  | "getCardHistory"
  | "addRelation"
  | "removeRelation"
  | "uploadAttachment"
  | "getAttachments"
  | "updateProductSections"
  | "uploadDocument"
  | "getDocuments"
  | "deleteDocument"
  | "restoreDocument"
  | "downloadDocument"
  | "getDocumentUrl"
  | "updateDocument"
  | "uploadImage"
  | "getRecordsNeedingAttention";

// New collection system types (updated to match organizational structure - migration 999)
export type KBMainCollection =
  | 'co_ea_hr_dev_finance'
  | 'ops_cs_orders_sales'
  | 'sales_listing_design'
  | 'ops_freight_inventory_po'
  | 'sales_quote'
  | 'sales_sme_product';

export type KBSMEProductType = 
  | 'bioshielduv'
  | 'ogm'
  | 'hr_fr_ext'
  | 'gr'
  | 'cable'
  | 'parts'
  | 'fence'
  | 'tr_trc';

// Legacy types (for backward compatibility)
export type KBCardType = 'product_info' | 'sop' | 'general';
export type KBClassification = 'product' | 'technical_sop' | 'core_sop' | 'other';
export type KBProductType = typeof HARD_CODED_PRODUCT_TYPES[number];
export type KBChangeType = 'created' | 'updated' | 'deleted' | 'reviewed';
export type KBProposalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type KBRelationType = 'governs' | 'references' | 'updates' | 'supersedes';

// Updated product section types (standardized 4 sections)
export type ProductSectionType = 'general_info' | 'specific_details' | 'change_log' | 'issues_resolutions';

export interface KnowledgeCard {
  id?: string;
  title: string;
  summary?: string;
  content?: string; // Markdown content

  // New collection system fields
  main_collection?: KBMainCollection;
  sme_product_type?: KBSMEProductType;

  // Legacy fields (for backward compatibility)
  card_type?: KBCardType;
  classification?: KBClassification;
  product_type?: KBProductType; // Only for product_info cards

  priority?: number;
  status?: string;
  version?: number;

  // Product card sections (for SME product cards)
  general_info?: string;
  specific_details?: string;
  change_log?: string;
  issues_resolutions?: string;

  // Owner role assignment
  owner_role_id?: number | null;
  owner_specialty_addon_id?: number | null;

  // Populated owner role data (from joins)
  owner_role_name?: string;
  owner_specialty_name?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;

  // Related data (populated on request)
  sections?: ProductSection[];
  relations?: KnowledgeCardRelation[];
  attachments?: KnowledgeCardAttachment[];
  changes?: KnowledgeCardChange[];
}

export interface ProductSection {
  id?: string;
  card_id: string;
  section_type: ProductSectionType;
  content: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

// Product card with all sections combined
export interface ProductKnowledgeCard extends Omit<KnowledgeCard, 'title' | 'summary' | 'content'> {
  general_info?: string;
  specific_details?: string;
  change_log?: string;
  issues_resolutions?: string;
}

export interface KnowledgeCardChange {
  id?: string;
  card_id: string;
  change_type: KBChangeType;
  reason?: string;
  changes_diff?: any; // JSON diff
  created_at?: string;
  created_by?: string;
  session_id?: string;
  channel_id?: string;
  thread_id?: string;
  message_ids?: string[];
}

export interface KnowledgeCardRelation {
  id?: string;
  source_card_id: string;
  target_card_id: string;
  relation_type: KBRelationType;
  description?: string;
  created_at?: string;
  created_by?: string;
  
  // Populated data
  target_card?: KnowledgeCard;
  source_card?: KnowledgeCard;
}

export interface KnowledgeCardAttachment {
  id?: string;
  card_id: string;
  filename: string;
  storage_path: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  image_metadata?: any;
  created_at?: string;
  uploaded_by?: string;
}

export interface KBSearchOptions {
  query?: string;

  // New collection system filters
  main_collection?: KBMainCollection | string;
  sme_product_type?: KBSMEProductType | string;
  tag?: string; // Single tag filter
  tags?: string[]; // Multiple tags filter

  // Legacy filters (for backward compatibility)
  card_type?: KBCardType;
  classification?: KBClassification;
  product_type?: KBProductType;

  status?: string;
  search_type?: 'text' | 'vector' | 'hybrid';
  limit?: number;
  offset?: number;
}

export interface KBSearchResult {
  cards: KnowledgeCard[];
  total: number;
  took_ms?: number;
}

export interface KnowledgeBaseModuleInput {
  action: KnowledgeBaseAction;
  payload?: {
    card?: Partial<KnowledgeCard>;
    cardId?: string;
    searchOptions?: KBSearchOptions;
    relation?: Partial<KnowledgeCardRelation>;
    attachment?: {
      file: Buffer;
      filename: string;
      mimetype: string;
    };
    document?: {
      file: Buffer;
      filename: string;
      mimetype: string;
      description?: string;
    };
    documentId?: string;
    changeReason?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface KnowledgeBaseModuleOutput<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Collection metadata interfaces
export interface KBCollectionMetadata {
  id?: string;
  collection_key: string;
  display_name: string;
  description?: string;
  icon?: string;
  color_class?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KBSubcategoryMetadata {
  id?: string;
  subcategory_key: string;
  display_name: string;
  description?: string;
  icon?: string;
  color_class?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KBSMEProductMetadata {
  id?: string;
  product_key: string;
  display_name: string;
  description?: string;
  icon?: string;
  color_class?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Collection hierarchy with metadata
export interface KBCollectionHierarchy extends KnowledgeCard {
  collection_display_name?: string;
  collection_icon?: string;
  collection_color?: string;
  subcategory_display_name?: string;
  subcategory_icon?: string;
  subcategory_color?: string;
  sme_product_display_name?: string;
  sme_product_icon?: string;
  sme_product_color?: string;
}

// Collection statistics
export interface KBCollectionStats {
  collection_key: string;
  total_cards: number;
  active_cards: number;
  draft_cards: number;
  subcategory_counts?: { [key: string]: number };
  sme_product_counts?: { [key: string]: number };
}

// Document-related types
export interface KnowledgeCardDocument {
  id?: string;
  card_id: string;
  title: string;
  content: string; // Markdown content (extracted text)
  original_filename: string;
  file_type: 'pdf' | 'docx' | 'doc' | 'txt' | 'md';
  file_size: number;
  storage_path?: string; // Path to original file in Supabase storage
  position?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface DocumentUploadResult {
  document: KnowledgeCardDocument;
  embeddings_created: number;
}
