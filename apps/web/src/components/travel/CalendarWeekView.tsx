"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  Car,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ScheduleEvent {
  id: string;
  day_id: string;
  date: string;
  time_start: string; // "HH:MM" format
  time_end: string;
  event_type: "activity" | "meal" | "transit" | "buffer" | "logistics";
  title: string;
  description?: string;
  location_name?: string;
  travel_mode?: "walking" | "driving" | "transit" | "taxi" | "ferry";
  travel_minutes?: number;
  is_all_day?: boolean;
}

interface CalendarWeekViewProps {
  events: ScheduleEvent[];
  tripStartDate: string;
  tripEndDate: string;
  onEventClick?: (event: ScheduleEvent) => void;
  className?: string;
}

// Constants
const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // 6 AM
const END_HOUR = 22; // 10 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

// Color mapping for event types
const EVENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  activity: { bg: "bg-blue-500/20", border: "border-l-blue-500", text: "text-blue-700 dark:text-blue-300" },
  meal: { bg: "bg-orange-500/20", border: "border-l-orange-500", text: "text-orange-700 dark:text-orange-300" },
  transit: { bg: "bg-gray-500/20", border: "border-l-gray-500", text: "text-gray-700 dark:text-gray-300" },
  buffer: { bg: "bg-green-500/20", border: "border-l-green-500", text: "text-green-700 dark:text-green-300" },
  logistics: { bg: "bg-purple-500/20", border: "border-l-purple-500", text: "text-purple-700 dark:text-purple-300" },
};

// Helper functions
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatTimeShort(time: string): string {
  const { hours, minutes } = parseTime(time);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")}${period}`;
}

function getEventPosition(timeStart: string, timeEnd: string): { top: number; height: number } {
  const start = parseTime(timeStart);
  const end = parseTime(timeEnd);

  const startMinutes = (start.hours - START_HOUR) * 60 + start.minutes;
  const endMinutes = (end.hours - START_HOUR) * 60 + end.minutes;

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 20); // Min 20px height

  return { top, height };
}

function getWeekDates(centerDate: Date): Date[] {
  const dates: Date[] = [];
  const startOfWeek = new Date(centerDate);
  startOfWeek.setDate(centerDate.getDate() - centerDate.getDay()); // Start from Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push(date);
  }

  return dates;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function CalendarWeekView({
  events,
  tripStartDate,
  tripEndDate,
  onEventClick,
  className,
}: CalendarWeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Start from trip start date
    const tripStart = new Date(tripStartDate);
    const startOfWeek = new Date(tripStart);
    startOfWeek.setDate(tripStart.getDate() - tripStart.getDay());
    return startOfWeek;
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    events.forEach((event) => {
      const dateKey = event.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    // Sort events by start time
    Object.values(grouped).forEach((dayEvents) => {
      dayEvents.sort((a, b) => a.time_start.localeCompare(b.time_start));
    });
    return grouped;
  }, [events]);

  // All-day events
  const allDayEventsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    events.filter((e) => e.is_all_day).forEach((event) => {
      const dateKey = event.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < START_HOUR || hours > END_HOUR) return null;
    const totalMinutes = (hours - START_HOUR) * 60 + minutes;
    return (totalMinutes / 60) * HOUR_HEIGHT;
  }, [currentTime]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    setCurrentWeekStart(startOfWeek);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className={cn("flex flex-col h-full bg-background rounded-lg border", className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium">
          {weekDates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <div className="text-xs text-muted-foreground">
          {/* Timezone indicator */}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div className="p-2 text-xs text-muted-foreground text-center border-r">
          {/* Empty corner */}
        </div>
        {weekDates.map((date, index) => {
          const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
          const dayNum = date.getDate();
          const today = isToday(date);

          return (
            <div
              key={index}
              className={cn(
                "p-2 text-center border-r last:border-r-0",
                today && "bg-primary/5"
              )}
            >
              <div className="text-xs text-muted-foreground">{dayName}</div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  today && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                )}
              >
                {dayNum}
              </div>
              {/* Weather icon placeholder */}
              <Sun className="h-3 w-3 mx-auto mt-1 text-yellow-500" />
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[32px]">
        <div className="p-1 text-[10px] text-muted-foreground text-center border-r flex items-center justify-center">
          all-day
        </div>
        {weekDates.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayAllDayEvents = allDayEventsByDate[dateKey] || [];

          return (
            <div key={index} className="p-1 border-r last:border-r-0 space-y-0.5">
              {dayAllDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 truncate cursor-pointer hover:bg-purple-500/30"
                  onClick={() => onEventClick?.(event)}
                >
                  {event.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Hour labels */}
          <div className="border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] text-[10px] text-muted-foreground text-right pr-2 -mt-2"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, dayIndex) => {
            const dateKey = formatDateKey(date);
            const dayEvents = (eventsByDate[dateKey] || []).filter((e) => !e.is_all_day);
            const today = isToday(date);

            return (
              <div
                key={dayIndex}
                className={cn(
                  "relative border-r last:border-r-0",
                  today && "bg-primary/5"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-dashed border-muted-foreground/20"
                  />
                ))}

                {/* Current time indicator */}
                {today && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimePosition }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.map((event) => {
                  const { top, height } = getEventPosition(event.time_start, event.time_end);
                  const colors = EVENT_COLORS[event.event_type] || EVENT_COLORS.activity;
                  const isTransit = event.event_type === "transit";

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 rounded-sm border-l-2 px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-10",
                        colors.bg,
                        colors.border
                      )}
                      style={{ top, height: Math.max(height, 24) }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="flex items-start gap-1">
                        {isTransit && event.travel_mode === "driving" && (
                          <Car className="h-3 w-3 shrink-0 mt-0.5 text-gray-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[10px] font-medium truncate", colors.text)}>
                            {formatTimeShort(event.time_start)} {event.title}
                          </div>
                          {height > 40 && event.location_name && (
                            <div className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
                              <MapPin className="h-2 w-2" />
                              {event.location_name}
                            </div>
                          )}
                          {height > 55 && event.description && (
                            <div className="text-[9px] text-muted-foreground truncate">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isTransit && event.travel_minutes && (
                        <Badge variant="secondary" className="absolute bottom-0.5 right-0.5 text-[8px] px-1 py-0 h-4">
                          {event.travel_minutes}min
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-t bg-muted/30 text-[10px]">
        {Object.entries(EVENT_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded-sm border-l-2", colors.bg, colors.border)} />
            <span className="capitalize text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
