import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { supabase } from '../config/supabase';
import { AI_CONFIG } from '../config/workspace';
import { ExtractBiomarkersRequest, HealthChatRequest, ExtractedBiomarkerData } from '../types';
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import { extractTextFromPDF, isPDFBase64, getBase64SizeMB } from '../utils/pdfProcessor';
import { BIOMARKER_REFERENCE, findBiomarkerMatch, getBiomarkerNames } from '../data/biomarkerReference';

const router = Router();
const MAX_IMAGE_SIZE_MB = 10; // Max size for image/vision API calls
const MAX_IMAGE_DIMENSION = 1920; // Anthropic limit for multi-image requests is 2000px, use 1920 for safety
const BATCH_SIZE = 3; // Process images in batches of 3 to avoid token limits
const MAX_RETRIES = 2; // Retry failed batches up to 2 times

/**
 * Batch processing result for tracking progress
 */
interface BatchResult {
  batchIndex: number;
  success: boolean;
  biomarkers: any[];
  labInfo: any;
  error?: string;
  retryCount: number;
}

/**
 * Process a single batch of images and return extracted biomarkers
 */
async function processBatch(
  anthropic: Anthropic,
  batchImages: Array<{ mediaType: string; data: string }>,
  textContent: string | null,
  systemPrompt: string,
  batchIndex: number,
  totalBatches: number
): Promise<{ biomarkers: any[]; labInfo: any }> {
  const userContent: any[] = [];

  // Add images to content
  for (const img of batchImages) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.data
      }
    });
  }

  // Add text content if provided (only for first batch to avoid duplication)
  if (textContent && batchIndex === 0) {
    userContent.push({
      type: 'text',
      text: `--- Text Content ---\n${textContent}\n--- End Text ---`
    });
  }

  // Add instruction
  const imageCount = batchImages.length;
  let instruction = `Extract all biomarker data from ${imageCount > 1 ? `these ${imageCount} lab report images` : 'this lab report image'}`;
  if (totalBatches > 1) {
    instruction += ` (batch ${batchIndex + 1} of ${totalBatches})`;
  }
  instruction += '. Return the data as JSON.';

  userContent.push({
    type: 'text',
    text: instruction
  });

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  });

  // Extract text from response
  const responseText = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('');

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  let jsonStr = jsonMatch[0];
  // Fix common JSON issues - trailing commas
  jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
  // Fix unclosed brackets
  const openBraces = (jsonStr.match(/{/g) || []).length;
  const closeBraces = (jsonStr.match(/}/g) || []).length;
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
  for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';

  const parsed = JSON.parse(jsonStr);
  return {
    biomarkers: parsed.biomarkers || [],
    labInfo: parsed.lab_info || {}
  };
}

/**
 * Merge biomarkers from multiple batches, deduplicating by name+date
 */
function mergeBiomarkerResults(batchResults: BatchResult[]): { biomarkers: any[]; labInfo: any; extractionNotes: string } {
  const biomarkerMap = new Map<string, any>();
  let labInfo: any = {};
  const notes: string[] = [];

  for (const result of batchResults) {
    if (!result.success) {
      notes.push(`Batch ${result.batchIndex + 1} failed: ${result.error}`);
      continue;
    }

    // Merge lab info (first non-null wins)
    if (result.labInfo) {
      labInfo = { ...result.labInfo, ...labInfo };
    }

    // Merge biomarkers
    for (const biomarker of result.biomarkers) {
      const key = biomarker.name.toLowerCase();

      if (biomarkerMap.has(key)) {
        // Merge readings from duplicate biomarkers
        const existing = biomarkerMap.get(key);
        const existingReadings = existing.readings || [];
        const newReadings = biomarker.readings || [];

        // Deduplicate readings by date+value
        const readingSet = new Set(existingReadings.map((r: any) => `${r.date}|${r.value}`));
        for (const reading of newReadings) {
          const readingKey = `${reading.date}|${reading.value}`;
          if (!readingSet.has(readingKey)) {
            existingReadings.push(reading);
            readingSet.add(readingKey);
          }
        }
        existing.readings = existingReadings;

        // Keep higher confidence
        if (biomarker.confidence > existing.confidence) {
          existing.confidence = biomarker.confidence;
        }
      } else {
        biomarkerMap.set(key, { ...biomarker });
      }
    }
  }

  const successfulBatches = batchResults.filter(r => r.success).length;
  const totalBatches = batchResults.length;
  if (successfulBatches < totalBatches) {
    notes.push(`Processed ${successfulBatches}/${totalBatches} batches successfully`);
  }

  return {
    biomarkers: Array.from(biomarkerMap.values()),
    labInfo,
    extractionNotes: notes.length > 0 ? notes.join('; ') : `Extracted from ${totalBatches} batch(es)`
  };
}

/**
 * Process images with retry logic
 */
async function processWithRetry(
  anthropic: Anthropic,
  batchImages: Array<{ mediaType: string; data: string }>,
  textContent: string | null,
  systemPrompt: string,
  batchIndex: number,
  totalBatches: number
): Promise<BatchResult> {
  let lastError: Error | null = null;

  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      const result = await processBatch(
        anthropic, batchImages, textContent, systemPrompt, batchIndex, totalBatches
      );
      return {
        batchIndex,
        success: true,
        biomarkers: result.biomarkers,
        labInfo: result.labInfo,
        retryCount: retry
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Batch ${batchIndex + 1} attempt ${retry + 1} failed:`, error.message);

      // Don't retry on certain errors
      if (error.message?.includes('No JSON found') || error.status === 400) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (retry < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
      }
    }
  }

  return {
    batchIndex,
    success: false,
    biomarkers: [],
    labInfo: {},
    error: lastError?.message || 'Unknown error',
    retryCount: MAX_RETRIES
  };
}

/**
 * Resize image if any dimension exceeds the max allowed
 * Returns base64 string without data URL prefix
 */
async function resizeImageIfNeeded(base64Data: string, mediaType: string): Promise<string> {
  try {
    // Remove data URL prefix if present
    let cleanBase64 = base64Data;
    if (base64Data.includes(',')) {
      cleanBase64 = base64Data.split(',')[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const metadata = await sharp(buffer).metadata();

    // Check if resize is needed
    if (metadata.width && metadata.height &&
        (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION)) {
      console.log(`Resizing image from ${metadata.width}x${metadata.height} to fit within ${MAX_IMAGE_DIMENSION}px`);

      const resizedBuffer = await sharp(buffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      return resizedBuffer.toString('base64');
    }

    return cleanBase64;
  } catch (error) {
    console.error('Error resizing image:', error);
    // Return original if resize fails
    return base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  }
}

// Get known biomarker names for the prompt
const KNOWN_BIOMARKERS = getBiomarkerNames().join(', ');

// Helper function to get Anthropic client for a user
async function getAnthropicClient(userId: string): Promise<Anthropic | null> {
  const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
  if (!keyData) {
    console.error(`No Anthropic API key found for user ${userId}`);
    return null;
  }
  return new Anthropic({ apiKey: keyData.api_key });
}

// Helper function to get Perplexity API key for a user
async function getPerplexityKey(userId: string): Promise<string | null> {
  const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'perplexity');
  if (!keyData) {
    console.log(`No Perplexity API key found for user ${userId}`);
    return null;
  }
  return keyData.api_key;
}

/**
 * Web search using Perplexity API for supplement information
 */
async function webSearchForSupplement(
  perplexityKey: string,
  supplementName: string,
  brand: string | null,
  missingFields: string[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const fieldDescriptions: Record<string, string> = {
      brand: 'brand/manufacturer name',
      price: 'current retail price in USD',
      servings_per_container: 'number of servings per container/bottle',
      serving_size: 'number of units (capsules, scoops, etc.) per serving (e.g., 2 for "2 capsules per serving")',
      intake_form: 'form (capsule, powder, liquid, spray, gummy, or patch)',
      dose_per_serving: 'dose amount per serving (number only)',
      dose_unit: 'dose unit (mg, g, mcg, IU, ml, or CFU)',
      category: 'category (vitamin_mineral, amino_protein, herb_botanical, probiotic, other)'
    };

    const searchQuery = `${supplementName}${brand ? ` ${brand}` : ''} supplement. Find: ${missingFields.map(f => fieldDescriptions[f] || f).join(', ')}. Provide specific values.`;

    console.log('Perplexity web search query:', searchQuery);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a supplement research assistant. Return ONLY valid JSON with supplement details. For each field requested, provide the value or null if not found. Format:
{
  "brand": "string or null",
  "price": number or null,
  "servings_per_container": number or null,
  "serving_size": number or null (how many units per serving, e.g., 2 for "2 capsules"),
  "intake_form": "capsule|powder|liquid|spray|gummy|patch or null",
  "dose_per_serving": number or null,
  "dose_unit": "mg|g|mcg|IU|ml|CFU or null",
  "category": "vitamin_mineral|amino_protein|herb_botanical|probiotic|other or null",
  "confidence": number 0-1
}`
          },
          { role: 'user', content: searchQuery }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Perplexity API error:', response.status, errorBody);
      return { success: false, error: `Perplexity API error: ${response.status}` };
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log('Perplexity response:', content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, data: parsed };
    }

    return { success: false, error: 'No JSON found in Perplexity response' };
  } catch (error: any) {
    console.error('Perplexity search error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/v1/ai/extract-biomarkers
 * Extract biomarkers from image or text
 */
router.post('/extract-biomarkers', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { image_base64, images_base64, text_content, source_type } = req.body;

    // Support both single image and multiple images
    const allImages: string[] = [];
    if (images_base64 && Array.isArray(images_base64)) {
      allImages.push(...images_base64);
    } else if (image_base64) {
      allImages.push(image_base64);
    }

    if (allImages.length === 0 && !text_content) {
      return res.status(400).json({
        success: false,
        error: 'Either image_base64, images_base64, or text_content is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`Processing extraction: ${allImages.length} images, text: ${!!text_content}`);

    const systemPrompt = `You are a precise biomarker extraction assistant. Your job is to extract health biomarker data from lab reports and match them to standard biomarker names.

## Known Biomarkers (match extracted names to these when possible):
${KNOWN_BIOMARKERS}

## Rules:
1. ONLY extract data that is explicitly visible in the source
2. NEVER guess or infer values that aren't clearly stated
3. Match extracted biomarker names to the known biomarkers list above when possible
4. Use the STANDARDIZED name from the known list (e.g., "Vitamin D" instead of "25-OH Vitamin D")
5. Include confidence scores: 1.0 for exact matches, 0.8-0.9 for close matches
6. Extract reference ranges shown on the report
7. Flag any values outside normal reference ranges
8. IMPORTANT: A single biomarker may have MULTIPLE readings from different dates (e.g., historical chart data)
9. Extract ALL date-value pairs visible for each biomarker - group them under the same biomarker entry
10. Look for chart data showing historical values across different dates (e.g., 07/23, 10/23, 02/24, etc.)
11. CALCULATED VALUES: For LDL Cholesterol, check if the report indicates it was "calculated" (using Friedewald equation) vs "direct" measurement. Look for keywords like "calculated", "calc", "Friedewald", "(c)", or notes about calculation. Mark is_calculated: true for calculated values.

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "biomarkers": [
    {
      "name": "string - standardized name from known list, or exact name if no match",
      "extracted_name": "string - original name as shown on report",
      "unit": "string - exact unit",
      "category": "string - blood, metabolic, hormone, vitamin, mineral, lipid, thyroid, liver, kidney, inflammation, other",
      "confidence": number between 0 and 1 - confidence in biomarker identification,
      "reference_range_low": number or null,
      "reference_range_high": number or null,
      "optimal_range_low": number or null,
      "optimal_range_high": number or null,
      "readings": [
        {
          "date": "YYYY-MM-DD - the date of this reading",
          "value": number,
          "confidence": number between 0 and 1 - confidence in this specific value extraction,
          "flag": "string or null - 'low', 'high', 'critical_low', 'critical_high', or null if normal",
          "is_calculated": boolean or null - true if this is a calculated value (e.g., LDL via Friedewald), false or null if direct measurement
        }
      ]
    }
  ],
  "lab_info": {
    "lab_name": "string or null",
    "default_date": "YYYY-MM-DD or null - fallback date if no dates found",
    "patient_name": "string or null - only if clearly visible"
  },
  "extraction_notes": "string - any important notes about the extraction"
}`;

    // Helper to get media type and clean base64 data
    const processBase64Image = (imageData: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: string } => {
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      let data = imageData;

      if (imageData.startsWith('data:image/png')) {
        mediaType = 'image/png';
        data = imageData.split(',')[1];
      } else if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
        mediaType = 'image/jpeg';
        data = imageData.split(',')[1];
      } else if (imageData.startsWith('data:image/webp')) {
        mediaType = 'image/webp';
        data = imageData.split(',')[1];
      } else if (imageData.startsWith('data:')) {
        data = imageData.split(',')[1];
      }

      return { mediaType, data };
    };

    // Collect all processed images for batching
    const processedImages: Array<{ mediaType: string; data: string }> = [];
    let additionalText = '';

    // Process images if provided
    if (allImages.length > 0) {
      for (const imageData of allImages) {
        const sizeMB = getBase64SizeMB(imageData);
        const isPDF = isPDFBase64(imageData);

        console.log(`Processing file: ${sizeMB.toFixed(2)}MB, isPDF: ${isPDF}`);

        if (isPDF) {
          console.log('PDF detected, extracting text...');
          const pdfResult = await extractTextFromPDF(imageData);

          if (!pdfResult.success) {
            return res.status(400).json({
              success: false,
              error: pdfResult.error || 'Failed to process PDF',
              error_type: 'PDF_PROCESSING_ERROR',
              timestamp: new Date().toISOString()
            });
          }

          // Handle scanned PDFs with images
          if (pdfResult.isScanned && pdfResult.images && pdfResult.images.length > 0) {
            console.log(`Processing ${pdfResult.images.length} scanned pages with Vision API`);
            for (const pageImage of pdfResult.images) {
              const resizedData = await resizeImageIfNeeded(pageImage, 'image/png');
              processedImages.push({ mediaType: 'image/png', data: resizedData });
            }
          } else if (pdfResult.text) {
            // Text-based PDF - add to text content
            additionalText += `\n--- PDF Document ---\n${pdfResult.text}\n--- End PDF ---\n`;
          }
        } else if (sizeMB > MAX_IMAGE_SIZE_MB) {
          return res.status(400).json({
            success: false,
            error: `File too large (${sizeMB.toFixed(1)}MB). Maximum for images is ${MAX_IMAGE_SIZE_MB}MB. Try a smaller image or PDF.`,
            error_type: 'FILE_TOO_LARGE',
            timestamp: new Date().toISOString()
          });
        } else {
          // Regular image - add to processed images (resize if needed)
          const { mediaType, data } = processBase64Image(imageData);
          const resizedData = await resizeImageIfNeeded(data, mediaType);
          processedImages.push({ mediaType, data: resizedData });
        }
      }
    }

    // Combine text content
    const combinedText = [text_content, additionalText].filter(Boolean).join('\n') || null;

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    let extractedData: ExtractedBiomarkerData;

    // Use batch processing for multiple images
    if (processedImages.length > BATCH_SIZE) {
      console.log(`Using batch processing: ${processedImages.length} images in batches of ${BATCH_SIZE}`);

      // Split images into batches
      const batches: Array<Array<{ mediaType: string; data: string }>> = [];
      for (let i = 0; i < processedImages.length; i += BATCH_SIZE) {
        batches.push(processedImages.slice(i, i + BATCH_SIZE));
      }

      console.log(`Processing ${batches.length} batches...`);

      // Process all batches (sequentially to avoid rate limits)
      const batchResults: BatchResult[] = [];
      for (let i = 0; i < batches.length; i++) {
        console.log(`Processing batch ${i + 1}/${batches.length} (${batches[i].length} images)`);
        const result = await processWithRetry(
          anthropic,
          batches[i],
          combinedText,
          systemPrompt,
          i,
          batches.length
        );
        batchResults.push(result);
        console.log(`Batch ${i + 1} ${result.success ? 'succeeded' : 'failed'}: ${result.biomarkers.length} biomarkers extracted`);
      }

      // Merge results from all batches
      const mergedResults = mergeBiomarkerResults(batchResults);

      // Check if any batches succeeded
      const successfulBatches = batchResults.filter(r => r.success);
      if (successfulBatches.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'All batches failed during extraction',
          details: batchResults.map(r => ({ batch: r.batchIndex + 1, error: r.error })),
          timestamp: new Date().toISOString()
        });
      }

      extractedData = {
        biomarkers: mergedResults.biomarkers,
        lab_info: mergedResults.labInfo,
        extraction_notes: mergedResults.extractionNotes
      };

      console.log(`Batch processing complete: ${extractedData.biomarkers.length} total biomarkers from ${successfulBatches.length}/${batches.length} batches`);

    } else {
      // Single batch processing for small number of images
      console.log(`Processing ${processedImages.length} images in single request`);

      const userContent: any[] = [];

      // Add all images
      for (const img of processedImages) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data }
        });
      }

      // Add text content if provided
      if (combinedText) {
        userContent.push({
          type: 'text',
          text: `--- Text Content ---\n${combinedText}\n--- End Text ---`
        });
      }

      // Add instruction
      const imageCount = processedImages.length;
      let instruction = 'Extract all biomarker data from ';
      if (imageCount > 0 && combinedText) {
        instruction += `these ${imageCount} image${imageCount > 1 ? 's' : ''} and text content`;
      } else if (imageCount > 0) {
        instruction += imageCount > 1 ? `these ${imageCount} lab report images` : 'this lab report image';
      } else {
        instruction += 'this lab report text';
      }
      instruction += '. Return the data as JSON.';
      userContent.push({ type: 'text', text: instruction });

      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      });

      // Extract text from response
      const responseText = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      // Parse JSON from response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          // Fix common JSON issues
          jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
          const openBraces = (jsonStr.match(/{/g) || []).length;
          const closeBraces = (jsonStr.match(/}/g) || []).length;
          const openBrackets = (jsonStr.match(/\[/g) || []).length;
          const closeBrackets = (jsonStr.match(/\]/g) || []).length;
          for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';
          extractedData = JSON.parse(jsonStr);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response (first 2000 chars):', responseText.substring(0, 2000));
        return res.status(500).json({
          success: false,
          error: 'Failed to parse AI response',
          raw_response: responseText.substring(0, 5000),
          timestamp: new Date().toISOString()
        });
      }
    }

    // Post-process: Match against reference data and fill in missing ranges
    if (extractedData.biomarkers && Array.isArray(extractedData.biomarkers)) {
      const defaultDate = (extractedData.lab_info as any)?.default_date || (extractedData.lab_info as any)?.default_test_date || null;

      extractedData.biomarkers = extractedData.biomarkers.map((biomarker: any) => {
        const { match, confidence: matchConfidence } = findBiomarkerMatch(biomarker.name);

        // Fill in missing reference ranges from our data
        const referenceRangeLow = biomarker.reference_range_low ?? match?.referenceRange?.low ?? null;
        const referenceRangeHigh = biomarker.reference_range_high ?? match?.referenceRange?.high ?? null;
        const optimalRangeLow = biomarker.optimal_range_low ?? match?.optimalRange?.low ?? null;
        const optimalRangeHigh = biomarker.optimal_range_high ?? match?.optimalRange?.high ?? null;

        // Helper to calculate flag for a value
        const calculateFlag = (value: number) => {
          if (referenceRangeLow !== null && value < referenceRangeLow * 0.8) return 'critical_low';
          if (referenceRangeLow !== null && value < referenceRangeLow) return 'low';
          if (referenceRangeHigh !== null && value > referenceRangeHigh * 1.2) return 'critical_high';
          if (referenceRangeHigh !== null && value > referenceRangeHigh) return 'high';
          return null;
        };

        // Handle new multi-reading format
        if (biomarker.readings && Array.isArray(biomarker.readings)) {
          // Process each reading
          const processedReadings = biomarker.readings.map((reading: any) => ({
            date: reading.date || defaultDate,
            value: reading.value,
            confidence: reading.confidence ?? biomarker.confidence ?? 0.9,
            flag: reading.flag || calculateFlag(reading.value),
            is_calculated: reading.is_calculated || false
          }));

          return {
            name: match?.name || biomarker.name,
            extracted_name: biomarker.extracted_name || biomarker.name,
            unit: biomarker.unit,
            category: biomarker.category || match?.category || 'other',
            confidence: Math.max(biomarker.confidence || 0, matchConfidence || 0),
            match_confidence: matchConfidence || 0,
            reference_range_low: referenceRangeLow,
            reference_range_high: referenceRangeHigh,
            optimal_range_low: optimalRangeLow,
            optimal_range_high: optimalRangeHigh,
            readings: processedReadings
          };
        }

        // Handle legacy single-value format (convert to readings array)
        const finalConfidence = Math.max(biomarker.confidence || 0, matchConfidence || 0);
        const singleReading = {
          date: biomarker.test_date || defaultDate,
          value: biomarker.value,
          confidence: finalConfidence,
          flag: biomarker.flag || calculateFlag(biomarker.value),
          is_calculated: biomarker.is_calculated || false
        };

        return {
          name: match?.name || biomarker.name,
          extracted_name: biomarker.extracted_name || biomarker.name,
          unit: biomarker.unit,
          category: biomarker.category || match?.category || 'other',
          confidence: finalConfidence,
          match_confidence: matchConfidence || 0,
          reference_range_low: referenceRangeLow,
          reference_range_high: referenceRangeHigh,
          optimal_range_low: optimalRangeLow,
          optimal_range_high: optimalRangeHigh,
          readings: [singleReading]
        };
      });
    }

    // Store conversation for reference
    const conversationSummary = extractedData.extraction_notes ||
      `Extracted ${extractedData.biomarkers?.length || 0} biomarkers from ${processedImages.length} image(s)`;

    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'biomarker_extraction',
      messages: [
        { role: 'user', content: source_type === 'image' ? `[${processedImages.length} image(s) uploaded]` : text_content?.substring(0, 500) },
        { role: 'assistant', content: conversationSummary }
      ],
      extracted_data: extractedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: extractedData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('POST /ai/extract-biomarkers error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI extraction failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Fetch webpage content from URL
 */
async function fetchWebpageContent(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Simple HTML to text conversion - extract useful content
    let text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Convert common elements
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Truncate to reasonable length
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '...[truncated]';
    }

    return { success: true, content: text };
  } catch (error: any) {
    console.error('URL fetch error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/v1/ai/extract-supplements
 * Extract supplements from image or text (e.g., supplement bottle photos, receipt text)
 */
router.post('/extract-supplements', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { image_base64, text_content, source_type, product_url } = req.body;

    if (!image_base64 && !text_content) {
      return res.status(400).json({
        success: false,
        error: 'Either image_base64 or text_content is required',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch URL content if provided
    let urlContent = '';
    let fetchedUrl = product_url;
    if (product_url) {
      console.log('Fetching URL content:', product_url);
      const fetchResult = await fetchWebpageContent(product_url);
      if (fetchResult.success && fetchResult.content) {
        urlContent = `\n\n--- Product Page Content (from ${product_url}) ---\n${fetchResult.content}\n--- End Product Page ---\n`;
        console.log('URL fetch successful, content length:', fetchResult.content.length);
      } else {
        console.log('URL fetch failed:', fetchResult.error);
      }
    }

    // Combine text content with URL content
    let actualContent = text_content || '';
    if (urlContent) {
      actualContent = actualContent + urlContent;
    }

    const systemPrompt = `You are a precise supplement extraction assistant. Your job is to extract supplement information from images (bottles, labels, receipts), text, or product URLs.

## Rules:
1. ONLY extract data that is explicitly visible/stated in the source
2. For URLs, infer product details from the URL pattern and common knowledge about the product
3. Return structured JSON
4. Include confidence scores for each extraction (lower for URL-based inference)
5. Extract as much detail as available (brand, dose, servings, serving size, price, etc.)
6. For well-known supplements, include WHY someone takes it and HOW it works (mechanism)
7. Suggest optimal timing based on the supplement type

## Timing Values (use exactly these):
- wake_up: First thing upon waking (e.g., thyroid meds, probiotics)
- am: Morning with breakfast (e.g., B vitamins, iron)
- lunch: Midday with food (e.g., some fat-soluble vitamins)
- pm: Afternoon (e.g., energy supplements before 3pm)
- dinner: Evening with dinner (e.g., fish oil, CoQ10)
- before_bed: Before sleep (e.g., magnesium, melatonin)

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "supplements": [
    {
      "name": "string - supplement name (e.g., Vitamin D3, Fish Oil, Krill Oil)",
      "brand": "string or null - brand name if visible",
      "dose": "string or null - dose as displayed (e.g., '5000 IU', '1000mg', '1 softgel')",
      "intake_form": "string or null - physical form (capsule, powder, liquid, spray, gummy, patch)",
      "serving_size": number or null - how many units (capsules, scoops, etc.) per serving (e.g., 2 for "2 capsules per serving"),
      "dose_per_serving": number or null,
      "dose_unit": "string or null - unit only (IU, mg, mcg, g)",
      "servings_per_container": number or null,
      "price": number or null - total price in dollars if visible,
      "price_per_serving": number or null - calculated if price and servings known,
      "purchase_url": "string or null - if URL was provided",
      "category": "string - vitamin_mineral, amino_protein, herb_botanical, probiotic, other",
      "timing": "string or null - MUST be one of: wake_up, am, lunch, pm, dinner, before_bed",
      "timing_reason": "string or null - WHY take at this time (e.g., 'cognitive benefits during waking hours')",
      "frequency": "string or null - daily, twice_daily, three_times_daily, weekly, as_needed",
      "reason": "string or null - WHY take this supplement (key benefits, nutrients provided)",
      "mechanism": "string or null - HOW it works (mechanism of action, absorption, etc.)",
      "goal_categories": ["string array - related health goals like Cardiovascular, Cognitive, Skin, Energy, Sleep, etc."],
      "confidence": number between 0 and 1
    }
  ],
  "source_info": {
    "store_name": "string or null - if from receipt",
    "purchase_date": "YYYY-MM-DD or null",
    "total_items": number
  },
  "extraction_notes": "string - any important notes about the extraction"
}`;

    let userContent: any[];

    if (source_type === 'image' && image_base64) {
      const sizeMB = getBase64SizeMB(image_base64);
      const isPDF = isPDFBase64(image_base64);

      console.log(`Processing supplement file: ${sizeMB.toFixed(2)}MB, isPDF: ${isPDF}`);

      // For PDFs or large files, extract text instead of using vision
      if (isPDF || sizeMB > MAX_IMAGE_SIZE_MB) {
        if (isPDF) {
          console.log('PDF detected, extracting text...');
          const pdfResult = await extractTextFromPDF(image_base64);

          if (!pdfResult.success) {
            return res.status(400).json({
              success: false,
              error: pdfResult.error || 'Failed to process PDF',
              error_type: 'PDF_PROCESSING_ERROR',
              timestamp: new Date().toISOString()
            });
          }

          console.log(`Extracted text from ${pdfResult.pageCount} pages${pdfResult.truncated ? ' (truncated)' : ''}`);

          userContent = [
            {
              type: 'text',
              text: `Extract all supplement information from this text. Return the data as JSON.\n\n---\n${pdfResult.text}\n---${pdfResult.truncated ? '\n\n(Note: Document was truncated due to length)' : ''}`
            }
          ];
        } else {
          return res.status(400).json({
            success: false,
            error: `File too large (${sizeMB.toFixed(1)}MB). Maximum for images is ${MAX_IMAGE_SIZE_MB}MB. Try a smaller image or PDF.`,
            error_type: 'FILE_TOO_LARGE',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Regular image processing with vision API (resize if needed)
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
        let base64Data = image_base64;

        if (image_base64.startsWith('data:image/png')) {
          mediaType = 'image/png';
          base64Data = image_base64.split(',')[1];
        } else if (image_base64.startsWith('data:image/jpeg') || image_base64.startsWith('data:image/jpg')) {
          mediaType = 'image/jpeg';
          base64Data = image_base64.split(',')[1];
        } else if (image_base64.startsWith('data:image/webp')) {
          mediaType = 'image/webp';
          base64Data = image_base64.split(',')[1];
        } else if (image_base64.startsWith('data:')) {
          base64Data = image_base64.split(',')[1];
        }

        // Resize image if needed
        const resizedData = await resizeImageIfNeeded(base64Data, mediaType);

        userContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: resizedData
            }
          },
          {
            type: 'text',
            text: 'Extract all supplement information from this image (bottle label, receipt, or list). Return the data as JSON.'
          }
        ];
      }
    } else {
      // Text-based extraction (including URL content)
      const hasUrlContent = product_url && urlContent.length > 0;
      userContent = [
        {
          type: 'text',
          text: hasUrlContent
            ? `Extract all supplement information from this product page content. Return the data as JSON.\n\n${actualContent}`
            : `Extract all supplement information from this text. Return the data as JSON.\n\n---\n${actualContent}\n---`
        }
      ];
    }

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ]
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    let extractedData: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        raw_response: responseText,
        timestamp: new Date().toISOString()
      });
    }

    // Second pass: Check confidence and do web search for low-confidence fields
    const CONFIDENCE_THRESHOLD = 0.8;
    const REQUIRED_FIELDS = ['brand', 'price', 'servings_per_container', 'serving_size', 'intake_form', 'dose_per_serving', 'dose_unit', 'category'];

    if (extractedData.supplements && extractedData.supplements.length > 0) {
      const supplement = extractedData.supplements[0];
      const baseConfidence = supplement.confidence || 0.5;

      // Initialize per-field confidence tracking
      if (!supplement.field_confidence) {
        supplement.field_confidence = {};
      }

      // Check which fields are missing or low confidence
      const lowConfidenceFields: string[] = [];
      for (const field of REQUIRED_FIELDS) {
        const value = supplement[field];
        const fieldConf = supplement.field_confidence[field] || baseConfidence;

        if (value === undefined || value === null || value === '' || fieldConf < CONFIDENCE_THRESHOLD) {
          lowConfidenceFields.push(field);
          // Mark initial confidence
          supplement.field_confidence[field] = value ? fieldConf : 0;
        } else {
          supplement.field_confidence[field] = fieldConf;
        }
      }

      console.log(`First pass confidence: ${baseConfidence}, low-confidence fields: ${lowConfidenceFields.join(', ') || 'none'}`);

      // If any fields need improvement, try web search
      if (lowConfidenceFields.length > 0) {
        const perplexityKey = await getPerplexityKey(userId);

        if (perplexityKey) {
          console.log(`Starting web search for ${lowConfidenceFields.length} fields...`);
          const searchResult = await webSearchForSupplement(
            perplexityKey,
            supplement.name || text_content?.split(' ')[0] || 'supplement',
            supplement.brand || null,
            lowConfidenceFields
          );

          if (searchResult.success && searchResult.data) {
            console.log('Web search successful, merging results...');
            const webData = searchResult.data;
            const webConfidence = webData.confidence || 0.85;

            // Merge web search results into supplement data
            for (const field of lowConfidenceFields) {
              const webValue = webData[field];
              const currentValue = supplement[field];
              const currentConf = supplement.field_confidence[field] || 0;

              // Only update if web value is valid and better than current
              if (webValue !== undefined && webValue !== null && webValue !== '') {
                // Update value if empty or web confidence is higher
                if (!currentValue || currentConf < webConfidence) {
                  supplement[field] = webValue;
                  supplement.field_confidence[field] = webConfidence;
                  console.log(`Updated ${field}: ${webValue} (conf: ${webConfidence})`);
                }
              } else {
                // Mark as not found (-1)
                supplement.field_confidence[field] = -1;
              }
            }

            // Update extraction notes
            extractedData.extraction_notes = (extractedData.extraction_notes || '') +
              ` | Web search filled ${lowConfidenceFields.filter(f => supplement.field_confidence[f] > 0).length}/${lowConfidenceFields.length} fields`;
          } else {
            console.log('Web search failed or returned no data:', searchResult.error);
            // Mark unfilled fields as not found
            for (const field of lowConfidenceFields) {
              if (!supplement[field] || supplement.field_confidence[field] === 0) {
                supplement.field_confidence[field] = -1;
              }
            }
          }
        } else {
          console.log('No Perplexity key available, skipping web search');
          // Mark unfilled fields as not found
          for (const field of lowConfidenceFields) {
            if (!supplement[field] || supplement.field_confidence[field] === 0) {
              supplement.field_confidence[field] = -1;
            }
          }
        }
      }

      // Update the supplement in the array
      extractedData.supplements[0] = supplement;
    }

    // Store conversation for reference
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'supplement_extraction',
      messages: [
        { role: 'user', content: source_type === 'image' ? '[Image uploaded]' : text_content?.substring(0, 500) },
        { role: 'assistant', content: responseText }
      ],
      extracted_data: extractedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: extractedData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('POST /ai/extract-supplements error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI extraction failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/extract-supplements/stream
 * Extract supplements with real-time progress streaming (SSE)
 */
router.post('/extract-supplements/stream', async (req: Request, res: Response): Promise<any> => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendProgress = (step: string, data: any) => {
    res.write(`data: ${JSON.stringify({ step, ...data })}\n\n`);
  };

  try {
    const userId = req.user!.id;
    const { text_content, source_type, product_url } = req.body;

    if (!text_content) {
      sendProgress('error', { message: 'text_content is required' });
      res.end();
      return;
    }

    const REQUIRED_FIELDS = ['brand', 'price', 'servings_per_container', 'serving_size', 'intake_form', 'dose_per_serving', 'dose_unit', 'category'];

    // Step 1: URL scraping
    let urlContent = '';
    if (product_url) {
      sendProgress('scraping', { message: `Fetching ${product_url}...` });
      const fetchResult = await fetchWebpageContent(product_url);
      if (fetchResult.success && fetchResult.content) {
        urlContent = `\n\n--- Product Page Content ---\n${fetchResult.content}\n--- End ---\n`;
        sendProgress('scraping_done', { message: 'URL scraped successfully', contentLength: fetchResult.content.length });
      } else {
        sendProgress('scraping_failed', { message: fetchResult.error || 'Could not fetch URL' });
      }
    }

    // Step 2: AI Analysis
    sendProgress('analyzing', { message: 'AI analyzing supplement data...', fields: REQUIRED_FIELDS.map(f => ({ key: f, status: 'pending' })) });

    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      sendProgress('error', { message: 'No Anthropic API key configured' });
      res.end();
      return;
    }

    const actualContent = (text_content || '') + urlContent;
    const systemPrompt = `You are a supplement extraction assistant. Extract: brand, price, servings_per_container, serving_size (how many units per serving, e.g., 2 capsules = 1 serving), intake_form (capsule/powder/liquid/spray/gummy/patch), dose_per_serving, dose_unit (mg/g/mcg/IU/ml/CFU), category (vitamin_mineral/amino_protein/herb_botanical/probiotic/other). Return JSON with field_confidence for each field (0-1).`;

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: 1000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Extract supplement info:\n${actualContent}\nReturn JSON with supplements array including field_confidence object.` }]
    });

    const responseText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let extractedData: any = { supplements: [] };
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    }

    // Process first pass results
    if (extractedData.supplements && extractedData.supplements.length > 0) {
      const supplement = extractedData.supplements[0];
      const baseConfidence = supplement.confidence || 0.7;

      if (!supplement.field_confidence) {
        supplement.field_confidence = {};
      }

      // Check each field
      const lowConfidenceFields: string[] = [];
      const fieldStatuses: Array<{ key: string; status: string; confidence?: number }> = [];

      for (const field of REQUIRED_FIELDS) {
        const value = supplement[field];
        const fieldConf = supplement.field_confidence[field] || (value ? baseConfidence : 0);
        supplement.field_confidence[field] = fieldConf;

        if (!value || fieldConf < 0.8) {
          lowConfidenceFields.push(field);
          fieldStatuses.push({ key: field, status: 'missing', confidence: fieldConf });
        } else {
          fieldStatuses.push({ key: field, status: 'found', confidence: fieldConf });
        }
      }

      sendProgress('first_pass_done', {
        message: `First pass: found ${REQUIRED_FIELDS.length - lowConfidenceFields.length}/${REQUIRED_FIELDS.length} fields`,
        fields: fieldStatuses,
        supplement
      });

      // Step 3: Web search if needed
      if (lowConfidenceFields.length > 0) {
        sendProgress('web_search', {
          message: `Searching web for ${lowConfidenceFields.length} missing fields...`,
          missingFields: lowConfidenceFields
        });

        const perplexityKey = await getPerplexityKey(userId);
        if (perplexityKey) {
          const searchResult = await webSearchForSupplement(
            perplexityKey,
            supplement.name || text_content?.split(' ')[0] || 'supplement',
            supplement.brand || null,
            lowConfidenceFields
          );

          if (searchResult.success && searchResult.data) {
            const webData = searchResult.data;
            const webConfidence = webData.confidence || 0.95;

            // Update fields one by one with progress
            for (const field of lowConfidenceFields) {
              const webValue = webData[field];
              if (webValue !== undefined && webValue !== null && webValue !== '') {
                supplement[field] = webValue;
                supplement.field_confidence[field] = webConfidence;
                sendProgress('field_found', { field, value: webValue, confidence: webConfidence, source: 'web_search' });
              } else {
                supplement.field_confidence[field] = -1;
                sendProgress('field_not_found', { field });
              }
            }
          } else {
            sendProgress('web_search_failed', { message: searchResult.error || 'Web search failed' });
            for (const field of lowConfidenceFields) {
              supplement.field_confidence[field] = -1;
            }
          }
        } else {
          sendProgress('web_search_skipped', { message: 'No Perplexity API key' });
        }
      }

      extractedData.supplements[0] = supplement;
    }

    // Final result
    sendProgress('complete', { data: extractedData });
    res.end();

  } catch (error: any) {
    console.error('POST /ai/extract-supplements/stream error:', error);
    sendProgress('error', { message: error.message || 'Extraction failed' });
    res.end();
  }
});

/**
 * POST /api/v1/ai/extract-equipment
 * Extract equipment/devices from text description
 */
router.post('/extract-equipment', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { text_content } = req.body;

    if (!text_content) {
      return res.status(400).json({
        success: false,
        error: 'text_content is required',
        timestamp: new Date().toISOString()
      });
    }

    const systemPrompt = `You are a precise health equipment extraction assistant. Your job is to extract health device and equipment information from text descriptions.

## Rules:
1. Extract ALL equipment/devices mentioned in the text
2. Parse detailed information about each device including usage protocols
3. Include confidence scores for each extraction
4. Extract as much detail as available (brand, model, purpose, usage timing, etc.)

## Category Values (use exactly these):
- lllt: Low-Level Light Therapy devices (red light, infrared, laser helmets)
- microneedling: Derma pens, microneedling devices
- sleep: Sleep tracking/optimization devices (Eight Sleep, Oura, etc.)
- skincare: LED masks, facial devices
- recovery: Massage guns, compression, cold therapy
- other: Any other health equipment

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "equipment": [
    {
      "name": "string - device name (e.g., iRestore Elite, Eight Sleep Pod)",
      "brand": "string or null - brand name",
      "model": "string or null - model name/number",
      "category": "string - MUST be one of: lllt, microneedling, sleep, skincare, recovery, other",
      "purpose": "string - what the device is used for",
      "specs": {} - object with key specifications (e.g., {"diodes": 500, "wavelength": "triple"}),
      "usage_frequency": "string or null - how often used (Daily, Weekly, 3-5x/week, etc.)",
      "usage_timing": "string or null - when to use (Morning, Evening, After shower, etc.)",
      "usage_duration": "string or null - how long per session",
      "usage_protocol": "string or null - detailed usage instructions/notes",
      "contraindications": "string or null - warnings, things to avoid",
      "confidence": number between 0 and 1
    }
  ],
  "extraction_notes": "string - any important notes about the extraction"
}`;

    const userContent: Array<{ type: 'text'; text: string }> = [
      {
        type: 'text',
        text: `Extract all health equipment and device information from this text. Return the data as JSON.\n\n---\n${text_content}\n---`
      }
    ];

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent
        }
      ]
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    let extractedData: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response',
        raw_response: responseText,
        timestamp: new Date().toISOString()
      });
    }

    // Store conversation for reference
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'equipment_extraction',
      messages: [
        { role: 'user', content: text_content?.substring(0, 500) },
        { role: 'assistant', content: responseText }
      ],
      extracted_data: extractedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: extractedData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('POST /ai/extract-equipment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI extraction failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/analyze-biomarker-trend
 * Analyze a biomarker's trend and provide personalized insights
 */
router.post('/analyze-biomarker-trend', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarkerName, currentValue, unit, optimalRange, trendDirection, percentChange, history } = req.body;

    if (!biomarkerName || currentValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'biomarkerName and currentValue are required',
        timestamp: new Date().toISOString()
      });
    }

    // Get biomarker reference data for context
    const { match } = findBiomarkerMatch(biomarkerName);

    // Build history summary
    const historyText = history && history.length > 0
      ? history.map((h: any) => `${h.date}: ${h.value} ${unit}`).join('\n  ')
      : 'No historical data available';

    const systemPrompt = `You are a knowledgeable health analyst specializing in biomarker interpretation. Provide personalized, actionable insights about the user's biomarker data.

## Guidelines:
1. Be specific about what the values mean for THIS user
2. Consider the trend direction and what it indicates
3. Provide 2-3 actionable suggestions if appropriate
4. Mention when professional consultation would be valuable
5. Be encouraging but honest about any concerns
6. Keep response concise (150-250 words)

## Response Format:
Write in a conversational, supportive tone. Use paragraphs, not bullet points. Focus on what matters most to the user.`;

    const userPrompt = `Analyze my ${biomarkerName} data:

**Current Value:** ${currentValue} ${unit}
**Optimal Range:** ${optimalRange.low} - ${optimalRange.high} ${unit}
**Trend:** ${trendDirection === 'up' ? 'Increasing' : trendDirection === 'down' ? 'Decreasing' : 'Stable'}${percentChange !== null ? ` (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}% change)` : ''}

**Reading History:**
  ${historyText}

${match?.detailedDescription ? `\n**About ${biomarkerName}:** ${match.detailedDescription}` : ''}
${match?.trendPreference ? `\n**Health Direction:** ${match.trendPreference === 'lower_is_better' ? 'Lower values are generally better' : match.trendPreference === 'higher_is_better' ? 'Higher values are generally better' : 'Staying within optimal range is ideal'}` : ''}

Please provide a personalized analysis of my ${biomarkerName} status and trend.`;

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    // Store conversation for reference
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'biomarker_analysis',
      messages: [
        { role: 'user', content: `Analyze ${biomarkerName}: ${currentValue} ${unit}`, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        analysis: responseText
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('POST /ai/analyze-biomarker-trend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/chat
 * Health assistant chat
 */
router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { message, context, include_user_data, biomarker_name, title } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
        timestamp: new Date().toISOString()
      });
    }

    // Optionally fetch user's health data for context
    let userContext = '';
    if (include_user_data) {
      // If biomarker_name is specified, get all readings for that specific biomarker
      let biomarkersQuery = supabase
        .from('biomarkers')
        .select('name, value, unit, date_tested')
        .eq('user_id', userId)
        .order('date_tested', { ascending: true }); // Chronological for trend analysis

      if (biomarker_name) {
        // Get all readings for this specific biomarker (for trend analysis)
        biomarkersQuery = biomarkersQuery.eq('name', biomarker_name);
      } else {
        // General query - get recent biomarkers across all types
        biomarkersQuery = biomarkersQuery.limit(20);
      }

      const { data: biomarkers } = await biomarkersQuery;

      // Fetch active supplements
      const { data: supplements } = await supabase
        .from('supplements')
        .select('name, dose, timing, frequency')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Fetch active goals
      const { data: goals } = await supabase
        .from('goals')
        .select('title, target_biomarker, current_value, target_value, direction')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (biomarkers?.length || supplements?.length || goals?.length) {
        userContext = `\n\n## User's Health Data (for context):\n`;
        if (biomarkers?.length) {
          const biomarkerLabel = biomarker_name
            ? `### ${biomarker_name} History (${biomarkers.length} readings):`
            : '### Recent Biomarkers:';
          userContext += `\n${biomarkerLabel}\n${JSON.stringify(biomarkers, null, 2)}`;
        }
        if (supplements?.length) {
          userContext += `\n### Active Supplements:\n${JSON.stringify(supplements, null, 2)}`;
        }
        if (goals?.length) {
          userContext += `\n### Active Health Goals:\n${JSON.stringify(goals, null, 2)}`;
        }
      }
    }

    const systemPrompt = `You are a knowledgeable health assistant for the Singularity health tracking app. You help users understand their biomarkers, supplements, and health protocols.

## Guidelines:
1. Provide evidence-based information when possible
2. Always recommend consulting healthcare providers for medical decisions
3. Be helpful but not preachy - users are health-conscious adults
4. Explain complex health concepts clearly
5. When discussing biomarkers, reference normal and optimal ranges if known
6. For supplement recommendations, mention potential interactions and timing

## Important:
- You are NOT providing medical advice - you're providing health information
- Always encourage users to work with their healthcare team
- Be conversational and supportive${userContext}`;

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: 0.7, // Slightly higher for more natural conversation
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    // Store conversation
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: context || 'general',
      biomarker_name: biomarker_name || null,
      title: title || (biomarker_name ? `Chat about ${biomarker_name}` : null),
      messages: [
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        response: responseText,
        context: context || 'general'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('POST /ai/chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Chat failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/chat/stream
 * Health assistant chat with streaming response (SSE)
 */
router.post('/chat/stream', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { message, context, include_user_data, biomarker_name, title } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
        timestamp: new Date().toISOString()
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Optionally fetch user's health data for context
    let userContext = '';
    if (include_user_data) {
      // If biomarker_name is specified, get all readings for that specific biomarker
      let biomarkersQuery = supabase
        .from('biomarkers')
        .select('name, value, unit, date_tested')
        .eq('user_id', userId)
        .order('date_tested', { ascending: true }); // Chronological for trend analysis

      if (biomarker_name) {
        // Get all readings for this specific biomarker (for trend analysis)
        biomarkersQuery = biomarkersQuery.eq('name', biomarker_name);
      } else {
        // General query - get recent biomarkers across all types
        biomarkersQuery = biomarkersQuery.limit(20);
      }

      const { data: biomarkers } = await biomarkersQuery;

      const { data: supplements } = await supabase
        .from('supplements')
        .select('name, dose, timing, frequency')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (biomarkers?.length || supplements?.length) {
        userContext = `\n\n## User's Health Data:\n`;
        if (biomarkers?.length) {
          const biomarkerLabel = biomarker_name
            ? `### ${biomarker_name} History (${biomarkers.length} readings):`
            : '### Recent Biomarkers:';
          userContext += `\n${biomarkerLabel}\n${JSON.stringify(biomarkers, null, 2)}`;
        }
        if (supplements?.length) {
          userContext += `\n### Active Supplements:\n${JSON.stringify(supplements, null, 2)}`;
        }
      }
    }

    const systemPrompt = `You are Alex, a friendly AI health assistant for Singularity. Be concise and helpful.

## Your Style:
- Brief, direct answers (2-4 sentences for simple questions)
- Friendly but not overly chatty
- Use bullet points for lists
- Don't over-explain unless asked

## For "Update my data" requests:
Simply ask: "What would you like to update?" and wait for their response.
Options you can help with: add new reading, edit existing value, or delete an entry.

## Guidelines:
- Evidence-based information when possible
- Always recommend consulting healthcare providers for medical decisions
- Be helpful but concise${userContext}`;

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    if (!anthropic) {
      res.write(`data: ${JSON.stringify({ error: 'No Anthropic API key configured' })}\n\n`);
      res.end();
      return;
    }

    let fullResponse = '';

    // Stream the response
    const stream = await anthropic.messages.stream({
      model: AI_CONFIG.model,
      max_tokens: 1024, // Shorter for chat
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();

    // Save conversation asynchronously (don't block response)
    (async () => {
      try {
        await supabase.from('ai_conversations').insert({
          user_id: userId,
          context: context || 'general',
          biomarker_name: biomarker_name || null,
          title: title || (biomarker_name ? `Chat about ${biomarker_name}` : null),
          messages: [
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    })();

  } catch (error: any) {
    console.error('POST /ai/chat/stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Chat stream failed',
        timestamp: new Date().toISOString()
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/v1/ai/conversations
 * Get user's AI conversation history
 */
router.get('/conversations', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { context, biomarker_name, limit = 20 } = req.query;

    let query = supabase
      .from('ai_conversations')
      .select('id, context, biomarker_name, title, messages, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (context) {
      query = query.eq('context', context);
    }

    if (biomarker_name) {
      query = query.eq('biomarker_name', biomarker_name);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: data || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GET /ai/conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/protocol-analysis
 * Enhanced Protocol AI analysis with root cause correlation
 * Fetches all relevant context and provides comprehensive analysis
 */
router.post('/protocol-analysis', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { biomarkerName, question } = req.body;

    if (!biomarkerName && !question) {
      return res.status(400).json({
        success: false,
        error: 'Either biomarkerName or question is required',
        timestamp: new Date().toISOString()
      });
    }

    // Import supplement interactions dynamically
    const { getSupplementsAffectingBiomarker, getRelatedBiomarkers, getHepatotoxicSupplements } = await import('../data/supplementInteractions');

    // Get biomarker reference data
    const { match: biomarkerRef } = biomarkerName ? findBiomarkerMatch(biomarkerName) : { match: null };

    // Fetch all relevant data in parallel
    const [
      biomarkerHistory,
      relatedBiomarkersData,
      activeSupplements,
      recentChanges,
      activeEquipment,
      userGoals
    ] = await Promise.all([
      // Get biomarker history
      biomarkerName ? supabase
        .from('biomarkers')
        .select('name, value, unit, date_tested')
        .eq('user_id', userId)
        .ilike('name', `%${biomarkerName}%`)
        .order('date_tested', { ascending: true })
        .limit(20) : { data: null },

      // Get related biomarkers if we have a biomarker name
      biomarkerName ? (async () => {
        const relatedNames = getRelatedBiomarkers(biomarkerName);
        if (relatedNames.length === 0) return { data: [] };

        const { data } = await supabase
          .from('biomarkers')
          .select('name, value, unit, date_tested')
          .eq('user_id', userId)
          .order('date_tested', { ascending: false });

        // Filter to related biomarkers and get latest for each
        const latestByName = new Map();
        for (const b of data || []) {
          const isRelated = relatedNames.some(r =>
            b.name.toLowerCase().includes(r.toLowerCase()) ||
            r.toLowerCase().includes(b.name.toLowerCase())
          );
          if (isRelated && !latestByName.has(b.name)) {
            latestByName.set(b.name, b);
          }
        }
        return { data: Array.from(latestByName.values()) };
      })() : { data: [] },

      // Get active supplements
      supabase
        .from('supplements')
        .select('name, dose, timing, frequency, category, created_at')
        .eq('user_id', userId)
        .eq('is_active', true),

      // Get recent protocol changes (90 days)
      supabase
        .from('change_log')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false })
        .limit(30),

      // Get active equipment
      supabase
        .from('equipment')
        .select('name, category, usage_frequency, usage_timing')
        .eq('user_id', userId)
        .eq('is_active', true),

      // Get active goals
      supabase
        .from('goals')
        .select('title, target_biomarker, current_value, target_value, direction')
        .eq('user_id', userId)
        .eq('status', 'active')
    ]);

    // Get supplements that could affect this biomarker
    const potentialInteractions = biomarkerName
      ? getSupplementsAffectingBiomarker(biomarkerName)
      : [];

    // Check which interactions match user's active supplements
    const relevantInteractions = potentialInteractions.filter(interaction =>
      activeSupplements.data?.some(supp =>
        supp.name.toLowerCase().includes(interaction.supplement.toLowerCase()) ||
        interaction.supplement.toLowerCase().includes(supp.name.toLowerCase())
      )
    );

    // Get hepatotoxic supplements if analyzing liver markers
    const liverMarkers = ['alt', 'ast', 'ggt', 'bilirubin', 'alkaline phosphatase'];
    const isLiverMarker = biomarkerName && liverMarkers.some(m =>
      biomarkerName.toLowerCase().includes(m)
    );
    const hepatotoxicSupplements = isLiverMarker ? getHepatotoxicSupplements() : [];

    // Build comprehensive context for the AI
    const contextParts: string[] = [];

    // Biomarker data
    if (biomarkerHistory.data && biomarkerHistory.data.length > 0) {
      const history = biomarkerHistory.data;
      const latest = history[history.length - 1];
      const oldest = history[0];
      const percentChange = oldest.value !== 0
        ? ((latest.value - oldest.value) / oldest.value * 100).toFixed(1)
        : 'N/A';

      contextParts.push(`## ${biomarkerName} Data
**Current Value:** ${latest.value} ${latest.unit} (${latest.date_tested})
**Trend:** ${history.length} readings over time, ${percentChange}% change
**History:** ${history.map(h => `${h.date_tested}: ${h.value}`).join(' → ')}
${biomarkerRef?.optimalRange ? `**Optimal Range:** ${biomarkerRef.optimalRange.low}-${biomarkerRef.optimalRange.high} ${latest.unit}` : ''}
${biomarkerRef?.trendPreference ? `**Health Direction:** ${biomarkerRef.trendPreference === 'lower_is_better' ? 'Lower is better' : biomarkerRef.trendPreference === 'higher_is_better' ? 'Higher is better' : 'Range is optimal'}` : ''}
${biomarkerRef?.detailedDescription ? `**About:** ${biomarkerRef.detailedDescription}` : ''}`);
    }

    // Related biomarkers
    if (relatedBiomarkersData.data && relatedBiomarkersData.data.length > 0) {
      contextParts.push(`## Related Biomarkers (Latest Values)
${relatedBiomarkersData.data.map((b: any) => `- **${b.name}:** ${b.value} ${b.unit} (${b.date_tested})`).join('\n')}`);
    }

    // Active supplements with potential interactions
    if (activeSupplements.data && activeSupplements.data.length > 0) {
      contextParts.push(`## Active Supplements (${activeSupplements.data.length} total)
${activeSupplements.data.map((s: any) => `- ${s.name} ${s.dose || ''} ${s.timing ? `@ ${s.timing}` : ''} ${s.frequency ? `(${s.frequency})` : ''}`).join('\n')}`);
    }

    // Relevant supplement-biomarker interactions
    if (relevantInteractions.length > 0) {
      contextParts.push(`## Supplement-Biomarker Interactions (User is taking these)
${relevantInteractions.map(i => `- **${i.supplement}** → ${i.effect}s ${biomarkerName} (${i.strength} effect)
  Mechanism: ${i.mechanism}
  Evidence: ${i.evidence}${i.notes ? `\n  Note: ${i.notes}` : ''}`).join('\n\n')}`);
    }

    // Hepatotoxic supplements warning
    if (isLiverMarker && hepatotoxicSupplements.length > 0) {
      const userHepato = hepatotoxicSupplements.filter(h =>
        activeSupplements.data?.some(s =>
          s.name.toLowerCase().includes(h.supplement.toLowerCase()) ||
          h.aliases.some(a => s.name.toLowerCase().includes(a.toLowerCase()))
        )
      );
      if (userHepato.length > 0) {
        contextParts.push(`## ⚠️ Hepatotoxicity Considerations
User is taking supplements with known liver effects:
${userHepato.map(h => `- **${h.supplement}** (${h.risk} risk)`).join('\n')}`);
      }
    }

    // Recent protocol changes
    if (recentChanges.data && recentChanges.data.length > 0) {
      contextParts.push(`## Recent Protocol Changes (Last 90 Days)
${recentChanges.data.map((c: any) => `- ${c.date.split('T')[0]}: **${c.change_type.toUpperCase()}** ${c.item_type} "${c.item_name}"${c.previous_value ? ` (was: ${c.previous_value})` : ''}${c.new_value ? ` → ${c.new_value}` : ''}${c.reason ? ` — ${c.reason}` : ''}`).join('\n')}`);
    }

    // Active equipment
    if (activeEquipment.data && activeEquipment.data.length > 0) {
      contextParts.push(`## Active Equipment/Devices
${activeEquipment.data.map((e: any) => `- ${e.name} (${e.category}) - ${e.usage_frequency || 'frequency not set'}`).join('\n')}`);
    }

    // Health goals
    if (userGoals.data && userGoals.data.length > 0) {
      contextParts.push(`## Active Health Goals
${userGoals.data.map((g: any) => `- ${g.title}${g.target_biomarker ? ` (${g.direction} ${g.target_biomarker}: ${g.current_value} → ${g.target_value})` : ''}`).join('\n')}`);
    }

    const fullContext = contextParts.join('\n\n');

    // Protocol AI System Prompt
    const systemPrompt = `You are Protocol AI, a Functional Health Advisor with access to the user's complete health ecosystem. Your purpose is to provide ROOT CAUSE analysis—connecting biomarkers, supplements, lifestyle factors, and interventions.

## Analysis Philosophy

1. **Root Cause Over Symptom Chasing**: When a biomarker moves, ask "What changed in the system?" Consider:
   - Recent protocol changes (supplements started/stopped, dose adjustments, timing shifts)
   - Supplement interactions and cumulative load (especially hepatic)
   - Timeline correlations (when did the trend start vs. what changed then?)

2. **Holistic Pattern Recognition**: Never analyze in isolation. Cross-reference:
   - Related markers (e.g., ALT rising → check AST, GGT, bilirubin)
   - Upstream causes (e.g., liver enzymes → supplement load, protein intake, keto)
   - Downstream effects

3. **Evidence-Weighted Interpretation**:
   - Strong evidence: Cite it confidently
   - Mechanistic plausibility: "This could explain..."
   - Speculation: Flag clearly as hypothesis

## Response Format

Provide analysis in this structure:

**Pattern Recognition**
What the data shows and related marker context.

**Most Likely Contributors (Ranked)**
1. [Most likely] — Why it fits
2. [Second likely] — Supporting evidence
3. [Consider] — Less likely but worth noting

**Protective Factors**
What's working in the user's favor.

**Recommendations**
- *Investigate:* What additional data would help
- *Adjust:* Protocol modifications to consider
- *Monitor:* When to retest, what to watch

**Connect to Goals**
How this relates to user's stated health objectives.

## Tone
- Direct and substantive
- Explain mechanisms (the "why")
- Acknowledge uncertainty
- Encourage professional consultation for medical decisions`;

    const userMessage = question || `Analyze my ${biomarkerName} data and provide root cause insights. What in my protocol might be affecting this marker?`;

    console.log('Protocol Analysis: Starting API call for biomarker:', biomarkerName);
    console.log('Protocol Analysis: Context length:', fullContext.length);

    // Get user's Anthropic API key
    const anthropic = await getAnthropicClient(userId);
    console.log('Protocol Analysis: Got Anthropic client:', !!anthropic);
    if (!anthropic) {
      return res.status(400).json({
        success: false,
        error: 'No Anthropic API key configured. Please add your API key in Settings > AI Keys.',
        error_type: 'NO_API_KEY',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Protocol Analysis: Calling Anthropic API...');
    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${fullContext}\n\n---\n\n**User Question:** ${userMessage}`
        }
      ]
    });
    console.log('Protocol Analysis: Got response from Anthropic');
    console.log('Protocol Analysis: Response content blocks:', response.content.length);

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    console.log('Protocol Analysis: Response text length:', responseText.length);

    // Store conversation
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'protocol_analysis',
      messages: [
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
      ],
      extracted_data: {
        biomarkerName,
        relevantInteractions: relevantInteractions.length,
        recentChanges: recentChanges.data?.length || 0,
        activeSupplements: activeSupplements.data?.length || 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Build hepatotoxicity warnings for liver markers
    const hepatotoxicityWarnings: Array<{ supplement: string; risk: string }> = [];
    if (isLiverMarker && hepatotoxicSupplements.length > 0) {
      for (const h of hepatotoxicSupplements) {
        const userTakes = activeSupplements.data?.some(s =>
          s.name.toLowerCase().includes(h.supplement.toLowerCase()) ||
          h.aliases.some(a => s.name.toLowerCase().includes(a.toLowerCase()))
        );
        if (userTakes) {
          hepatotoxicityWarnings.push({
            supplement: h.supplement,
            risk: h.risk
          });
        }
      }
    }

    const responseData = {
      success: true,
      data: {
        analysis: responseText,
        correlations: {
          supplements: relevantInteractions.map(i => ({
            name: i.supplement,
            effect: i.effect,
            strength: i.strength,
            mechanism: i.mechanism
          })),
          changes: (recentChanges.data || []).slice(0, 10).map((c: any) => ({
            item_name: c.item_name,
            change_type: c.change_type,
            changed_at: c.date
          })),
          relatedBiomarkers: (relatedBiomarkersData.data || []).map((b: any) => ({
            name: b.name,
            value: b.value,
            unit: b.unit,
            status: 'measured' // Could add status calculation here
          }))
        },
        hepatotoxicityWarnings: hepatotoxicityWarnings.length > 0 ? hepatotoxicityWarnings : undefined,
        context: {
          biomarker: biomarkerHistory.data?.[biomarkerHistory.data.length - 1] || null,
          activeSupplements: activeSupplements.data?.length || 0,
          relevantInteractions: relevantInteractions.length,
          recentChanges: recentChanges.data?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    };
    console.log('Protocol Analysis: Sending response with keys:', Object.keys(responseData.data));
    res.json(responseData);
    console.log('Protocol Analysis: Response sent successfully');
  } catch (error: any) {
    console.error('POST /ai/protocol-analysis error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({
      success: false,
      error: error.message || 'Protocol analysis failed',
      error_type: error.constructor?.name,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
