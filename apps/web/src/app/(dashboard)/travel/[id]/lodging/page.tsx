"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  useTripFull,
  formatTripDate,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Hotel,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  MapPin,
  Layers,
  CalendarDays,
} from "lucide-react";

export default function TripLodgingPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  // Create lookup maps for segments and days
  const segmentMap = useMemo(() => {
    if (!trip?.segments) return new Map<string, string>();
    return new Map(trip.segments.map(s => [s.id, s.name]));
  }, [trip?.segments]);

  // Get days that fall within an accommodation's check-in/check-out range
  const getDaysForAccommodation = (checkIn: string, checkOut: string) => {
    if (!trip?.days) return [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    return trip.days.filter(day => {
      const dayDate = new Date(day.date);
      // Day is covered if it's >= check-in and < check-out (check-out day you're leaving)
      return dayDate >= checkInDate && dayDate < checkOutDate;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Accommodations</h2>
          <p className="text-sm text-muted-foreground">
            Hotels, rentals, and places to stay
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Accommodation
        </Button>
      </div>

      {trip.accommodations && trip.accommodations.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Check-out</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium text-center">Nights</th>
                <th className="px-4 py-3 font-medium text-right">Cost</th>
                <th className="px-4 py-3 font-medium text-right w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trip.accommodations.map((accommodation) => {
                const segmentName = accommodation.segment_id
                  ? segmentMap.get(accommodation.segment_id)
                  : null;
                const coveredDays = getDaysForAccommodation(
                  accommodation.check_in_date,
                  accommodation.check_out_date
                );

                return (
                  <tr key={accommodation.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{accommodation.name}</div>
                      {accommodation.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{accommodation.address}</span>
                        </div>
                      )}
                      {accommodation.booking_reference && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {accommodation.booking_reference}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {segmentName ? (
                        <Badge variant="outline" className="font-normal">
                          <Layers className="h-3 w-3 mr-1" />
                          {segmentName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatTripDate(accommodation.check_in_date)}
                      {accommodation.check_in_time && (
                        <div className="text-xs text-muted-foreground">
                          {accommodation.check_in_time}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatTripDate(accommodation.check_out_date)}
                      {accommodation.check_out_time && (
                        <div className="text-xs text-muted-foreground">
                          {accommodation.check_out_time}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {coveredDays.length > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {coveredDays.length === 1
                              ? `Day ${coveredDays[0].day_number || 1}`
                              : `Days ${coveredDays[0].day_number || 1}-${coveredDays[coveredDays.length - 1].day_number || coveredDays.length}`
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {accommodation.nights || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {accommodation.cost ? (
                        <span>
                          {accommodation.currency || "$"}
                          {accommodation.cost.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {accommodation.website && (
                            <DropdownMenuItem asChild>
                              <a href={accommodation.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
            {trip.accommodations.length > 1 && (
              <tfoot className="bg-muted/30 border-t">
                <tr className="text-sm font-medium">
                  <td colSpan={5} className="px-4 py-3">
                    Total ({trip.accommodations.length} accommodations)
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trip.accommodations.reduce((sum, a) => sum + (a.nights || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${trip.accommodations.reduce((sum, a) => sum + (a.cost || 0), 0).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Hotel className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No accommodations yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add hotels, rentals, or other places to stay
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Accommodation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
