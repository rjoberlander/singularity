"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { TripDetails2Content } from "@/components/travel/TripDetails2Content";

export default function TripDetails2Page() {
  const params = useParams();
  const tripId = params.id as string;
  const { data: trip } = useTripFull(tripId);
  if (!trip) return null;
  return <TripDetails2Content trip={trip} tripId={tripId} />;
}
