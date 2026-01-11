"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateTrip } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plane, Car, Users } from "lucide-react";
import { toast } from "sonner";
import { CreateTripRequest, TripStatus, TripTransportationType } from "@singularity/shared-types";

export default function NewTripPage() {
  const router = useRouter();
  const createTrip = useCreateTrip();

  const [formData, setFormData] = useState<CreateTripRequest>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    origin: "",
    destination: "",
    transportation_type: undefined,
    traveler_count: 1,
    status: "planning",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      const trip = await createTrip.mutateAsync(formData);
      toast.success("Trip created successfully!");
      router.push(`/travel/${trip.id}`);
    } catch (error) {
      toast.error("Failed to create trip");
    }
  };

  const handleChange = (field: keyof CreateTripRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/travel">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Trip</h1>
          <p className="text-muted-foreground">Plan your next adventure</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>
              Enter the basic information about your trip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trip Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Trip Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Portugal Adventure 2025"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your trip..."
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange("end_date", e.target.value)}
                  min={formData.start_date}
                  required
                />
              </div>
            </div>

            {/* Origin & Destination */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input
                  id="origin"
                  placeholder="e.g., San Francisco"
                  value={formData.origin || ""}
                  onChange={(e) => handleChange("origin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Lisbon, Portugal"
                  value={formData.destination || ""}
                  onChange={(e) => handleChange("destination", e.target.value)}
                />
              </div>
            </div>

            {/* Transportation Type */}
            <div className="space-y-2">
              <Label>Transportation</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={formData.transportation_type === "flying" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => handleChange("transportation_type", "flying")}
                >
                  <Plane className="h-4 w-4 mr-2" />
                  Flying
                </Button>
                <Button
                  type="button"
                  variant={formData.transportation_type === "driving" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => handleChange("transportation_type", "driving")}
                >
                  <Car className="h-4 w-4 mr-2" />
                  Driving
                </Button>
                <Button
                  type="button"
                  variant={formData.transportation_type === "both" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => handleChange("transportation_type", "both")}
                >
                  <div className="flex items-center gap-1 mr-2">
                    <Plane className="h-4 w-4" />
                    <Car className="h-4 w-4" />
                  </div>
                  Both
                </Button>
              </div>
            </div>

            {/* Travelers */}
            <div className="space-y-2">
              <Label htmlFor="traveler_count">Number of Travelers</Label>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="traveler_count"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.traveler_count || 1}
                  onChange={(e) => handleChange("traveler_count", parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">people</span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value as TripStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Link href="/travel">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createTrip.isPending}>
            {createTrip.isPending ? "Creating..." : "Create Trip"}
          </Button>
        </div>
      </form>
    </div>
  );
}
