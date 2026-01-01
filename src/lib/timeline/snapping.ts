import { DateTime } from "luxon";

export const SNAP_MINUTES = 1;
export const MIN_DURATION_MINUTES = 1;

/**
 * Snap a date to the nearest minute increment
 */
export function snapToMinute(date: Date, snapMinutes: number = SNAP_MINUTES): Date {
  const dt = DateTime.fromJSDate(date);
  const minutes = dt.minute;
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes;
  return dt.set({ minute: snappedMinutes, second: 0, millisecond: 0 }).toJSDate();
}

/**
 * Snap a timestamp (milliseconds) to the nearest minute
 */
export function snapTimestamp(timestamp: number, snapMinutes: number = SNAP_MINUTES): number {
  const snappedDate = snapToMinute(new Date(timestamp), snapMinutes);
  return snappedDate.getTime();
}

/**
 * Ensure minimum duration between start and end
 */
export function ensureMinDuration(
  start: Date,
  end: Date,
  minMinutes: number = MIN_DURATION_MINUTES
): { start: Date; end: Date } {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const minDuration = minMinutes * 60 * 1000;

  if (endTime - startTime < minDuration) {
    return {
      start,
      end: new Date(startTime + minDuration),
    };
  }

  return { start, end };
}

/**
 * Clamp a date to be within window bounds
 */
export function clampToWindow(
  date: Date,
  windowStart: Date,
  windowEnd: Date
): Date {
  if (date < windowStart) return windowStart;
  if (date > windowEnd) return windowEnd;
  return date;
}

/**
 * Process event times: snap to minute, ensure min duration, clamp to window
 */
export function processEventTimes(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date
): { start: Date; end: Date; valid: boolean; error?: string } {
  // Snap to minute
  let snappedStart = snapToMinute(start);
  let snappedEnd = snapToMinute(end);

  // Ensure min duration
  const { start: minStart, end: minEnd } = ensureMinDuration(snappedStart, snappedEnd);
  snappedStart = minStart;
  snappedEnd = minEnd;

  // Clamp to window
  snappedStart = clampToWindow(snappedStart, windowStart, windowEnd);
  snappedEnd = clampToWindow(snappedEnd, windowStart, windowEnd);

  // Validate
  if (snappedEnd <= snappedStart) {
    return {
      start: snappedStart,
      end: snappedEnd,
      valid: false,
      error: "Event end must be after start",
    };
  }

  return {
    start: snappedStart,
    end: snappedEnd,
    valid: true,
  };
}
