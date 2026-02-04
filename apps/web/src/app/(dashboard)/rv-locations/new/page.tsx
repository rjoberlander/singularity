"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRVLocation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Tent } from "lucide-react";
import { toast } from "sonner";
import {
  RVLocationCategory,
  RVLocationStatus,
  CreateRVLocationRequest,
} from "@singularity/shared-types";
import Link from "next/link";

const CATEGORY_OPTIONS: { value: RVLocationCategory; label: string }[] = [
  { value: "national_parks", label: "National Parks" },
  { value: "state_parks", label: "State Parks" },
  { value: "harvest_hosts", label: "Harvest Hosts" },
  { value: "hot_springs", label: "Hot Springs" },
  { value: "lake_river", label: "Lake/River" },
  { value: "boondocking", label: "Boondocking" },
  { value: "couples_getaway", label: "Couples Getaway" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: RVLocationStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "want_to_visit", label: "Want to Visit" },
  { value: "visited", label: "Visited" },
  { value: "not_interested", label: "Not Interested" },
];

export default function NewRVLocationPage() {
  const router = useRouter();
  const createLocation = useCreateRVLocation();

  const [formData, setFormData] = useState<CreateRVLocationRequest>({
    name: "",
    description: "",
    hook: "",
    category: undefined,
    location_name: "",
    city: "",
    state: "",
    drive_time_from_la: "",
    website: "",
    status: "researching",
    tags: [],
  });

  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const location = await createLocation.mutateAsync({
        ...formData,
        tags,
      });

      toast.success("Location created");
      router.push(`/rv-locations/${location.id}`);
    } catch {
      toast.error("Failed to create location");
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/rv-locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tent className="h-6 w-6" />
            New RV Location
          </h1>
          <p className="text-muted-foreground">Add a new camping destination</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Death Valley National Park"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook">The Hook</Label>
            <Input
              id="hook"
              value={formData.hook || ""}
              onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
              placeholder="1-2 sentence compelling reason to visit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the location..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as RVLocationCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || "researching"}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as RVLocationStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Location</h2>

          <div className="space-y-2">
            <Label htmlFor="location_name">Location Name</Label>
            <Input
              id="location_name"
              value={formData.location_name || ""}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="e.g., Furnace Creek Campground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Death Valley"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state || ""}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g., CA"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drive_time">Drive Time from LA</Label>
            <Input
              id="drive_time"
              value={formData.drive_time_from_la || ""}
              onChange={(e) => setFormData({ ...formData, drive_time_from_la: e.target.value })}
              placeholder="e.g., 4-5 hours"
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Additional Information</h2>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website || ""}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., dog-friendly, lakefront, scenic"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createLocation.isPending} className="flex-1">
            {createLocation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Location"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
