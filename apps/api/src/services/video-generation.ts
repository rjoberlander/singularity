/**
 * Video Generation Service
 *
 * Four-phase pipeline for creating podcast-style travel videos:
 *   Phase 1 — Data Collection: fetch segment, days, activities, media from Supabase
 *   Phase 2 — Script Generation: Claude produces a two-host podcast script
 *   Phase 3 — Audio Generation: ElevenLabs TTS renders each line with two voices
 *   Phase 4 — Video Rendering: Remotion composes photos + audio + text into MP4
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { supabase } from '../config/supabase';

/** Wrap raw PCM data in a valid WAV header (16-bit, 24kHz, mono — Gemini default) */
function wrapPcmAsWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
  header.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}
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

// Gemini 2.5 TTS voices
const GEMINI_VOICES: Record<Speaker, string> = {
  host: 'Charon',    // deep, warm male
  cohost: 'Kore',    // bright, engaging female
};

/**
 * Generate audio using Gemini 2.5 Pro TTS with multi-speaker single-pass.
 * Sends the full script as a formatted dialogue and gets one combined audio back,
 * then also generates individual line audio for Remotion sequencing.
 */
async function generateAudioGemini(
  script: PodcastScript,
  videoId: string,
  tripId: string,
  apiKey: string,
): Promise<TripVideoAudioFile[]> {
  const audioFiles: TripVideoAudioFile[] = [];
  const AVG_READING_WPM = 150;

  // Gemini TTS has token limits, so we batch lines into chunks of ~8-10 lines
  // and generate each chunk as a multi-speaker dialogue
  const BATCH_SIZE = 8;
  const batches: PodcastScriptLine[][] = [];
  for (let i = 0; i < script.dialogue.length; i += BATCH_SIZE) {
    batches.push(script.dialogue.slice(i, i + BATCH_SIZE));
  }

  console.log(`[video-gen] Generating audio via Gemini TTS: ${script.dialogue.length} lines in ${batches.length} batches...`);

  let globalIndex = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    // Format as multi-speaker dialogue
    const dialogueText = batch.map((line) => {
      const speakerLabel = line.speaker === 'host' ? 'Alex' : 'Sam';
      return `${speakerLabel}: ${line.text}`;
    }).join('\n');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: dialogueText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: [
                    { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICES.host } } },
                    { speaker: 'Sam', voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICES.cohost } } },
                  ],
                },
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini TTS ${response.status}: ${errText.slice(0, 200)}`);
      }

      const result = await response.json() as any;
      const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!audioData) {
        throw new Error('No audio data in Gemini response');
      }

      // Decode base64 audio (Gemini returns raw PCM as base64 — needs WAV header)
      const rawPcm = Buffer.from(audioData, 'base64');
      const audioBuffer = wrapPcmAsWav(rawPcm);

      // Total duration from PCM data (16-bit, 24kHz, mono)
      const totalDurationMs = Math.round((rawPcm.length / (24000 * 2)) * 1000);

      // Upload the batch audio
      const storagePath = `travel/${tripId}/videos/${videoId}/audio/batch_${batchIdx.toString().padStart(2, '0')}.wav`;
      const { error: uploadError } = await supabase.storage
        .from('singularity-uploads')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/wav',
          upsert: true,
        });

      if (uploadError) throw new Error(`Audio upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('singularity-uploads')
        .getPublicUrl(storagePath);

      // Distribute duration across lines proportionally by word count
      const wordCounts = batch.map(l => l.text.split(/\s+/).length);
      const totalWords = wordCounts.reduce((a, b) => a + b, 0);

      // For the first line in the batch, use the full batch audio URL
      // For subsequent lines, use empty URL (Remotion will use the batch audio)
      // Actually: we put the same batch URL for all lines but assign proportional durations
      for (let j = 0; j < batch.length; j++) {
        const lineDurationMs = Math.round((wordCounts[j] / totalWords) * totalDurationMs);

        audioFiles.push({
          speaker: batch[j].speaker,
          file_url: j === 0 ? urlData.publicUrl : '', // only first line in batch has the audio
          duration_ms: Math.max(lineDurationMs, 1500),
          index: globalIndex,
        });
        globalIndex++;
      }

      console.log(`[video-gen] Batch ${batchIdx + 1}/${batches.length} complete (${totalDurationMs}ms, ${batch.length} lines)`);
    } catch (err: any) {
      console.warn(`[video-gen] Gemini TTS batch ${batchIdx} failed: ${err.message}`);

      // Fallback: silent mode for this batch
      for (let j = 0; j < batch.length; j++) {
        const wordCount = batch[j].text.split(/\s+/).length;
        const durationMs = Math.round((wordCount / AVG_READING_WPM) * 60 * 1000);
        audioFiles.push({
          speaker: batch[j].speaker,
          file_url: '',
          duration_ms: Math.max(durationMs, 2000),
          index: globalIndex,
        });
        globalIndex++;
      }
    }
  }

  const withAudio = audioFiles.filter(a => a.file_url).length;
  console.log(`[video-gen] Audio complete: ${withAudio} batches with audio out of ${audioFiles.length} total lines`);
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

    // Phase 3: Generate audio via Gemini 2.5 TTS (multi-speaker single-pass)
    const googleAiKey = await AIAPIKeyService.getActiveKeyForProvider(userId, 'google_ai');
    const geminiApiKey = googleAiKey?.api_key || process.env.GOOGLE_AI_API_KEY;
    if (!geminiApiKey) throw new Error('No Google AI API key configured');

    const audioFiles = await generateAudioGemini(script, videoId, tripId, geminiApiKey);
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
        voice_host: GEMINI_VOICES.host,
        voice_cohost: GEMINI_VOICES.cohost,
        tts_provider: 'gemini',
        photo_count: data.photos.length,
        line_count: script.dialogue.length,
      },
    });

    console.log(`[video-gen] ✓ Video complete: ${videoUrl} (${durationSeconds}s)`);
  } catch (err: any) {
    await failVideo(videoId, err.message || 'Unknown error');
  }
}
