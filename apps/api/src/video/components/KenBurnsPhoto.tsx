import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';

interface KenBurnsPhotoProps {
  src: string;
  durationInFrames: number;
  direction?: 'zoom-in' | 'zoom-out';
}

export const KenBurnsPhoto: React.FC<KenBurnsPhotoProps> = ({
  src,
  durationInFrames,
  direction = 'zoom-in',
}) => {
  const frame = useCurrentFrame();

  const scale = direction === 'zoom-in'
    ? interpolate(frame, [0, durationInFrames], [1, 1.15], {
        extrapolateRight: 'clamp',
      })
    : interpolate(frame, [0, durationInFrames], [1.15, 1], {
        extrapolateRight: 'clamp',
      });

  // Subtle pan
  const translateX = interpolate(frame, [0, durationInFrames], [0, direction === 'zoom-in' ? -20 : 20], {
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [0, durationInFrames], [0, -10], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          overflow: 'hidden',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>
      {/* Dark gradient overlay for text readability */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.8) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
