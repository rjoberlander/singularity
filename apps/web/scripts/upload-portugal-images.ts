import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://fcsiqoebtpfhzreamotp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg';

const USER_ID = 'b201a860-05a3-4ddc-bb89-4c4271177271';
const TRIP_ID = '814c38ad-c6d4-4811-acbf-6db049e3ede1';

const PORTUGAL_CITIES_PATH = '/Users/rich/Downloads/portugal-cities';

// Map city folder names to segment names
const CITY_TO_SEGMENT: Record<string, string> = {
  'lisbon': 'Lisbon',
  'cascais': 'Cascais & Sintra',
  'sintra': 'Cascais & Sintra',
  'lagos': 'Lagos & Sagres',
  'sagres': 'Lagos & Sagres',
  'albufeira': 'Albufeira',
  'obidos': 'Óbidos & Nazaré',
  'nazare': 'Óbidos & Nazaré',
  'aveiro': 'Aveiro',
  'porto': 'Porto',
  'douro-valley': 'Douro Valley',
};

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get segments for the trip
  const { data: segments, error: segmentsError } = await supabase
    .from('trip_segments')
    .select('id, name')
    .eq('trip_id', TRIP_ID);

  if (segmentsError) {
    console.error('Failed to get segments:', segmentsError);
    return;
  }

  console.log(`Found ${segments?.length} segments`);

  // Create segment name to ID map
  const segmentMap: Record<string, string> = {};
  for (const segment of segments || []) {
    segmentMap[segment.name] = segment.id;
  }

  // Get all city folders
  const cityFolders = fs.readdirSync(PORTUGAL_CITIES_PATH).filter(f => {
    const stat = fs.statSync(path.join(PORTUGAL_CITIES_PATH, f));
    return stat.isDirectory() && !f.startsWith('.');
  });

  console.log(`Found ${cityFolders.length} city folders`);

  let totalUploaded = 0;
  let totalFailed = 0;

  for (const cityFolder of cityFolders) {
    const imagesPath = path.join(PORTUGAL_CITIES_PATH, cityFolder, 'images');

    if (!fs.existsSync(imagesPath)) {
      console.log(`No images folder for ${cityFolder}`);
      continue;
    }

    const segmentName = CITY_TO_SEGMENT[cityFolder];
    const segmentId = segmentName ? segmentMap[segmentName] : null;

    if (!segmentId) {
      console.log(`No segment mapping for ${cityFolder}`);
      continue;
    }

    const imageFiles = fs.readdirSync(imagesPath).filter(f =>
      f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
    );

    console.log(`\nUploading ${imageFiles.length} images for ${cityFolder} → ${segmentName}...`);

    for (const imageFile of imageFiles) {
      const filePath = path.join(imagesPath, imageFile);
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `${USER_ID}/${TRIP_ID}/${segmentId}/${imageFile}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.log(`  ✗ Failed to upload ${imageFile}: ${uploadError.message}`);
        totalFailed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-media')
        .getPublicUrl(storagePath);

      // Create media record
      const { error: mediaError } = await supabase
        .from('trip_media')
        .insert({
          trip_id: TRIP_ID,
          user_id: USER_ID,
          parent_type: 'segment',
          parent_id: segmentId,
          file_url: urlData.publicUrl,
          media_type: 'image',
          original_filename: imageFile,
          mime_type: 'image/jpeg',
          caption: imageFile.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').replace(/^\d+\s*/, '')
        });

      if (mediaError) {
        console.log(`  ✗ Failed to create media record for ${imageFile}: ${mediaError.message}`);
        totalFailed++;
        continue;
      }

      totalUploaded++;
      process.stdout.write(`  ✓ ${imageFile}\n`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Total uploaded: ${totalUploaded}`);
  console.log(`Total failed: ${totalFailed}`);
}

main().catch(console.error);
