"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { StoryViewer } from "@/components/travel/stories/StoryViewer";
import { Loader2 } from "lucide-react";

export default function TripStoriesPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: trip, isLoading, error } = useTripFull(tripId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-black text-white gap-4">
        <p className="text-white/60 text-sm">
          {error ? "Failed to load trip data" : "Trip not found"}
        </p>
        <a
          href={`/travel/${tripId}/browse`}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors"
        >
          Back to trip
        </a>
      </div>
    );
  }

  return <StoryViewer trip={trip as any} tripId={tripId} />;
}
