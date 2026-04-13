"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { StoryViewer } from "@/components/travel/stories/StoryViewer";

export default function TripStoriesPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: trip } = useTripFull(tripId);
  if (!trip) return null;
  return <StoryViewer trip={trip as any} tripId={tripId} />;
}
