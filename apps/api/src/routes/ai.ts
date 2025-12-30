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
    const { image_base64, text_content, source_type }: ExtractBiomarkersRequest = req.body;

    if (!image_base64 && !text_content) {
      return res.status(400).json({
        success: false,
        error: 'Either image_base64 or text_content is required',
        timestamp: new Date().toISOString()
      });
    }

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

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "biomarkers": [
    {
      "name": "string - standardized name from known list, or exact name if no match",
      "extracted_name": "string - original name as shown on report",
      "value": number,
      "unit": "string - exact unit",
      "reference_range_low": number or null,
      "reference_range_high": number or null,
      "optimal_range_low": number or null,
      "optimal_range_high": number or null,
      "category": "string - blood, metabolic, hormone, vitamin, mineral, lipid, thyroid, liver, kidney, inflammation, other",
      "confidence": number between 0 and 1,
      "flag": "string or null - 'low', 'high', 'critical_low', 'critical_high', or null if normal"
    }
  ],
  "lab_info": {
    "lab_name": "string or null",
    "test_date": "YYYY-MM-DD or null",
    "patient_name": "string or null - only if clearly visible"
  },
  "extraction_notes": "string - any important notes about the extraction"
}`;

    let userContent: any[];

    if (source_type === 'image' && image_base64) {
      const sizeMB = getBase64SizeMB(image_base64);
      const isPDF = isPDFBase64(image_base64);

      console.log(`Processing file: ${sizeMB.toFixed(2)}MB, isPDF: ${isPDF}`);

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

          // Handle scanned PDFs with images
          if (pdfResult.isScanned && pdfResult.images && pdfResult.images.length > 0) {
            console.log(`Processing ${pdfResult.images.length} scanned pages with Vision API`);

            // Build content array with all images
            userContent = [];
            for (let i = 0; i < pdfResult.images.length; i++) {
              userContent.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: pdfResult.images[i]
                }
              });
            }
            userContent.push({
              type: 'text',
              text: `Extract all biomarker data from these ${pdfResult.images.length} lab report pages. Return the data as JSON.${pdfResult.truncated ? '\n\n(Note: Only showing first ' + pdfResult.images.length + ' of ' + pdfResult.pageCount + ' pages)' : ''}`
            });
          } else {
            // Text-based PDF
            console.log(`Extracted text from ${pdfResult.pageCount} pages${pdfResult.truncated ? ' (truncated)' : ''}`);

            userContent = [
              {
                type: 'text',
                text: `Extract all biomarker data from this lab report. Return the data as JSON.\n\n---\n${pdfResult.text}\n---${pdfResult.truncated ? '\n\n(Note: Document was truncated due to length)' : ''}`
              }
            ];
          }
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
            text: 'Extract all biomarker data from this lab report image. Return the data as JSON.'
          }
        ];
      }
    } else {
      userContent = [
        {
          type: 'text',
          text: `Extract all biomarker data from this lab report text. Return the data as JSON.\n\n---\n${text_content}\n---`
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
      extractedData.biomarkers = extractedData.biomarkers.map((biomarker: any) => {
        const { match, confidence: matchConfidence } = findBiomarkerMatch(biomarker.name);

        if (match) {
          // Update confidence based on our matching
          const finalConfidence = Math.max(biomarker.confidence || 0, matchConfidence);

          // Use reference name if different
          const standardizedName = match.name;

          // Fill in missing reference ranges from our data
          const referenceRangeLow = biomarker.reference_range_low ?? match.referenceRange.low;
          const referenceRangeHigh = biomarker.reference_range_high ?? match.referenceRange.high;
          const optimalRangeLow = biomarker.optimal_range_low ?? match.optimalRange.low;
          const optimalRangeHigh = biomarker.optimal_range_high ?? match.optimalRange.high;

          // Calculate flag based on value vs ranges
          let flag = biomarker.flag;
          if (!flag && biomarker.value !== undefined) {
            if (biomarker.value < referenceRangeLow * 0.8) {
              flag = 'critical_low';
            } else if (biomarker.value < referenceRangeLow) {
              flag = 'low';
            } else if (biomarker.value > referenceRangeHigh * 1.2) {
              flag = 'critical_high';
            } else if (biomarker.value > referenceRangeHigh) {
              flag = 'high';
            }
          }

          return {
            ...biomarker,
            name: standardizedName,
            extracted_name: biomarker.extracted_name || biomarker.name,
            category: biomarker.category || match.category,
            reference_range_low: referenceRangeLow,
            reference_range_high: referenceRangeHigh,
            optimal_range_low: optimalRangeLow,
            optimal_range_high: optimalRangeHigh,
            confidence: finalConfidence,
            match_confidence: matchConfidence,
            flag
          };
        }

        return {
          ...biomarker,
          extracted_name: biomarker.extracted_name || biomarker.name,
          match_confidence: 0
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

    const systemPrompt = `You are a precise supplement extraction assistant. Your job is to extract supplement information from images (bottles, labels, receipts) or text.

## Rules:
1. ONLY extract data that is explicitly visible in the source
2. NEVER guess or infer values that aren't clearly stated
3. Return structured JSON
4. Include confidence scores for each extraction
5. Extract as much detail as available (brand, dose, servings, price, etc.)

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "supplements": [
    {
      "name": "string - supplement name (e.g., Vitamin D3, Fish Oil)",
      "brand": "string or null - brand name if visible",
      "dose": "string or null - dose as displayed (e.g., '5000 IU', '1000mg')",
      "dose_per_serving": number or null,
      "dose_unit": "string or null - unit only (IU, mg, mcg, g)",
      "servings_per_container": number or null,
      "price": number or null - price in dollars if visible,
      "category": "string - vitamin, mineral, amino_acid, herb, probiotic, omega, antioxidant, hormone, enzyme, other",
      "timing": "string or null - morning, afternoon, evening, with_meals, empty_stomach, before_bed",
      "frequency": "string or null - daily, twice_daily, three_times_daily, weekly, as_needed",
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
          text: `Extract all supplement information from this text. Return the data as JSON.\n\n---\n${text_content}\n---`
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
