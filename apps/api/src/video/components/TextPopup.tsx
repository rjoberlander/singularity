import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface TextPopupProps {
  text: string;
  durationInFrames: number;
}

export const TextPopup: React.FC<TextPopupProps> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pop in with spring
  const popIn = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 120, mass: 0.8 } });
  const scale = frame > 10 ? interpolate(popIn, [0, 1], [0.5, 1]) : 0;
  const opacity = frame > 10 ? interpolate(popIn, [0, 1], [0, 1]) : 0;

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '80px 60px',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: opacity * fadeOut,
          backgroundColor: 'rgba(245, 158, 11, 0.95)',
          color: '#1a1a2e',
          fontSize: 24,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '16px 24px',
          borderRadius: 16,
          maxWidth: 500,
          lineHeight: 1.4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
          Did you know?
        </div>
        {text}
      </div>
    </AbsoluteFill>
  );
};
