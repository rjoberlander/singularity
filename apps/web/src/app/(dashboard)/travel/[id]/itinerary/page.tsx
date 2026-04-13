"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useTripFull,
  useTripSchedule,
  useAssembleTripSchedule,
  useGenerateTripDays,
  formatTripDate,
  parseLocalDate,
  getActivityTypeIcon,
  getTimeBlockLabel,
  DailyScheduleItem,
} from "@/lib/api";
import { ActivityDetailPanel } from "@/components/travel/ActivityDetailPanel";
import { SegmentDetailPanel } from "@/components/travel/SegmentDetailPanel";
import { CalendarWeekView } from "@/components/travel/CalendarWeekView";
import { buildGoogleCalendarUrl, downloadIcsFile } from "@/lib/google-calendar";
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
  List,
  Calendar,
  Wand2,
  Loader2,
  Sparkles,
  Download,
  ExternalLink,
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
  const { data: scheduleItems, refetch: refetchSchedule } = useTripSchedule(tripId);
  const generateDays = useGenerateTripDays();
  const assembleSchedule = useAssembleTripSchedule();
  const [isAssembling, setIsAssembling] = useState(false);

  const handleAssembleSchedule = async () => {
    setIsAssembling(true);
    try {
      await assembleSchedule.mutateAsync({ tripId });
      await refetchSchedule();
      toast.success("Schedule assembled! Your activities now have specific times.");
    } catch (error: any) {
      // Extract error message from API response
      const errorMessage = error?.response?.data?.error
        || error?.message
        || "Failed to assemble schedule";
      toast.error(errorMessage);
      console.error("Assembly error:", error?.response?.data || error);
    } finally {
      setIsAssembling(false);
    }
  };

  // Count activities that need scheduling (have day_id but no start_time)
  const unscheduledActivityCount = useMemo(() => {
    if (!trip?.activities) return 0;
    return trip.activities.filter(
      (a) => !a.is_backup && a.day_id && !a.start_time
    ).length;
  }, [trip?.activities]);

  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

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

  // Detect destination timezone for calendar exports (best effort from destination)
  const tripTimezone = useMemo(() => {
    const dest = trip?.destination?.toLowerCase() || "";
    if (dest.includes("portugal") || dest.includes("lisbon")) return "Europe/Lisbon";
    if (dest.includes("spain") || dest.includes("madrid")) return "Europe/Madrid";
    if (dest.includes("france") || dest.includes("paris")) return "Europe/Paris";
    if (dest.includes("italy") || dest.includes("rome")) return "Europe/Rome";
    if (dest.includes("uk") || dest.includes("london")) return "Europe/London";
    if (dest.includes("japan") || dest.includes("tokyo")) return "Asia/Tokyo";
    // Fall back to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [trip?.destination]);

  const handleExportIcs = () => {
    if (calendarEvents.length === 0) {
      toast.error("No scheduled events to export");
      return;
    }
    const icsEvents = calendarEvents.map((e) => ({
      title: e.title,
      date: e.date,
      startTime: e.time_start,
      endTime: e.time_end,
      location: e.location_name,
      description: e.description,
      timezone: tripTimezone,
    }));
    const filename = `${(trip?.name || "trip").replace(/[^a-zA-Z0-9]/g, "_")}_itinerary.ics`;
    downloadIcsFile(icsEvents, filename, trip?.name);
    toast.success(`Exported ${icsEvents.length} events to ${filename}`);
  };

  const handleExportGoogleCalendar = () => {
    if (calendarEvents.length === 0) {
      toast.error("No scheduled events to export");
      return;
    }
    // Open Google Calendar with each event - for bulk, we use ICS.
    // For a quick single-page approach, open the first few events.
    const icsEvents = calendarEvents.slice(0, 1).map((e) => ({
      title: e.title,
      date: e.date,
      startTime: e.time_start,
      endTime: e.time_end,
      location: e.location_name,
      description: e.description,
      timezone: tripTimezone,
    }));
    const url = buildGoogleCalendarUrl(icsEvents[0]);
    window.open(url, "_blank");
    if (calendarEvents.length > 1) {
      toast.info("Tip: Use 'Download ICS File' to export all events at once and import into Google Calendar.");
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
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    // Create segment map
    const segmentMap = new Map(trip.segments?.map((s) => [s.id, s]) || []);

    // Find accommodation for each day (day >= check_in AND day < check_out)
    const getAccommodationForDay = (dayDate: string) => {
      if (!trip.accommodations) return null;
      const dayTime = parseLocalDate(dayDate).getTime();
      return trip.accommodations.find((acc) => {
        const checkIn = parseLocalDate(acc.check_in_date).getTime();
        const checkOut = parseLocalDate(acc.check_out_date).getTime();
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

  // Transform schedule items and activities to calendar events format
  // Use schedule items for days that have them, fall back to activities for other days
  const calendarEvents = useMemo(() => {
    const events: Array<{
      id: string;
      day_id: string;
      date: string;
      time_start: string;
      time_end: string;
      event_type: "activity" | "meal" | "transit" | "buffer" | "logistics";
      title: string;
      description?: string;
      location_name?: string;
      travel_mode?: "walking" | "driving" | "transit" | "taxi" | "ferry";
      travel_minutes?: number;
      is_all_day: boolean;
    }> = [];

    // Collect day_ids that have assembled schedule items
    const assembledDayIds = new Set<string>();

    if (scheduleItems && scheduleItems.length > 0) {
      for (const item of scheduleItems) {
        assembledDayIds.add(item.day_id);
        events.push({
          id: item.id,
          day_id: item.day_id,
          date: item.day?.date || "",
          time_start: item.time_start,
          time_end: item.time_end,
          event_type: item.event_type,
          title: item.title,
          description: item.description || undefined,
          location_name: item.location_name || undefined,
          travel_mode: item.travel_mode,
          travel_minutes: item.travel_minutes,
          is_all_day: false,
        });
      }
    }

    // Add activities for days that don't have assembled schedule items
    if (trip?.activities && trip?.days) {
      const dayDateMap = new Map(trip.days.map((d) => [d.id, d.date]));

      for (const activity of trip.activities) {
        if (activity.is_backup || !activity.day_id || !activity.start_time) continue;
        // Skip days that already have assembled schedule items
        if (assembledDayIds.has(activity.day_id)) continue;

        const date = dayDateMap.get(activity.day_id) || "";
        const startTime = activity.start_time;

        // Calculate end time based on duration or default to 1 hour
        const durationMinutes = activity.duration_minutes || 60;
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const endTotalMinutes = startHours * 60 + startMinutes + durationMinutes;
        const endHours = Math.floor(endTotalMinutes / 60);
        const endMins = endTotalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

        // Map activity_type to event_type
        let eventType: "activity" | "meal" | "transit" | "buffer" | "logistics" = "activity";
        const activityType = activity.activity_type?.toLowerCase() || "";
        if (activityType.includes("meal") || activityType.includes("restaurant") || activityType.includes("food") || activityType.includes("dining")) {
          eventType = "meal";
        } else if (activityType.includes("transit") || activityType.includes("drive") || activityType.includes("travel")) {
          eventType = "transit";
        } else if (activityType.includes("hotel") || activityType.includes("check")) {
          eventType = "logistics";
        }

        events.push({
          id: activity.id,
          day_id: activity.day_id,
          date,
          time_start: startTime,
          time_end: endTime,
          event_type: eventType,
          title: activity.name,
          description: activity.description || undefined,
          location_name: activity.location_name || undefined,
          travel_mode: undefined,
          travel_minutes: undefined,
          is_all_day: false,
        });
      }
    }

    return events;
  }, [scheduleItems, trip?.activities, trip?.days]);

  if (!trip) return null;

  // Handler for calendar event clicks
  const handleCalendarEventClick = (event: { id: string; event_type: string }) => {
    if (event.event_type !== "transit") {
      setSelectedActivityId(event.id);
      setSelectedSegmentId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Full Itinerary</h2>
            <p className="text-sm text-muted-foreground">
              Complete day-by-day schedule
            </p>
          </div>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-3"
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          {(!trip.days || trip.days.length === 0) && (
            <Button variant="outline" onClick={handleGenerateDays}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Generate Days
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleAssembleSchedule}
            disabled={isAssembling}
            className="border-purple-500/50 text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            data-testid="assemble-schedule-btn"
          >
            {isAssembling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {isAssembling ? "Assembling..." : `Assemble Schedule${unscheduledActivityCount > 0 ? ` (${unscheduledActivityCount})` : ""}`}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportIcs}>
                <Download className="h-4 w-4 mr-2" />
                Download ICS File
                <span className="ml-auto text-xs text-muted-foreground">
                  {calendarEvents.length} events
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportGoogleCalendar}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {trip.days && trip.days.length > 0 ? (
        viewMode === "calendar" ? (
          <>
            {calendarEvents.length === 0 && (
              <Card className="mb-4 border-purple-500/30 bg-purple-500/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-purple-500/10">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">No scheduled events yet</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your activities from the Details page don't have specific times assigned.
                        Click <strong className="text-purple-600 dark:text-purple-400">Assemble Schedule</strong> to
                        have AI create a detailed day-by-day schedule with 15-minute precision.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAssembleSchedule}
                      disabled={isAssembling}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isAssembling ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      {isAssembling ? "Assembling..." : "Assemble"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <CalendarWeekView
              events={calendarEvents}
              tripStartDate={trip.start_date}
              tripEndDate={trip.end_date}
              onEventClick={handleCalendarEventClick}
              className="h-[calc(100vh-340px)] min-h-[500px]"
            />
          </>
        ) : (
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
                            {parseLocalDate(row.day.date).toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </div>
                          <div className="text-muted-foreground">
                            {parseLocalDate(row.day.date).toLocaleDateString("en-US", {
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
                                    {getActivityTypeIcon(activity.activity_type || "activity", activity.activity_sub_type)}
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
                              <Link
                                href={`/travel/${tripId}/lodging`}
                                className="flex items-start gap-1.5 hover:text-primary transition-colors"
                              >
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <span className="font-medium text-sm leading-tight hover:underline">
                                  {row.accommodation.name}
                                </span>
                              </Link>
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
        )
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
