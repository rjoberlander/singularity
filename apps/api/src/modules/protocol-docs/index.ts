import {
  KnowledgeBaseModuleInput,
  KnowledgeBaseModuleOutput,
  KnowledgeCard,
  KBSearchResult,
  KnowledgeCardChange,
  KnowledgeCardRelation,
  KnowledgeCardAttachment,
  KnowledgeCardDocument,
  DocumentUploadResult
} from "./types";
import { KBDatabaseService } from "./services/database";
import { EmbeddingsService } from "./services/embeddings";
import { StorageService } from "./services/storage";
import { DocumentProcessorService } from "./services/documentProcessor";

// Initialize services
const dbService = new KBDatabaseService();
const embeddingsService = new EmbeddingsService();
const storageService = new StorageService();
const documentProcessor = new DocumentProcessorService();

/**
 * Knowledge Base Module entrypoint
 * Follows the modular-module-scaffold convention: one public entry with clear input/output.
 */
export async function runModule(
  input: KnowledgeBaseModuleInput
): Promise<KnowledgeBaseModuleOutput> {
  try {
    switch (input.action) {
      case "createCard":
        return await handleCreateCard(input);
      
      case "updateCard":
        return await handleUpdateCard(input);
      
      case "search":
        return await handleSearch(input);
      
      case "getCard":
        return await handleGetCard(input);
      
      case "deleteCard":
        return await handleDeleteCard(input);
      
      case "getCardHistory":
        return await handleGetCardHistory(input);
      
      case "addRelation":
        return await handleAddRelation(input);
      
      case "removeRelation":
        return await handleRemoveRelation(input);
      
      case "uploadAttachment":
        return await handleUploadAttachment(input);
      
      case "getAttachments":
        return await handleGetAttachments(input);
      
      case "reviewSuggestion":
        return await handleReviewSuggestion(input);
      
      case "updateProductSections":
        return await handleUpdateProductSections(input);
      
      case "uploadDocument":
        return await handleUploadDocument(input);
      
      case "getDocuments":
        return await handleGetDocuments(input);
      
      case "deleteDocument":
        return await handleDeleteDocument(input);
      
      case "restoreDocument":
        return await handleRestoreDocument(input);
      
      case "downloadDocument":
        return await handleDownloadDocument(input);

      case "getDocumentUrl":
        return await handleGetDocumentUrl(input);

      case "updateDocument":
        return await handleUpdateDocument(input);
      
      case "uploadImage":
        return await handleUploadImage(input);

      case "getRecordsNeedingAttention":
        return await handleGetRecordsNeedingAttention(input);

      default:
        return {
          success: false,
          message: `Unknown action: ${String((input as any)?.action)}`,
        };
    }
  } catch (error) {
    console.error(`Knowledge Base Module error for action ${input.action}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// =============================================
// ACTION HANDLERS
// =============================================

async function handleCreateCard(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCard>> {
  const { card, userId } = input.payload || {};
  
  if (!card) {
    return {
      success: false,
      message: 'Card data is required'
    };
  }

  // For SME product cards, title is not required (product type is the title)
  // TODO: Fix type comparison - temporarily disabled to allow server startup
  if (card.main_collection && card.main_collection as string !== 'sme_product_saas' && !card.title) {
    return {
      success: false,
      message: 'Card title is required for non-SME product cards'
    };
  }

  // Enhanced validation and logging for title issues
  if (card.title) {
    console.log(`Creating KB card with title: "${card.title}"`);
    
    // Validate title length and content
    const trimmedTitle = card.title.trim();
    if (!trimmedTitle || trimmedTitle.length === 0) {
      return {
        success: false,
        message: 'Card title cannot be empty or contain only whitespace'
      };
    }
    
    if (trimmedTitle.length > 500) {
      return {
        success: false,
        message: 'Card title cannot exceed 500 characters'
      };
    }
  }

  let createdCard;
  try {
    createdCard = await dbService.createCard(card, userId);
    console.log(`Successfully created KB card with ID: ${createdCard.id}`);
  } catch (error) {
    console.error('Failed to create KB card:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create knowledge card'
    };
  }

  // Process embeddings if content is provided
  if (createdCard.content) {
    try {
      // Get sections if this is a product info card
      let sections: { [key: string]: string } = {};
      if (createdCard.card_type === 'product_info') {
        const cardSections = await dbService.getCardSections(createdCard.id!);
        cardSections.forEach(section => {
          sections[section.section_type] = section.content;
        });
      }

      await embeddingsService.processCardContent(createdCard.id!, createdCard.content, sections);
    } catch (error) {
      console.warn('Failed to generate embeddings for new card:', error);
    }
  }

  // Process issues_resolutions embeddings separately
  if (createdCard.issues_resolutions) {
    try {
      await embeddingsService.processIssuesResolutions(createdCard.id!, createdCard.issues_resolutions);
    } catch (error) {
      console.warn('Failed to generate issues_resolutions embeddings for new card:', error);
    }
  }

  return {
    success: true,
    message: 'Knowledge card created successfully',
    data: createdCard
  };
}

async function handleUpdateCard(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCard>> {
  const { cardId, card, userId, changeReason } = input.payload || {};

  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  if (!card) {
    return {
      success: false,
      message: 'Card updates are required'
    };
  }

  const updatedCard = await dbService.updateCard(cardId, card, userId, changeReason);

  // Reprocess embeddings if content changed
  if (card.content !== undefined) {
    try {
      let sections: any = null;
      if (updatedCard.card_type === 'product_info') {
        // Get product sections for embedding
        sections = await dbService.getCardSections(updatedCard.id!);
      }

      await embeddingsService.processCardContent(updatedCard.id!, updatedCard.content || '', sections);
      console.log(`[KB Update] Successfully regenerated embeddings for card: ${updatedCard.id}`);
    } catch (error) {
      console.error('[KB Update] ❌ CRITICAL: Failed to regenerate embeddings for updated card:', error);
      console.error(`[KB Update] Card ID: ${updatedCard.id}, Title: "${updatedCard.title}"`);
      // Don't throw - allow the card update to succeed even if embeddings fail
      // But log prominently so it's visible in logs
    }
  }

  // Process issues_resolutions embeddings separately (works even if content wasn't updated)
  if (card.issues_resolutions !== undefined || updatedCard.issues_resolutions) {
    try {
      const issuesContent = card.issues_resolutions !== undefined
        ? card.issues_resolutions
        : updatedCard.issues_resolutions;
      await embeddingsService.processIssuesResolutions(updatedCard.id!, issuesContent);
      console.log(`[KB Update] Successfully regenerated issues_resolutions embeddings for card: ${updatedCard.id}`);
    } catch (error) {
      console.error('[KB Update] ❌ CRITICAL: Failed to regenerate issues_resolutions embeddings:', error);
      console.error(`[KB Update] Card ID: ${updatedCard.id}, Title: "${updatedCard.title}"`);
    }
  }

  return {
    success: true,
    message: 'Knowledge card updated successfully',
    data: updatedCard
  };
}

async function handleSearch(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KBSearchResult>> {
  const { searchOptions } = input.payload || {};
  
  if (!searchOptions) {
    return {
      success: false,
      message: 'Search options are required'
    };
  }

  let results: KBSearchResult;

  // Handle different search types
  if (searchOptions.search_type === 'vector' && searchOptions.query) {
    // Vector search
    const queryEmbedding = await embeddingsService.generateEmbedding(searchOptions.query);
    const vectorResults = await embeddingsService.vectorSearch(queryEmbedding, searchOptions.limit);
    
    // Convert vector results to cards (simplified)
    const cardIds = [...new Set(vectorResults.map(r => r.card_id))];
    const cards = await Promise.all(
      cardIds.slice(0, searchOptions.limit || 10).map(id => dbService.getCard(id))
    );
    
    results = {
      cards: cards.filter(card => card !== null) as KnowledgeCard[],
      total: vectorResults.length,
      took_ms: 0 // Would be calculated in a real implementation
    };
  } else if (searchOptions.search_type === 'hybrid' && searchOptions.query) {
    // Hybrid search
    const hybridResults = await embeddingsService.hybridSearch(searchOptions.query, searchOptions.limit);
    
    const cardIds = [...new Set(hybridResults.map(r => r.card_id))];
    const cards = await Promise.all(
      cardIds.slice(0, searchOptions.limit || 10).map(id => dbService.getCard(id))
    );
    
    results = {
      cards: cards.filter(card => card !== null) as KnowledgeCard[],
      total: hybridResults.length,
      took_ms: 0
    };
  } else {
    // Default text search
    results = await dbService.searchCards(searchOptions);
  }

  return {
    success: true,
    message: 'Search completed successfully',
    data: results
  };
}

async function handleGetCard(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCard | null>> {
  const { cardId } = input.payload || {};
  
  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  const card = await dbService.getCard(cardId, true);

  return {
    success: true,
    message: card ? 'Card retrieved successfully' : 'Card not found',
    data: card
  };
}

async function handleDeleteCard(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<void>> {
  const { cardId, userId } = input.payload || {};
  
  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  // Delete associated embeddings and chunks
  await embeddingsService.deleteCardChunks(cardId);
  
  // Delete attachments
  await storageService.deleteCardAttachments(cardId);
  
  // Delete the card itself
  await dbService.deleteCard(cardId, userId);

  return {
    success: true,
    message: 'Knowledge card deleted successfully'
  };
}

async function handleGetCardHistory(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCardChange[]>> {
  const { cardId } = input.payload || {};
  
  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  const history = await dbService.getCardHistory(cardId);

  return {
    success: true,
    message: 'Card history retrieved successfully',
    data: history
  };
}

async function handleAddRelation(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCardRelation>> {
  const { relation } = input.payload || {};
  
  if (!relation || !relation.source_card_id || !relation.target_card_id || !relation.relation_type) {
    return {
      success: false,
      message: 'Complete relation data is required (source_card_id, target_card_id, relation_type)'
    };
  }

  const createdRelation = await dbService.addRelation(relation);

  return {
    success: true,
    message: 'Card relation added successfully',
    data: createdRelation
  };
}

async function handleRemoveRelation(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<void>> {
  const { relationId } = input.payload || {};
  
  if (!relationId) {
    return {
      success: false,
      message: 'Relation ID is required'
    };
  }

  await dbService.removeRelation(relationId);

  return {
    success: true,
    message: 'Card relation removed successfully'
  };
}

async function handleUploadAttachment(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCardAttachment>> {
  const { cardId, attachment, userId } = input.payload || {};
  
  if (!cardId || !attachment) {
    return {
      success: false,
      message: 'Card ID and attachment data are required'
    };
  }

  const uploadResult = await storageService.uploadFile(
    cardId,
    attachment.file,
    attachment.filename,
    attachment.mimetype,
    (attachment as any).description,
    userId
  );

  // Get the full attachment record
  const attachmentRecord = await dbService.getCardAttachments(cardId);
  const uploadedAttachment = attachmentRecord.find(a => a.id === uploadResult.id);

  return {
    success: true,
    message: 'Attachment uploaded successfully',
    data: uploadedAttachment
  };
}

async function handleGetAttachments(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCardAttachment[]>> {
  const { cardId } = input.payload || {};
  
  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  const attachments = await dbService.getCardAttachments(cardId);

  return {
    success: true,
    message: 'Attachments retrieved successfully',
    data: attachments
  };
}

async function handleReviewSuggestion(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<any>> {
  // This will be implemented when AI Agent integration is complete
  return {
    success: false,
    message: 'Review suggestion functionality will be implemented with AI Agent integration'
  };
}

async function handleUpdateProductSections(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<void>> {
  const { cardId, sections, userId } = input.payload || {};

  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  if (!sections) {
    return {
      success: false,
      message: 'Sections data is required'
    };
  }

  // Verify the card exists and is a product card
  const card = await dbService.getCard(cardId);
  if (!card) {
    return {
      success: false,
      message: 'Card not found'
    };
  }

  // TODO: Fix type comparison - temporarily disabled to allow server startup
  if (card.main_collection && card.main_collection as string !== 'sme_product_saas') {
    return {
      success: false,
      message: 'This operation is only for SME product cards'
    };
  }

  // Update the sections
  await dbService.updateProductCardSections(cardId, sections);

  // Regenerate embeddings for issues_resolutions if it was updated
  if (sections.issues_resolutions !== undefined) {
    try {
      const chunksCreated = await embeddingsService.processIssuesResolutions(cardId, sections.issues_resolutions);
      console.log(`[handleUpdateProductSections] Generated ${chunksCreated} embeddings for issues_resolutions`);
    } catch (error) {
      console.warn('[handleUpdateProductSections] Failed to generate embeddings for issues_resolutions:', error);
      // Don't fail the whole operation if embeddings fail
    }
  }

  // Log the update
  await dbService.logCardChange(
    cardId,
    'updated',
    'Product sections updated',
    userId,
    { sections_updated: Object.keys(sections) }
  );

  return {
    success: true,
    message: 'Product sections updated successfully'
  };
}

// =============================================
// DOCUMENT OPERATIONS
// =============================================

async function handleUploadDocument(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<DocumentUploadResult>> {
  const { cardId, document, userId } = input.payload || {};
  
  if (!cardId || !document) {
    return {
      success: false,
      message: 'Card ID and document are required'
    };
  }

  // Validate file type
  if (!DocumentProcessorService.isSupportedFileType(document.mimetype)) {
    return {
      success: false,
      message: 'Unsupported file type. Only PDF, Word, and text files are allowed.'
    };
  }

  // Validate file size
  if (!DocumentProcessorService.validateFileSize(document.file.length)) {
    return {
      success: false,
      message: 'File size exceeds the 10MB limit'
    };
  }

  // Check document count limit
  const existingDocs = await dbService.getCardDocuments(cardId);
  if (existingDocs.length >= 50) {
    return {
      success: false,
      message: 'Document limit reached. Maximum 50 documents per card allowed.'
    };
  }

  // Verify the card exists and is SME product type
  const card = await dbService.getCard(cardId);
  if (!card) {
    return {
      success: false,
      message: 'Card not found'
    };
  }

  // Allow document uploads for all cards
  // Previously restricted to only 'sme_product_saas' collection

  try {
    // Extract user-provided title from description if it's a text content upload
    let userProvidedTitle: string | undefined;
    if (document.mimetype === 'text/plain' && (document as any).description?.startsWith('Text content: ')) {
      userProvidedTitle = (document as any).description.substring('Text content: '.length);
    }

    // Process the document (extract text)
    const processed = await documentProcessor.processDocument(
      document.file,
      document.filename,
      document.mimetype,
      cardId,
      userProvidedTitle
    );

    // Upload original file to storage for later preview/download
    let storagePath: string | undefined;
    try {
      storagePath = await storageService.uploadDocumentFile(
        cardId,
        document.file,
        document.filename,
        document.mimetype
      );
      console.log(`Document file uploaded to storage: ${storagePath}`);
    } catch (storageError) {
      console.warn('Failed to upload document file to storage, continuing without:', storageError);
      // Continue without storage - document will still have extracted text
    }

    // Save to database (with storage_path if upload succeeded)
    const savedDoc = await dbService.createCardDocument({
      card_id: cardId,
      title: processed.title,
      content: processed.content,
      original_filename: document.filename,
      file_type: document.filename.toLowerCase().endsWith('.pdf') ? 'pdf' :
                  document.filename.toLowerCase().endsWith('.docx') ? 'docx' :
                  document.filename.toLowerCase().endsWith('.doc') ? 'doc' :
                  document.filename.toLowerCase().endsWith('.md') ? 'md' : 'txt',
      file_size: document.file.length,
      storage_path: storagePath,
      created_by: userId
    });

    // Generate embeddings for the document content
    // For text files and small documents, skip embedding generation to improve speed
    let embeddingsCreated = 0;
    const shouldGenerateEmbeddings = (
      document.mimetype !== 'text/plain' || 
      document.file.length > 50000 // Only generate embeddings for text files larger than 50KB
    );
    
    if (shouldGenerateEmbeddings) {
      try {
        const chunks = await embeddingsService.processDocumentContent(
          savedDoc.id!,
          cardId,
          processed.content
        );
        embeddingsCreated = chunks.length;
      } catch (error) {
        console.warn('Failed to generate embeddings for document:', error);
      }
    } else {
      console.log('Skipping embedding generation for small text file');
    }

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: savedDoc,
        embeddings_created: embeddingsCreated
      }
    };
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process document'
    };
  }
}

async function handleGetDocuments(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<KnowledgeCardDocument[]>> {
  const { cardId } = input.payload || {};
  
  if (!cardId) {
    return {
      success: false,
      message: 'Card ID is required'
    };
  }

  const documents = await dbService.getCardDocuments(cardId);

  return {
    success: true,
    data: documents
  };
}

async function handleDeleteDocument(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput> {
  const { documentId, userId, userRole } = input.payload || {};
  
  if (!documentId) {
    return {
      success: false,
      message: 'Document ID is required'
    };
  }

  const result = await dbService.softDeleteDocument(documentId, userId, userRole);
  
  if (!result) {
    return {
      success: false,
      message: 'Document not found or you do not have permission to delete it'
    };
  }

  return {
    success: true,
    message: 'Document deleted successfully'
  };
}

async function handleRestoreDocument(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput> {
  const { documentId, userId, userRole } = input.payload || {};
  
  if (!documentId) {
    return {
      success: false,
      message: 'Document ID is required'
    };
  }

  const result = await dbService.restoreDocument(documentId, userId, userRole);
  
  if (!result) {
    return {
      success: false,
      message: 'Document not found or you do not have permission to restore it'
    };
  }

  return {
    success: true,
    message: 'Document restored successfully'
  };
}

async function handleDownloadDocument(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput> {
  const { documentId } = input.payload || {};

  if (!documentId) {
    return {
      success: false,
      message: 'Document ID is required'
    };
  }

  // Get the document from the database
  const document = await dbService.getDocument(documentId);
  if (!document) {
    return {
      success: false,
      message: 'Document not found'
    };
  }

  // If document has storage_path, return signed URL for original file download
  if (document.storage_path) {
    try {
      const signedUrl = await storageService.getSignedUrl(document.storage_path, 3600); // 1 hour expiry
      return {
        success: true,
        message: 'Document redirect URL generated',
        data: {
          redirect_url: signedUrl,
          filename: document.original_filename,
          mimeType: getMimeType(document.file_type)
        }
      };
    } catch (error) {
      console.warn('Failed to generate signed URL, falling back to extracted text:', error);
      // Fall through to text download
    }
  }

  // Fallback: Return extracted text content (for legacy documents without storage_path)
  const formattedContent = formatDocumentForDownload(document);

  // Generate filename based on document title
  const safeTitle = document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${safeTitle}_${new Date().toISOString().split('T')[0]}.txt`;

  return {
    success: true,
    message: 'Document prepared for download',
    data: {
      filename,
      content: formattedContent,
      mimeType: 'text/plain; charset=utf-8'
    }
  };
}

// Helper to get mime type from file_type
function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'md': 'text/markdown'
  };
  return mimeTypes[fileType] || 'application/octet-stream';
}

async function handleGetDocumentUrl(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput> {
  const { documentId } = input.payload || {};

  if (!documentId) {
    return {
      success: false,
      message: 'Document ID is required'
    };
  }

  // Get the document from the database
  const document = await dbService.getDocument(documentId);
  if (!document) {
    return {
      success: false,
      message: 'Document not found'
    };
  }

  // Check if document has storage_path
  if (!document.storage_path) {
    return {
      success: false,
      message: 'Document does not have stored file (legacy document with extracted text only)'
    };
  }

  try {
    const signedUrl = await storageService.getSignedUrl(document.storage_path, 3600); // 1 hour expiry
    return {
      success: true,
      message: 'Document URL generated',
      data: {
        url: signedUrl,
        filename: document.original_filename,
        file_type: document.file_type,
        mimeType: getMimeType(document.file_type)
      }
    };
  } catch (error) {
    console.error('Failed to generate document URL:', error);
    return {
      success: false,
      message: 'Failed to generate document URL'
    };
  }
}

async function handleUpdateDocument(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput> {
  const { documentId, title, content, userId } = input.payload || {};
  
  if (!documentId || !title || !content) {
    return {
      success: false,
      message: 'Document ID, title, and content are required'
    };
  }

  // Get the existing document
  const existingDoc = await dbService.getDocument(documentId);
  if (!existingDoc) {
    return {
      success: false,
      message: 'Document not found'
    };
  }

  // Create a new buffer with the updated content
  const buffer = Buffer.from(content, 'utf8');
  const filename = `${title.replace(/[^a-zA-Z0-9-_]/g, '_')}.txt`;
  
  // Process the updated document
  const processedDoc = await documentProcessor.processDocument(
    buffer,
    filename,
    'text/plain',
    existingDoc.card_id
  );

  // Update the document in the database
  const updatedDoc = await dbService.updateDocument(documentId, {
    title: processedDoc.title,
    content: processedDoc.content,
    original_filename: filename,
    file_size: buffer.length
  });

  if (!updatedDoc) {
    return {
      success: false,
      message: 'Failed to update document'
    };
  }

  return {
    success: true,
    message: 'Document updated successfully',
    data: {
      document: updatedDoc
    }
  };
}

/**
 * Format document content for user-friendly download
 */
function formatDocumentForDownload(doc: KnowledgeCardDocument): string {
  let formattedContent = '';
  
  // Add header with document info
  formattedContent += `========================================\n`;
  formattedContent += `${doc.title}\n`;
  formattedContent += `========================================\n\n`;
  
  formattedContent += `Original File: ${doc.original_filename}\n`;
  formattedContent += `Uploaded: ${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}\n`;
  formattedContent += `File Type: ${doc.file_type.toUpperCase()}\n`;
  formattedContent += `File Size: ${(doc.file_size / 1024).toFixed(2)} KB\n\n`;
  
  formattedContent += `----------------------------------------\n`;
  formattedContent += `CONTENT\n`;
  formattedContent += `----------------------------------------\n\n`;
  
  // Process the markdown content to make it more readable
  const content = doc.content || '';
  
  // Convert markdown headers to uppercase with underlines
  let processedContent = content
    .replace(/^#{1,6}\s+(.+)$/gm, (match, p1) => {
      return `\n${p1.toUpperCase()}\n${'-'.repeat(p1.length)}\n`;
    })
    // Convert bullet points to readable format
    .replace(/^[\*\-]\s+/gm, '• ')
    // Ensure proper spacing between paragraphs
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/[ \t]+/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n');
  
  formattedContent += processedContent;
  
  // Add footer
  formattedContent += `\n\n----------------------------------------\n`;
  formattedContent += `Generated from SlackKB Knowledge Base\n`;
  formattedContent += `${new Date().toLocaleString()}\n`;
  
  return formattedContent;
}

async function handleUploadImage(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<{ url: string; filename: string }>> {
  const { image, userId } = input.payload || {};
  
  if (!image || !image.file || !image.filename || !image.mimetype) {
    return {
      success: false,
      message: 'Image file, filename, and mimetype are required'
    };
  }

  // Validate that it's an image
  if (!image.mimetype.startsWith('image/')) {
    return {
      success: false,
      message: 'Only image files are allowed'
    };
  }

  // Set max file size to 10MB for images
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  if (image.file.length > MAX_IMAGE_SIZE) {
    return {
      success: false,
      message: `Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
    };
  }

  try {
    // Create a special UUID for markdown images instead of using string literal
    // This avoids UUID validation errors in the database
    const { v4: uuidv4 } = require('uuid');
    const markdownImagesCardId = uuidv4(); // Generate a proper UUID for markdown images
    
    // Upload the image directly to storage without database record
    // We'll use a different approach that doesn't rely on kb_attachments table
    const signedUrl = await storageService.uploadImageForMarkdown(
      image.file,
      image.filename,
      image.mimetype,
      userId
    );

    return {
      success: true,
      data: {
        url: signedUrl,
        filename: image.filename
      }
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload image'
    };
  }
}

async function handleGetRecordsNeedingAttention(input: KnowledgeBaseModuleInput): Promise<KnowledgeBaseModuleOutput<{
  needsReview: Array<{ cardId: string; cardTitle: string; record: any }>;
  needsUpdateListing: Array<{ cardId: string; cardTitle: string; record: any }>;
}>> {
  try {
    // Get all active cards with issues_resolutions
    const cards = await dbService.searchCards({ status: 'active', limit: 1000 });

    const needsReview: Array<{ cardId: string; cardTitle: string; record: any }> = [];
    const needsUpdateListing: Array<{ cardId: string; cardTitle: string; record: any }> = [];

    // Iterate through cards and parse issues_resolutions
    for (const card of cards.cards) {
      if (!card.issues_resolutions) continue;

      try {
        const issues = typeof card.issues_resolutions === 'string'
          ? JSON.parse(card.issues_resolutions)
          : card.issues_resolutions;

        if (Array.isArray(issues)) {
          issues.forEach(record => {
            const cardInfo = {
              cardId: card.id!,
              cardTitle: card.title || card.sme_product_type || 'Untitled',
              record: record
            };

            if (record.needsReview) {
              needsReview.push(cardInfo);
            }
            if (record.needsUpdateListing) {
              needsUpdateListing.push(cardInfo);
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to parse issues_resolutions for card ${card.id}:`, error);
      }
    }

    return {
      success: true,
      message: 'Records needing attention retrieved successfully',
      data: {
        needsReview,
        needsUpdateListing
      }
    };
  } catch (error) {
    console.error('Error getting records needing attention:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get records needing attention'
    };
  }
}

// =============================================
// EXPORT SERVICE INSTANCES FOR DIRECT USE
// =============================================

export { dbService, embeddingsService, storageService };



