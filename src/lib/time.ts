import { DateTime, Duration } from "luxon";

// Constants from the spec
export const TIMELINE_WINDOW_START_HOUR = 3; // 3:00 AM
export const TIMELINE_WINDOW_END_HOUR = 3; // 3:00 AM next day
export const SNAP_MINUTES = 1;

/**
 * Get the timeline window bounds for a wedding date in the venue timezone.
 * The window spans from 3:00 AM on the wedding date to 3:00 AM the next day.
 */
export function getTimelineWindow(weddingDate: string, venueTimezone: string) {
  // Parse the wedding date in the venue timezone
  const weddingDt = DateTime.fromISO(weddingDate, { zone: venueTimezone });

  // Window start: 3:00 AM on wedding day
  const windowStartLocal = weddingDt.set({
    hour: TIMELINE_WINDOW_START_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  // Window end: 3:00 AM next day
  const windowEndLocal = windowStartLocal.plus({ days: 1 });

  return {
    windowStartLocal,
    windowEndLocal,
    windowStartUtc: windowStartLocal.toUTC().toISO()!,
    windowEndUtc: windowEndLocal.toUTC().toISO()!,
  };
}

/**
 * Convert a UTC ISO string to venue local time display string.
 */
export function utcToVenueTime(utcIso: string, venueTimezone: string): string {
  const dt = DateTime.fromISO(utcIso, { zone: "UTC" }).setZone(venueTimezone);
  return dt.toFormat("h:mm a");
}

/**
 * Convert a UTC ISO string to venue local DateTime.
 */
export function utcToVenueDateTime(utcIso: string, venueTimezone: string): DateTime {
  return DateTime.fromISO(utcIso, { zone: "UTC" }).setZone(venueTimezone);
}

/**
 * Convert venue local DateTime to UTC ISO string.
 */
export function venueDateTimeToUtc(dt: DateTime): string {
  return dt.toUTC().toISO()!;
}

/**
 * Snap a DateTime to the nearest minute increment.
 */
export function snapToMinute(dt: DateTime, snapMinutes: number = SNAP_MINUTES): DateTime {
  const minutes = dt.minute;
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes;
  return dt.set({ minute: snappedMinutes, second: 0, millisecond: 0 });
}

/**
 * Clamp a DateTime to be within the timeline window bounds.
 */
export function clampToWindow(
  dt: DateTime,
  windowStartUtc: string,
  windowEndUtc: string
): DateTime {
  const start = DateTime.fromISO(windowStartUtc);
  const end = DateTime.fromISO(windowEndUtc);

  if (dt < start) return start;
  if (dt > end) return end;
  return dt;
}

/**
 * Validate that an event's times are valid (end > start, within window, minimum duration).
 */
export function validateEventTimes(
  startUtc: string,
  endUtc: string,
  windowStartUtc: string,
  windowEndUtc: string
): { valid: boolean; error?: string } {
  const start = DateTime.fromISO(startUtc);
  const end = DateTime.fromISO(endUtc);
  const windowStart = DateTime.fromISO(windowStartUtc);
  const windowEnd = DateTime.fromISO(windowEndUtc);

  // Check start is before end
  if (end <= start) {
    return { valid: false, error: "End time must be after start time" };
  }

  // Check minimum duration (1 minute)
  const durationMinutes = end.diff(start, "minutes").minutes;
  if (durationMinutes < 1) {
    return { valid: false, error: "Event must be at least 1 minute long" };
  }

  // Check start is within window
  if (start < windowStart || start >= windowEnd) {
    return { valid: false, error: "Start time must be within the day-of timeline window" };
  }

  // Check end is within window
  if (end <= windowStart || end > windowEnd) {
    return { valid: false, error: "End time must be within the day-of timeline window" };
  }

  return { valid: true };
}

/**
 * Format a duration in minutes to a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Get the duration between two UTC ISO strings in minutes.
 */
export function getDurationMinutes(startUtc: string, endUtc: string): number {
  const start = DateTime.fromISO(startUtc);
  const end = DateTime.fromISO(endUtc);
  return end.diff(start, "minutes").minutes;
}

/**
 * Create a new end time by adding duration to start time.
 */
export function addMinutes(utcIso: string, minutes: number): string {
  return DateTime.fromISO(utcIso).plus({ minutes }).toISO()!;
}

/**
 * Format a date for display in the venue timezone.
 */
export function formatVenueDate(weddingDate: string, venueTimezone: string): string {
  const dt = DateTime.fromISO(weddingDate, { zone: venueTimezone });
  return dt.toFormat("EEEE, MMMM d, yyyy");
}

/**
 * Get the timezone abbreviation (e.g., "EST", "PST").
 */
export function getTimezoneAbbr(venueTimezone: string, date?: DateTime): string {
  const dt = date ?? DateTime.now().setZone(venueTimezone);
  return dt.toFormat("ZZZZ");
}
