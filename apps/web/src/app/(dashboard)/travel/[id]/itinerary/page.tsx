"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useTripFull,
  useGenerateTripDays,
  formatTripDate,
  getActivityTypeIcon,
  getTimeBlockLabel,
} from "@/lib/api";
import { ActivityDetailPanel } from "@/components/travel/ActivityDetailPanel";
import { SegmentDetailPanel } from "@/components/travel/SegmentDetailPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Plus,
  CalendarDays,
  Building2,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Convert 24h time to 12h AM/PM format
function formatTimeAmPm(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get time-of-day info based on time string (HH:MM format)
function getTimeOfDayInfo(time: string): {
  icon: React.ReactNode;
  colorClass: string;
  label: string;
} {
  const hours = parseInt(time.split(':')[0], 10);

  if (hours < 8) {
    return {
      icon: <Sunrise className="h-3 w-3" />,
      colorClass: "text-orange-400",
      label: "Early morning",
    };
  } else if (hours < 12) {
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-yellow-500",
      label: "Morning",
    };
  } else if (hours < 14) {
    return {
      icon: <Utensils className="h-3 w-3" />,
      colorClass: "text-green-500",
      label: "Lunch",
    };
  } else if (hours < 17) {
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-amber-500",
      label: "Afternoon",
    };
  } else if (hours < 20) {
    return {
      icon: <Sunset className="h-3 w-3" />,
      colorClass: "text-orange-500",
      label: "Evening",
    };
  } else {
    return {
      icon: <Moon className="h-3 w-3" />,
      colorClass: "text-indigo-400",
      label: "Night",
    };
  }
}

export default function TripItineraryPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);
  const generateDays = useGenerateTripDays();

  // Panel state for detail views
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Find selected items from data
  const selectedActivity = selectedActivityId
    ? trip?.activities?.find((a) => a.id === selectedActivityId) || null
    : null;
  const selectedSegment = selectedSegmentId
    ? trip?.segments?.find((s) => s.id === selectedSegmentId) || null
    : null;

  const handleGenerateDays = async () => {
    try {
      await generateDays.mutateAsync(tripId);
      toast.success("Days generated from trip dates");
    } catch (error) {
      toast.error("Failed to generate days");
    }
  };

  // Build flat list of days with segment and lodging info for merged cells
  const itineraryRows = useMemo(() => {
    if (!trip?.days) return [];

    // Dedupe by date and sort all days chronologically
    const seenDates = new Set<string>();
    const sortedDays = [...trip.days]
      .filter((day) => {
        if (seenDates.has(day.date)) return false;
        seenDates.add(day.date);
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Create segment map
    const segmentMap = new Map(trip.segments?.map((s) => [s.id, s]) || []);

    // Find accommodation for each day (day >= check_in AND day < check_out)
    const getAccommodationForDay = (dayDate: string) => {
      if (!trip.accommodations) return null;
      const dayTime = new Date(dayDate).getTime();
      return trip.accommodations.find((acc) => {
        const checkIn = new Date(acc.check_in_date).getTime();
        const checkOut = new Date(acc.check_out_date).getTime();
        return dayTime >= checkIn && dayTime < checkOut;
      });
    };

    // Build rows with segment and lodging span info
    type RowData = {
      day: (typeof sortedDays)[0];
      dayIndex: number;
      segment: { id: string; name: string } | null;
      segmentRowSpan: number;
      showSegment: boolean;
      accommodation: NonNullable<typeof trip.accommodations>[0] | null;
      lodgingRowSpan: number;
      showLodging: boolean;
    };

    const rows: RowData[] = [];
    let currentSegmentId: string | null = null;
    let segmentStartIndex = 0;
    let currentAccommodationId: string | null = null;
    let accommodationStartIndex = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const segment = day.segment_id ? segmentMap.get(day.segment_id) : null;
      const accommodation = getAccommodationForDay(day.date);

      // Check if segment changed
      const segmentChanged = day.segment_id !== currentSegmentId;
      if (segmentChanged && i > 0) {
        // Update rowSpan for previous segment rows
        const spanCount = i - segmentStartIndex;
        if (rows[segmentStartIndex]) {
          rows[segmentStartIndex].segmentRowSpan = spanCount;
        }
        segmentStartIndex = i;
      }
      currentSegmentId = day.segment_id || null;

      // Check if accommodation changed
      const accChanged = accommodation?.id !== currentAccommodationId;
      if (accChanged && i > 0) {
        // Update rowSpan for previous accommodation rows
        const spanCount = i - accommodationStartIndex;
        if (rows[accommodationStartIndex]) {
          rows[accommodationStartIndex].lodgingRowSpan = spanCount;
        }
        accommodationStartIndex = i;
      }
      currentAccommodationId = accommodation?.id || null;

      rows.push({
        day,
        dayIndex: i,
        segment: segment ? { id: segment.id, name: segment.name } : null,
        segmentRowSpan: 1,
        showSegment: segmentChanged || i === 0,
        accommodation: accommodation || null,
        lodgingRowSpan: 1,
        showLodging: accChanged || i === 0,
      });
    }

    // Handle final segment and accommodation spans
    if (rows.length > 0) {
      const finalSegmentSpan = rows.length - segmentStartIndex;
      if (rows[segmentStartIndex]) {
        rows[segmentStartIndex].segmentRowSpan = finalSegmentSpan;
      }
      const finalAccSpan = rows.length - accommodationStartIndex;
      if (rows[accommodationStartIndex]) {
        rows[accommodationStartIndex].lodgingRowSpan = finalAccSpan;
      }
    }

    return rows;
  }, [trip?.days, trip?.segments, trip?.accommodations]);

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    if (!trip?.activities) return {};
    const grouped: Record<string, typeof trip.activities> = {};
    for (const activity of trip.activities) {
      if (activity.is_backup) continue;
      const dayId = activity.day_id || "unassigned";
      if (!grouped[dayId]) grouped[dayId] = [];
      grouped[dayId].push(activity);
    }
    // Sort by sort_order
    for (const dayId of Object.keys(grouped)) {
      grouped[dayId].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return grouped;
  }, [trip?.activities]);

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Full Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            Complete day-by-day schedule
          </p>
        </div>
        <div className="flex gap-2">
          {(!trip.days || trip.days.length === 0) && (
            <Button variant="outline" onClick={handleGenerateDays}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Generate Days
            </Button>
          )}
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {trip.days && trip.days.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Day</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="w-32">Segment</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead className="w-44">Lodging</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itineraryRows.map((row) => {
                  const dayActivities = activitiesByDay[row.day.id] || [];

                  return (
                    <TableRow
                      key={row.day.id}
                      className={cn(row.showSegment && row.dayIndex > 0 && "border-t-2 border-border")}
                    >
                      <TableCell className="font-medium">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                          {row.day.day_number || row.dayIndex + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {new Date(row.day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(row.day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </TableCell>
                      {row.showSegment && (
                        <TableCell
                          rowSpan={row.segmentRowSpan}
                          className="align-top border-r border-border bg-muted/30"
                        >
                          {row.segment ? (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="secondary"
                                className="font-medium w-fit cursor-pointer hover:bg-secondary/80 transition-colors"
                                onClick={() => {
                                  setSelectedSegmentId(row.segment!.id);
                                  setSelectedActivityId(null);
                                }}
                              >
                                {row.segment.name}
                              </Badge>
                              {row.segmentRowSpan > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {row.segmentRowSpan} days
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {dayActivities.length > 0 ? (
                          <div className="space-y-1">
                            {dayActivities.map((activity) => {
                              const timeInfo = activity.start_time
                                ? getTimeOfDayInfo(activity.start_time)
                                : null;
                              return (
                                <div
                                  key={activity.id}
                                  className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                                  onClick={() => {
                                    setSelectedActivityId(activity.id);
                                    setSelectedSegmentId(null);
                                  }}
                                >
                                  <span className="w-5 text-center shrink-0">
                                    {getActivityTypeIcon(activity.activity_type || "activity")}
                                  </span>
                                  <span className="flex-1 min-w-0 truncate">
                                    {activity.name}
                                  </span>
                                  {activity.time_block && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs shrink-0 hidden sm:inline-flex"
                                    >
                                      {getTimeBlockLabel(activity.time_block)}
                                    </Badge>
                                  )}
                                  {activity.start_time && timeInfo && (
                                    <span className={cn("text-xs shrink-0 hidden md:flex items-center gap-1", timeInfo.colorClass)}>
                                      {timeInfo.icon}
                                      {formatTimeAmPm(activity.start_time)}
                                    </span>
                                  )}
                                  {activity.location_name && (
                                    <span className="text-muted-foreground text-xs shrink-0 hidden lg:flex items-center gap-1 max-w-[150px] truncate">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      {activity.location_name}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            No activities
                          </span>
                        )}
                      </TableCell>
                      {row.showLodging && (
                        <TableCell
                          rowSpan={row.lodgingRowSpan}
                          className="align-top border-l border-border bg-muted/20"
                        >
                          {row.accommodation ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-start gap-1.5">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <span className="font-medium text-sm leading-tight">
                                  {row.accommodation.name}
                                </span>
                              </div>
                              {row.lodgingRowSpan > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {row.lodgingRowSpan} nights
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              No lodging
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No days planned yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Generate days from your trip dates or add them manually
            </p>
            <Button onClick={handleGenerateDays}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Generate Days from Dates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trip.days?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {trip.activities?.filter((a) => !a.is_backup).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Planned Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {trip.activities?.filter((a) => a.is_backup).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Backup Activities</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Detail Panel */}
      <ActivityDetailPanel
        activity={selectedActivity}
        tripId={tripId}
        open={!!selectedActivityId}
        onOpenChange={(open) => !open && setSelectedActivityId(null)}
      />

      {/* Segment Detail Panel */}
      <SegmentDetailPanel
        segment={selectedSegment}
        tripId={tripId}
        open={!!selectedSegmentId}
        onOpenChange={(open) => !open && setSelectedSegmentId(null)}
      />
    </div>
  );
}
