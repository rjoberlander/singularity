"use client";

import { useParams } from "next/navigation";
import { useTripFull, useDeleteTripFlight } from "@/lib/api";
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
} from "lucide-react";
import { toast } from "sonner";

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

export default function TripFlightsPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);
  const deleteFlight = useDeleteTripFlight();

  const handleDeleteFlight = async (flightId: string) => {
    try {
      await deleteFlight.mutateAsync({ tripId, flightId });
      toast.success("Flight deleted");
    } catch (error) {
      toast.error("Failed to delete flight");
    }
  };

  if (!trip) return null;

  // Sort flights: outbound first, then return
  const sortedFlights = [...(trip.flights || [])].sort((a, b) => {
    if (a.direction === "outbound" && b.direction === "return") return -1;
    if (a.direction === "return" && b.direction === "outbound") return 1;
    // Within same direction, sort by departure time
    return new Date(a.departure_datetime || 0).getTime() - new Date(b.departure_datetime || 0).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Flights</h2>
          <p className="text-sm text-muted-foreground">
            Booked flights for this trip
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Flight
        </Button>
      </div>

      {sortedFlights.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Departure</th>
                <th className="px-4 py-3 font-medium">Arrival</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Airline</th>
                <th className="px-4 py-3 font-medium">Flight #</th>
                <th className="px-4 py-3 font-medium">Booking Ref</th>
                <th className="px-4 py-3 font-medium text-right w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedFlights.map((flight) => {
                const duration = flight.departure_datetime && flight.arrival_datetime
                  ? calculateDuration(flight.departure_datetime, flight.arrival_datetime)
                  : null;

                return (
                  <tr key={flight.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{flight.departure_airport}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span>{flight.arrival_airport}</span>
                      </div>
                      {flight.layovers && flight.layovers.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {flight.layovers.length} stop: {flight.layovers.map(l => l.airport).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {flight.departure_datetime ? formatFlightDate(flight.departure_datetime) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {flight.departure_datetime ? formatFlightTime(flight.departure_datetime) : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">{flight.departure_airport}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {flight.arrival_datetime ? formatFlightTime(flight.arrival_datetime) : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">{flight.arrival_airport}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {duration && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {flight.airline || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {flight.flight_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {flight.booking_reference || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
