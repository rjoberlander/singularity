"use client";

import React, { useEffect, useState } from "react";
import {
  PlayCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Film,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTripVideos,
  useGenerateVideo,
  useDeleteVideo,
  useTripVideo,
} from "@/lib/api";
import type {
  Trip,
  TripSegment,
  TripVideo,
  TripVideoStatus,
} from "@singularity/shared-types";
import { useQueryClient } from "@tanstack/react-query";

interface TripVideosContentProps {
  trip: Trip & { segments?: TripSegment[] };
}

const STATUS_CONFIG: Record<
  TripVideoStatus,
  { label: string; icon: React.ElementType; color: string; animate?: boolean }
> = {
  queued: { label: "Queued", icon: Clock, color: "text-gray-500" },
  generating_script: {
    label: "Writing Script",
    icon: Loader2,
    color: "text-blue-500",
    animate: true,
  },
  generating_audio: {
    label: "Generating Audio",
    icon: Loader2,
    color: "text-purple-500",
    animate: true,
  },
  rendering: {
    label: "Rendering Video",
    icon: Loader2,
    color: "text-amber-500",
    animate: true,
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  failed: { label: "Failed", icon: AlertCircle, color: "text-red-500" },
};

function VideoStatusBadge({ status }: { status: TripVideoStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.color}`}>
      <Icon className={`h-4 w-4 ${config.animate ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

function VideoCard({
  video,
  tripId,
  onDelete,
}: {
  video: TripVideo;
  tripId: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const isInProgress = ["queued", "generating_script", "generating_audio", "rendering"].includes(
    video.status
  );

  // Poll for updates while in progress
  const { data: liveVideo } = useTripVideo(tripId, video.id);
  const displayVideo = liveVideo || video;

  useEffect(() => {
    if (!isInProgress) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ["travel", "trips", tripId, "videos", video.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["travel", "trips", tripId, "videos"],
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isInProgress, tripId, video.id, queryClient]);

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Video player or status */}
      {displayVideo.status === "complete" && displayVideo.video_url ? (
        <div className="relative bg-black aspect-video">
          <video
            src={displayVideo.video_url}
            controls
            className="w-full h-full"
            poster={displayVideo.thumbnail_url || undefined}
            data-testid="video-player"
          />
        </div>
      ) : (
        <div className="bg-slate-50 aspect-video flex flex-col items-center justify-center gap-3">
          <VideoStatusBadge status={displayVideo.status as TripVideoStatus} />
          {displayVideo.status === "failed" && displayVideo.error_message && (
            <p className="text-xs text-red-400 max-w-md text-center px-4">
              {displayVideo.error_message}
            </p>
          )}
          {isInProgress && (
            <p className="text-xs text-gray-400">This may take a few minutes...</p>
          )}
        </div>
      )}

      {/* Info bar */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            {displayVideo.title || `${displayVideo.level} overview`}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <VideoStatusBadge status={displayVideo.status as TripVideoStatus} />
            {displayVideo.duration_seconds && (
              <span className="text-xs text-gray-400">
                {Math.floor(displayVideo.duration_seconds / 60)}:
                {String(Math.round(displayVideo.duration_seconds % 60)).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-400 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TripVideosContent({ trip }: TripVideosContentProps) {
  const tripId = trip.id;
  const { data: videos, isLoading } = useTripVideos(tripId);
  const generateVideo = useGenerateVideo();
  const deleteVideo = useDeleteVideo();
  const segments = trip.segments || [];

  const handleGenerate = (segmentId: string) => {
    generateVideo.mutate({
      tripId,
      level: "segment",
      segment_id: segmentId,
    });
  };

  const handleDelete = (videoId: string) => {
    if (confirm("Delete this video? This cannot be undone.")) {
      deleteVideo.mutate({ tripId, videoId });
    }
  };

  // Group videos by segment
  const videosBySegment = new Map<string, TripVideo[]>();
  (videos || []).forEach((v) => {
    const key = v.segment_id || "trip";
    if (!videosBySegment.has(key)) videosBySegment.set(key, []);
    videosBySegment.get(key)!.push(v);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-blue-600" />
            Trip Videos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate podcast-style videos with two AI hosts discussing your trip
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {segments.map((segment) => {
            const segmentVideos = videosBySegment.get(segment.id) || [];
            const hasActiveJob = segmentVideos.some(
              (v) =>
                v.status !== "complete" && v.status !== "failed"
            );

            return (
              <div key={segment.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{segment.name}</h2>
                    <p className="text-xs text-gray-400">
                      {segment.start_date} — {segment.end_date}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerate(segment.id)}
                    disabled={generateVideo.isPending || hasActiveJob}
                    size="sm"
                    data-testid={`generate-video-${segment.id}`}
                  >
                    {generateVideo.isPending || hasActiveJob ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Generate Segment Overview
                  </Button>
                </div>

                {segmentVideos.length > 0 ? (
                  <div className="grid gap-4">
                    {segmentVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        tripId={tripId}
                        onDelete={() => handleDelete(video.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center text-gray-400">
                    <Film className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">
                      No videos yet. Click &quot;Generate Segment Overview&quot; to create one.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {segments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No segments found. Add segments to your trip first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
