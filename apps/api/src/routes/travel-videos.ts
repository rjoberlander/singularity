/**
 * Travel Video API Routes
 *
 * Endpoints for generating and managing podcast-style travel videos.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateUser } from '../middleware/auth';
import { generateSegmentVideo } from '../services/video-generation';

const router = Router();

// ─── POST /trips/:tripId/videos/generate ─────────────────────────────
// Creates a video generation job and kicks off the async pipeline

router.post(
  '/trips/:tripId/videos/generate',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user!.id;
      const { tripId } = req.params;
      const { level, segment_id, day_id } = req.body;

      if (!level || !['trip', 'segment', 'day'].includes(level)) {
        return res.status(400).json({
          success: false,
          error: 'level is required and must be trip, segment, or day',
          timestamp: new Date().toISOString(),
        });
      }

      if (level === 'segment' && !segment_id) {
        return res.status(400).json({
          success: false,
          error: 'segment_id is required for segment-level videos',
          timestamp: new Date().toISOString(),
        });
      }

      // Verify trip ownership
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .select('id, user_id')
        .eq('id', tripId)
        .single();

      if (tripErr || !trip) {
        return res.status(404).json({
          success: false,
          error: 'Trip not found',
          timestamp: new Date().toISOString(),
        });
      }

      if (trip.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date().toISOString(),
        });
      }

      // Create video record
      const { data: video, error: createErr } = await supabase
        .from('trip_videos')
        .insert({
          trip_id: tripId,
          user_id: userId,
          segment_id: segment_id || null,
          day_id: day_id || null,
          level,
          status: 'queued',
        })
        .select()
        .single();

      if (createErr || !video) {
        return res.status(500).json({
          success: false,
          error: `Failed to create video record: ${createErr?.message}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Kick off async generation (fire-and-forget)
      if (level === 'segment') {
        generateSegmentVideo(tripId, segment_id, video.id, userId).catch((err) => {
          console.error('[travel-videos] Async generation error:', err);
        });
      }

      res.json({
        success: true,
        data: video,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[travel-videos] POST generate error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// ─── GET /trips/:tripId/videos ───────────────────────────────────────
// List all videos for a trip

router.get(
  '/trips/:tripId/videos',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user!.id;
      const { tripId } = req.params;

      const { data: videos, error } = await supabase
        .from('trip_videos')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: videos || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// ─── GET /trips/:tripId/videos/:videoId ──────────────────────────────
// Get a single video (for polling status)

router.get(
  '/trips/:tripId/videos/:videoId',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user!.id;
      const { videoId } = req.params;

      const { data: video, error } = await supabase
        .from('trip_videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', userId)
        .single();

      if (error || !video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: video,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// ─── DELETE /trips/:tripId/videos/:videoId ───────────────────────────

router.delete(
  '/trips/:tripId/videos/:videoId',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user!.id;
      const { tripId, videoId } = req.params;

      // Get video to find storage paths
      const { data: video } = await supabase
        .from('trip_videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', userId)
        .single();

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete storage files
      const videoPath = `travel/${tripId}/videos/${videoId}.mp4`;
      await supabase.storage.from('singularity-uploads').remove([videoPath]);

      // Delete audio files
      if (video.audio_files && Array.isArray(video.audio_files)) {
        const audioPaths = video.audio_files.map(
          (_: unknown, i: number) =>
            `travel/${tripId}/videos/${videoId}/audio/${i.toString().padStart(3, '0')}.mp3`,
        );
        if (audioPaths.length > 0) {
          await supabase.storage.from('singularity-uploads').remove(audioPaths);
        }
      }

      // Delete DB record
      const { error } = await supabase
        .from('trip_videos')
        .delete()
        .eq('id', videoId);

      if (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
