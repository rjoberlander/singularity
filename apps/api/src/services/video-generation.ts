/**
 * Video Generation Service
 *
 * Four-phase pipeline for creating podcast-style travel videos:
 *   Phase 1 — Data Collection: fetch segment, days, activities, media from Supabase
 *   Phase 2 — Script Generation: Claude produces a two-host podcast script
 *   Phase 3 — Audio Generation: OpenAI TTS renders each line with two voices
 *   Phase 4 — Video Rendering: Remotion composes photos + audio + text into MP4
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import { supabase } from '../config/supabase';
import { AIAPIKeyService } from '../modules/ai-api-keys/services/aiAPIKeyService';
import { renderVideo } from '../video/render';
import type {
  PodcastScript,
  PodcastScriptLine,
  TripVideoAudioFile,
  TripSegment,
  TripDay,
  TripActivity,
  TripAccommodation,
  TripMedia,
} from '@singularity/shared-types';

type Speaker = 'host' | 'cohost';

// ─── Status Helpers ──────────────────────────────────────────────────

async function updateVideoStatus(
  videoId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  const { error } = await supabase
    .from('trip_videos')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', videoId);
  if (error) console.error(`[video-gen] Failed to update status to ${status}:`, error.message);
}

async function failVideo(videoId: string, message: string) {
  console.error(`[video-gen] FAILED:`, message);
  await updateVideoStatus(videoId, 'failed', { error_message: message });
}

// ─── Phase 1: Data Collection ────────────────────────────────────────

interface SegmentData {
  segment: TripSegment;
  days: TripDay[];
  activities: TripActivity[];
  accommodations: TripAccommodation[];
  photos: string[]; // public URLs
  heroPhoto: string;
}

async function collectSegmentData(tripId: string, segmentId: string): Promise<SegmentData> {
  // Fetch segment
  const { data: segment, error: segErr } = await supabase
    .from('trip_segments')
    .select('*')
    .eq('id', segmentId)
    .single();
  if (segErr || !segment) throw new Error(`Segment not found: ${segErr?.message}`);

  // Fetch days for this segment
  const { data: days } = await supabase
    .from('trip_days')
    .select('*')
    .eq('segment_id', segmentId)
    .order('date', { ascending: true });

  const dayIds = (days || []).map((d: TripDay) => d.id);

  // Fetch activities for those days
  const { data: activities } = await supabase
    .from('trip_activities')
    .select('*')
    .in('day_id', dayIds.length > 0 ? dayIds : ['none'])
    .eq('is_backup', false)
    .order('sort_order', { ascending: true });

  // Fetch accommodations linked to this segment
  const { data: accommodations } = await supabase
    .from('trip_accommodations')
    .select('*')
    .eq('segment_id', segmentId);

  // Fetch all media for the trip (segment, activities, accommodations)
  const parentIds = [
    segmentId,
    ...dayIds,
    ...(activities || []).map((a: TripActivity) => a.id),
    ...(accommodations || []).map((a: TripAccommodation) => a.id),
  ];

  const { data: media } = await supabase
    .from('trip_media')
    .select('*')
    .in('parent_id', parentIds)
    .eq('media_type', 'image')
    .not('file_url', 'is', null);

  const photos = (media || [])
    .map((m: TripMedia) => m.file_url)
    .filter(Boolean) as string[];

  // Hero photo: first segment-level photo, or first accommodation photo, or first any photo
  const segmentPhotos = (media || []).filter((m: TripMedia) => m.parent_id === segmentId);
  const accomPhotos = (media || []).filter((m: TripMedia) =>
    (accommodations || []).some((a: TripAccommodation) => a.id === m.parent_id)
  );
  const heroPhoto = segmentPhotos[0]?.file_url || accomPhotos[0]?.file_url || photos[0] || '';

  console.log(`[video-gen] Collected: ${(days || []).length} days, ${(activities || []).length} activities, ${photos.length} photos`);

  return {
    segment: segment as TripSegment,
    days: (days || []) as TripDay[],
    activities: (activities || []) as TripActivity[],
    accommodations: (accommodations || []) as TripAccommodation[],
    photos,
    heroPhoto,
  };
}

// ─── Phase 2: Script Generation ──────────────────────────────────────

function buildScriptPrompt(data: SegmentData): string {
  const { segment, days, activities, accommodations } = data;
  const cityInfo = (segment as any).city_info || {};

  // Build a concise data summary for the LLM
  const daysSummary = days.map((day) => {
    const dayActivities = activities
      .filter((a) => a.day_id === day.id)
      .map((a) => ({
        name: a.name,
        type: a.activity_type,
        description: a.description?.slice(0, 200),
        why_its_great: (a as any).why_its_great?.slice(0, 200),
        deep_dive_story: (a as any).deep_dive?.the_story?.slice(0, 300),
        interesting_facts: (a as any).deep_dive?.interesting_facts?.slice(0, 3),
        kid_engagement: (a as any).kid_engagement,
        restaurant_details: a.activity_type === 'restaurant' ? {
          cuisine: (a as any).restaurant_details?.cuisine_type,
          signature_dishes: (a as any).restaurant_details?.signature_dishes?.slice(0, 3),
          local_insight: (a as any).restaurant_details?.local_insight,
        } : undefined,
      }));
    return {
      date: day.date,
      title: day.title,
      theme: (day as any).theme,
      activities: dayActivities,
    };
  });

  const accomSummary = accommodations.map((a) => ({
    name: a.name,
    rating: a.google_rating,
    nights: (a as any).nights,
    amenities: (a as any).amenities_structured,
    guest_insights: (a as any).guest_insights,
  }));

  return JSON.stringify({
    segment_name: segment.name,
    segment_description: segment.description,
    segment_theme: (segment as any).theme,
    dates: { start: segment.start_date, end: segment.end_date },
    city_intro: cityInfo.intro,
    deep_history: cityInfo.deep_history,
    culture: cityInfo.culture,
    cuisine: cityInfo.cuisine,
    main_attractions: (segment as any).main_attractions,
    weather: (segment as any).weather_summary,
    days: daysSummary,
    accommodations: accomSummary,
  }, null, 2);
}

const SCRIPT_SYSTEM_PROMPT = `You are a world-class travel podcast producer. Create an engaging two-host conversation about a trip segment.

HOSTS:
- Alex (host): Enthusiastic, knowledgeable travel expert. Uses "host" as speaker value.
- Sam (cohost): Curious, asks great questions, relatable parent. Uses "cohost" as speaker value.

FAMILY:
- This is a family trip with 3 kids: Parker (age 7), Charlotte (age 5), and Xander (age 3).
- Call kids by name when discussing things they'll love.

FORMAT RULES:
- Output valid JSON matching the schema below
- Keep individual lines SHORT — under 150 characters / ~8 seconds spoken
- Target 25-40 dialogue lines for a 3-5 minute segment overview
- Include natural speech: curiosity, humor, genuine reactions
- Include visual_cue on roughly 40% of lines

STRUCTURE:
1. HOOK (2-3 lines): Open with something exciting or surprising about the city
2. OVERVIEW (4-6 lines): Where it is, how long, what's the vibe, where we're staying
3. HIGHLIGHTS (10-15 lines): Key activities, restaurants, cultural experiences
4. KID MOMENTS (4-6 lines): What each kid will love, call them by name
5. FOOD (3-4 lines): Must-try dishes and restaurants
6. WRAP (2-3 lines): Build anticipation

VISUAL CUE TYPES (for the visual_cue field):
- "text_popup": A fun fact to display as on-screen text (put the fact in ref)
- "kid_callout": A message for a specific kid (put kid name in ref, message in detail)
- "photo": Reference to show a specific photo (put activity name or description in ref)

OUTPUT SCHEMA:
{
  "title": "string — episode title",
  "level": "segment",
  "dialogue": [
    {
      "speaker": "host" | "cohost",
      "text": "string — what they say (under 150 chars)",
      "visual_cue": {  // optional, include on ~40% of lines
        "type": "text_popup" | "kid_callout" | "photo",
        "ref": "string",
        "detail": "string (optional)"
      }
    }
  ],
  "estimated_duration_seconds": number
}`;

async function generateScript(
  data: SegmentData,
  anthropicApiKey: string,
): Promise<PodcastScript> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const dataPrompt = buildScriptPrompt(data);

  console.log('[video-gen] Generating script via Claude...');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Create a podcast script for this travel segment:\n\n${dataPrompt}`,
      },
    ],
    system: SCRIPT_SYSTEM_PROMPT,
  });

  // Extract JSON from response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in Claude response');

  let rawJson = textBlock.text;
  // Strip markdown code fences if present
  const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) rawJson = jsonMatch[1];

  const parsed = JSON.parse(rawJson.trim()) as PodcastScript;

  // Validate basic structure
  if (!parsed.dialogue || !Array.isArray(parsed.dialogue) || parsed.dialogue.length < 5) {
    throw new Error(`Script has too few dialogue lines: ${parsed.dialogue?.length || 0}`);
  }

  console.log(`[video-gen] Script generated: "${parsed.title}" with ${parsed.dialogue.length} lines`);
  return parsed;
}

// ─── Phase 3: Audio Generation ───────────────────────────────────────

const VOICE_MAP: Record<Speaker, 'onyx' | 'nova'> = {
  host: 'onyx',
  cohost: 'nova',
};

async function generateAudio(
  script: PodcastScript,
  videoId: string,
  tripId: string,
  openaiApiKey: string,
): Promise<TripVideoAudioFile[]> {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const audioFiles: TripVideoAudioFile[] = [];
  const AVG_READING_WPM = 150; // words per minute for estimated duration

  console.log(`[video-gen] Generating ${script.dialogue.length} audio clips...`);

  for (let i = 0; i < script.dialogue.length; i++) {
    const line = script.dialogue[i];
    const voice = VOICE_MAP[line.speaker];

    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice,
        input: line.text,
        response_format: 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      // Estimate duration from MP3 file size (128kbps bitrate)
      const durationMs = Math.round((buffer.length / (128000 / 8)) * 1000);

      // Upload to Supabase storage
      const storagePath = `travel/${tripId}/videos/${videoId}/audio/${i.toString().padStart(3, '0')}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from('singularity-uploads')
        .upload(storagePath, buffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`[video-gen] Audio upload failed for line ${i}:`, uploadError.message);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('singularity-uploads')
        .getPublicUrl(storagePath);

      audioFiles.push({
        speaker: line.speaker,
        file_url: urlData.publicUrl,
        duration_ms: durationMs,
        index: i,
      });

      if ((i + 1) % 10 === 0) {
        console.log(`[video-gen] Audio progress: ${i + 1}/${script.dialogue.length}`);
      }
    } catch (err: any) {
      // If TTS fails (quota, rate limit, etc.), fall back to silent mode
      // Estimate duration from word count
      console.warn(`[video-gen] TTS failed for line ${i}, using silent fallback: ${err.message}`);
      const wordCount = line.text.split(/\s+/).length;
      const durationMs = Math.round((wordCount / AVG_READING_WPM) * 60 * 1000);

      audioFiles.push({
        speaker: line.speaker,
        file_url: '', // empty = no audio for this line
        duration_ms: Math.max(durationMs, 2000), // at least 2 seconds
        index: i,
      });

      // If the very first line fails, warn but continue (likely quota issue for all lines)
      if (i === 0) {
        console.warn('[video-gen] TTS quota/key issue — generating silent video with captions only');
      }
    }
  }

  const withAudio = audioFiles.filter(a => a.file_url).length;
  console.log(`[video-gen] Audio complete: ${withAudio}/${audioFiles.length} clips have audio (${audioFiles.length - withAudio} silent)`);
  return audioFiles;
}

// ─── Phase 4: Video Rendering ────────────────────────────────────────

async function renderSegmentVideo(
  script: PodcastScript,
  audioFiles: TripVideoAudioFile[],
  data: SegmentData,
  videoId: string,
  tripId: string,
): Promise<{ videoUrl: string; durationSeconds: number }> {
  const fps = 30;
  const titleFrames = 150; // 5s
  const pauseFrames = 6; // 0.2s gap between lines

  // Calculate total duration
  const audioFrames = audioFiles.reduce((sum, af) => {
    return sum + Math.ceil((af.duration_ms / 1000) * fps) + pauseFrames;
  }, 0);
  const totalFrames = titleFrames + audioFrames + 60; // +2s outro buffer

  const segment = data.segment;
  const startDate = segment.start_date
    ? new Date(segment.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const endDate = segment.end_date
    ? new Date(segment.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const inputProps = {
    segmentName: segment.name || 'Segment Overview',
    segmentDates: startDate && endDate ? `${startDate} – ${endDate}` : '',
    dialogue: script.dialogue,
    audioFiles,
    photos: data.photos.slice(0, 50), // Limit to prevent prop size issues
    heroPhoto: data.heroPhoto,
  };

  console.log(`[video-gen] Rendering video: ${totalFrames} frames (${(totalFrames / fps).toFixed(0)}s)`);

  const outputPath = await renderVideo({
    compositionId: 'SegmentOverview',
    inputProps,
    durationInFrames: totalFrames,
    outputFileName: `${videoId}.mp4`,
  });

  // Upload to Supabase
  const videoBuffer = fs.readFileSync(outputPath);
  const storagePath = `travel/${tripId}/videos/${videoId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from('singularity-uploads')
    .upload(storagePath, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  // Clean up temp file
  try { fs.unlinkSync(outputPath); } catch {}

  if (uploadError) throw new Error(`Video upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('singularity-uploads')
    .getPublicUrl(storagePath);

  const durationSeconds = Math.round(totalFrames / fps);
  return { videoUrl: urlData.publicUrl, durationSeconds };
}

// ─── Main Pipeline ───────────────────────────────────────────────────

export async function generateSegmentVideo(
  tripId: string,
  segmentId: string,
  videoId: string,
  userId: string,
): Promise<void> {
  try {
    // Phase 1: Collect data
    await updateVideoStatus(videoId, 'generating_script');
    const data = await collectSegmentData(tripId, segmentId);

    if (data.photos.length === 0) {
      console.warn('[video-gen] No photos found — video will use solid backgrounds');
    }

    // Phase 2: Generate script
    const anthropicKey = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!anthropicKey) throw new Error('No Anthropic API key configured');

    const script = await generateScript(data, anthropicKey.api_key);
    await updateVideoStatus(videoId, 'generating_audio', {
      script,
      title: script.title,
    });

    // Phase 3: Generate audio
    const openaiKey = await AIAPIKeyService.getActiveKeyForProvider(userId, 'openai');
    if (!openaiKey) throw new Error('No OpenAI API key configured');

    const audioFiles = await generateAudio(script, videoId, tripId, openaiKey.api_key);
    await updateVideoStatus(videoId, 'rendering', { audio_files: audioFiles });

    // Phase 4: Render video
    const { videoUrl, durationSeconds } = await renderSegmentVideo(
      script,
      audioFiles,
      data,
      videoId,
      tripId,
    );

    await updateVideoStatus(videoId, 'complete', {
      video_url: videoUrl,
      duration_seconds: durationSeconds,
      metadata: {
        voice_host: VOICE_MAP.host,
        voice_cohost: VOICE_MAP.cohost,
        photo_count: data.photos.length,
        line_count: script.dialogue.length,
      },
    });

    console.log(`[video-gen] ✓ Video complete: ${videoUrl} (${durationSeconds}s)`);
  } catch (err: any) {
    await failVideo(videoId, err.message || 'Unknown error');
  }
}
