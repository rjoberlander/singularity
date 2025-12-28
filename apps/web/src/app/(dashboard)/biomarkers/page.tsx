"use client";

import { useState } from "react";
import Link from "next/link";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { BiomarkerCard } from "@/components/biomarkers/BiomarkerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Activity } from "lucide-react";

const CATEGORIES = [
  "All",
  "Blood",
  "Hormones",
  "Vitamins",
  "Metabolic",
  "Lipids",
  "Thyroid",
  "Liver",
  "Kidney",
];

export default function BiomarkersPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: biomarkers, isLoading, error } = useBiomarkers({
    category: selectedCategory === "All" ? undefined : selectedCategory.toLowerCase(),
  });

  const filteredBiomarkers = biomarkers?.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Biomarkers</h1>
          <p className="text-muted-foreground">Track your health metrics</p>
        </div>
        <Link href="/biomarkers/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Biomarkers
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search biomarkers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[180px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load biomarkers</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again
          </p>
        </div>
      ) : filteredBiomarkers && filteredBiomarkers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBiomarkers.map((biomarker) => (
            <BiomarkerCard key={biomarker.id} biomarker={biomarker} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No biomarkers yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first lab results to start tracking your health
          </p>
          <Link href="/biomarkers/add">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Biomarkers
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
