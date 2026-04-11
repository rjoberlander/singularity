"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { TripBrowseContent } from "@/components/travel/TripBrowseContent";

export default function TripBrowsePage() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: trip } = useTripFull(tripId);
  if (!trip) return null;
  return <TripBrowseContent trip={trip} tripId={tripId} />;
}
