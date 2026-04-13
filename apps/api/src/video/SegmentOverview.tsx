import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  Audio,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { KenBurnsPhoto } from './components/KenBurnsPhoto';
import { TitleCard } from './components/TitleCard';
import { SpeakerCaption } from './components/SpeakerCaption';
import { TextPopup } from './components/TextPopup';
import { KidCallout } from './components/KidCallout';

interface DialogueLine {
  speaker: 'host' | 'cohost';
  text: string;
  visual_cue?: {
    type: 'photo' | 'video' | 'map' | 'text_popup' | 'kid_callout' | 'title_card';
    ref: string;
    detail?: string;
  };
}

interface AudioFileEntry {
  speaker: 'host' | 'cohost';
  file_url: string;
  duration_ms: number;
  index: number;
}

export interface SegmentOverviewProps {
  segmentName: string;
  segmentDates: string;
  dialogue: DialogueLine[];
  audioFiles: AudioFileEntry[];
  photos: string[]; // array of photo URLs
  heroPhoto: string; // main segment photo
}

const TITLE_DURATION_FRAMES = 150; // 5 seconds at 30fps
const PAUSE_FRAMES = 6; // 0.2s gap between lines

export const SegmentOverview: React.FC<SegmentOverviewProps> = ({
  segmentName,
  segmentDates,
  dialogue,
  audioFiles,
  photos,
  heroPhoto,
}) => {
  const { fps } = useVideoConfig();

  // Build frame timeline from audio durations
  const timeline: Array<{
    startFrame: number;
    durationFrames: number;
    line: DialogueLine;
    audioFile: AudioFileEntry;
    photoUrl: string;
  }> = [];

  let currentFrame = TITLE_DURATION_FRAMES;

  dialogue.forEach((line, i) => {
    const audioFile = audioFiles[i];
    if (!audioFile) return;

    const durationFrames = Math.ceil((audioFile.duration_ms / 1000) * fps);

    // Pick a photo: try to match visual_cue ref to a photo, otherwise cycle
    let photoUrl = photos[i % Math.max(photos.length, 1)] || heroPhoto;
    if (line.visual_cue?.type === 'photo' && line.visual_cue.ref) {
      // ref might be a URL or an activity ID — if it looks like a URL, use it
      if (line.visual_cue.ref.startsWith('http')) {
        photoUrl = line.visual_cue.ref;
      }
    }

    timeline.push({
      startFrame: currentFrame,
      durationFrames,
      line,
      audioFile,
      photoUrl,
    });

    currentFrame += durationFrames + PAUSE_FRAMES;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      {/* Title card */}
      <Sequence from={0} durationInFrames={TITLE_DURATION_FRAMES}>
        <TitleCard
          title={segmentName}
          subtitle={segmentDates}
          backgroundPhoto={heroPhoto}
          durationInFrames={TITLE_DURATION_FRAMES}
        />
      </Sequence>

      {/* Dialogue sequences */}
      {timeline.map((entry, i) => (
        <Sequence
          key={i}
          from={entry.startFrame}
          durationInFrames={entry.durationFrames}
        >
          {/* Background photo with Ken Burns */}
          <KenBurnsPhoto
            src={entry.photoUrl}
            durationInFrames={entry.durationFrames}
            direction={i % 2 === 0 ? 'zoom-in' : 'zoom-out'}
          />

          {/* Audio narration (if available — may be silent in fallback mode) */}
          {entry.audioFile.file_url ? (
            <Audio src={entry.audioFile.file_url} volume={1} />
          ) : null}

          {/* Speaker caption */}
          <SpeakerCaption
            speaker={entry.line.speaker}
            text={entry.line.text}
            durationInFrames={entry.durationFrames}
          />

          {/* Text popup overlays */}
          {entry.line.visual_cue?.type === 'text_popup' && (
            <TextPopup
              text={entry.line.visual_cue.ref}
              durationInFrames={entry.durationFrames}
            />
          )}

          {/* Kid callout overlays */}
          {entry.line.visual_cue?.type === 'kid_callout' && (
            <KidCallout
              kidName={entry.line.visual_cue.ref}
              text={entry.line.visual_cue.detail || ''}
              durationInFrames={entry.durationFrames}
            />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
