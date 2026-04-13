"use client";

import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useTripFull, useDeleteTripFlight, API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plane,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowRight,
  Clock,
  FileText,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { TripFlight, TripMedia } from "@singularity/shared-types";

function formatFlightDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatFlightTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function calculateDuration(departure: string, arrival: string): string {
  try {
    const dep = new Date(departure);
    const arr = new Date(arrival);
    const diffMs = arr.getTime() - dep.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch {
    return "";
  }
}

function formatDurationMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TripFlightsPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip, refetch } = useTripFull(tripId);
  const deleteFlight = useDeleteTripFlight();
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);
  const [uploadingFlightId, setUploadingFlightId] = useState<string | null>(null);

  const handleDeleteFlight = async (flightId: string) => {
    try {
      await deleteFlight.mutateAsync({ tripId, flightId });
      toast.success("Flight deleted");
    } catch (error) {
      toast.error("Failed to delete flight");
    }
  };

  // Build confirmation file map from media
  const confirmationFiles = new Map<string, TripMedia>();
  if (trip?.media) {
    for (const m of trip.media) {
      if (m.parent_type === "flight" && m.media_type === "document" && m.parent_id) {
        confirmationFiles.set(m.parent_id, m);
      }
    }
  }

  const handleUploadConfirmation = useCallback(async (flightId: string, file: File) => {
    setUploadingFlightId(flightId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const resp = await fetch(`${API_URL}/travel/trips/${tripId}/flights/${flightId}/upload-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ file: base64, filename: file.name, mimeType: file.type }),
      });
      if (!resp.ok) throw new Error("Upload failed");
      toast.success("Confirmation uploaded");
      refetch();
    } catch (err) {
      toast.error("Failed to upload confirmation");
    } finally {
      setUploadingFlightId(null);
    }
  }, [tripId, refetch]);

  if (!trip) return null;

  const sortedFlights = [...(trip.flights || [])].sort((a, b) => {
    if (a.direction === "outbound" && b.direction === "return") return -1;
    if (a.direction === "return" && b.direction === "outbound") return 1;
    return new Date(a.departure_datetime || 0).getTime() - new Date(b.departure_datetime || 0).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Flights</h2>
          <p className="text-sm text-muted-foreground">
            {sortedFlights.length} flight{sortedFlights.length !== 1 ? "s" : ""} booked
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Flight
        </Button>
      </div>

      {sortedFlights.length > 0 ? (
        <div className="space-y-4">
          {sortedFlights.map((flight) => {
            const duration = flight.departure_datetime && flight.arrival_datetime
              ? calculateDuration(flight.departure_datetime, flight.arrival_datetime)
              : null;
            const isExpanded = expandedFlightId === flight.id;
            const confirmation = confirmationFiles.get(flight.id);
            const segments = flight.flight_segments;
            const hasSegments = segments && segments.length > 1;

            return (
              <Card key={flight.id}>
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Direction + Route + Duration */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            flight.direction === "outbound"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-green-500/10 text-green-600 border-green-500/30"
                          }
                        >
                          {flight.direction === "outbound" ? "Outbound" : "Return"}
                        </Badge>
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <span>{flight.departure_airport}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span>{flight.arrival_airport}</span>
                        </div>
                        {duration && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {duration}
                          </span>
                        )}
                        {hasSegments && (
                          <span className="text-xs text-muted-foreground">
                            {segments!.length} legs
                          </span>
                        )}
                      </div>

                      {/* Airline + Flight numbers */}
                      <div className="flex items-center gap-3 text-sm">
                        <span>{flight.airline}</span>
                        {flight.flight_number && (
                          <span className="font-mono text-muted-foreground">{flight.flight_number}</span>
                        )}
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-6 text-sm">
                        {flight.departure_datetime && (
                          <div>
                            <div className="text-muted-foreground text-xs">{formatFlightDate(flight.departure_datetime)}</div>
                            <div className="font-semibold text-base">{formatFlightTime(flight.departure_datetime)}</div>
                            <div className="text-xs text-muted-foreground">{flight.departure_airport}</div>
                          </div>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        {flight.arrival_datetime && (
                          <div>
                            <div className="text-muted-foreground text-xs">{formatFlightDate(flight.arrival_datetime)}</div>
                            <div className="font-semibold text-base">{formatFlightTime(flight.arrival_datetime)}</div>
                            <div className="text-xs text-muted-foreground">{flight.arrival_airport}</div>
                          </div>
                        )}
                      </div>

                      {/* Flight segments for connecting flights */}
                      {hasSegments && (
                        <div className="border rounded-md p-2 bg-muted/30 space-y-1.5">
                          {segments!.map((seg, i) => (
                            <div key={i}>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="font-mono text-xs w-14">{seg.flight_number}</span>
                                <span className="font-medium">{seg.departure_airport} → {seg.arrival_airport}</span>
                                {seg.duration_minutes != null && (
                                  <span className="text-muted-foreground">
                                    {formatDurationMinutes(seg.duration_minutes)}
                                  </span>
                                )}
                                {seg.departure_datetime && (
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {formatFlightTime(seg.departure_datetime)} → {seg.arrival_datetime ? formatFlightTime(seg.arrival_datetime) : ""}
                                  </span>
                                )}
                              </div>
                              {/* Layover between segments */}
                              {i < segments!.length - 1 && flight.layovers?.[i] && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 ml-14 my-0.5">
                                  <Clock className="h-3 w-3" />
                                  {flight.layovers[i].duration} layover at {flight.layovers[i].airport}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Non-segment layovers fallback */}
                      {!hasSegments && flight.layovers && flight.layovers.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {flight.layovers.length} stop: {flight.layovers.map(l => `${l.airport} (${l.duration})`).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Right side: booking info + actions */}
                    <div className="shrink-0 text-right space-y-2">
                      {/* Booking ref */}
                      {flight.booking_reference && (
                        <div>
                          <div className="text-xs text-muted-foreground">Booking Ref</div>
                          <button
                            className="font-mono font-semibold text-sm hover:text-primary"
                            onClick={() => {
                              navigator.clipboard.writeText(flight.booking_reference!);
                              toast.success("Copied");
                            }}
                            title="Click to copy"
                          >
                            {flight.booking_reference}
                            <Copy className="h-3 w-3 inline ml-1 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      {flight.agency_reference && (
                        <div className="text-xs text-muted-foreground">
                          Agency: {flight.agency_reference}
                        </div>
                      )}

                      {/* Cost */}
                      {flight.cost != null && flight.cost > 0 && (
                        <div className="text-sm font-semibold">
                          {flight.currency || "$"}{flight.cost.toLocaleString()}
                          {flight.points_used != null && flight.points_used > 0 && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {flight.points_used.toLocaleString()} pts
                            </div>
                          )}
                        </div>
                      )}

                      {/* Confirmation PDF */}
                      {confirmation ? (
                        <a
                          href={confirmation.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          {confirmation.original_filename || "Confirmation"}
                        </a>
                      ) : (
                        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          {uploadingFlightId === flight.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Upload PDF
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadConfirmation(flight.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteFlight(flight.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expandable: Seat assignments */}
                  {flight.seat_assignments && flight.seat_assignments.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedFlightId(isExpanded ? null : flight.id)}
                      >
                        <Users className="h-3 w-3" />
                        {flight.seat_assignments.length} traveler{flight.seat_assignments.length !== 1 ? "s" : ""} — Seat assignments
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                          {flight.seat_assignments.map((sa, i) => (
                            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1">
                              <span className="font-medium">{sa.name}</span>
                              <span className="text-muted-foreground font-mono">{sa.seat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Plane className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No flights booked yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add flight information or import from a confirmation screenshot
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Flight
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
