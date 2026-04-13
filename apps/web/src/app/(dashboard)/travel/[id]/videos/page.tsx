"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { TripVideosContent } from "@/components/travel/TripVideosContent";

export default function TripVideosPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: trip, isLoading } = useTripFull(tripId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20 text-gray-500">Trip not found</div>
    );
  }

  return <TripVideosContent trip={trip} />;
}
