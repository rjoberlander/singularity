/**
 * Airbnb Listing Enrichment Service
 *
 * Fetches listing data (photos, amenities, host info, check-in/out) from Airbnb
 * via the omkarcloud scraper API (5,000 free requests/month).
 *
 * Usage: Set AIRBNB_SCRAPER_API_KEY in .env
 * Get a key at: https://omkar.cloud/auth/sign-up?redirect=/api-key
 */

import { supabase } from '../config/supabase';

const AIRBNB_API_BASE = 'https://airbnb-scraper-api.omkar.cloud/airbnb/listings';

interface AirbnbListingData {
  listing_id?: string | number;
  title?: string;
  tagline?: string;
  property_type?: string;
  listing_url?: string;
  photos?: string[];
  highlights?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  guest_capacity?: number;
  amenity_ids?: string[] | null;
  host_name?: string;
  host_id?: number;
  is_superhost?: boolean;
  is_verified?: boolean;
  host_rating?: number;
  host_review_count?: number;
  years_hosting?: number;
  overall_rating?: number;
  review_count?: number;
  is_guest_favorite?: boolean;
  rating_categories?: Array<{ category: string; score: string }>;
  pricing?: { rate?: number; currency?: string; total?: number } | null;
  cancellation_terms?: string[];
  is_available?: boolean;
}

export interface AirbnbEnrichmentResult {
  success: boolean;
  listingData?: AirbnbListingData;
  photosAdded: number;
  photosSkipped: number;
  fieldsUpdated: number;
  error?: string;
}

/**
 * Extract Airbnb room/listing ID from a URL
 * e.g. https://www.airbnb.com/rooms/923011954010540033 → "923011954010540033"
 */
export function extractAirbnbListingId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('airbnb')) return null;
    // Match /rooms/XXXXX or /h/XXXXX patterns
    const match = parsed.pathname.match(/\/(?:rooms|h)\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch listing details from the Airbnb scraper API
 */
async function fetchAirbnbListing(listingId: string): Promise<AirbnbListingData | null> {
  const apiKey = process.env.AIRBNB_SCRAPER_API_KEY;
  if (!apiKey) {
    console.warn('AIRBNB_SCRAPER_API_KEY not set — cannot fetch Airbnb data');
    return null;
  }

  try {
    const resp = await fetch(`${AIRBNB_API_BASE}/details?stay_id=${listingId}`, {
      headers: { 'API-Key': apiKey },
    });

    if (resp.status === 401) {
      console.error('Airbnb API: invalid API key');
      return null;
    }
    if (resp.status === 429) {
      console.error('Airbnb API: rate limit exceeded');
      return null;
    }
    if (!resp.ok) {
      console.error(`Airbnb API error: ${resp.status} ${resp.statusText}`);
      return null;
    }

    const data = await resp.json();
    return data as AirbnbListingData;
  } catch (err) {
    console.error('Airbnb API fetch error:', err);
    return null;
  }
}

/**
 * Download a photo from URL and upload to Supabase storage
 */
async function downloadAndStorePhoto(
  photoUrl: string,
  tripId: string,
  accommodationId: string,
  index: number,
  userId: string,
): Promise<{ stored: boolean; fileUrl?: string }> {
  try {
    // Fetch the image
    const resp = await fetch(photoUrl);
    if (!resp.ok) return { stored: false };

    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    const storagePath = `travel/${tripId}/accommodations/${accommodationId}/airbnb_${index}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('singularity-uploads')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn(`Failed to upload Airbnb photo ${index}:`, uploadError.message);
      return { stored: false };
    }

    const { data: urlData } = supabase.storage.from('singularity-uploads').getPublicUrl(storagePath);
    return { stored: true, fileUrl: urlData.publicUrl };
  } catch (err) {
    console.warn(`Failed to download Airbnb photo ${index}:`, err);
    return { stored: false };
  }
}

/**
 * Enrich an accommodation with Airbnb listing data
 */
export async function enrichFromAirbnb(
  tripId: string,
  accommodationId: string,
  userId: string,
  airbnbUrl: string,
  maxPhotos: number = 15,
): Promise<AirbnbEnrichmentResult> {
  // Extract listing ID
  const listingId = extractAirbnbListingId(airbnbUrl);
  if (!listingId) {
    return { success: false, photosAdded: 0, photosSkipped: 0, fieldsUpdated: 0, error: 'Could not extract Airbnb listing ID from URL' };
  }

  console.log(`[Airbnb] Fetching listing ${listingId}...`);

  // Fetch listing data
  const listing = await fetchAirbnbListing(listingId);
  if (!listing) {
    return { success: false, photosAdded: 0, photosSkipped: 0, fieldsUpdated: 0, error: 'Failed to fetch Airbnb listing data' };
  }

  console.log(`[Airbnb] Got listing: "${listing.title}", ${(listing.photos || []).length} photos`);

  // === PHOTO DEDUP: skip if already enriched from Airbnb ===
  let photosAdded = 0;
  let photosSkipped = 0;
  const photos = listing.photos || [];

  const { data: existingMedia } = await supabase
    .from('trip_media')
    .select('file_url, original_filename')
    .eq('trip_id', tripId)
    .eq('parent_type', 'accommodation')
    .eq('parent_id', accommodationId)
    .eq('media_type', 'image');

  const existingCount = (existingMedia || []).length;
  const hasAirbnbPhotos = (existingMedia || []).some(m => m.original_filename?.startsWith('airbnb_'));

  if (hasAirbnbPhotos) {
    console.log(`[Airbnb] Already has ${existingCount} photos (including Airbnb) — skipping photo download`);
    photosSkipped = photos.length;
  } else {
    for (let i = 0; i < Math.min(photos.length, maxPhotos); i++) {
      const photoUrl = photos[i];
      if (!photoUrl) continue;

      const result = await downloadAndStorePhoto(photoUrl, tripId, accommodationId, existingCount + i, userId);
      if (result.stored && result.fileUrl) {
        await supabase.from('trip_media').insert({
          trip_id: tripId,
          user_id: userId,
          parent_type: 'accommodation',
          parent_id: accommodationId,
          file_url: result.fileUrl,
          media_type: 'image',
          original_filename: `airbnb_${i}.jpg`,
          is_google_sourced: false,
          approved: true,
          sort_order: existingCount + i,
        });
        photosAdded++;
      } else {
        photosSkipped++;
      }
    }
  }

  // === BUILD UPDATE FIELDS ===
  const updateFields: Record<string, any> = {};
  let fieldsUpdated = 0;

  if (listing.latitude) { updateFields.latitude = listing.latitude; fieldsUpdated++; }
  if (listing.longitude) { updateFields.longitude = listing.longitude; fieldsUpdated++; }
  if (listing.overall_rating) { updateFields.google_rating = listing.overall_rating; fieldsUpdated++; }
  if (listing.review_count) { updateFields.google_review_count = listing.review_count; fieldsUpdated++; }

  // Build notes from host info + highlights
  const notes: string[] = [];
  if (listing.host_name) notes.push(`Host: ${listing.host_name}`);
  if (listing.is_superhost) notes.push('Superhost');
  if (listing.years_hosting) notes.push(`${listing.years_hosting} years hosting`);
  if (listing.is_guest_favorite) notes.push('Guest Favorite');
  if (listing.tagline) notes.push(listing.tagline);
  if (listing.guest_capacity) notes.push(`${listing.guest_capacity} guests`);
  if (listing.highlights?.length) notes.push(listing.highlights.join(', '));
  if (listing.cancellation_terms?.length) notes.push(`Cancellation: ${listing.cancellation_terms[0]}`);
  if (listing.pricing?.total) notes.push(`Total: ${listing.pricing.currency || '$'}${listing.pricing.total}`);
  if (notes.length > 0) { updateFields.notes = notes.join('. ') + '.'; fieldsUpdated++; }

  // Store highlights as flat amenities list
  if (listing.highlights?.length) { updateFields.amenities = listing.highlights; fieldsUpdated++; }

  // Don't set amenities_structured from Airbnb API — the data is too sparse.
  // The enrich-ai step (Perplexity + Claude) does a web search on the listing
  // and extracts pool, kitchen, wifi, parking etc. with much better accuracy.

  // Mark as enriched
  updateFields.photos_fetched = true;
  updateFields.enriched_at = new Date().toISOString();
  updateFields.enrichment_source = 'airbnb_api';
  updateFields.property_type = 'vacation_rental';

  // Update the accommodation record
  if (Object.keys(updateFields).length > 0) {
    const { error: updateError } = await supabase
      .from('trip_accommodations')
      .update(updateFields)
      .eq('id', accommodationId);

    if (updateError) {
      console.error('[Airbnb] Failed to update accommodation:', updateError);
    }
  }

  console.log(`[Airbnb] Done: ${photosAdded} photos added, ${photosSkipped} skipped, ${fieldsUpdated} fields updated`);

  return {
    success: true,
    listingData: listing,
    photosAdded,
    photosSkipped,
    fieldsUpdated,
  };
}
