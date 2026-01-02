/**
 * Universal Product Enrichment Service
 *
 * Single service for enriching product data across all types:
 * - Supplements
 * - Facial Products
 * - Equipment
 *
 * Features:
 * - URL scraping with consistent quality
 * - Type-specific AI prompts and field definitions
 * - Type-specific data normalization
 * - Optional web search fallback
 */

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// Types
// =============================================================================

export type ProductType = 'supplement' | 'facial_product' | 'equipment';

export interface EnrichmentRequest {
  product_name: string;
  brand?: string;
  product_url?: string;
  product_type: ProductType;
  existing_data?: Record<string, any>;
}

export interface EnrichmentResult {
  success: boolean;
  data?: Record<string, any>;
  field_confidence?: Record<string, number>;
  error?: string;
}

export interface StreamProgressEvent {
  step: string;
  message?: string;
  field?: string;
  value?: any;
  confidence?: number;
  source?: string;
  product?: Record<string, any>;
  fields?: Array<{ key: string; status: string; confidence?: number }>;
  [key: string]: any;
}

// =============================================================================
// Field Configurations by Product Type
// =============================================================================

const FIELD_CONFIGS: Record<ProductType, {
  required: string[];
  prompt: string;
  normalize: (data: any) => any;
}> = {
  supplement: {
    required: ['brand', 'price', 'servings_per_container', 'serving_size', 'intake_form', 'dose_per_serving', 'dose_unit', 'category'],
    prompt: `You are a supplement product data extraction assistant. Given product information (name, URL content, etc.), extract these fields:
- brand: The brand/manufacturer name
- price: The price in USD (number only, no currency symbol)
- servings_per_container: Total number of servings in the container
- serving_size: How many units per serving (e.g., "2 capsules" means serving_size=2)
- intake_form: One of: capsule, tablet, softgel, gummy, powder, liquid, spray, patch
- dose_per_serving: The dosage amount per serving (number only)
- dose_unit: One of: mg, g, mcg, IU, ml, CFU
- category: One of: vitamin_mineral, amino_protein, herb_botanical, probiotic, other
- purchase_url: Amazon or retailer URL if found

IMPORTANT: Extract price and size from the page content. Look for:
- Price patterns: "$XX.XX", "Price: $XX", etc.
- Size patterns: "XX Count", "XX Capsules", "XX Servings"

Return JSON with a "product" object containing these fields and a "field_confidence" object (0-1 for each field).`,
    normalize: normalizeSupplementData,
  },

  facial_product: {
    required: ['brand', 'price', 'size_amount', 'size_unit', 'application_form', 'category', 'usage_amount', 'usage_unit'],
    prompt: `You are a skincare/facial product data extraction assistant. Given product information (name, URL content, etc.), extract these fields:
- brand: The brand/manufacturer name
- price: The price in USD (number only, no currency symbol)
- size_amount: The product size as a number (e.g., 200 for "200ml")
- size_unit: One of: ml, oz, g
- application_form: One of: cream, gel, oil, liquid, foam
- category: One of: cleanser, toner, serum, moisturizer, sunscreen, other
- usage_amount: Amount per application (number). ALWAYS provide a value - use typical amounts if not explicitly stated:
  * Serums/oils: 2-3 drops
  * Toners/essences: 1-2 ml or 2-3 pumps
  * Cleansers: 1-2 pumps or pea-sized amount (use 1)
  * Moisturizers/creams: pea-sized amount (use 1)
  * Sunscreens: 2 finger lengths worth (~1 ml)
- usage_unit: One of: ml, pumps, drops, pea-sized. Match to product type:
  * Serums/oils with droppers: drops
  * Pump bottles: pumps
  * Tubes/jars (creams): pea-sized
  * Liquids: ml
- purchase_url: Amazon or retailer URL if found
- key_ingredients: Array of key active ingredients if found

IMPORTANT:
- Extract price and size from the page content
- ALWAYS provide usage_amount and usage_unit - estimate based on product type if not explicitly stated
- Price patterns: "$XX.XX", "Price: $XX", etc.
- Size patterns: "XX ml", "XX oz", "XX g", "XX FL OZ"

Return JSON with a "product" object containing these fields and a "field_confidence" object (0-1 for each field).`,
    normalize: normalizeFacialProductData,
  },

  equipment: {
    required: ['brand', 'price', 'category'],
    prompt: `You are a health equipment/device data extraction assistant. Given product information (name, URL content, etc.), extract these fields:
- brand: The brand/manufacturer name
- model: The model name/number
- price: The price in USD (number only, no currency symbol)
- category: One of: lllt, microneedling, sleep, skincare, recovery, other
- purchase_url: Amazon or retailer URL if found
- specs: Object with key specifications

IMPORTANT: Extract price from the page content. Look for:
- Price patterns: "$XX.XX", "Price: $XX", etc.

Return JSON with a "product" object containing these fields and a "field_confidence" object (0-1 for each field).`,
    normalize: normalizeEquipmentData,
  },
};

// =============================================================================
// URL Scraping
// =============================================================================

export async function fetchWebpageContent(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Enhanced HTML to text conversion
    let text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      // Convert common elements
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' | ')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&dollar;/g, '$')
      .replace(/&#\d+;/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Extract price patterns specifically (keep them prominent)
    const priceMatches = html.match(/\$\d+\.?\d{0,2}/g) || [];
    const sizeMatches = html.match(/\d+\s*(ml|oz|g|fl\s*oz|count|capsules?|tablets?|softgels?)/gi) || [];

    // Prepend extracted data for AI to find more easily
    let extractedHints = '';
    if (priceMatches.length > 0) {
      extractedHints += `\n[PRICES FOUND ON PAGE: ${[...new Set(priceMatches)].slice(0, 5).join(', ')}]\n`;
    }
    if (sizeMatches.length > 0) {
      extractedHints += `[SIZES FOUND ON PAGE: ${[...new Set(sizeMatches)].slice(0, 5).join(', ')}]\n`;
    }

    text = extractedHints + text;

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

// =============================================================================
// Data Normalization Functions
// =============================================================================

function normalizeSupplementData(data: any): any {
  if (!data) return data;
  const normalized = { ...data };

  // Form values that might end up in dose_unit by mistake
  const formValues = ['capsule', 'capsules', 'tablet', 'tablets', 'softgel', 'softgels', 'gummy', 'gummies', 'powder', 'liquid', 'spray', 'patch'];
  const validUnits = ['mg', 'g', 'mcg', 'iu', 'ml', 'cfu', 'billion cfu'];

  // Fix dose_unit if it contains a form value
  if (normalized.dose_unit) {
    const unitLower = String(normalized.dose_unit).toLowerCase();
    if (formValues.includes(unitLower)) {
      if (!normalized.intake_form) {
        normalized.intake_form = unitLower.replace(/s$/, '');
      }
      normalized.dose_unit = null;
    }
    if (unitLower.includes('afu') || unitLower.includes('cfu')) {
      normalized.dose_unit = 'CFU';
    }
  }

  // Normalize intake_form
  if (normalized.intake_form) {
    const formLower = String(normalized.intake_form).toLowerCase();
    if (formLower === 'capsules') normalized.intake_form = 'capsule';
    if (formLower === 'tablets') normalized.intake_form = 'tablet';
    if (formLower === 'softgels') normalized.intake_form = 'softgel';
    if (formLower === 'gummies') normalized.intake_form = 'gummy';
  }

  // Ensure numeric fields are numbers
  if (normalized.price && typeof normalized.price === 'string') {
    normalized.price = parseFloat(normalized.price.replace(/[$,]/g, '')) || null;
  }
  if (normalized.servings_per_container && typeof normalized.servings_per_container === 'string') {
    normalized.servings_per_container = parseInt(normalized.servings_per_container) || null;
  }
  if (normalized.dose_per_serving && typeof normalized.dose_per_serving === 'string') {
    normalized.dose_per_serving = parseFloat(normalized.dose_per_serving) || null;
  }

  return normalized;
}

function normalizeFacialProductData(data: any): any {
  if (!data) return data;
  const normalized = { ...data };

  // Normalize application_form
  if (normalized.application_form) {
    normalized.application_form = String(normalized.application_form).toLowerCase().replace(/\s+/g, '_');
  }

  // Normalize category
  if (normalized.category) {
    normalized.category = String(normalized.category).toLowerCase().replace(/\s+/g, '_');
  }

  // Normalize size_unit
  if (normalized.size_unit) {
    const unitLower = String(normalized.size_unit).toLowerCase();
    if (unitLower.includes('fl') && unitLower.includes('oz')) {
      normalized.size_unit = 'oz';
    } else if (unitLower === 'milliliter' || unitLower === 'milliliters') {
      normalized.size_unit = 'ml';
    } else if (unitLower === 'ounce' || unitLower === 'ounces') {
      normalized.size_unit = 'oz';
    } else if (unitLower === 'gram' || unitLower === 'grams') {
      normalized.size_unit = 'g';
    }
  }

  // Normalize usage_unit
  if (normalized.usage_unit) {
    const usageUnitLower = String(normalized.usage_unit).toLowerCase().replace(/s$/, ''); // remove trailing 's'
    if (usageUnitLower === 'pump') {
      normalized.usage_unit = 'pumps';
    } else if (usageUnitLower === 'drop') {
      normalized.usage_unit = 'drops';
    } else if (usageUnitLower === 'pea-size' || usageUnitLower === 'pea size' || usageUnitLower === 'pea') {
      normalized.usage_unit = 'pea-sized';
    } else if (['ml', 'pumps', 'drops', 'pea-sized'].includes(usageUnitLower)) {
      normalized.usage_unit = usageUnitLower;
    }
  }

  // Ensure numeric fields are numbers
  if (normalized.price && typeof normalized.price === 'string') {
    normalized.price = parseFloat(normalized.price.replace(/[$,]/g, '')) || null;
  }
  if (normalized.size_amount && typeof normalized.size_amount === 'string') {
    normalized.size_amount = parseFloat(normalized.size_amount) || null;
  }
  if (normalized.usage_amount && typeof normalized.usage_amount === 'string') {
    normalized.usage_amount = parseFloat(normalized.usage_amount) || null;
  }

  return normalized;
}

function normalizeEquipmentData(data: any): any {
  if (!data) return data;
  const normalized = { ...data };

  // Normalize category
  if (normalized.category) {
    normalized.category = String(normalized.category).toLowerCase().replace(/\s+/g, '_');
  }

  // Ensure numeric fields are numbers
  if (normalized.price && typeof normalized.price === 'string') {
    normalized.price = parseFloat(normalized.price.replace(/[$,]/g, '')) || null;
  }

  return normalized;
}

// =============================================================================
// Main Enrichment Function (Streaming)
// =============================================================================

// Web search for missing product data using Perplexity
async function webSearchForProduct(
  perplexityKey: string,
  productName: string,
  brand: string | null,
  productType: ProductType,
  missingFields: string[]
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const fieldDescriptions: Record<string, string> = {
    // Supplement fields
    brand: 'brand/manufacturer name',
    price: 'current retail price in USD (number only, e.g., 29.99)',
    servings_per_container: 'total servings per bottle (number)',
    serving_size: 'units per serving (e.g., 2 if "take 2 capsules")',
    intake_form: 'physical form: capsule, tablet, softgel, powder, liquid, gummy, or patch',
    dose_per_serving: 'active ingredient amount per serving (number only)',
    dose_unit: 'measurement unit: mg, g, mcg, IU, ml, or CFU',
    category: 'product category',
    // Facial product fields
    size_amount: 'product size as a number (e.g., 200 for 200ml)',
    size_unit: 'size unit: ml, oz, or g',
    application_form: 'application form: cream, gel, oil, liquid, or foam',
    usage_amount: 'recommended amount per application (e.g., 1 for 1 pump, 2 for 2 drops)',
    usage_unit: 'usage unit: ml, pumps, drops, or pea-sized',
  };

  const productTypeLabel = productType === 'facial_product' ? 'skincare product' : productType;
  const fieldsToSearch = missingFields.includes('price') ? missingFields : ['price', ...missingFields];
  const brandSuffix = brand && !productName.toLowerCase().includes(brand.toLowerCase()) ? ` ${brand}` : '';
  const searchQuery = `"${productName}${brandSuffix}" price USD buy online. What is the price? ${fieldsToSearch.map(f => fieldDescriptions[f] || f).join(', ')}.`;

  try {
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
            content: `You are a product price researcher. Find the retail PRICE of products.

Search ANY retailer - Amazon, Walmart, Target, Ulta, Sephora, iHerb, brand websites, etc.

When you find a price mentioned ANYWHERE, extract it:
- "$24.99" → price: 24.99
- "costs $15" → price: 15
- "US$29.95" → price: 29.95
- "for 12.99" → price: 12.99

Return ONLY valid JSON:
{
  "brand": "string or null",
  "price": number (e.g., 24.99) - FIND THIS,
  "size_amount": number or null,
  "size_unit": "ml|oz|g or null",
  "application_form": "cream|gel|oil|liquid|foam or null",
  "category": "string or null",
  "usage_amount": number or null (recommended amount per use, e.g., 1 for 1 pump),
  "usage_unit": "ml|pumps|drops|pea-sized or null",
  "servings_per_container": number or null,
  "serving_size": number or null,
  "intake_form": "capsule|tablet|softgel|powder|liquid|gummy|patch or null",
  "dose_per_serving": number or null,
  "dose_unit": "mg|g|mcg|IU|ml|CFU or null",
  "source_url": "URL where you found the price",
  "confidence": 0.0-1.0
}`
          },
          { role: 'user', content: searchQuery }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error('[WebSearch] Perplexity API error:', response.status);
      return { success: false, error: `Perplexity API error: ${response.status}` };
    }

    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content || '';
    console.log('[WebSearch] Query:', searchQuery);
    console.log('[WebSearch] Perplexity response:', content.substring(0, 500));

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[WebSearch] Parsed data:', JSON.stringify(parsed));
      return { success: true, data: parsed };
    }
    console.error('[WebSearch] No JSON found in response');
    return { success: false, error: 'No JSON in response' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Web search failed';
    return { success: false, error: message };
  }
}

export async function enrichProductStream(
  request: EnrichmentRequest,
  anthropic: Anthropic,
  onProgress: (event: StreamProgressEvent) => void,
  perplexityKey?: string | null
): Promise<EnrichmentResult> {
  const config = FIELD_CONFIGS[request.product_type];
  if (!config) {
    return { success: false, error: `Unknown product type: ${request.product_type}` };
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: URL scraping
    let urlContent = '';
    if (request.product_url) {
      onProgress({ step: 'scraping', message: `Fetching ${request.product_url}...` });
      const fetchResult = await fetchWebpageContent(request.product_url);
      if (fetchResult.success && fetchResult.content) {
        urlContent = `\n\n--- Product Page Content ---\n${fetchResult.content}\n--- End Product Page ---\n`;
        onProgress({ step: 'scraping_done', message: 'URL scraped successfully', contentLength: fetchResult.content.length });
      } else {
        onProgress({ step: 'scraping_failed', message: fetchResult.error || 'Could not fetch URL' });
      }
    }

    // Step 2: Build context
    const productContext = `Product Name: ${request.product_name}${request.brand ? `\nBrand: ${request.brand}` : ''}${request.product_url ? `\nProduct URL: ${request.product_url}` : ''}`;
    const fullContent = productContext + urlContent;

    // Step 3: AI Analysis
    onProgress({
      step: 'analyzing',
      message: `AI analyzing ${request.product_type} data...`,
      fields: config.required.map(f => ({ key: f, status: 'pending' }))
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.1,
      system: config.prompt,
      messages: [{
        role: 'user',
        content: `Extract product information from the following:\n\n${fullContent}\n\nReturn JSON with "product" object and "field_confidence" object.`
      }]
    });

    const responseText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    let extractedData: any = {};
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Get the product data (might be nested or flat)
    let productData = extractedData.product || extractedData.products?.[0] || extractedData;
    let fieldConfidence = extractedData.field_confidence || productData.field_confidence || {};

    // Normalize the data
    productData = config.normalize(productData);

    // Stream field results
    const baseConfidence = productData.confidence || 0.8;
    const lowConfidenceFields: string[] = [];
    const fieldStatuses: Array<{ key: string; status: string; confidence?: number }> = [];

    for (const field of config.required) {
      const value = productData[field];
      const fieldConf = fieldConfidence[field] || (value !== undefined && value !== null && value !== '' ? baseConfidence : 0);

      if (!value || value === '' || fieldConf < 0.5) {
        lowConfidenceFields.push(field);
        fieldStatuses.push({ key: field, status: 'missing', confidence: fieldConf });
        onProgress({ step: 'field_not_found', field, confidence: fieldConf, source: 'ai_analysis' });
      } else {
        fieldStatuses.push({ key: field, status: 'found', confidence: fieldConf });
        onProgress({ step: 'field_found', field, value, confidence: fieldConf, source: 'ai_analysis' });
      }
      await delay(150);
    }

    // Send first pass done
    onProgress({
      step: 'first_pass_done',
      message: `Found ${config.required.length - lowConfidenceFields.length}/${config.required.length} fields`,
      product: productData,
      fields: fieldStatuses,
      lowConfidenceFields
    });

    // Step 4: Web search fallback for missing fields (especially price)
    if (lowConfidenceFields.length > 0 && perplexityKey) {
      onProgress({
        step: 'web_search',
        message: `Searching web for ${lowConfidenceFields.length} missing fields...`,
        missingFields: lowConfidenceFields
      });

      const searchResult = await webSearchForProduct(
        perplexityKey,
        request.product_name,
        request.brand || null,
        request.product_type,
        lowConfidenceFields
      );

      if (searchResult.success && searchResult.data) {
        const webData = searchResult.data;
        const webConfidence = (webData.confidence as number) || 0.9;

        // Update missing fields with web search results
        for (const field of lowConfidenceFields) {
          const webValue = webData[field];
          if (webValue !== undefined && webValue !== null && webValue !== '') {
            productData[field] = webValue;
            fieldConfidence[field] = webConfidence;
            onProgress({ step: 'field_found', field, value: webValue, confidence: webConfidence, source: 'web_search' });
          }
          await delay(100);
        }

        // Save source_url as purchase_url if no purchase_url exists
        if (webData.source_url && !productData.purchase_url) {
          productData.purchase_url = webData.source_url;
          fieldConfidence.purchase_url = webConfidence;
          onProgress({ step: 'field_found', field: 'purchase_url', value: webData.source_url, confidence: webConfidence, source: 'web_search' });
        }

        // Normalize again after web search updates
        productData = config.normalize(productData);

        onProgress({
          step: 'web_search_done',
          message: 'Web search complete',
          product: productData
        });
      } else {
        onProgress({
          step: 'web_search_failed',
          message: searchResult.error || 'Web search failed'
        });
      }
    } else if (lowConfidenceFields.length > 0 && !perplexityKey) {
      onProgress({
        step: 'web_search_skipped',
        message: 'No Perplexity API key - skipping web search'
      });
    }

    // Return result
    return {
      success: true,
      data: productData,
      field_confidence: fieldConfidence
    };

  } catch (error: any) {
    console.error('Product enrichment error:', error);
    return { success: false, error: error.message || 'Enrichment failed' };
  }
}

// =============================================================================
// Batch Enrichment (for multiple products)
// =============================================================================

export async function enrichProductBatch(
  products: Array<{ name: string; brand?: string; url?: string; index: number }>,
  productType: ProductType,
  anthropic: Anthropic,
  onProductProgress: (index: number, event: StreamProgressEvent) => void,
  onProductComplete: (index: number, result: EnrichmentResult) => void
): Promise<void> {
  for (const product of products) {
    const result = await enrichProductStream(
      {
        product_name: product.name,
        brand: product.brand,
        product_url: product.url,
        product_type: productType,
      },
      anthropic,
      (event) => onProductProgress(product.index, event)
    );
    onProductComplete(product.index, result);
  }
}
