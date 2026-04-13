import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface SpeakerCaptionProps {
  speaker: 'host' | 'cohost';
  text: string;
  durationInFrames: number;
}

const SPEAKER_COLORS = {
  host: { bg: 'rgba(59, 130, 246, 0.85)', label: 'Alex', accent: '#3b82f6' },
  cohost: { bg: 'rgba(168, 85, 247, 0.85)', label: 'Sam', accent: '#a855f7' },
};

export const SpeakerCaption: React.FC<SpeakerCaptionProps> = ({
  speaker,
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const config = SPEAKER_COLORS[speaker];

  // Slide in from bottom
  const slideIn = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const translateY = interpolate(slideIn, [0, 1], [40, 0]);
  const opacity = interpolate(slideIn, [0, 1], [0, 1]);

  // Fade out near end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 80px 80px',
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: opacity * fadeOut,
          display: 'flex',
          flexDirection: 'column',
          alignItems: speaker === 'host' ? 'flex-start' : 'flex-end',
          width: '100%',
          maxWidth: 1400,
        }}
      >
        {/* Speaker label */}
        <div
          style={{
            backgroundColor: config.accent,
            color: 'white',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '4px 16px',
            borderRadius: '8px 8px 0 0',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {config.label}
        </div>

        {/* Caption text */}
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            fontSize: 36,
            fontWeight: 400,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '20px 32px',
            borderRadius:
              speaker === 'host' ? '0 16px 16px 16px' : '16px 0 16px 16px',
            lineHeight: 1.4,
            maxWidth: '85%',
            borderLeft: speaker === 'host' ? `4px solid ${config.accent}` : 'none',
            borderRight: speaker === 'cohost' ? `4px solid ${config.accent}` : 'none',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
