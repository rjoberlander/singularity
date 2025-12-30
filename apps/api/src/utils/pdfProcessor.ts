/**
 * PDF Processing Utility
 * Handles extraction of text from PDFs for AI processing
 * Supports both text-based PDFs and scanned image PDFs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');

const MAX_PDF_SIZE_MB = 100; // Max PDF size we'll attempt to process
const MAX_TEXT_LENGTH = 50000; // Max characters to send to AI
const PDF_PARSE_TIMEOUT_MS = 60000; // 60 second timeout for PDF parsing
const MAX_PAGES_TO_RENDER = 5; // Max pages to render as images (reduced for memory/speed)
const IMAGE_DPI = 150; // DPI for rendered images (balance between quality and size)

export interface PDFProcessResult {
  success: boolean;
  text?: string;
  images?: string[]; // Base64 encoded images if scanned PDF
  pageCount?: number;
  truncated?: boolean;
  isScanned?: boolean;
  error?: string;
}

/**
 * Extract text from a PDF base64 string
 * Falls back to image extraction for scanned PDFs
 */
export async function extractTextFromPDF(base64Data: string): Promise<PDFProcessResult> {
  try {
    // Remove data URL prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.includes(',')) {
      cleanBase64 = base64Data.split(',')[1];
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Check size
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > MAX_PDF_SIZE_MB) {
      return {
        success: false,
        error: `PDF too large (${sizeMB.toFixed(1)}MB). Maximum is ${MAX_PDF_SIZE_MB}MB.`
      };
    }

    console.log(`Processing PDF: ${sizeMB.toFixed(2)}MB`);

    // Parse PDF with timeout
    const parsePromise = pdf(buffer);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`PDF parsing timed out after ${PDF_PARSE_TIMEOUT_MS/1000} seconds`)), PDF_PARSE_TIMEOUT_MS)
    );

    const data = await Promise.race([parsePromise, timeoutPromise]) as any;

    let text = data.text || '';
    let truncated = false;

    // Check if PDF has extractable text
    if (!text || text.trim().length < 50) {
      console.log(`PDF has no extractable text (${text.length} chars). Attempting image extraction...`);

      // Try to extract images from PDF pages using pdf2pic + ImageMagick
      try {
        const images = await renderPDFPagesToImages(buffer, Math.min(data.numpages, MAX_PAGES_TO_RENDER));

        if (images.length > 0) {
          console.log(`Rendered ${images.length} pages as images`);
          return {
            success: true,
            images,
            pageCount: data.numpages,
            isScanned: true,
            truncated: data.numpages > MAX_PAGES_TO_RENDER
          };
        }
      } catch (renderError) {
        console.error('Failed to render PDF pages:', renderError);
      }

      return {
        success: false,
        error: 'This PDF appears to be scanned images without extractable text. Please take a screenshot or photo of the lab results and upload that instead.',
        pageCount: data.numpages
      };
    }

    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
      console.log(`PDF text truncated from ${data.text.length} to ${MAX_TEXT_LENGTH} characters`);
    }

    // Clean up text - remove excessive whitespace
    text = text
      .replace(/\n{3,}/g, '\n\n')  // Multiple newlines to double
      .replace(/[ \t]+/g, ' ')      // Multiple spaces to single
      .trim();

    console.log(`Extracted ${text.length} characters from ${data.numpages} pages`);

    return {
      success: true,
      text,
      pageCount: data.numpages,
      truncated,
      isScanned: false
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: `Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Render PDF pages to images using ImageMagick/Ghostscript directly
 */
async function renderPDFPagesToImages(pdfBuffer: Buffer, maxPages: number): Promise<string[]> {
  const images: string[] = [];
  const tempDir = os.tmpdir();
  const tempId = Date.now().toString(36);
  const tempPdfPath = path.join(tempDir, `pdf-input-${tempId}.pdf`);

  // Write PDF buffer to temp file
  fs.writeFileSync(tempPdfPath, pdfBuffer);
  console.log(`Rendering up to ${maxPages} pages from PDF using ImageMagick...`);

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    try {
      console.log(`Rendering page ${pageNum + 1}...`);
      const outputPath = path.join(tempDir, `pdf-render-${tempId}-${pageNum}.png`);

      // Use magick (ImageMagick v7) command
      const cmd = `/opt/homebrew/bin/magick -density ${IMAGE_DPI} "${tempPdfPath}[${pageNum}]" -resize 1200x1600 -background white -flatten "${outputPath}"`;

      await new Promise<void>((resolve, reject) => {
        exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`ImageMagick error for page ${pageNum + 1}:`, stderr || error.message);
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Read the generated image
      if (fs.existsSync(outputPath)) {
        const imageBuffer = fs.readFileSync(outputPath);
        const base64 = imageBuffer.toString('base64');
        images.push(base64);
        console.log(`Rendered page ${pageNum + 1}/${maxPages} - ${base64.length} chars`);
        fs.unlinkSync(outputPath); // Clean up
      }
    } catch (pageError) {
      console.error(`Error rendering page ${pageNum + 1}:`, pageError);
      // Continue with other pages
    }
  }

  // Clean up temp PDF file
  try {
    fs.unlinkSync(tempPdfPath);
  } catch (cleanupError) {
    console.error('Cleanup error:', cleanupError);
  }

  return images;
}

/**
 * Check if base64 data is a PDF
 */
export function isPDFBase64(base64Data: string): boolean {
  // PDF files start with %PDF which is JVBERi0 in base64
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  return cleanBase64.startsWith('JVBERi0');
}

/**
 * Get estimated size of base64 data in MB
 */
export function getBase64SizeMB(base64Data: string): number {
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  // Base64 encodes 3 bytes in 4 characters
  const bytes = (cleanBase64.length * 3) / 4;
  return bytes / (1024 * 1024);
}
