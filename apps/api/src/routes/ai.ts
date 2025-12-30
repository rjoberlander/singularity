import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase';
import { AI_CONFIG } from '../config/workspace';
import { ExtractBiomarkersRequest, HealthChatRequest, ExtractedBiomarkerData } from '../types';
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import { extractTextFromPDF, isPDFBase64, getBase64SizeMB } from '../utils/pdfProcessor';
import { BIOMARKER_REFERENCE, findBiomarkerMatch, getBiomarkerNames } from '../data/biomarkerReference';

const router = Router();
const MAX_IMAGE_SIZE_MB = 10; // Max size for image/vision API calls

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

    let userContent: any[] = [];

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
              userContent.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: pageImage
                }
              });
            }
          } else if (pdfResult.text) {
            // Text-based PDF - add as text content
            userContent.push({
              type: 'text',
              text: `--- PDF Document ---\n${pdfResult.text}\n--- End PDF ---`
            });
          }
        } else if (sizeMB > MAX_IMAGE_SIZE_MB) {
          return res.status(400).json({
            success: false,
            error: `File too large (${sizeMB.toFixed(1)}MB). Maximum for images is ${MAX_IMAGE_SIZE_MB}MB. Try a smaller image or PDF.`,
            error_type: 'FILE_TOO_LARGE',
            timestamp: new Date().toISOString()
          });
        } else {
          // Regular image - add to content
          const { mediaType, data } = processBase64Image(imageData);
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: data
            }
          });
        }
      }
    }

    // Add text content if provided
    if (text_content) {
      userContent.push({
        type: 'text',
        text: `--- Text Content ---\n${text_content}\n--- End Text ---`
      });
    }

    // Add final instruction
    const imageCount = userContent.filter((c: any) => c.type === 'image').length;
    const hasText = userContent.some((c: any) => c.type === 'text');
    let instruction = 'Extract all biomarker data from ';
    if (imageCount > 0 && hasText) {
      instruction += `these ${imageCount} image${imageCount > 1 ? 's' : ''} and text content`;
    } else if (imageCount > 0) {
      instruction += imageCount > 1 ? `these ${imageCount} lab report images` : 'this lab report image';
    } else {
      instruction += 'this lab report text';
    }
    instruction += '. Return the data as JSON.';

    userContent.push({
      type: 'text',
      text: instruction
    });

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

    // Extract text from response
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    // Parse JSON from response
    let extractedData: ExtractedBiomarkerData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        // Fix common JSON issues
        // Remove trailing commas before ] or }
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
        // Fix any unclosed brackets/braces at the end (truncated response)
        const openBraces = (jsonStr.match(/{/g) || []).length;
        const closeBraces = (jsonStr.match(/}/g) || []).length;
        const openBrackets = (jsonStr.match(/\[/g) || []).length;
        const closeBrackets = (jsonStr.match(/\]/g) || []).length;
        // Add missing closing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonStr += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonStr += '}';
        }
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
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      context: 'biomarker_extraction',
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
    console.error('POST /ai/extract-biomarkers error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI extraction failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/ai/extract-supplements
 * Extract supplements from image or text (e.g., supplement bottle photos, receipt text)
 */
router.post('/extract-supplements', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { image_base64, text_content, source_type } = req.body;

    if (!image_base64 && !text_content) {
      return res.status(400).json({
        success: false,
        error: 'Either image_base64 or text_content is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if this is a URL input
    let isUrlInput = false;
    let actualContent = text_content;
    if (text_content && text_content.startsWith('[URL]:')) {
      isUrlInput = true;
      const url = text_content.replace('[URL]:', '').trim();
      // For URL inputs, instruct AI to identify the product from the URL pattern
      actualContent = `Product URL: ${url}\n\nPlease identify the supplement product from this URL. Common patterns:\n- Amazon: /dp/ or /gp/product/ followed by ASIN\n- iHerb: product name in URL path\n- Other retailers: product name usually in the URL\n\nExtract what you can determine from the URL pattern (brand, product name, etc). Set confidence lower (0.6-0.8) since we're inferring from URL.`;
    }

    const systemPrompt = `You are a precise supplement extraction assistant. Your job is to extract supplement information from images (bottles, labels, receipts), text, or product URLs.

## Rules:
1. ONLY extract data that is explicitly visible/stated in the source
2. For URLs, infer product details from the URL pattern and common knowledge about the product
3. Return structured JSON
4. Include confidence scores for each extraction (lower for URL-based inference)
5. Extract as much detail as available (brand, dose, servings, price, etc.)
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
      "dose_per_serving": number or null,
      "dose_unit": "string or null - unit only (IU, mg, mcg, g)",
      "servings_per_container": number or null,
      "price": number or null - total price in dollars if visible,
      "price_per_serving": number or null - calculated if price and servings known,
      "purchase_url": "string or null - if URL was provided",
      "category": "string - vitamin, mineral, amino_acid, herb, probiotic, omega, antioxidant, hormone, enzyme, other",
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
        // Regular image processing with vision API
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

        userContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: 'Extract all supplement information from this image (bottle label, receipt, or list). Return the data as JSON.'
          }
        ];
      }
    } else {
      userContent = [
        {
          type: 'text',
          text: isUrlInput
            ? `${actualContent}\n\nReturn the supplement data as JSON.`
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
 * POST /api/v1/ai/chat
 * Health assistant chat
 */
router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { message, context, include_user_data }: HealthChatRequest = req.body;

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
      // Fetch recent biomarkers
      const { data: biomarkers } = await supabase
        .from('biomarkers')
        .select('name, value, unit, date_tested')
        .eq('user_id', userId)
        .order('date_tested', { ascending: false })
        .limit(20);

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
          userContext += `\n### Recent Biomarkers:\n${JSON.stringify(biomarkers, null, 2)}`;
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
 * GET /api/v1/ai/conversations
 * Get user's AI conversation history
 */
router.get('/conversations', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { context, limit = 20 } = req.query;

    let query = supabase
      .from('ai_conversations')
      .select('id, context, messages, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (context) {
      query = query.eq('context', context);
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

export default router;
