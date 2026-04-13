import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface KidCalloutProps {
  kidName: string;
  text: string;
  durationInFrames: number;
}

const KID_COLORS: Record<string, { bg: string; emoji: string }> = {
  Parker: { bg: 'rgba(34, 197, 94, 0.95)', emoji: '🎯' },
  Charlotte: { bg: 'rgba(236, 72, 153, 0.95)', emoji: '🎨' },
  Xander: { bg: 'rgba(59, 130, 246, 0.95)', emoji: '🚀' },
};

export const KidCallout: React.FC<KidCalloutProps> = ({
  kidName,
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = KID_COLORS[kidName] || { bg: 'rgba(99, 102, 241, 0.95)', emoji: '⭐' };

  // Bounce in
  const bounceIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 10, stiffness: 150, mass: 0.6 },
  });
  const scale = frame > 8 ? interpolate(bounceIn, [0, 1], [0.3, 1]) : 0;
  const opacity = frame > 8 ? interpolate(bounceIn, [0, 1], [0, 1]) : 0;

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
        justifyContent: 'flex-start',
        padding: '80px 60px',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: opacity * fadeOut,
          backgroundColor: colors.bg,
          color: 'white',
          fontSize: 26,
          fontWeight: 500,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px 28px',
          borderRadius: 20,
          maxWidth: 480,
          lineHeight: 1.4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.05em',
            marginBottom: 10,
            textTransform: 'uppercase',
          }}
        >
          {colors.emoji} {kidName}
        </div>
        {text}
      </div>
    </AbsoluteFill>
  );
};
