import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedDocument {
  title: string;
  content: string; // Markdown content
  images: Array<{
    id: string;
    originalName: string;
    storagePath: string;
  }>;
}

export class DocumentProcessorService {
  private supabase;
  private turndownService: TurndownService;
  private readonly IMAGE_BUCKET = 'kb-document-images';
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Initialize Turndown for HTML to Markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-'
    });

    // Configure Turndown to preserve tables
    this.turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
  }

  /**
   * Process uploaded file and convert to Markdown
   */
  async processDocument(
    file: Buffer,
    filename: string,
    mimeType: string,
    cardId: string,
    userProvidedTitle?: string
  ): Promise<ProcessedDocument> {
    const fileExtension = this.getFileExtension(filename);
    
    switch (fileExtension.toLowerCase()) {
      case '.pdf':
        return await this.processPDF(file, filename, cardId);
      case '.docx':
      case '.doc':
        return await this.processWord(file, filename, cardId);
      case '.txt':
        return await this.processText(file, filename, userProvidedTitle);
      case '.md':
        return await this.processMarkdown(file, filename);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  /**
   * Process PDF file to Markdown
   */
  private async processPDF(
    file: Buffer,
    filename: string,
    cardId: string
  ): Promise<ProcessedDocument> {
    try {
      const data = await pdf(file);
      
      // Extract text content - data.text contains the raw extracted text
      let rawText = data.text;
      
      console.log('PDF raw text preview:', rawText.substring(0, 500));
      
      // Clean up the text and format it nicely
      const markdownContent = this.cleanupPDFText(rawText);
      
      // Extract title from the cleaned content or filename
      const title = this.extractTitle(filename, markdownContent);
      
      return {
        title,
        content: markdownContent,
        images: []
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  /**
   * Process Word document to Markdown
   */
  private async processWord(
    file: Buffer,
    filename: string,
    cardId: string
  ): Promise<ProcessedDocument> {
    try {
      // Convert Word to HTML first
      const result = await mammoth.convertToHtml({
        buffer: file
      }, {
        convertImage: mammoth.images.imgElement(async () => {
          // For now, we'll skip image extraction as requested
          return { src: '' };
        })
      });
      
      // Handle any conversion messages/warnings
      if (result.messages.length > 0) {
        console.warn('Word conversion messages:', result.messages);
      }
      
      // Convert HTML to Markdown
      let markdownContent = this.turndownService.turndown(result.value);
      
      // Clean up the markdown
      markdownContent = this.cleanupMarkdown(markdownContent);
      
      // Extract title
      const title = this.extractTitle(filename, markdownContent);
      
      return {
        title,
        content: markdownContent,
        images: []
      };
    } catch (error) {
      console.error('Error processing Word document:', error);
      throw new Error('Failed to process Word document');
    }
  }

  /**
   * Process plain text file
   */
  private async processText(
    file: Buffer,
    filename: string,
    userProvidedTitle?: string
  ): Promise<ProcessedDocument> {
    const content = file.toString('utf-8');
    
    // If user explicitly provided a title, always use that
    if (userProvidedTitle) {
      // For plain text, just ensure proper line breaks
      const markdownContent = content
        .split('\n')
        .map(line => line.trim())
        .join('\n\n');
      
      return {
        title: userProvidedTitle,
        content: markdownContent,
        images: []
      };
    }
    
    // Otherwise, try to extract from filename or content
    const baseFilename = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    
    // Check if this looks like a user-provided title (has underscores, reasonable length)
    const isUserProvidedTitle = filename.includes('_') && baseFilename.length < 100;
    
    const title = isUserProvidedTitle ? baseFilename : this.extractTitle(filename, content);
    
    // For plain text, just ensure proper line breaks
    const markdownContent = content
      .split('\n')
      .map(line => line.trim())
      .join('\n\n');
    
    return {
      title,
      content: markdownContent,
      images: []
    };
  }

  /**
   * Process Markdown file
   */
  private async processMarkdown(
    file: Buffer,
    filename: string
  ): Promise<ProcessedDocument> {
    const content = file.toString('utf-8');
    
    // Extract title from the first H1 header or filename
    const h1Match = content.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].trim() : filename.replace(/\.[^/.]+$/, '');
    
    // Markdown files are already in the desired format
    // Just ensure consistent formatting
    const markdownContent = this.cleanupMarkdown(content);
    
    return {
      title,
      content: markdownContent,
      images: []
    };
  }

  /**
   * Clean up PDF extracted text
   */
  private cleanupPDFText(text: string): string {
    // First, let's see what we're working with
    console.log('Raw PDF text sample:', text.substring(0, 200).replace(/\n/g, '\\n'));
    
    // Split by lines to preserve structure
    let lines = text.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Skip completely empty lines but preserve spacing
      if (line.trim() === '') {
        // Keep one empty line for paragraph separation
        if (i > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        continue;
      }
      
      // Clean up the line - preserve internal spaces
      line = line.trim();
      
      // Detect headers - typically shorter lines in ALL CAPS or followed by colons
      const isHeader = (
        line.length < 80 && (
          line === line.toUpperCase() && line.length > 3 && /[A-Z]/.test(line) || // All caps with letters
          line.endsWith(':') && line.length < 60 || // Ends with colon
          /^[0-9]+\.?\s+[A-Z]/.test(line) || // Numbered section like "1. Title"
          /^[A-Z][A-Z\s]+$/.test(line) && line.length < 50 // Multiple words in caps
        )
      );
      
      // Detect list items
      const isBullet = /^[•·▪▫◦‣⁃]\s*/.test(line) || /^[\-\*]\s+/.test(line);
      const isNumbered = /^\d+[\.)]\s*/.test(line);
      
      if (isHeader) {
        // Add spacing before headers
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
          processedLines.push('');
        }
        
        // Clean header text and format as H2
        const headerText = line.replace(/:$/, '').trim();
        processedLines.push(`## ${headerText}`);
        processedLines.push(''); // Space after header
      } else if (isBullet) {
        // Standardize bullet points
        const bulletContent = line.replace(/^[•·▪▫◦‣⁃\-*]\s*/, '').trim();
        processedLines.push(`• ${bulletContent}`);
      } else if (isNumbered) {
        // Preserve numbered lists
        processedLines.push(line);
      } else {
        // Regular paragraph text
        // Check if this line should be joined with the previous one
        const prevLine = processedLines[processedLines.length - 1];
        const shouldJoin = (
          prevLine && 
          prevLine !== '' && 
          !prevLine.startsWith('#') && 
          !prevLine.startsWith('•') && 
          !isNumbered && 
          !prevLine.endsWith('.') && 
          !prevLine.endsWith('!') && 
          !prevLine.endsWith('?') &&
          !prevLine.endsWith(':') &&
          line[0] === line[0].toLowerCase() // Starts with lowercase
        );
        
        if (shouldJoin) {
          // Join with previous line
          processedLines[processedLines.length - 1] = prevLine + ' ' + line;
        } else {
          processedLines.push(line);
        }
      }
    }
    
    // Join lines and clean up excessive spacing
    let result = processedLines.join('\n');
    
    // Clean up multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n');
    
    // Ensure proper spacing around headers
    result = result.replace(/\n(#{1,6}\s+[^\n]+)\n/g, '\n\n$1\n\n');
    
    // Trim and return
    return result.trim();
  }

  /**
   * Clean up converted Markdown
   */
  private cleanupMarkdown(markdown: string): string {
    // Remove excessive line breaks
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Fix table formatting
    markdown = markdown.replace(/\|\s+/g, '| ');
    markdown = markdown.replace(/\s+\|/g, ' |');
    
    // Ensure headers have proper spacing
    markdown = markdown.replace(/^(#{1,6})\s*(.+)$/gm, '\n$1 $2\n');
    
    // Clean up list formatting
    markdown = markdown.replace(/^(\s*[-*+])\s+/gm, '$1 ');
    markdown = markdown.replace(/^(\s*\d+\.)\s+/gm, '$1 ');
    
    return markdown.trim();
  }

  /**
   * Extract title from filename or content
   */
  private extractTitle(filename: string, content: string): string {
    // Remove file extension from filename
    const baseFilename = filename.replace(/\.[^/.]+$/, '');
    
    // Try to find a title in the content
    // Look for markdown headers first
    const headerMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headerMatch) {
      return headerMatch[1].trim();
    }
    
    // Look for lines that might be titles (short, possibly all caps)
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 5 && trimmed.length < 100) {
        // Check if it looks like a title
        if (
          trimmed === trimmed.toUpperCase() || // All caps
          /^[A-Z][^.!?]*$/.test(trimmed) || // Starts with capital, no sentence ending
          /^[0-9]+\.?\s+[A-Z]/.test(trimmed) // Numbered section
        ) {
          return trimmed.replace(/^[0-9]+\.?\s+/, ''); // Remove numbering if present
        }
      }
    }
    
    // Get first non-empty line as last resort
    const firstLine = lines.find(line => line.trim().length > 0)?.trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine;
    }
    
    // Fallback to filename
    return baseFilename;
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Check if file type is supported
   */
  static isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/x-markdown'
    ];
    return supportedTypes.includes(mimeType);
  }

  /**
   * Validate file size (max 10MB)
   */
  static validateFileSize(size: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    return size > 0 && size <= MAX_SIZE;
  }
}