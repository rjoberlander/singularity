import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://cymbadkegbibhxbfevuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w';

const USER_ID = 'b201a860-05a3-4ddc-bb89-4c4271177271';
const TRIP_ID = '814c38ad-c6d4-4811-acbf-6db049e3ede1';

const PORTUGAL_CITIES_PATH = '/Users/rich/Downloads/portugal-cities';

// Map image filename patterns to activity names
const IMAGE_TO_ACTIVITY_MAP: Record<string, string[]> = {
  // Lisbon
  'alfama': ['Alfama District Walk'],
  'belem': ['Belém Tower', 'Belém Cultural Circuit'],
  'monastery': ['Jerónimos Monastery'],
  'tram': ['Tram 28 Ride'],
  'castle': ['São Jorge Castle'],
  'pastel': ['Pastéis de Belém'],
  'bridge': ['Dom Luís I Bridge'],
  'time-out': ['Time Out Market'],
  'oceanario': ['Oceanário de Lisboa'],

  // Cascais & Sintra
  'pena-palace': ['Pena Palace'],
  'regaleira': ['Quinta da Regaleira'],
  'initiation-well': ['Quinta da Regaleira'],
  'moorish-castle': ['Sintra Day Trip'],
  'monserrate': ['Sintra Day Trip'],
  'national-palace': ['Sintra National Palace'],
  'cabo-da-roca': ['Cabo da Roca'],
  'cascais': ['Cascais Beach', 'Old Town Exploration'],
  'guincho': ['Guincho Beach'],
  'boca-inferno': ['Boca do Inferno'],

  // Lagos & Sagres
  'ponta-da-piedade': ['Ponta da Piedade', 'Kayaking at Ponta da Piedade'],
  'praia-dona-ana': ['Praia Dona Ana'],
  'praia-do-camilo': ['Praia do Camilo'],
  'meia-praia': ['Meia Praia'],
  'lagos-marina': ['Lagos Marina'],
  'lagos-old-town': ['Lagos Old Town'],
  'slave-market': ['Slave Market Museum'],
  'mercado-escravos': ['Slave Market Museum'],
  'forte-bandeira': ['Lagos Old Town'],
  'gil-eanes': ['Lagos Old Town'],
  'cape-st-vincent': ['Cape St. Vincent'],
  'sagres': ['Sagres Day Trip', 'Sagres Fortress'],
  'surfing': ['Surfing Lesson'],
  'surfer': ['Surfing Lesson'],

  // Albufeira
  'benagil': ['Benagil Cave Boat Tour'],
  'albufeira': ['Albufeira Old Town', 'Resort Exploration'],
  'falesia': ['Praia da Falésia'],
  'marinha': ['Praia da Marinha'],
  'carvoeiro': ['Carvoeiro'],
  'zoomarine': ['Zoomarine'],

  // Óbidos & Nazaré
  'obidos': ['Óbidos Medieval Town', 'Castle Walls Walk'],
  'nazare': ['Nazaré Day Trip', 'Nazaré Beach', 'Farol da Nazaré'],
  'big-wave': ['Farol da Nazaré'],
  'lighthouse': ['Farol da Nazaré'],

  // Aveiro
  'aveiro': ['Moliceiro Boat Ride', 'Art Nouveau Architecture'],
  'moliceiro': ['Moliceiro Boat Ride'],
  'costa-nova': ['Costa Nova', 'Costa Nova Beach'],

  // Porto
  'porto': ['Ribeira District', 'Porto'],
  'ribeira': ['Ribeira District'],
  'livraria-lello': ['Livraria Lello'],
  'lello': ['Livraria Lello'],
  'sao-bento': ['São Bento Station'],
  'clerigos': ['Clérigos Tower'],
  'azulejo': ['São Bento Station'],
  'port-wine': ['Port Wine Tasting'],

  // Douro Valley
  'douro': ['Douro River Cruise', 'Quinta Visit', 'Vineyard Views'],
  'vineyard': ['Vineyard Views', 'Quinta Visit'],
  'quinta': ['Quinta Visit'],
  'pinhao': ['Pinhão'],
};

// City folder to segment mapping
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

  // First, delete all existing trip media for this trip
  console.log('Deleting existing trip media...');
  const { error: deleteError } = await supabase
    .from('trip_media')
    .delete()
    .eq('trip_id', TRIP_ID);

  if (deleteError) {
    console.error('Failed to delete existing media:', deleteError);
  }

  // Get all activities for the trip with their day and segment info
  const { data: activities, error: activitiesError } = await supabase
    .from('trip_activities')
    .select(`
      id,
      name,
      trip_days!inner (
        id,
        segment_id,
        trip_segments!inner (
          id,
          name
        )
      )
    `)
    .eq('trip_id', TRIP_ID);

  if (activitiesError) {
    console.error('Failed to get activities:', activitiesError);
    return;
  }

  console.log(`Found ${activities?.length} activities`);

  // Create activity name to ID map, grouped by segment
  const activityMap: Record<string, { id: string; segmentName: string }[]> = {};
  for (const activity of activities || []) {
    const segmentName = (activity.trip_days as any).trip_segments.name;
    if (!activityMap[activity.name]) {
      activityMap[activity.name] = [];
    }
    activityMap[activity.name].push({ id: activity.id, segmentName });
  }

  // Get segments
  const { data: segments } = await supabase
    .from('trip_segments')
    .select('id, name')
    .eq('trip_id', TRIP_ID);

  const segmentMap: Record<string, string> = {};
  for (const segment of segments || []) {
    segmentMap[segment.name] = segment.id;
  }

  // Get all city folders
  const cityFolders = fs.readdirSync(PORTUGAL_CITIES_PATH).filter(f => {
    const stat = fs.statSync(path.join(PORTUGAL_CITIES_PATH, f));
    return stat.isDirectory() && !f.startsWith('.');
  });

  let totalUploaded = 0;
  let activityMatches = 0;
  let segmentFallbacks = 0;

  for (const cityFolder of cityFolders) {
    const imagesPath = path.join(PORTUGAL_CITIES_PATH, cityFolder, 'images');

    if (!fs.existsSync(imagesPath)) {
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

    console.log(`\nProcessing ${imageFiles.length} images for ${cityFolder}...`);

    for (const imageFile of imageFiles) {
      const filePath = path.join(imagesPath, imageFile);
      const fileBuffer = fs.readFileSync(filePath);
      const filenameLower = imageFile.toLowerCase();

      // Try to match image to activity
      let matchedActivity: { id: string; segmentName: string } | null = null;
      let matchedActivityName = '';

      for (const [pattern, activityNames] of Object.entries(IMAGE_TO_ACTIVITY_MAP)) {
        if (filenameLower.includes(pattern)) {
          // Find an activity in the matching segment
          for (const activityName of activityNames) {
            const activities = activityMap[activityName];
            if (activities) {
              // Prefer activity in the same segment
              const sameSegment = activities.find(a => a.segmentName === segmentName);
              if (sameSegment) {
                matchedActivity = sameSegment;
                matchedActivityName = activityName;
                break;
              }
              // Otherwise use first match
              if (!matchedActivity) {
                matchedActivity = activities[0];
                matchedActivityName = activityName;
              }
            }
          }
          if (matchedActivity) break;
        }
      }

      // Determine parent type and ID
      let parentType: string;
      let parentId: string;

      if (matchedActivity) {
        parentType = 'activity';
        parentId = matchedActivity.id;
        activityMatches++;
      } else {
        parentType = 'segment';
        parentId = segmentId;
        segmentFallbacks++;
      }

      // Upload to storage
      const storagePath = `${USER_ID}/${TRIP_ID}/${parentType}/${parentId}/${imageFile}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.log(`  ✗ Failed to upload ${imageFile}: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-media')
        .getPublicUrl(storagePath);

      // Create media record
      const caption = imageFile
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '')
        .replace(/^\d+\s*/, '')
        .trim();

      const { error: mediaError } = await supabase
        .from('trip_media')
        .insert({
          trip_id: TRIP_ID,
          user_id: USER_ID,
          parent_type: parentType,
          parent_id: parentId,
          file_url: urlData.publicUrl,
          media_type: 'image',
          original_filename: imageFile,
          mime_type: 'image/jpeg',
          caption: caption
        });

      if (mediaError) {
        console.log(`  ✗ Failed to create media record: ${mediaError.message}`);
        continue;
      }

      totalUploaded++;
      if (matchedActivity) {
        console.log(`  ✓ ${imageFile} → ${matchedActivityName}`);
      } else {
        console.log(`  ○ ${imageFile} → segment (${segmentName})`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Total uploaded: ${totalUploaded}`);
  console.log(`Matched to activities: ${activityMatches}`);
  console.log(`Fallback to segments: ${segmentFallbacks}`);
}

main().catch(console.error);
