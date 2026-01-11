"use client";

import { useParams } from "next/navigation";
import { useTripFull } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Images,
  Plus,
} from "lucide-react";

export default function TripMediaPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Photos & Media</h2>
          <p className="text-sm text-muted-foreground">
            Trip photos and documents
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </div>

      {trip.media && trip.media.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trip.media.map((media) => (
            <div
              key={media.id}
              className="aspect-square rounded-lg overflow-hidden bg-muted"
            >
              {media.media_type === "image" ? (
                <img
                  src={media.thumbnail_url || media.file_url}
                  alt={media.caption || "Trip photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Images className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Images className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No media yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Upload photos and documents for your trip
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload First Photo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
