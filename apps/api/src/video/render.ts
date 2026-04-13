import path from 'path';
import fs from 'fs';
import os from 'os';

// Cached bundle path — bundle() is expensive, only do it once per process
let cachedBundlePath: string | null = null;

export async function getBundlePath(): Promise<string> {
  if (cachedBundlePath && fs.existsSync(cachedBundlePath)) {
    return cachedBundlePath;
  }

  const { bundle } = await import('@remotion/bundler');
  const entryPoint = path.join(__dirname, 'Root.tsx');

  console.log('[video-render] Bundling Remotion compositions from:', entryPoint);
  const bundlePath = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });
  console.log('[video-render] Bundle created at:', bundlePath);

  cachedBundlePath = bundlePath;
  return bundlePath;
}

export interface RenderVideoOptions {
  compositionId: string;
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  outputFileName?: string;
}

export async function renderVideo(options: RenderVideoOptions): Promise<string> {
  const { compositionId, inputProps, durationInFrames, outputFileName } = options;

  const { renderMedia, selectComposition } = await import('@remotion/renderer');

  const bundlePath = await getBundlePath();

  // Create temp output path
  const tmpDir = path.join(os.tmpdir(), 'singularity-video');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const outputPath = path.join(tmpDir, outputFileName || `${compositionId}-${Date.now()}.mp4`);

  console.log('[video-render] Selecting composition:', compositionId);
  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: compositionId,
    inputProps,
  });

  // Override duration with our calculated value
  const compositionWithDuration = {
    ...composition,
    durationInFrames,
  };

  console.log('[video-render] Rendering video:', {
    compositionId,
    durationInFrames,
    outputPath,
  });

  await renderMedia({
    composition: compositionWithDuration,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    // Compress output to stay under Supabase 50MB limit
    crf: 28,
    scale: 0.667, // Render at 1280x720 instead of 1920x1080
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
  });

  console.log('[video-render] Render complete:', outputPath);
  return outputPath;
}
