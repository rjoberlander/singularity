import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import ExifReader from 'exifreader';

export interface UploadResult {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  image_metadata?: any;
}

export class StorageService {
  private supabase;
  private readonly BUCKET_NAME = 'kb-attachments';
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // =============================================
  // FILE UPLOAD OPERATIONS
  // =============================================

  /**
   * Uploads a file to Supabase Storage and returns attachment metadata
   */
  async uploadFile(
    cardId: string,
    file: Buffer,
    filename: string,
    mimetype: string,
    description?: string,
    userId?: string
  ): Promise<UploadResult> {
    // Validate file
    this.validateFile(file, filename, mimetype);

    // Generate unique file path
    const fileExtension = this.getFileExtension(filename);
    const uniqueId = uuidv4();
    const storagePath = `cards/${cardId}/${uniqueId}${fileExtension}`;

    // Extract image metadata if it's an image
    let imageMetadata = null;
    if (this.isImageType(mimetype)) {
      try {
        imageMetadata = await this.extractImageMetadata(file);
      } catch (error) {
        console.warn('Failed to extract image metadata:', error);
      }
    }

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: mimetype,
        duplex: 'half'
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Save attachment record to database
    const attachmentData = {
      card_id: cardId,
      filename: filename,
      storage_path: storagePath,
      file_size: file.length,
      mime_type: mimetype,
      description: description,
      image_metadata: imageMetadata,
      uploaded_by: userId
    };

    const { data: attachment, error: dbError } = await this.supabase
      .from('kb_attachments')
      .insert([attachmentData])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await this.deleteFileFromStorage(storagePath);
      throw new Error(`Failed to save attachment record: ${dbError.message}`);
    }

    return {
      id: attachment.id,
      filename: attachment.filename,
      storage_path: attachment.storage_path,
      file_size: attachment.file_size,
      mime_type: attachment.mime_type,
      image_metadata: attachment.image_metadata
    };
  }

  /**
   * Generates a signed URL for downloading/viewing a file
   */
  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Deletes a file from storage and removes the database record
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    // Get attachment record
    const { data: attachment, error: fetchError } = await this.supabase
      .from('kb_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to get attachment: ${fetchError.message}`);
    }

    // Delete from storage
    await this.deleteFileFromStorage(attachment.storage_path);

    // Delete database record
    const { error: dbError } = await this.supabase
      .from('kb_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      throw new Error(`Failed to delete attachment record: ${dbError.message}`);
    }
  }

  /**
   * Deletes all attachments for a knowledge card
   */
  async deleteCardAttachments(cardId: string): Promise<void> {
    // Get all attachments for the card
    const { data: attachments, error: fetchError } = await this.supabase
      .from('kb_attachments')
      .select('id, storage_path')
      .eq('card_id', cardId);

    if (fetchError) {
      throw new Error(`Failed to get card attachments: ${fetchError.message}`);
    }

    // Delete each attachment
    for (const attachment of attachments || []) {
      try {
        await this.deleteFileFromStorage(attachment.storage_path);
      } catch (error) {
        console.warn(`Failed to delete file ${attachment.storage_path}:`, error);
      }
    }

    // Delete all database records
    const { error: dbError } = await this.supabase
      .from('kb_attachments')
      .delete()
      .eq('card_id', cardId);

    if (dbError) {
      throw new Error(`Failed to delete attachment records: ${dbError.message}`);
    }
  }

  // =============================================
  // VALIDATION AND UTILITY METHODS
  // =============================================

  /**
   * Validates file size and type
   */
  private validateFile(file: Buffer, filename: string, mimetype: string): void {
    if (file.length > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (!this.ALLOWED_TYPES.includes(mimetype)) {
      throw new Error(`File type ${mimetype} is not allowed`);
    }

    if (!filename || filename.trim().length === 0) {
      throw new Error('Filename cannot be empty');
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const lowerFilename = filename.toLowerCase();
    
    if (dangerousExtensions.some(ext => lowerFilename.endsWith(ext))) {
      throw new Error('File type is not allowed for security reasons');
    }
  }

  /**
   * Extracts file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Checks if mimetype is an image
   */
  private isImageType(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Extracts EXIF metadata from image files
   */
  private async extractImageMetadata(imageBuffer: Buffer): Promise<any> {
    try {
      const tags = ExifReader.load(imageBuffer);
      
      // Extract commonly useful metadata
      const metadata: any = {};

      if (tags.ImageWidth?.value) metadata.width = tags.ImageWidth.value;
      if (tags.ImageHeight?.value) metadata.height = tags.ImageHeight.value;
      if (tags.Make?.description) metadata.camera_make = tags.Make.description;
      if (tags.Model?.description) metadata.camera_model = tags.Model.description;
      if (tags.DateTime?.description) metadata.date_taken = tags.DateTime.description;
      if (tags.GPS) {
        metadata.gps = {
          latitude: tags.GPSLatitude?.description,
          longitude: tags.GPSLongitude?.description
        };
      }

      return Object.keys(metadata).length > 0 ? metadata : null;
    } catch (error) {
      // If EXIF extraction fails, just return null
      return null;
    }
  }

  /**
   * Deletes a file from Supabase Storage
   */
  private async deleteFileFromStorage(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete file from storage: ${error.message}`);
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  /**
   * Gets storage usage statistics for a knowledge card
   */
  async getCardStorageStats(cardId: string): Promise<{
    total_files: number;
    total_size: number;
    files_by_type: Record<string, number>;
  }> {
    const { data: attachments, error } = await this.supabase
      .from('kb_attachments')
      .select('file_size, mime_type')
      .eq('card_id', cardId);

    if (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }

    const stats = {
      total_files: attachments?.length || 0,
      total_size: 0,
      files_by_type: {} as Record<string, number>
    };

    attachments?.forEach(attachment => {
      stats.total_size += attachment.file_size || 0;
      
      const type = attachment.mime_type || 'unknown';
      stats.files_by_type[type] = (stats.files_by_type[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Gets overall storage statistics for the knowledge base
   */
  async getOverallStorageStats(): Promise<{
    total_files: number;
    total_size: number;
    files_by_type: Record<string, number>;
    storage_by_card: Array<{ card_id: string; file_count: number; total_size: number }>;
  }> {
    const { data: attachments, error } = await this.supabase
      .from('kb_attachments')
      .select('card_id, file_size, mime_type');

    if (error) {
      throw new Error(`Failed to get overall storage stats: ${error.message}`);
    }

    const stats = {
      total_files: attachments?.length || 0,
      total_size: 0,
      files_by_type: {} as Record<string, number>,
      storage_by_card: [] as Array<{ card_id: string; file_count: number; total_size: number }>
    };

    const cardStats = new Map<string, { file_count: number; total_size: number }>();

    attachments?.forEach(attachment => {
      stats.total_size += attachment.file_size || 0;
      
      const type = attachment.mime_type || 'unknown';
      stats.files_by_type[type] = (stats.files_by_type[type] || 0) + 1;

      // Track per-card stats
      const cardId = attachment.card_id;
      const existing = cardStats.get(cardId) || { file_count: 0, total_size: 0 };
      existing.file_count++;
      existing.total_size += attachment.file_size || 0;
      cardStats.set(cardId, existing);
    });

    stats.storage_by_card = Array.from(cardStats.entries()).map(([card_id, stats]) => ({
      card_id,
      ...stats
    }));

    return stats;
  }

  /**
   * Upload image for markdown embedding without creating database record
   * This method bypasses the kb_attachments table to avoid UUID validation issues
   */
  async uploadImageForMarkdown(
    file: Buffer,
    filename: string,
    mimetype: string,
    userId?: string
  ): Promise<string> {
    // Validate file
    this.validateFile(file, filename, mimetype);

    // Generate unique file path for markdown images
    const fileExtension = this.getFileExtension(filename);
    const uniqueId = require('uuid').v4();
    const storagePath = `markdown-images/${uniqueId}${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: mimetype,
        duplex: 'half'
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get the public URL instead of signed URL for permanent access
    const { data: publicUrlData } = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    if (!publicUrlData?.publicUrl) {
      // Fallback to signed URL if public URL fails
      const signedUrl = await this.getSignedUrl(storagePath, 31536000);
      return signedUrl;
    }
    
    return publicUrlData.publicUrl;
  }

  /**
   * Upload a document file (PDF, DOCX, etc.) to storage for later download/preview
   * Stores in documents/{cardId}/{uuid}.ext path
   * Returns the storage path (not a URL - use getSignedUrl to get download URL)
   */
  async uploadDocumentFile(
    cardId: string,
    file: Buffer,
    filename: string,
    mimetype: string
  ): Promise<string> {
    // Validate file
    this.validateFile(file, filename, mimetype);

    // Generate unique file path
    const fileExtension = this.getFileExtension(filename);
    const uniqueId = require('uuid').v4();
    const storagePath = `documents/${cardId}/${uniqueId}${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: mimetype,
        duplex: 'half'
      });

    if (error) {
      throw new Error(`Failed to upload document file: ${error.message}`);
    }

    return storagePath;
  }

  /**
   * Delete a document file from storage
   */
  async deleteDocumentFile(storagePath: string): Promise<void> {
    if (!storagePath) return;

    try {
      await this.deleteFileFromStorage(storagePath);
    } catch (error) {
      console.warn(`Failed to delete document file ${storagePath}:`, error);
    }
  }
}