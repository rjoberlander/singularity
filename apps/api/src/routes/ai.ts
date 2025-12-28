import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase';
import { AI_CONFIG } from '../config/workspace';
import { ExtractBiomarkersRequest, HealthChatRequest, ExtractedBiomarkerData } from '../types';

const router = Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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

    const systemPrompt = `You are a precise biomarker extraction assistant. Your job is to extract health biomarker data from lab reports.

## Rules:
1. ONLY extract data that is explicitly visible in the source
2. NEVER guess or infer values that aren't clearly stated
3. Return structured JSON
4. Include confidence scores for each extraction
5. Flag any values outside normal reference ranges

## Output Format:
Return ONLY valid JSON in this exact format:
{
  "biomarkers": [
    {
      "name": "string - exact name as shown",
      "value": number,
      "unit": "string - exact unit",
      "reference_range_low": number or null,
      "reference_range_high": number or null,
      "optimal_range_low": number or null,
      "optimal_range_high": number or null,
      "category": "string - blood, metabolic, hormone, vitamin, mineral, lipid, thyroid, liver, kidney, other",
      "confidence": number between 0 and 1
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
      // Determine media type from base64 header or default to jpeg
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
    } else {
      userContent = [
        {
          type: 'text',
          text: `Extract all biomarker data from this lab report text. Return the data as JSON.\n\n---\n${text_content}\n---`
        }
      ];
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
