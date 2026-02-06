"use client";

import { useState } from "react";
import { usePublicRVLocations } from "@/lib/api";
import { RVLocationsListView } from "@/components/rv-locations/RVLocationsListView";
import { RVLocationCategory, RVLocationStatus } from "@singularity/shared-types";

export default function PublicRVLocationsPage() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<RVLocationStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RVLocationCategory | null>(null);

  const { data: locations, isLoading } = usePublicRVLocations({
    status: selectedStatus || undefined,
    category: selectedCategory || undefined,
    search: search || undefined,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-6">
        <RVLocationsListView
          locations={locations || []}
          isLoading={isLoading}
          readOnly={true}
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          baseLocationPath="/rv-locations"
        />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 mt-8 border-t">
          <p>Shared via Singularity</p>
        </div>
      </div>
    </div>
  );
}
