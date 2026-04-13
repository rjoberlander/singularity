import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { SegmentOverview } from './SegmentOverview';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SegmentOverviewAny = SegmentOverview as React.FC<any>;

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SegmentOverview"
        component={SegmentOverviewAny}
        durationInFrames={30 * 60}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          segmentName: 'Lisbon',
          segmentDates: 'Jun 15–18, 2026',
          dialogue: [],
          audioFiles: [],
          photos: [],
          heroPhoto: '',
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
