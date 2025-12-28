import { createClient } from '@supabase/supabase-js';
import {
  KnowledgeCard,
  ProductSection,
  KnowledgeCardChange,
  KnowledgeCardRelation,
  KnowledgeCardAttachment,
  KBSearchOptions,
  KBSearchResult,
  KBCardType,
  KBClassification,
  KBProductType,
  KBChangeType,
  KBRelationType,
  ProductSectionType,
  KnowledgeCardDocument
} from '../types';

// Database service for Knowledge Base operations
export class KBDatabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // =============================================
  // KNOWLEDGE CARD OPERATIONS
  // =============================================

  async createCard(card: Partial<KnowledgeCard>, userId?: string): Promise<KnowledgeCard> {
    // Check for duplicate SME product cards before creating
    if (card.main_collection === 'sales_sme_product' && card.sme_product_type) {
      const { data: existingCards } = await this.supabase
        .from('kb_cards')
        .select('id')
        .eq('main_collection', 'sales_sme_product')
        .eq('sme_product_type', card.sme_product_type)
        .eq('status', 'active');

      if (existingCards && existingCards.length > 0) {
        throw new Error(`An active ${card.sme_product_type} product card already exists`);
      }
    }

    // For SME product cards, use product type as title
    let cardData: any = {
      ...card,
      created_by: userId,
      updated_by: userId,
      status: card.status || 'active',
      priority: card.priority || 0,
      version: 1
    };

    // If it's an SME product card, set title to product type
    if (card.main_collection === 'sales_sme_product' && card.sme_product_type) {
      cardData.title = card.sme_product_type;
      cardData.summary = card.sme_product_type; // Just use the product type without the prefix text
      // Don't include content field for product cards
      delete cardData.content;
    }

    const { data, error } = await this.supabase
      .from('kb_cards')
      .insert([cardData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create knowledge card: ${error.message}`);
    }

    // If it's a product card, create the 4 sections
    if (data.main_collection === 'sales_sme_product' && data.sme_product_type) {
      const sections = [
        { card_id: data.id, section_type: 'general_info', content: '', order_index: 1 },
        { card_id: data.id, section_type: 'specific_details', content: '', order_index: 2 },
        { card_id: data.id, section_type: 'change_log', content: '', order_index: 3 },
        { card_id: data.id, section_type: 'issues_resolutions', content: '', order_index: 4 }
      ];

      const { error: sectionsError } = await this.supabase
        .from('kb_product_sections')
        .insert(sections);

      if (sectionsError) {
        console.error('Error creating product sections:', sectionsError);
        // Rollback card creation if sections fail
        await this.supabase.from('kb_cards').delete().eq('id', data.id);
        throw new Error(`Failed to create product sections: ${sectionsError.message}`);
      }
    }

    // Log the creation
    await this.logCardChange(data.id, 'created', 'Card created', userId);

    // Trigger background chunking/embedding generation (fire and forget)
    this.triggerBackgroundChunking(data.id, 'create').catch(err => {
      console.error(`[KB] Background chunking failed for card ${data.id}:`, err.message);
    });

    return data;
  }

  async updateCard(cardId: string, updates: Partial<KnowledgeCard>, userId?: string, reason?: string): Promise<KnowledgeCard> {
    // Get the current card for diff
    const current = await this.getCard(cardId);
    if (!current) {
      throw new Error('Card not found');
    }

    // Filter out deprecated fields and derived display fields that don't exist in the database schema
    // owner_role_name and owner_specialty_name are computed from joins when fetching cards
    const { tag, tags, frequency, frequency_when, owner_role_name, owner_specialty_name, owner_role, owner_specialty, ...cleanUpdates } = updates as any;

    // Update the card
    const { data, error } = await this.supabase
      .from('kb_cards')
      .update({
        ...cleanUpdates,
        updated_by: userId,
        version: current.version ? current.version + 1 : 2
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update knowledge card: ${error.message}`);
    }

    // Log the change with diff
    const changesDiff = this.computeDiff(current, data);
    await this.logCardChange(cardId, 'updated', reason || 'Card updated', userId, changesDiff);

    // Trigger background chunking/embedding generation (fire and forget)
    this.triggerBackgroundChunking(cardId, 'update').catch(err => {
      console.error(`[KB] Background chunking failed for card ${cardId}:`, err.message);
    });

    // Return the full card with joined role names (not raw update result)
    const fullCard = await this.getCard(cardId);
    return fullCard as KnowledgeCard;
  }

  async getCard(cardId: string, includeRelated: boolean = false): Promise<KnowledgeCard | null> {
    // Select card with owner role names via joins
    const { data: card, error } = await this.supabase
      .from('kb_cards')
      .select(`
        *,
        owner_role:roles!kb_cards_owner_role_id_fkey(id, name),
        owner_specialty:roles!kb_cards_owner_specialty_addon_id_fkey(id, name)
      `)
      .eq('id', cardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get knowledge card: ${error.message}`);
    }

    if (!card) return null;

    // Flatten owner role data
    const result: any = { ...card };
    if (card.owner_role) {
      result.owner_role_name = card.owner_role.name;
    }
    if (card.owner_specialty) {
      result.owner_specialty_name = card.owner_specialty.name;
    }
    // Clean up nested objects
    delete result.owner_role;
    delete result.owner_specialty;

    // Always include sections for product cards
    if (result.main_collection === 'sales_sme_product') {
      const sections = await this.getCardSections(cardId);
      const sectionMap: any = {};
      sections.forEach(section => {
        sectionMap[section.section_type] = section.content;
      });
      // Add sections as flat fields
      result.general_info = sectionMap.general_info || '';
      result.specific_details = sectionMap.specific_details || '';
      result.change_log = sectionMap.change_log || '';
      result.issues_resolutions = sectionMap.issues_resolutions || '';

      if (includeRelated) {
        result.sections = sections;
      }
    }

    if (includeRelated) {
      // Fetch additional related data
      const [relations, attachments] = await Promise.all([
        this.getCardRelations(cardId),
        this.getCardAttachments(cardId)
      ]);

      return {
        ...result,
        relations,
        attachments
      };
    }

    return result;
  }

  async deleteCard(cardId: string, userId?: string): Promise<void> {
    // Log the deletion first
    await this.logCardChange(cardId, 'deleted', 'Card deleted', userId);

    const { error } = await this.supabase
      .from('kb_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      throw new Error(`Failed to delete knowledge card: ${error.message}`);
    }
  }

  async searchCards(options: KBSearchOptions): Promise<KBSearchResult> {
    const startTime = Date.now();
    // Include owner role names via joins
    let query = this.supabase.from('kb_cards').select(`
      *,
      owner_role:roles!kb_cards_owner_role_id_fkey(id, name),
      owner_specialty:roles!kb_cards_owner_specialty_addon_id_fkey(id, name)
    `, { count: 'exact' });

    // Apply filters
    // New collection system filters
    if (options.main_collection) {
      query = query.eq('main_collection', options.main_collection);
    }

    if (options.sme_product_type) {
      query = query.eq('sme_product_type', options.sme_product_type);
    }
    
    // Legacy filters
    if (options.card_type) {
      query = query.eq('card_type', options.card_type);
    }

    if (options.classification) {
      query = query.eq('classification', options.classification);
    }

    if (options.product_type) {
      query = query.eq('product_type', options.product_type);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.eq('status', 'active'); // Default to active cards
    }

    // Handle text search
    if (options.query) {
      const searchType = options.search_type || 'text';
      
      if (searchType === 'text' || searchType === 'hybrid') {
        // For text search, use RPC function if available, otherwise fallback to ILIKE
        const formattedQuery = this.formatSearchQuery(options.query);
        
        // Check if query has multiple words (which might break textSearch)
        const hasMultipleWords = formattedQuery.split(' ').length > 1;
        
        if (hasMultipleWords) {
          // Use ILIKE for multi-word queries as a safer approach
          // Search ONLY in title for more precise results
          const searchTerms = formattedQuery.split(' ').filter(term => term.length > 0);
          const orConditions = searchTerms.map(term =>
            `title.ilike.%${term}%`
          ).join(',');
          query = query.or(orConditions);
        } else {
          // Single word queries - search only title using ILIKE for consistency
          query = query.ilike('title', `%${formattedQuery}%`);
        }
      }
      
      // TODO: Implement vector search when search_type is 'vector' or 'hybrid'
      // This would require the embeddings to be generated and stored
    }

    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by relevance (updated_at for now, could be enhanced with ranking)
    query = query.order('updated_at', { ascending: false });

    const { data: cards, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search knowledge cards: ${error.message}`);
    }

    const tookMs = Date.now() - startTime;

    // Transform cards to include sections as flat fields and flatten owner role data
    const transformedCards = await Promise.all((cards || []).map(async (card: any) => {
      // Flatten owner role data
      const result: any = { ...card };
      if (card.owner_role) {
        result.owner_role_name = card.owner_role.name;
      }
      if (card.owner_specialty) {
        result.owner_specialty_name = card.owner_specialty.name;
      }
      delete result.owner_role;
      delete result.owner_specialty;

      // Handle product card sections
      if (result.main_collection === 'sales_sme_product') {
        const sections = await this.getCardSections(result.id);
        const sectionMap: any = {};
        sections.forEach(section => {
          sectionMap[section.section_type] = section.content;
        });
        result.general_info = sectionMap.general_info || '';
        result.specific_details = sectionMap.specific_details || '';
        result.change_log = sectionMap.change_log || '';
        result.issues_resolutions = sectionMap.issues_resolutions || '';
      }
      return result;
    }));

    return {
      cards: transformedCards,
      total: count || 0,
      took_ms: tookMs
    };
  }

  // =============================================
  // PRODUCT SECTIONS OPERATIONS
  // =============================================

  async createProductSection(section: Partial<ProductSection>): Promise<ProductSection> {
    const { data, error } = await this.supabase
      .from('kb_product_sections')
      .insert([section])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product section: ${error.message}`);
    }

    return data;
  }

  async updateProductSection(sectionId: string, updates: Partial<ProductSection>): Promise<ProductSection> {
    const { data, error } = await this.supabase
      .from('kb_product_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product section: ${error.message}`);
    }

    return data;
  }

  async getCardSections(cardId: string): Promise<ProductSection[]> {
    const { data, error } = await this.supabase
      .from('kb_product_sections')
      .select('*')
      .eq('card_id', cardId)
      .order('order_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to get card sections: ${error.message}`);
    }

    return data || [];
  }

  async deleteProductSection(sectionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('kb_product_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      throw new Error(`Failed to delete product section: ${error.message}`);
    }
  }

  async updateProductCardSections(cardId: string, sections: {
    general_info?: string;
    specific_details?: string;
    change_log?: string;
    issues_resolutions?: string;
  }): Promise<void> {
    const sectionTypes: Array<{ type: ProductSectionType; content?: string }> = [
      { type: 'general_info', content: sections.general_info },
      { type: 'specific_details', content: sections.specific_details },
      { type: 'change_log', content: sections.change_log },
      { type: 'issues_resolutions', content: sections.issues_resolutions }
    ];

    for (const { type, content } of sectionTypes) {
      if (content !== undefined) {
        // Update or create the section
        const { error } = await this.supabase
          .from('kb_product_sections')
          .upsert({
            card_id: cardId,
            section_type: type,
            content,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'card_id,section_type'
          });

        if (error) {
          throw new Error(`Failed to update ${type} section: ${error.message}`);
        }
      }
    }
  }

  // =============================================
  // RELATIONS OPERATIONS
  // =============================================

  async addRelation(relation: Partial<KnowledgeCardRelation>): Promise<KnowledgeCardRelation> {
    const { data, error } = await this.supabase
      .from('kb_relations')
      .insert([relation])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add card relation: ${error.message}`);
    }

    return data;
  }

  async removeRelation(relationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('kb_relations')
      .delete()
      .eq('id', relationId);

    if (error) {
      throw new Error(`Failed to remove card relation: ${error.message}`);
    }
  }

  async getCardRelations(cardId: string): Promise<KnowledgeCardRelation[]> {
    const { data, error } = await this.supabase
      .from('kb_relations')
      .select(`
        *,
        target_card:kb_cards!target_card_id(id, title, card_type, classification)
      `)
      .eq('source_card_id', cardId);

    if (error) {
      throw new Error(`Failed to get card relations: ${error.message}`);
    }

    return data || [];
  }

  // =============================================
  // ATTACHMENTS OPERATIONS
  // =============================================

  async addAttachment(attachment: Partial<KnowledgeCardAttachment>): Promise<KnowledgeCardAttachment> {
    const { data, error } = await this.supabase
      .from('kb_attachments')
      .insert([attachment])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add attachment: ${error.message}`);
    }

    return data;
  }

  async getCardAttachments(cardId: string): Promise<KnowledgeCardAttachment[]> {
    const { data, error } = await this.supabase
      .from('kb_attachments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get card attachments: ${error.message}`);
    }

    return data || [];
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('kb_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      throw new Error(`Failed to remove attachment: ${error.message}`);
    }
  }

  // =============================================
  // CHANGE HISTORY OPERATIONS
  // =============================================

  async logCardChange(
    cardId: string,
    changeType: KBChangeType,
    reason?: string,
    userId?: string,
    changesDiff?: any,
    sessionId?: string,
    channelId?: string,
    threadId?: string,
    messageIds?: string[]
  ): Promise<KnowledgeCardChange> {
    const { data, error } = await this.supabase
      .from('kb_card_changes')
      .insert([{
        card_id: cardId,
        change_type: changeType,
        reason,
        created_by: userId,
        changes_diff: changesDiff,
        session_id: sessionId,
        channel_id: channelId,
        thread_id: threadId,
        message_ids: messageIds
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log card change: ${error.message}`);
    }

    return data;
  }

  async getCardHistory(cardId: string): Promise<KnowledgeCardChange[]> {
    const { data, error } = await this.supabase
      .from('kb_card_changes')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get card history: ${error.message}`);
    }

    return data || [];
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private formatSearchQuery(query: string): string {
    // Clean and format the query for PostgreSQL full-text search
    // Using plainto_tsquery approach: just clean the input
    // PostgreSQL will handle the parsing more robustly
    
    // Remove any special characters that could break tsquery
    // Keep alphanumeric, spaces, hyphens, and basic punctuation
    const cleaned = query
      .trim()
      .replace(/[^\w\s\-\.]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
      .toLowerCase();                 // Lowercase for consistency
    
    // Return the cleaned query - let PostgreSQL handle the rest
    // The textSearch method should use plainto_tsquery or similar
    return cleaned;
  }

  private computeDiff(before: any, after: any): any {
    const diff: any = {
      before: {},
      after: {},
      changed: []
    };

    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of keys) {
      if (before[key] !== after[key]) {
        diff.before[key] = before[key];
        diff.after[key] = after[key];
        diff.changed.push(key);
      }
    }

    return diff;
  }

  // Get statistics for the knowledge base
  async getStatistics(): Promise<any> {
    const [cardsStats, sectionsStats, relationsStats] = await Promise.all([
      this.supabase
        .from('kb_cards')
        .select('card_type, classification, status', { count: 'exact' }),
      this.supabase
        .from('kb_product_sections')
        .select('section_type', { count: 'exact' }),
      this.supabase
        .from('kb_relations')
        .select('relation_type', { count: 'exact' })
    ]);

    return {
      cards: cardsStats.count || 0,
      sections: sectionsStats.count || 0,
      relations: relationsStats.count || 0,
      cardsByType: this.groupByField(cardsStats.data || [], 'card_type'),
      cardsByClassification: this.groupByField(cardsStats.data || [], 'classification'),
      cardsByStatus: this.groupByField(cardsStats.data || [], 'status'),
      sectionsByType: this.groupByField(sectionsStats.data || [], 'section_type'),
      relationsByType: this.groupByField(relationsStats.data || [], 'relation_type')
    };
  }

  private groupByField(data: any[], field: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  // =============================================
  // DOCUMENT OPERATIONS
  // =============================================

  async createCardDocument(document: Partial<KnowledgeCardDocument>): Promise<KnowledgeCardDocument> {
    // Get current max position for ordering
    const { data: existingDocs } = await this.supabase
      .from('kb_card_documents')
      .select('position')
      .eq('card_id', document.card_id!)
      .eq('is_deleted', false)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingDocs && existingDocs.length > 0 
      ? (existingDocs[0].position || 0) + 1 
      : 0;

    const { data, error } = await this.supabase
      .from('kb_card_documents')
      .insert([{
        ...document,
        position: nextPosition
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create card document: ${error.message}`);
    }

    return data;
  }

  async getCardDocuments(cardId: string): Promise<KnowledgeCardDocument[]> {
    const { data, error } = await this.supabase
      .from('kb_card_documents')
      .select('*')
      .eq('card_id', cardId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to get card documents: ${error.message}`);
    }

    return data || [];
  }

  async getDocument(documentId: string): Promise<KnowledgeCardDocument | null> {
    const { data, error } = await this.supabase
      .from('kb_card_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw new Error(`Failed to get document: ${error.message}`);
    }

    return data;
  }

  async updateDocument(documentId: string, updates: Partial<KnowledgeCardDocument>): Promise<KnowledgeCardDocument | null> {
    const { data, error } = await this.supabase
      .from('kb_card_documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return null;
    }

    return data;
  }

  async softDeleteDocument(documentId: string, userId?: string, userRole?: string): Promise<boolean> {
    let query = this.supabase
      .from('kb_card_documents')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', documentId);
    
    // Only restrict by user if not admin
    if (userRole !== 'admin') {
      query = query.eq('created_by', userId); // Only allow deleting own documents
    }
    
    const { data, error } = await query
      .select()
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  async restoreDocument(documentId: string, userId?: string, userRole?: string): Promise<boolean> {
    let query = this.supabase
      .from('kb_card_documents')
      .update({
        is_deleted: false,
        deleted_at: null
      })
      .eq('id', documentId);
    
    // Only restrict by user if not admin
    if (userRole !== 'admin') {
      query = query.eq('created_by', userId); // Only allow restoring own documents
    }
    
    const { data, error } = await query
      .select()
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    // Delete embeddings for this document
    const { error } = await this.supabase
      .from('kb_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to delete document embeddings: ${error.message}`);
    }

    // Delete chunks for this document
    const { error: chunkError } = await this.supabase
      .from('kb_card_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunkError) {
      throw new Error(`Failed to delete document chunks: ${chunkError.message}`);
    }
  }

  // =============================================
  // BACKGROUND CHUNKING
  // =============================================

  /**
   * Triggers background chunking/embedding generation for a card
   * Runs asynchronously without blocking the user's save operation
   *
   * @param cardId - The card ID to process
   * @param operation - 'create' or 'update'
   */
  private async triggerBackgroundChunking(cardId: string, operation: 'create' | 'update'): Promise<void> {
    try {
      console.log(`[KB] Starting background chunking for card ${cardId} (${operation})...`);

      // Import EmbeddingsService dynamically to avoid circular dependencies
      const { EmbeddingsService } = await import('./embeddings');
      const embeddingsService = new EmbeddingsService();

      // Get the full card data
      const card = await this.getCard(cardId);
      if (!card) {
        console.warn(`[KB] Card ${cardId} not found, skipping chunking`);
        return;
      }

      // Process card content if it exists
      if (card.content) {
        console.log(`[KB] Processing card content for ${cardId}...`);

        // Get sections if this is a product info card
        let sections: { [key: string]: string } = {};
        if (card.card_type === 'product_info') {
          const cardSections = await this.getCardSections(cardId);
          cardSections.forEach(section => {
            sections[section.section_type] = section.content;
          });
        }

        await embeddingsService.processCardContent(cardId, card.content, sections);
        console.log(`[KB] ✅ Card content processed for ${cardId}`);
      }

      // Process issues_resolutions if it exists
      if (card.issues_resolutions) {
        console.log(`[KB] Processing issues_resolutions for ${cardId}...`);
        await embeddingsService.processIssuesResolutions(cardId, card.issues_resolutions);
        console.log(`[KB] ✅ Issues/resolutions processed for ${cardId}`);
      }

      console.log(`[KB] ✅ Background chunking complete for card ${cardId}`);
    } catch (error: any) {
      // Don't throw - just log the error so save operations aren't blocked
      console.error(`[KB] ❌ Background chunking failed for card ${cardId}:`, error.message);
    }
  }
}