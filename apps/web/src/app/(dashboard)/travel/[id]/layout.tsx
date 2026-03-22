"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  useTripFull,
  useUpdateTrip,
  useDeleteTrip,
  useUpdateTripStatus,
  getTripStatusColor,
  getTripStatusLabel,
  formatTripDateRange,
  calculateTripDuration,
  API_URL,
} from "@/lib/api";
import type { Trip } from "@singularity/shared-types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Plane,
  Car,
  Hotel,
  Edit,
  Trash2,
  Share2,
  CalendarDays,
  ListTodo,
  Images,
  Layers,
  FileText,
  Clock,
  Wand2,
  Loader2,
  ClipboardCheck,
  ShieldCheck,
  X,
  Check,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "details", label: "Details", icon: FileText, href: "/details" },
  { value: "plan", label: "Plan", icon: ClipboardCheck, href: "/plan" },
  { value: "overview", label: "Overview", icon: Layers, href: "/overview" },
  { value: "itinerary", label: "Itinerary", icon: CalendarDays, href: "/itinerary" },
  { value: "validation", label: "Validation", icon: ShieldCheck, href: "/validation" },
  { value: "flights", label: "Flights", icon: Plane, href: "/flights" },
  { value: "lodging", label: "Lodging", icon: Hotel, href: "/lodging" },
  { value: "packing", label: "Packing", icon: ListTodo, href: "/packing" },
  { value: "media", label: "Media", icon: Images, href: "/media" },
  { value: "browse", label: "Browse", icon: BookOpen, href: "/browse" },
];

export default function TripDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const tripId = params.id as string;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssembleDialog, setShowAssembleDialog] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    destination: "",
    origin: "",
    start_date: "",
    end_date: "",
    transportation_type: "",
    traveler_count: 1,
  });

  const { data: trip, isLoading, error } = useTripFull(tripId);
  const deleteTrip = useDeleteTrip();
  const updateTrip = useUpdateTrip();
  const updateStatus = useUpdateTripStatus();

  const TRIP_STATUSES = ['planning', 'confirmed', 'in_progress', 'completed'] as const;

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: tripId, status });
      toast.success(`Status updated to ${getTripStatusLabel(status)}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Initialize edit form when trip data loads
  useEffect(() => {
    if (trip) {
      setEditForm({
        name: trip.name || "",
        destination: trip.destination || "",
        origin: trip.origin || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
        transportation_type: trip.transportation_type || "",
        traveler_count: trip.traveler_count || 1,
      });
    }
  }, [trip]);

  const handleSaveEdit = async () => {
    try {
      await updateTrip.mutateAsync({
        id: tripId,
        data: {
          name: editForm.name || undefined,
          destination: editForm.destination || undefined,
          origin: editForm.origin || undefined,
          start_date: editForm.start_date || undefined,
          end_date: editForm.end_date || undefined,
          transportation_type: (editForm.transportation_type || undefined) as Trip["transportation_type"],
          traveler_count: editForm.traveler_count || undefined,
        },
      });
      toast.success("Trip updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update trip");
    }
  };

  const handleCancelEdit = () => {
    if (trip) {
      setEditForm({
        name: trip.name || "",
        destination: trip.destination || "",
        origin: trip.origin || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
        transportation_type: trip.transportation_type || "",
        traveler_count: trip.traveler_count || 1,
      });
    }
    setIsEditing(false);
  };

  const handleDeleteTrip = async () => {
    try {
      await deleteTrip.mutateAsync(tripId);
      toast.success("Trip deleted");
      router.push("/travel");
    } catch (error) {
      toast.error("Failed to delete trip");
    }
  };

  const handleAssembleSchedule = async () => {
    setIsAssembling(true);
    try {
      // Get auth token for API call
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/trips/${tripId}/assemble-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assemble schedule");
      }

      toast.success("Schedule assembled! View it in the Itinerary tab.");
      setShowAssembleDialog(false);
      // Navigate to itinerary tab to see results
      router.push(`/travel/${tripId}/itinerary`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assemble schedule");
    } finally {
      setIsAssembling(false);
    }
  };

  const getTransportIcon = (type?: string) => {
    switch (type) {
      case "flying":
        return <Plane className="h-4 w-4" />;
      case "driving":
        return <Car className="h-4 w-4" />;
      case "both":
        return (
          <div className="flex gap-0.5">
            <Plane className="h-4 w-4" />
            <Car className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const getCurrentTab = () => {
    const pathParts = pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart === tripId) return "details";
    return lastPart;
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container max-w-6xl py-6">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold">Trip not found</h2>
          <p className="text-muted-foreground mt-2">
            The trip you're looking for doesn't exist or you don't have access.
          </p>
          <Link href="/travel">
            <Button className="mt-4">Back to Trips</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentTab = getCurrentTab();

  return (
    <div className="container max-w-6xl py-2 space-y-2">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link href="/travel">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          {trip.description && (
            <p className="text-muted-foreground text-sm mt-1">{trip.description}</p>
          )}
        </div>
      </div>

      {/* Trip Overview Card */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Destination */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4" />
                  Destination
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      value={editForm.origin}
                      onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                      placeholder="Origin"
                      className="h-7 text-sm"
                    />
                    <Input
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      placeholder="Destination"
                      className="h-7 text-sm"
                    />
                  </div>
                ) : (
                  <p className="font-medium">
                    {trip.origin && `${trip.origin} to `}
                    {trip.destination || "Not set"}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  Dates
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="h-7 text-sm"
                    />
                    <Input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="h-7 text-sm"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-medium">
                      {formatTripDateRange(trip.start_date, trip.end_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {calculateTripDuration(trip.start_date, trip.end_date)} days
                    </p>
                  </>
                )}
              </div>

              {/* Transport */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  {getTransportIcon(trip.transportation_type) || <Plane className="h-4 w-4" />}
                  Transportation
                </div>
                {isEditing ? (
                  <select
                    value={editForm.transportation_type}
                    onChange={(e) => setEditForm({ ...editForm, transportation_type: e.target.value })}
                    className="h-7 text-sm rounded border bg-background px-2 w-full"
                  >
                    <option value="">Not Set</option>
                    <option value="flying">Flying</option>
                    <option value="driving">Driving</option>
                    <option value="both">Both</option>
                  </select>
                ) : (
                  <p className="font-medium capitalize">
                    {trip.transportation_type || "Not Set"}
                  </p>
                )}
              </div>

              {/* Travelers */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  Travelers
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    min={1}
                    value={editForm.traveler_count}
                    onChange={(e) => setEditForm({ ...editForm, traveler_count: parseInt(e.target.value) || 1 })}
                    className="h-7 text-sm w-16"
                  />
                ) : (
                  <p className="font-medium">{trip.traveler_count || 1}</p>
                )}
              </div>

              {/* Created */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  Created
                </div>
                <p className="font-medium">
                  {trip.created_at
                    ? new Date(trip.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trip.created_at
                    ? new Date(trip.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>

            {/* Action Buttons & Status */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveEdit}
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    style={{
                      borderColor: getTripStatusColor(trip.status),
                      color: getTripStatusColor(trip.status),
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getTripStatusColor(trip.status) }}
                    />
                    {getTripStatusLabel(trip.status)}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {TRIP_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="gap-2"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTripStatusColor(status) }}
                      />
                      {getTripStatusLabel(status)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-0" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const href = `/travel/${tripId}${tab.href}`;
            const isActive = currentTab === tab.value;

            return (
              <Link
                key={tab.value}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {children}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{trip.name}"? This action cannot be
              undone and will remove all associated segments, days, activities, and
              media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assemble Schedule Confirmation Dialog */}
      <AlertDialog open={showAssembleDialog} onOpenChange={setShowAssembleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Assemble Daily Schedule
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will use AI to create a detailed day-by-day schedule with 15-minute
                precision, including travel times between activities.
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                <div className="font-medium text-foreground">What happens:</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Pulls your hotel selection (Phase 2)</li>
                  <li>Pulls your activities and research (Phase 3)</li>
                  <li>Calculates travel times via Google Maps</li>
                  <li>Creates 15-min precision schedules</li>
                </ul>
              </div>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ This will replace any existing assembled schedule.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssembling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssembleSchedule}
              disabled={isAssembling}
              className="bg-primary"
            >
              {isAssembling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assembling...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Assemble Schedule
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
