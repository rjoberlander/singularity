import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface TitleCardProps {
  title: string;
  subtitle: string;
  backgroundPhoto: string;
  durationInFrames: number;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  subtitle,
  backgroundPhoto,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow zoom on background
  const bgScale = interpolate(frame, [0, durationInFrames], [1, 1.1], {
    extrapolateRight: 'clamp',
  });

  // Title springs in
  const titleSpring = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtitle fades in after title
  const subtitleSpring = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 80 } });
  const subtitleOpacity = frame > 15 ? interpolate(subtitleSpring, [0, 1], [0, 1]) : 0;
  const subtitleY = frame > 15 ? interpolate(subtitleSpring, [0, 1], [30, 0]) : 30;

  // Fade out near end
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Background image */}
      {backgroundPhoto && (
        <AbsoluteFill
          style={{ transform: `scale(${bgScale})`, overflow: 'hidden' }}
        >
          <Img
            src={backgroundPhoto}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </AbsoluteFill>
      )}

      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Title content */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 120px',
        }}
      >
        {/* Decorative line */}
        <div
          style={{
            width: interpolate(titleSpring, [0, 1], [0, 120]),
            height: 3,
            backgroundColor: '#f59e0b',
            marginBottom: 40,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 300,
            color: '#e2e8f0',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginTop: 20,
            transform: `translateY(${subtitleY}px)`,
            opacity: subtitleOpacity,
            letterSpacing: '0.1em',
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
