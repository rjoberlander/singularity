/**
 * Generate Google Calendar event URLs for "Add to Google Calendar" links.
 *
 * Uses the unofficial but stable Google Calendar URL API:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 *
 * Reference: https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs
 */

interface CalendarEvent {
  title: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Time in HH:MM or HH:MM:SS format */
  startTime: string;
  /** Time in HH:MM or HH:MM:SS format */
  endTime: string;
  /** Optional location string (Google Maps compatible preferred) */
  location?: string;
  /** Optional event description */
  description?: string;
  /** IANA timezone (e.g. "Europe/Lisbon") */
  timezone?: string;
}

/**
 * Format date + time into Google Calendar's required format: YYYYMMDDTHHmmSS
 * Uses floating time (no Z suffix) combined with ctz param for timezone.
 */
function formatGCalDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  const timeParts = time.split(":");
  const hours = timeParts[0];
  const minutes = timeParts[1];
  const seconds = timeParts[2] || "00";
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Build a single Google Calendar "Add Event" URL.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", event.title);

  const start = formatGCalDateTime(event.date, event.startTime);
  const end = formatGCalDateTime(event.date, event.endTime);
  params.set("dates", `${start}/${end}`);

  if (event.location) {
    params.set("location", event.location);
  }
  if (event.description) {
    params.set("details", event.description);
  }
  if (event.timezone) {
    params.set("ctz", event.timezone);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build a Google Calendar URL for adding ALL events at once.
 * Google doesn't natively support multi-event URLs, so this generates
 * an ICS data URI that can be imported.
 */
export function buildIcsContent(events: CalendarEvent[], tripName?: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Singularity//Travel Itinerary//EN",
    `X-WR-CALNAME:${tripName || "Trip Itinerary"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const start = formatGCalDateTime(event.date, event.startTime);
    const end = formatGCalDateTime(event.date, event.endTime);
    const uid = `${start}-${Math.random().toString(36).slice(2, 10)}@singularity`;

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART;TZID=${event.timezone || "UTC"}:${start}`);
    lines.push(`DTEND;TZID=${event.timezone || "UTC"}:${end}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatGCalDateTime(new Date().toISOString().split("T")[0], new Date().toISOString().split("T")[1].slice(0, 8))}Z`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Download an ICS file to import into Google Calendar (or any calendar app).
 */
export function downloadIcsFile(events: CalendarEvent[], filename: string, tripName?: string) {
  const ics = buildIcsContent(events, tripName);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
