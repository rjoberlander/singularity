"use client";

import { useState } from "react";
import { useSupplements, useSupplementCosts } from "@/hooks/useSupplements";
import { SupplementCard } from "@/components/supplements/SupplementCard";
import { SupplementForm } from "@/components/supplements/SupplementForm";
import { CostSummaryCard } from "@/components/supplements/CostSummaryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Supplement } from "@/types";
import { Plus, Search, Pill, Filter } from "lucide-react";

const CATEGORIES = [
  "All",
  "Vitamin",
  "Mineral",
  "Amino Acid",
  "Herb",
  "Probiotic",
  "Omega",
  "Antioxidant",
  "Hormone",
  "Enzyme",
  "Other",
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function SupplementsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);

  const { data: supplements, isLoading, error } = useSupplements({
    category: selectedCategory === "All" ? undefined : selectedCategory.toLowerCase().replace(" ", "_"),
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const costs = useSupplementCosts(supplements);

  const filteredSupplements = supplements?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (supplement: Supplement) => {
    setEditingSupplement(supplement);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplement(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supplements</h1>
          <p className="text-muted-foreground">Manage your supplement stack</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Supplement
        </Button>
      </div>

      {/* Cost Summary */}
      {supplements && supplements.length > 0 && <CostSummaryCard costs={costs} />}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search supplements..."
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

        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "outline" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className={statusFilter === filter.value ? "border-primary" : ""}
            >
              {filter.label}
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
          <p className="text-destructive">Failed to load supplements</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again
          </p>
        </div>
      ) : filteredSupplements && filteredSupplements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSupplements.map((supplement) => (
            <SupplementCard
              key={supplement.id}
              supplement={supplement}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No supplements yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first supplement to start tracking your stack
          </p>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplement
          </Button>
        </div>
      )}

      {/* Form Dialog */}
      <SupplementForm
        supplement={editingSupplement}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
