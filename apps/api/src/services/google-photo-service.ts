/**
 * Google Photo Service
 *
 * Shared service for fetching, processing, and storing Google Places photos
 * with content-based deduplication. Used by both Travel and RV Locations.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { trackPhotoDownload } from './api-usage-tracking';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export interface GooglePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri: string;
  }>;
}

export interface PhotoProcessingOptions {
  maxPhotos?: number;
  maxWidthPx?: number;
  maxHeightPx?: number;
  // For API usage tracking
  userId?: string;
  contextType?: 'rv_enrichment' | 'travel_planning' | string;
  contextId?: string;
}

export interface ProcessedPhoto {
  fileUrl: string;
  contentHash: string;
  googlePhotoReference: string;
  width: number;
  height: number;
  attributionName?: string;
  attributionUri?: string;
}

export interface PhotoProcessingResult {
  photosAdded: number;
  photosSkipped: number;
  photos: ProcessedPhoto[];
  errors: string[];
}

export interface ExistingPhotoData {
  google_photo_reference?: string;
  content_hash?: string;
  file_url?: string;
}

/**
 * Compute SHA256 content hash from photo bytes
 */
export function computeContentHash(photoBytes: Uint8Array): string {
  return crypto.createHash('sha256').update(photoBytes).digest('hex');
}

/**
 * Download a Google Places photo and return the bytes
 */
export async function downloadGooglePhoto(
  photoName: string,
  maxWidthPx: number = 1600,
  maxHeightPx: number = 1200
): Promise<Uint8Array | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return null;
  }

  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_PLACES_API_KEY}&maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}`;

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.error(`Failed to download photo ${photoName}: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error(`Error downloading photo ${photoName}:`, error);
    return null;
  }
}

/**
 * Upload photo bytes to Supabase Storage
 */
export async function uploadToStorage(
  photoBytes: Uint8Array,
  storagePath: string
): Promise<string | null> {
  try {
    const { error: uploadError } = await supabase.storage
      .from('singularity-uploads')
      .upload(storagePath, photoBytes, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('singularity-uploads')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    return null;
  }
}

/**
 * Build deduplication sets from existing photos
 */
export function buildDeduplicationSets(existingPhotos: ExistingPhotoData[] | null): {
  existingRefs: Set<string>;
  existingHashes: Set<string>;
  existingUrls: Set<string>;
} {
  return {
    existingRefs: new Set(existingPhotos?.map(p => p.google_photo_reference).filter(Boolean) as string[] || []),
    existingHashes: new Set(existingPhotos?.map(p => p.content_hash).filter(Boolean) as string[] || []),
    existingUrls: new Set(existingPhotos?.map(p => p.file_url).filter(Boolean) as string[] || []),
  };
}

/**
 * Check if a photo is a duplicate based on reference, hash, or URL
 */
export function isDuplicate(
  photoRef: string,
  contentHash: string,
  fileUrl: string,
  dedupSets: {
    existingRefs: Set<string>;
    existingHashes: Set<string>;
    existingUrls: Set<string>;
  }
): boolean {
  return (
    dedupSets.existingRefs.has(photoRef) ||
    dedupSets.existingHashes.has(contentHash) ||
    dedupSets.existingUrls.has(fileUrl)
  );
}

/**
 * Process Google photos with deduplication
 *
 * Downloads photos, computes content hashes, uploads to storage,
 * and returns processed photo data ready for database insertion.
 */
export async function processGooglePhotos(
  photos: GooglePhoto[],
  storagePath: string,
  existingPhotos: ExistingPhotoData[] | null,
  options: PhotoProcessingOptions = {}
): Promise<PhotoProcessingResult> {
  const {
    maxPhotos = 30,
    maxWidthPx = 1600,
    maxHeightPx = 1200,
    userId,
    contextType,
    contextId,
  } = options;

  const result: PhotoProcessingResult = {
    photosAdded: 0,
    photosSkipped: 0,
    photos: [],
    errors: [],
  };

  if (!GOOGLE_PLACES_API_KEY) {
    result.errors.push('GOOGLE_PLACES_API_KEY not configured');
    return result;
  }

  const dedupSets = buildDeduplicationSets(existingPhotos);

  for (const photo of photos) {
    // Stop if we have enough photos
    if (result.photosAdded >= maxPhotos) {
      break;
    }

    try {
      // Skip if we already have this photo reference
      if (dedupSets.existingRefs.has(photo.name)) {
        result.photosSkipped++;
        continue;
      }

      // Download photo
      const photoBytes = await downloadGooglePhoto(photo.name, maxWidthPx, maxHeightPx);
      if (!photoBytes) {
        continue;
      }

      // Track photo download for API usage billing
      if (userId) {
        trackPhotoDownload(userId, 1, contextType, contextId);
      }

      // Compute content hash
      const contentHash = computeContentHash(photoBytes);

      // Skip if we already have this exact content
      if (dedupSets.existingHashes.has(contentHash)) {
        result.photosSkipped++;
        continue;
      }

      // Upload to storage
      const filename = `google_${photo.name.replace(/\//g, '_')}.jpg`;
      const fullPath = `${storagePath}/${filename}`;
      const fileUrl = await uploadToStorage(photoBytes, fullPath);

      if (!fileUrl) {
        continue;
      }

      // Skip if this exact URL already exists
      if (dedupSets.existingUrls.has(fileUrl)) {
        result.photosSkipped++;
        continue;
      }

      // Add to dedup sets for this batch
      dedupSets.existingRefs.add(photo.name);
      dedupSets.existingHashes.add(contentHash);
      dedupSets.existingUrls.add(fileUrl);

      const attribution = photo.authorAttributions?.[0];

      result.photos.push({
        fileUrl,
        contentHash,
        googlePhotoReference: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        attributionName: attribution?.displayName,
        attributionUri: attribution?.uri,
      });

      result.photosAdded++;
    } catch (error) {
      console.error('Photo processing error:', error);
      result.errors.push(`Failed to process photo: ${photo.name}`);
    }
  }

  return result;
}

/**
 * Insert processed photos into rv_location_media table
 * Note: Deduplication is handled in processGooglePhotos before reaching here
 */
export async function insertRVLocationPhotos(
  locationId: string,
  userId: string,
  photos: ProcessedPhoto[],
  activityId?: string,
  caption?: string
): Promise<{ inserted: number; errors: string[] }> {
  const result = { inserted: 0, errors: [] as string[] };

  console.log(`[Photo Insert] Inserting ${photos.length} photos for location ${locationId}, activity ${activityId || 'main'}, caption: "${caption}"`);

  for (const photo of photos) {
    try {
      // Use regular insert - deduplication already handled by content hash check in processGooglePhotos
      const { error } = await supabase
        .from('rv_location_media')
        .insert({
          location_id: locationId,
          activity_id: activityId,
          user_id: userId,
          file_url: photo.fileUrl,
          media_type: 'image',
          width: photo.width,
          height: photo.height,
          caption: caption,
          google_attribution_name: photo.attributionName,
          google_attribution_uri: photo.attributionUri,
          google_photo_reference: photo.googlePhotoReference,
          content_hash: photo.contentHash,
          is_google_sourced: true,
          sort_order: result.inserted,
          created_at: new Date().toISOString(),
        });

      if (error) {
        // Duplicate constraint violation - skip silently (dedup working as expected)
        if (error.code === '23505') {
          console.log(`[Photo Insert] Duplicate constraint hit for photo (code 23505)`);
          continue;
        }
        console.error(`[Photo Insert] Insert error:`, error);
        result.errors.push(`Insert error: ${error.message}`);
        continue;
      }

      result.inserted++;
    } catch (error: any) {
      console.error(`[Photo Insert] Exception:`, error);
      result.errors.push(`Insert exception: ${error.message}`);
    }
  }

  console.log(`[Photo Insert] Completed: ${result.inserted} inserted, ${result.errors.length} errors`);
  return result;
}

/**
 * Insert processed photos into trip_media table
 */
export async function insertTripPhotos(
  tripId: string,
  userId: string,
  photos: ProcessedPhoto[],
  parentType: 'segment' | 'activity',
  parentId: string,
  caption?: string
): Promise<{ inserted: number; errors: string[] }> {
  const result = { inserted: 0, errors: [] as string[] };

  for (const photo of photos) {
    try {
      const { error } = await supabase
        .from('trip_media')
        .upsert({
          trip_id: tripId,
          user_id: userId,
          parent_type: parentType,
          parent_id: parentId,
          file_url: photo.fileUrl,
          media_type: 'image',
          width: photo.width,
          height: photo.height,
          caption: caption,
          is_google_sourced: true,
          approved: true, // Auto-approve Google photos
          google_attribution_name: photo.attributionName,
          google_attribution_uri: photo.attributionUri,
          google_photo_reference: photo.googlePhotoReference,
          content_hash: photo.contentHash,
        }, {
          onConflict: 'trip_id,content_hash',
          ignoreDuplicates: true
        });

      if (error) {
        // Duplicate constraint is expected, just skip
        if (error.code === '23505') {
          continue;
        }
        result.errors.push(`Insert error: ${error.message}`);
        continue;
      }

      result.inserted++;
    } catch (error: any) {
      result.errors.push(`Insert exception: ${error.message}`);
    }
  }

  return result;
}

/**
 * Fetch and store Google photos for an RV location
 * Convenience function that combines processing and insertion
 */
export async function fetchAndStoreRVLocationPhotos(
  locationId: string,
  userId: string,
  photos: GooglePhoto[],
  options: PhotoProcessingOptions = {},
  activityId?: string,
  caption?: string
): Promise<PhotoProcessingResult> {
  // Get existing photos for deduplication - only within the same activity
  // This allows the same photo to exist for campground AND activities
  let existingPhotosQuery = supabase
    .from('rv_location_media')
    .select('google_photo_reference, content_hash, file_url')
    .eq('location_id', locationId);

  // Only dedupe within same activity (or campground if no activityId)
  if (activityId) {
    existingPhotosQuery = existingPhotosQuery.eq('activity_id', activityId);
  } else {
    existingPhotosQuery = existingPhotosQuery.is('activity_id', null);
  }

  const { data: existingPhotos } = await existingPhotosQuery;

  // Process photos with tracking
  const storagePath = activityId
    ? `rv-locations/${locationId}/activities/${activityId}`
    : `rv-locations/${locationId}`;
  const processResult = await processGooglePhotos(photos, storagePath, existingPhotos, {
    ...options,
    userId,
    contextType: 'rv_enrichment',
    contextId: locationId,
  });

  // Insert into database
  if (processResult.photos.length > 0) {
    const insertResult = await insertRVLocationPhotos(locationId, userId, processResult.photos, activityId, caption);
    processResult.errors.push(...insertResult.errors);
  }

  return processResult;
}

/**
 * Fetch and store Google photos for a trip activity
 * Convenience function that combines processing and insertion
 */
export async function fetchAndStoreTripPhotos(
  tripId: string,
  userId: string,
  activityId: string,
  photos: GooglePhoto[],
  caption?: string,
  options: PhotoProcessingOptions = {}
): Promise<PhotoProcessingResult> {
  // Get existing photos at TRIP level for deduplication (need all rows, not default 1000)
  const { data: existingPhotos } = await supabase
    .from('trip_media')
    .select('google_photo_reference, content_hash, file_url')
    .eq('trip_id', tripId)
    .limit(5000);

  // Process photos with tracking
  const storagePath = `travel/${tripId}/activities/${activityId}`;
  const processResult = await processGooglePhotos(photos, storagePath, existingPhotos, {
    ...options,
    userId,
    contextType: 'travel_planning',
    contextId: tripId,
  });

  // Insert into database — use actual insert count, not download count
  if (processResult.photos.length > 0) {
    const insertResult = await insertTripPhotos(tripId, userId, processResult.photos, 'activity', activityId, caption);
    processResult.errors.push(...insertResult.errors);
    // Correct photosAdded to reflect actual DB inserts (downloads may exceed inserts due to constraints)
    processResult.photosAdded = insertResult.inserted;
  }

  return processResult;
}
