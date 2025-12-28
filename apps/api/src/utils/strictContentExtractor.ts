import OpenAI from 'openai';

export interface StrictExtractionOptions {
  /** The source content to extract from */
  sourceContent: string;
  /** Instructions for what to extract/how to organize */
  extractionInstructions: string;
  /** Optional format instructions (e.g., "Return as JSON with fields: x, y, z") */
  formatInstructions?: string;
  /** Optional existing content to merge with */
  existingContent?: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Optional validation function to check the response */
  validateResponse?: (response: string, sourceContent: string) => boolean;
}

export interface ExtractionResult {
  success: boolean;
  extractedContent?: string;
  error?: string;
  validationPassed?: boolean;
}

/**
 * Shared utility for strict content extraction that prevents AI hallucination
 * 
 * @example
 * const result = await strictContentExtractor({
 *   sourceContent: "Product specs: Weight: 5kg, Color: Blue",
 *   extractionInstructions: "Extract product specifications",
 *   formatInstructions: "Format as bullet points"
 * });
 */
export async function strictContentExtractor(
  options: StrictExtractionOptions
): Promise<ExtractionResult> {
  const {
    sourceContent,
    extractionInstructions,
    formatInstructions,
    existingContent,
    maxTokens = 2000,
    validateResponse
  } = options;

  // Initialize OpenAI (assumes OPENAI_API_KEY is in environment)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Build the strict extraction prompt
  const systemPrompt = `You are a STRICT CONTENT EXTRACTOR. Critical rules:
- ONLY use text that appears between SOURCE_START and SOURCE_END markers
- DO NOT add ANY information from your training data or general knowledge
- DO NOT make inferences, assumptions, or add context
- DO NOT add units, explanations, or clarifications unless explicitly in source
- You are a COPY EDITOR only - reorganize existing text, never create new content
- Every piece of information in your output MUST be traceable to the source`;

  let userPrompt = `${extractionInstructions}

SOURCE_START
${sourceContent}
SOURCE_END`;

  // Add existing content context if provided
  if (existingContent) {
    userPrompt = `EXISTING CONTENT TO UPDATE:
${existingContent}

${userPrompt}

Merge the source content with existing content. Keep existing information that isn't contradicted by the source.`;
  }

  // Add format instructions if provided
  if (formatInstructions) {
    userPrompt += `\n\nFORMAT REQUIREMENTS:\n${formatInstructions}`;
  }

  userPrompt += `\n\nREMEMBER: Output ONLY information found in the source. If something is not in the source, do not include it.`;

  try {
    // Call OpenAI with very low temperature for deterministic extraction
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Very low for strict extraction
      max_tokens: maxTokens
    });

    const extractedContent = response.choices[0]?.message?.content || '';

    if (!extractedContent) {
      return {
        success: false,
        error: 'No content extracted from source'
      };
    }

    // Default validation: check that key phrases from response exist in source
    const defaultValidation = (response: string, source: string): boolean => {
      // For shipping labels, we need to handle shorter data like order numbers, tracking numbers, names
      // Extract significant phrases (3+ characters to catch shorter data)
      const keyPhrases = response.match(/[A-Za-z0-9\-#]{3,}/g) || [];
      
      if (keyPhrases.length === 0) return true; // Empty response is valid
      
      // Count how many key phrases appear in source
      let foundCount = 0;
      const samplesToCheck = Math.min(keyPhrases.length, 15);
      
      for (let i = 0; i < samplesToCheck; i++) {
        const phrase = keyPhrases[i].toLowerCase();
        const sourceText = source.toLowerCase();
        
        // Check direct match
        if (sourceText.includes(phrase)) {
          foundCount++;
        } else {
          // For numbers, check if they appear with different formatting (spaces, dashes)
          const numberOnly = phrase.replace(/[^0-9]/g, '');
          if (numberOnly.length >= 6 && sourceText.includes(numberOnly)) {
            foundCount++;
          }
        }
      }
      
      // For shipping labels, be more lenient - require at least 20% match for shorter data
      // If we have very few phrases, require at least one match
      const requiredRatio = samplesToCheck <= 3 ? 0.34 : 0.2;
      return (foundCount / samplesToCheck) >= requiredRatio;
    };

    // Run validation
    const validationFunction = validateResponse || defaultValidation;
    const validationPassed = validationFunction(extractedContent, sourceContent);

    if (!validationPassed) {
      console.warn('[StrictContentExtractor] Validation failed - possible hallucination detected');
      return {
        success: false,
        error: 'Content validation failed - AI may have added information not in source',
        validationPassed: false
      };
    }

    return {
      success: true,
      extractedContent,
      validationPassed: true
    };

  } catch (error) {
    console.error('[StrictContentExtractor] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown extraction error'
    };
  }
}

/**
 * Validate that content only contains information from source
 * Can be used as a custom validation function
 */
export function strictSourceValidation(response: string, source: string): boolean {
  // More strict validation - check for common hallucination patterns
  const suspiciousPhrases = [
    'typically', 'usually', 'commonly', 'often', 'generally',
    'standard', 'professional', 'recommended', 'best practice',
    'industry standard', 'certified', 'approximately', 'roughly',
    'should be', 'must be', 'needs to be', 'requires'
  ];
  
  // Check if response contains suspicious phrases not in source
  for (const phrase of suspiciousPhrases) {
    if (response.toLowerCase().includes(phrase) && 
        !source.toLowerCase().includes(phrase)) {
      console.warn(`[StrictValidation] Found suspicious phrase not in source: "${phrase}"`);
      return false;
    }
  }
  
  // Check that significant content from response exists in source
  const contentWords = response.match(/\b[A-Za-z0-9]{4,}\b/g) || [];
  const uniqueWords = [...new Set(contentWords.map(w => w.toLowerCase()))];
  
  let matchCount = 0;
  for (const word of uniqueWords.slice(0, 20)) { // Check first 20 unique words
    if (source.toLowerCase().includes(word)) {
      matchCount++;
    }
  }
  
  // Require at least 60% of unique words to be in source
  return uniqueWords.length === 0 || (matchCount / Math.min(uniqueWords.length, 20)) >= 0.6;
}

/**
 * Extract structured data from source content
 * Useful for extracting specific fields or Q&A format
 */
export async function extractStructuredContent(
  sourceContent: string,
  structure: Record<string, string>
): Promise<ExtractionResult> {
  const fields = Object.entries(structure)
    .map(([field, description]) => `- ${field}: ${description}`)
    .join('\n');

  const formatInstructions = `Return as JSON with exactly these fields:
${fields}

For each field, ONLY include information if it's explicitly mentioned in the source.
If a field's information is not in the source, set it to null.`;

  return strictContentExtractor({
    sourceContent,
    extractionInstructions: 'Extract information for each specified field',
    formatInstructions,
    validateResponse: (response, source) => {
      try {
        const parsed = JSON.parse(response);
        // Validate each field
        for (const [field, value] of Object.entries(parsed)) {
          if (value && typeof value === 'string' && value.length > 0) {
            if (!strictSourceValidation(value as string, source)) {
              return false;
            }
          }
        }
        return true;
      } catch {
        return false;
      }
    }
  });
}