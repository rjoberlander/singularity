"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  useEffect(() => {
    router.replace(`/travel/${tripId}/details`);
  }, [tripId, router]);

  return null;
}
