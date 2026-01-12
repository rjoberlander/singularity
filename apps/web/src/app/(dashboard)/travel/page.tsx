"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useTrips,
  useDeleteTrip,
  useDuplicateTrip,
  useUpdateTripStatus,
  getTripStatusColor,
  getTripStatusLabel,
  formatTripDateRange,
  calculateTripDuration,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Plus,
  Search,
  Plane,
  Car,
  Calendar,
  MapPin,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  Filter,
  X,
  BookOpen,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Trip, TripStatus } from "@singularity/shared-types";
import { cn } from "@/lib/utils";
import { TripSkeletonImportSheet } from "@/components/travel/TripSkeletonImportSheet";

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function TravelPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [showImportSheet, setShowImportSheet] = useState(false);

  // Fetch data
  const { data: trips, isLoading } = useTrips({
    status: selectedStatus || undefined,
    limit: 50,
  });
  const deleteTrip = useDeleteTrip();
  const duplicateTrip = useDuplicateTrip();
  const updateStatus = useUpdateTripStatus();

  // Filter trips by search
  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    if (!search) return trips;

    const searchLower = search.toLowerCase();
    return trips.filter(
      (trip) =>
        trip.name.toLowerCase().includes(searchLower) ||
        trip.destination?.toLowerCase().includes(searchLower) ||
        trip.origin?.toLowerCase().includes(searchLower)
    );
  }, [trips, search]);

  // Group trips by status
  const groupedTrips = useMemo(() => {
    const groups: Record<string, Trip[]> = {
      in_progress: [],
      confirmed: [],
      planning: [],
      completed: [],
    };

    filteredTrips.forEach((trip) => {
      if (groups[trip.status]) {
        groups[trip.status].push(trip);
      }
    });

    return groups;
  }, [filteredTrips]);

  const handleDeleteTrip = async () => {
    if (!deleteTripId) return;

    try {
      await deleteTrip.mutateAsync(deleteTripId);
      toast.success("Trip deleted");
      setDeleteTripId(null);
    } catch (error) {
      toast.error("Failed to delete trip");
    }
  };

  const handleDuplicateTrip = async (tripId: string) => {
    try {
      const newTrip = await duplicateTrip.mutateAsync(tripId);
      toast.success("Trip duplicated");
      router.push(`/travel/${newTrip.id}`);
    } catch (error) {
      toast.error("Failed to duplicate trip");
    }
  };

  const handleStatusChange = async (tripId: string, status: TripStatus) => {
    try {
      await updateStatus.mutateAsync({ id: tripId, status });
      toast.success(`Status updated to ${getTripStatusLabel(status)}`);
    } catch (error) {
      toast.error("Failed to update status");
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
          <div className="flex gap-1">
            <Plane className="h-4 w-4" />
            <Car className="h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const renderTripCard = (trip: Trip) => (
    <Link
      key={trip.id}
      href={`/travel/${trip.id}`}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow block"
    >
      {/* Cover Image Grid */}
      <div className="relative h-40 bg-muted">
        {trip.cover_image_url ? (
          <img
            src={trip.cover_image_url}
            alt={trip.name}
            className="w-full h-full object-cover"
          />
        ) : (trip as Trip & { preview_photos?: string[] }).preview_photos?.length ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
            {(trip as Trip & { preview_photos?: string[] }).preview_photos!.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-muted-foreground/5 flex items-center justify-center">
                {i === 0 && <MapPin className="h-8 w-8 text-muted-foreground/20" />}
              </div>
            ))}
          </div>
        )}
        {/* Status Badge */}
        <Badge
          className="absolute top-3 left-3"
          style={{
            backgroundColor: getTripStatusColor(trip.status),
            color: "white",
          }}
        >
          {getTripStatusLabel(trip.status)}
        </Badge>
        {/* Transport Icon */}
        {trip.transportation_type && (
          <div className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full">
            {getTransportIcon(trip.transportation_type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {trip.name}
            </h3>
            {trip.destination && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {trip.origin && `${trip.origin} to `}
                {trip.destination}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/travel/${trip.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateTrip(trip.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTripId(trip.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
          <span className="text-muted-foreground/50">
            ({calculateTripDuration(trip.start_date, trip.end_date)} days)
          </span>
        </div>

        {/* Travelers */}
        {trip.traveler_count && trip.traveler_count > 1 && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{trip.traveler_count} travelers</span>
          </div>
        )}
      </div>
    </Link>
  );

  const renderTripGroup = (status: string, trips: Trip[]) => {
    if (trips.length === 0) return null;

    return (
      <div key={status} className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getTripStatusColor(status) }}
          />
          <h2 className="font-semibold text-lg">{getTripStatusLabel(status)}</h2>
          <Badge variant="secondary">{trips.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map(renderTripCard)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6" />
            Travel
          </h1>
          <p className="text-muted-foreground">Plan and organize your trips</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportSheet(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Trip Planning
          </Button>
          <Link href="/travel/guide">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Guide
            </Button>
          </Link>
          <Link href="/travel/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Trip
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {selectedStatus ? getTripStatusLabel(selectedStatus) : "All Status"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSelectedStatus(null)}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getTripStatusColor(option.value) }}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State */}
      {filteredTrips.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plane className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No trips yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Start planning your next adventure!
          </p>
          <Link href="/travel/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Trip
            </Button>
          </Link>
        </div>
      )}

      {/* Trip Groups */}
      <div className="space-y-8">
        {renderTripGroup("in_progress", groupedTrips.in_progress)}
        {renderTripGroup("confirmed", groupedTrips.confirmed)}
        {renderTripGroup("planning", groupedTrips.planning)}
        {renderTripGroup("completed", groupedTrips.completed)}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTripId} onOpenChange={() => setDeleteTripId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone and will remove all
              associated segments, days, activities, and media.
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

      {/* Trip Skeleton Import Sheet */}
      <TripSkeletonImportSheet
        open={showImportSheet}
        onOpenChange={setShowImportSheet}
      />
    </div>
  );
}
