"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupplements, useSupplementCosts } from "@/hooks/useSupplements";
import { SupplementCard } from "@/components/supplements/SupplementCard";
import { SupplementForm } from "@/components/supplements/SupplementForm";
import { SupplementChatInput } from "@/components/supplements/SupplementChatInput";
import { SupplementExtractionModal } from "@/components/supplements/SupplementExtractionModal";
import { SupplementUrlModal } from "@/components/supplements/SupplementUrlModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Supplement } from "@/types";
import {
  Plus,
  Search,
  Pill,
  ChevronUp,
  ChevronDown,
  Droplet,
  Atom,
  TreeDeciduous,
  Bug,
  Fish,
  Apple,
  Moon,
  Zap,
  MoreHorizontal,
  LucideIcon,
  Link2,
} from "lucide-react";

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

// Category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Vitamin: Pill,
  Mineral: Droplet,
  "Amino Acid": Atom,
  Herb: TreeDeciduous,
  Probiotic: Bug,
  Omega: Fish,
  Antioxidant: Apple,
  Hormone: Moon,
  Enzyme: Zap,
  Other: MoreHorizontal,
};

// Category colors for button backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  All: "rgba(107, 142, 90, 0.2)",
  Vitamin: "rgba(234, 179, 8, 0.2)",
  Mineral: "rgba(59, 130, 246, 0.2)",
  "Amino Acid": "rgba(139, 92, 246, 0.2)",
  Herb: "rgba(34, 197, 94, 0.2)",
  Probiotic: "rgba(236, 72, 153, 0.2)",
  Omega: "rgba(20, 184, 166, 0.2)",
  Antioxidant: "rgba(239, 68, 68, 0.2)",
  Hormone: "rgba(168, 85, 247, 0.2)",
  Enzyme: "rgba(249, 115, 22, 0.2)",
  Other: "rgba(107, 114, 128, 0.2)",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function SupplementsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [extractionInput, setExtractionInput] = useState<{ text?: string; file?: File; url?: string } | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  const { data: supplements, isLoading, error, refetch } = useSupplements({
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

  const handleChatSubmit = (data: { text?: string; file?: File; url?: string }) => {
    setExtractionInput(data);
    setIsProcessing(true);
    setIsExtractionModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsExtractionModalOpen(open);
    if (!open) {
      setExtractionInput(undefined);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h1 className="text-2xl font-semibold">Supplements</h1>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Filter Bar - Categories */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => {
                  const IconComponent = CATEGORY_ICONS[category];
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      className="px-2"
                      onClick={() => setSelectedCategory(category)}
                      style={selectedCategory !== category ? { backgroundColor: CATEGORY_COLORS[category] } : undefined}
                    >
                      {IconComponent && <IconComponent className="w-3.5 h-3.5 mr-1" />}
                      {category}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex gap-4">
              {/* Left Sidebar */}
              <div className="w-52 flex-shrink-0 space-y-4">
                {/* Supplement Cost Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SUPPLEMENT COSTS</h3>
                  {supplements && supplements.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {costs.activeCount} active / {costs.totalCount} total
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Monthly</span>
                          <span className="text-lg font-bold">${costs.monthly.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Yearly</span>
                          <span className="text-sm font-medium text-muted-foreground">${costs.yearly.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Daily</span>
                          <span className="text-sm font-medium text-muted-foreground">${costs.daily.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No supplements yet. Add supplements to track costs.
                    </p>
                  )}
                </div>

                {/* Status Filter */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">STATUS</h3>
                  <div className="flex flex-col gap-1">
                    {STATUS_FILTERS.map((filter) => (
                      <Button
                        key={filter.value}
                        variant={statusFilter === filter.value ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start h-7"
                        onClick={() => setStatusFilter(filter.value)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Chat Input - AI Quick Add */}
                <div className="pt-2">
                  <SupplementChatInput onSubmit={handleChatSubmit} isProcessing={isProcessing} />
                </div>

                {/* Add from URL Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsUrlModalOpen(true)}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Add from URL
                  </Button>
                </div>

                {/* Add Manually Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <Link href="/supplements/add">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Content - Supplement Cards */}
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">ALL SUPPLEMENTS</h3>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                    <Button asChild>
                      <Link href="/supplements/add">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Supplement
                      </Link>
                    </Button>
                  </div>
                )}

                {filteredSupplements && filteredSupplements.length === 0 && supplements && supplements.length > 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No supplements match your current filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <SupplementForm
        supplement={editingSupplement}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* Extraction Modal */}
      <SupplementExtractionModal
        open={isExtractionModalOpen}
        onOpenChange={handleModalClose}
        onSuccess={() => refetch()}
        initialInput={extractionInput}
      />

      {/* URL Modal */}
      <SupplementUrlModal
        open={isUrlModalOpen}
        onOpenChange={setIsUrlModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
