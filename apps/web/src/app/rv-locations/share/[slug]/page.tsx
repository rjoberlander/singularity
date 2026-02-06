"use client";

import { useParams } from "next/navigation";
import { usePublicRVLocation } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RVLocationDetailView } from "@/components/rv-locations/RVLocationDetailView";

export default function PublicRVLocationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: location, isLoading, error } = usePublicRVLocation(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Link Not Found</h1>
            <p className="text-muted-foreground">
              This share link is invalid or has been revoked.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <RVLocationDetailView
          location={{
            id: location.id,
            name: location.name,
            description: location.description,
            hook: location.hook,
            category: location.category,
            land_type: location.land_type,
            status: location.status,
            city: location.city,
            state: location.state,
            address: location.address,
            drive_time_from_la: location.drive_time_from_la,
            cost_per_night: location.cost_per_night,
            cost_notes: location.cost_notes,
            reservation_required: location.reservation_required,
            reservation_notes: location.reservation_notes,
            website: location.website,
            phone: location.phone,
            notes: location.notes,
            google_place_id: location.google_place_id,
            google_rating: location.google_rating,
            google_review_count: location.google_review_count,
            tags: location.tags,
            pros: location.pros,
            cons: location.cons,
            vibe: location.vibe as Record<string, number> | null,
            rv_logistics: location.rv_logistics as Record<string, any> | null,
            best_season: location.best_season as { best?: string[]; avoid?: string[]; notes?: string } | null,
            educational_value: (location as any).educational_value,
            kid_engagement: (location as any).kid_engagement,
            reviews_summary: (location as any).reviews_summary,
            reviews_highlights: (location as any).reviews_highlights,
            enriched_at: (location as any).enriched_at,
            activities: location.activities,
            media: location.media,
          }}
          readOnly={true}
        />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 mt-8 border-t">
          <p>Shared via Singularity</p>
        </div>
      </div>
    </div>
  );
}
