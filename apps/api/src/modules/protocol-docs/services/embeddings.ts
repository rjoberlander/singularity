import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Interface for chunking and embedding operations
export interface TextChunk {
  id?: string;
  card_id: string;
  chunk_text: string;
  chunk_index: number;
  token_count?: number;
  section_type?: string;
  heading?: string;
}

export interface EmbeddingRecord {
  id?: string;
  chunk_id: string;
  embedding: number[];
}

export interface VectorSearchResult {
  chunk_id: string;
  card_id: string;
  chunk_text: string;
  similarity: number;
  section_type?: string;
  heading?: string;
}

export class EmbeddingsService {
  private supabase;
  private openai;
  private readonly CHUNK_SIZE = 1200;
  private readonly CHUNK_OVERLAP = 200;
  private readonly MODEL_VERSION = 'text-embedding-3-small';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  // =============================================
  // TEXT CHUNKING OPERATIONS
  // =============================================

  /**
   * Chunks text content into manageable pieces for embedding
   */
  chunkText(text: string, cardId: string, sectionType?: string, heading?: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const paragraphs = text.split(/\n\s*\n/); // Split on double newlines
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;
      
      // Check if adding this paragraph would exceed chunk size
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + trimmedParagraph;
      
      if (potentialChunk.length > this.CHUNK_SIZE && currentChunk) {
        // Create chunk with current content
        chunks.push({
          card_id: cardId,
          chunk_text: currentChunk,
          chunk_index: chunkIndex++,
          token_count: this.estimateTokenCount(currentChunk),
          section_type: sectionType,
          heading: heading
        });
        
        // Start new chunk with overlap if possible
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5)); // Rough overlap
        currentChunk = overlapWords.join(' ') + '\n\n' + trimmedParagraph;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add final chunk if there's content
    if (currentChunk.trim()) {
      chunks.push({
        card_id: cardId,
        chunk_text: currentChunk,
        chunk_index: chunkIndex,
        token_count: this.estimateTokenCount(currentChunk),
        section_type: sectionType,
        heading: heading
      });
    }
    
    return chunks;
  }

  /**
   * Estimates token count for a text string (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // =============================================
  // CHUNK DATABASE OPERATIONS
  // =============================================

  /**
   * Saves text chunks to the database
   */
  async saveChunks(chunks: TextChunk[]): Promise<TextChunk[]> {
    if (chunks.length === 0) return [];

    const { data, error } = await this.supabase
      .from('kb_card_chunks')
      .insert(chunks)
      .select();

    if (error) {
      throw new Error(`Failed to save chunks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Gets all chunks for a knowledge card
   */
  async getCardChunks(cardId: string): Promise<TextChunk[]> {
    const { data, error } = await this.supabase
      .from('kb_card_chunks')
      .select('*')
      .eq('card_id', cardId)
      .order('chunk_index');

    if (error) {
      throw new Error(`Failed to get card chunks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Deletes all chunks for a knowledge card
   */
  async deleteCardChunks(cardId: string): Promise<void> {
    const { error } = await this.supabase
      .from('kb_card_chunks')
      .delete()
      .eq('card_id', cardId);

    if (error) {
      throw new Error(`Failed to delete card chunks: ${error.message}`);
    }
  }

  // =============================================
  // EMBEDDING OPERATIONS
  // =============================================

  /**
   * Generates embeddings for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generates embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Saves embeddings to the database
   */
  async saveEmbeddings(embeddings: EmbeddingRecord[]): Promise<void> {
    if (embeddings.length === 0) return;

    const { error } = await this.supabase
      .from('kb_embeddings')
      .insert(embeddings);

    if (error) {
      throw new Error(`Failed to save embeddings: ${error.message}`);
    }
  }

  /**
   * Performs vector similarity search
   */
  async vectorSearch(queryEmbedding: number[], limit: number = 10, threshold: number = 0.7): Promise<VectorSearchResult[]> {
    try {
      console.log(`[vectorSearch] CALLED with ${queryEmbedding.length} dimensions, threshold=${threshold}, limit=${limit}`);

      // Convert embedding array to string format for PostgreSQL
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      console.log(`[vectorSearch] Embedding string created (${embeddingString.length} chars)`);

      console.log('[vectorSearch] Calling RPC...');
      const { data, error } = await this.supabase.rpc('vector_search_kb', {
        query_embedding: embeddingString,
        similarity_threshold: threshold,
        match_count: limit
      });
      console.log(`[vectorSearch] RPC returned, error=${!!error}, data length=${data?.length || 0}`);

      if (error) {
        console.error('[vectorSearch] RPC ERROR:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          embeddingStringLength: embeddingString.length,
          threshold,
          limit
        });

        // For now, disable vector search fallback since the database doesn't support vector operations properly
        // Return empty array and rely on text search in hybrid search
        console.log('[vectorSearch] Vector search disabled, returning empty array');
        return [];
      }

      console.log(`[vectorSearch] SUCCESS! Returning ${data?.length || 0} results`);
      return data || [];
    } catch (e: any) {
      console.error('[vectorSearch] EXCEPTION:', e.message, e.stack);
      return [];
    }
  }

  // =============================================
  // HYBRID SEARCH (TEXT + VECTOR)
  // =============================================

  /**
   * Performs hybrid search combining text and vector search
   */
  async hybridSearch(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    console.log('[hybridSearch] Query:', query);

    // Generate embedding for the query
    console.log('[hybridSearch] Generating embedding...');
    const queryEmbedding = await this.generateEmbedding(query);
    console.log(`[hybridSearch] Embedding generated (${queryEmbedding.length} dimensions)`);

    // Perform both text and vector search
    // Use lower threshold (0.3) to match KB agent's SIMILARITY_THRESHOLD
    console.log('[hybridSearch] Starting parallel searches...');
    const [textResults, vectorResults] = await Promise.all([
      this.textSearch(query, limit),
      this.vectorSearch(queryEmbedding, limit, 0.3) // Lower threshold for better recall
    ]);

    console.log('[hybridSearch] Text results:', textResults.length);
    console.log('[hybridSearch] Vector results:', vectorResults.length);
    if (vectorResults.length === 0) {
      console.warn('[hybridSearch] ⚠️  Vector search returned 0 results - check for errors above');
    }
    textResults.slice(0, 3).forEach((r, i) => {
      console.log(`[hybridSearch] Text #${i+1}: card=${r.card_id}, sim=${r.similarity.toFixed(3)}, preview=${r.chunk_text.substring(0, 60)}...`);
    });

    // Combine and normalize scores
    const combinedResults = new Map<string, VectorSearchResult>();

    // Add text search results with normalized scores
    textResults.forEach((result, index) => {
      const textScore = 1 - (index / textResults.length); // Simple ranking normalization
      combinedResults.set(result.chunk_id, {
        ...result,
        similarity: textScore * 0.5 // Weight text search at 50%
      });
    });

    // Add vector search results
    vectorResults.forEach((result) => {
      const existing = combinedResults.get(result.chunk_id);
      if (existing) {
        // Combine scores if chunk appears in both results
        existing.similarity += result.similarity * 0.5; // Weight vector search at 50%
      } else {
        combinedResults.set(result.chunk_id, {
          ...result,
          similarity: result.similarity * 0.5
        });
      }
    });

    // Sort by combined similarity and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Performs text-based search on chunks using LIKE search for better document content matching
   */
  private async textSearch(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    // Common stop words to exclude from search
    const stopWords = new Set([
      'what', 'where', 'when', 'which', 'who', 'whom', 'whose', 'why', 'how',
      'the', 'this', 'that', 'these', 'those', 'there', 'here',
      'and', 'but', 'for', 'nor', 'yet', 'both', 'either', 'neither',
      'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
      'have', 'has', 'had', 'having', 'does', 'did', 'doing', 'done',
      'are', 'was', 'were', 'been', 'being', 'get', 'got', 'gets',
      'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
      'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
      'from', 'into', 'onto', 'upon', 'with', 'within', 'without',
      'your', 'our', 'their', 'its', 'his', 'her', 'any', 'all', 'some', 'most',
      'tell', 'give', 'know', 'find', 'help', 'please', 'need', 'want'
    ]);

    // Split query into individual terms for LIKE search, filtering stop words
    // Also strip punctuation from terms
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.has(term));
    console.log('[textSearch] Searching for terms:', terms);

    // Try searching for each term individually and combine results
    const allResults: any[] = [];

    // Use more terms (up to 4) for better coverage of meaningful words
    for (const term of terms.slice(0, 4)) { // Use top 4 meaningful terms
      const { data: termResults, error: termError } = await this.supabase
        .from('kb_card_chunks')
        .select('*')
        .ilike('chunk_text', `%${term}%`)
        .limit(limit);
        
      if (!termError && termResults) {
        console.log(`[textSearch] Term '${term}' found ${termResults.length} results`);
        allResults.push(...termResults);
      } else if (termError) {
        console.warn(`[textSearch] Error searching for term '${term}':`, termError);
      }
    }
    
    // Remove duplicates by chunk ID
    const uniqueResults = allResults.reduce((acc: any[], chunk: any) => {
      if (!acc.some((existing: any) => existing.id === chunk.id)) {
        acc.push(chunk);
      }
      return acc;
    }, [] as any[]);
    
    const data = uniqueResults.slice(0, limit);
    const error = data.length === 0 ? new Error('No results found') : null;

    if (error && data.length === 0) {
      console.warn('LIKE search failed, trying textSearch fallback:', error.message);
      
      // Fallback to textSearch for non-document content
      const tsQuery = query.trim().replace(/\s+/g, ' & ');
      const { data: fallbackData, error: fallbackError } = await this.supabase
        .from('kb_card_chunks')
        .select('*')
        .textSearch('chunk_text', tsQuery)
        .limit(limit);
        
      if (fallbackError) {
        console.error('Both LIKE and textSearch failed:', fallbackError);
        return [];
      }
      
      return (fallbackData || []).map((chunk: any, index: number) => ({
        chunk_id: chunk.id,
        card_id: chunk.card_id,
        chunk_text: chunk.chunk_text,
        similarity: 1 - (index / (fallbackData?.length || 1)),
        section_type: chunk.section_type,
        heading: chunk.heading
      }));
    }

    // Prioritize document chunks and rank by relevance
    const documentChunks = (data || []).filter((chunk: any) => chunk.section_type === 'document');
    const otherChunks = (data || []).filter((chunk: any) => chunk.section_type !== 'document');
    
    // Combine with documents first (higher priority)
    const combinedResults = [...documentChunks, ...otherChunks].slice(0, limit);

    return combinedResults.map((chunk: any, index: number) => {
      let baseScore = chunk.section_type === 'document' ? 0.9 - (index * 0.1) : 0.5 - (index * 0.05);
      
      // Boost installation content and penalize disclaimer content
      const lowerContent = chunk.chunk_text.toLowerCase();
      
      // Boost for installation-specific content
      if (lowerContent.includes('placement') && lowerContent.includes('coil')) {
        baseScore += 0.3;
      } else if (lowerContent.includes('install') && lowerContent.includes('above')) {
        baseScore += 0.2;
      } else if (lowerContent.includes('inside') && lowerContent.includes('coil')) {
        baseScore += 0.2;
      }
      
      // Penalize disclaimer content heavily
      if (lowerContent.includes('disclaimer') || lowerContent.includes('always follow')) {
        baseScore -= 0.4;
      }
      
      return {
        chunk_id: chunk.id,
        card_id: chunk.card_id,
        chunk_text: chunk.chunk_text,
        similarity: Math.max(0.1, baseScore), // Don't go below 0.1
        section_type: chunk.section_type,
        heading: chunk.heading
      };
    });
  }

  // =============================================
  // FULL PIPELINE OPERATIONS
  // =============================================

  /**
   * Complete pipeline: chunk text, generate embeddings, and save to database
   */
  async processCardContent(cardId: string, content: string, sections?: { [key: string]: string }): Promise<void> {
    try {
      // Delete existing chunks and embeddings
      await this.deleteCardChunks(cardId);

      let allChunks: TextChunk[] = [];

      // Process main content
      if (content) {
        const contentChunks = this.chunkText(content, cardId, 'main_content', 'Main Content');
        allChunks.push(...contentChunks);
      }

      // Process sections if provided
      if (sections) {
        for (const [sectionType, sectionContent] of Object.entries(sections)) {
          if (sectionContent) {
            const sectionChunks = this.chunkText(sectionContent, cardId, sectionType, sectionType);
            allChunks.push(...sectionChunks);
          }
        }
      }

      if (allChunks.length === 0) return;

      // Save chunks to database
      const savedChunks = await this.saveChunks(allChunks);

      // Generate embeddings
      const texts = savedChunks.map(chunk => chunk.chunk_text);
      const embeddings = await this.generateEmbeddings(texts);

      // Create embedding records
      const embeddingRecords: EmbeddingRecord[] = savedChunks.map((chunk, index) => ({
        chunk_id: chunk.id!,
        embedding: embeddings[index]
      }));

      // Save embeddings
      await this.saveEmbeddings(embeddingRecords);

    } catch (error) {
      console.error('Error processing card content:', error);
      throw error;
    }
  }

  /**
   * Reprocesses all existing cards to generate embeddings
   */
  async reprocessAllCards(): Promise<void> {
    const { data: cards, error } = await this.supabase
      .from('kb_cards')
      .select('id, content')
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get cards for reprocessing: ${error.message}`);
    }

    for (const card of cards || []) {
      if (card.content) {
        try {
          await this.processCardContent(card.id, card.content);
          console.log(`Processed embeddings for card ${card.id}`);
        } catch (error) {
          console.error(`Failed to process card ${card.id}:`, error);
        }
      }
    }
  }

  /**
   * Parses issues_resolutions JSONB and formats it for vectorization
   * Each Issue/Question/Guidance/TopicInfo becomes searchable text
   */
  parseIssuesResolutionsForEmbedding(issuesResolutions: string | any[] | null): string {
    if (!issuesResolutions) return '';

    let records: any[] = [];

    // Parse if string
    if (typeof issuesResolutions === 'string') {
      try {
        records = JSON.parse(issuesResolutions);
      } catch {
        // If not valid JSON, return empty
        return '';
      }
    } else if (Array.isArray(issuesResolutions)) {
      records = issuesResolutions;
    }

    if (!Array.isArray(records) || records.length === 0) return '';

    // Format each record for vectorization
    // Include type, content (title/description), and resolution (details)
    const formattedText = records
      .map(record => {
        const type = (record.type || 'issue').toUpperCase();
        const content = record.content || '';
        const resolution = record.resolution || '';

        // Create a rich text representation that captures all searchable info
        let text = `${type}: ${content}`;
        if (resolution) {
          // Use appropriate label based on type
          const resolutionLabel = type === 'QUESTION' ? 'Answer' :
                                  type === 'TOPICINFO' ? 'Information' :
                                  type === 'GUIDANCE' ? 'Details' : 'Resolution';
          text += `\n${resolutionLabel}: ${resolution}`;
        }
        return text;
      })
      .join('\n\n---\n\n');

    return formattedText;
  }

  /**
   * Process issues_resolutions content and generate embeddings
   * This handles the Common Issues/Questions/Guidance/TopicInfo section
   */
  async processIssuesResolutions(cardId: string, issuesResolutions: string | any[] | null): Promise<number> {
    console.log(`[processIssuesResolutions] Processing issues_resolutions for card ${cardId}`);

    const formattedText = this.parseIssuesResolutionsForEmbedding(issuesResolutions);

    if (!formattedText) {
      console.log(`[processIssuesResolutions] No issues_resolutions content to process`);
      return 0;
    }

    // Delete existing issues_resolutions chunks for this card
    const { error: deleteError } = await this.supabase
      .from('kb_card_chunks')
      .delete()
      .eq('card_id', cardId)
      .eq('section_type', 'issues_resolutions');

    if (deleteError) {
      console.warn(`[processIssuesResolutions] Failed to delete existing chunks:`, deleteError);
    }

    // Chunk the formatted text
    const chunks = this.chunkText(formattedText, cardId, 'issues_resolutions', 'Common Issues/Questions & Resolution/Answer');

    if (chunks.length === 0) {
      console.log(`[processIssuesResolutions] No chunks generated`);
      return 0;
    }

    // Save chunks
    const savedChunks = await this.saveChunks(chunks);
    console.log(`[processIssuesResolutions] Saved ${savedChunks.length} chunks`);

    // Generate and save embeddings
    const texts = savedChunks.map(chunk => chunk.chunk_text);
    const embeddings = await this.generateEmbeddings(texts);

    const embeddingRecords: EmbeddingRecord[] = savedChunks.map((chunk, index) => ({
      chunk_id: chunk.id!,
      embedding: embeddings[index]
    }));

    await this.saveEmbeddings(embeddingRecords);
    console.log(`[processIssuesResolutions] Generated ${embeddingRecords.length} embeddings`);

    return savedChunks.length;
  }

  /**
   * Reprocesses all existing cards' issues_resolutions to generate embeddings
   * Use this to backfill embeddings for existing Section 4 content
   */
  async reprocessAllIssuesResolutions(): Promise<{ processed: number; failed: number; skipped: number }> {
    console.log('[reprocessAllIssuesResolutions] Starting backfill of issues_resolutions embeddings');

    const { data: cards, error } = await this.supabase
      .from('kb_cards')
      .select('id, title, issues_resolutions')
      .eq('status', 'active')
      .not('issues_resolutions', 'is', null);

    if (error) {
      throw new Error(`Failed to get cards for reprocessing: ${error.message}`);
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const card of cards || []) {
      try {
        // Check if there's actual content
        const formattedText = this.parseIssuesResolutionsForEmbedding(card.issues_resolutions);
        if (!formattedText) {
          skipped++;
          continue;
        }

        const chunksCreated = await this.processIssuesResolutions(card.id, card.issues_resolutions);
        if (chunksCreated > 0) {
          processed++;
          console.log(`[reprocessAllIssuesResolutions] Processed card ${card.id} (${card.title}): ${chunksCreated} chunks`);
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        console.error(`[reprocessAllIssuesResolutions] Failed to process card ${card.id}:`, error);
      }
    }

    console.log(`[reprocessAllIssuesResolutions] Complete: ${processed} processed, ${failed} failed, ${skipped} skipped`);
    return { processed, failed, skipped };
  }

  /**
   * Chunk content into smaller pieces for embedding
   */
  private chunkContent(content: string): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + this.CHUNK_SIZE, content.length);
      const chunk = content.slice(start, end);
      
      chunks.push({
        text: chunk,
        start,
        end
      });
      
      // Move start position, accounting for overlap
      start = end - this.CHUNK_OVERLAP;
      
      // Ensure we don't go backwards
      if (start <= chunks[chunks.length - 1]?.start) {
        start = end;
      }
    }
    
    return chunks;
  }

  /**
   * Process document content and generate embeddings
   * Associates chunks with both the document and parent card
   */
  async processDocumentContent(
    documentId: string,
    cardId: string,
    content: string
  ): Promise<any[]> {
    console.log(`[processDocumentContent] Processing document ${documentId} for card ${cardId}`);
    
    // Chunk the document content
    const chunks = this.chunkContent(content);
    console.log(`[processDocumentContent] Created ${chunks.length} chunks`);
    
    // Process each chunk
    const processedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Store chunk with document reference - using heading to store document info for now
        const { data: savedChunk, error: chunkError } = await this.supabase
          .from('kb_card_chunks')
          .insert([{
            card_id: cardId,
            chunk_text: chunk.text, // Use correct column name
            chunk_index: i,
            section_type: 'document', // Mark as document content
            heading: `Document: ${documentId}`, // Store document ID in heading for now
            token_count: this.estimateTokenCount(chunk.text)
          }])
          .select()
          .single();
        
        if (chunkError) {
          console.error('Failed to save chunk:', chunkError);
          continue;
        }
        
        // Generate embedding for the chunk
        const embedding = await this.generateEmbedding(chunk.text);
        
        // Store embedding (only chunk_id and embedding exist in current schema)
        const { error: embError } = await this.supabase
          .from('kb_embeddings')
          .insert([{
            chunk_id: savedChunk.id,
            embedding: embedding
          }]);
        
        if (embError) {
          console.error('Failed to save embedding:', embError);
        } else {
          processedChunks.push(savedChunk);
        }
      } catch (error) {
        console.error(`Failed to process chunk ${i}:`, error);
      }
    }
    
    console.log(`[processDocumentContent] Successfully processed ${processedChunks.length} chunks`);
    return processedChunks;
  }
}