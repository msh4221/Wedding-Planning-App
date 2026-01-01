"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Timeline } from "vis-timeline/standalone";
import { DataSet } from "vis-data/standalone";
import type { TimelineEventItem, TimelineLane, TimelineBackgroundBand } from "@/types/timeline";
import { DateTime } from "luxon";
import "vis-timeline/styles/vis-timeline-graph2d.css";

type TimelineCanvasProps = {
  events: TimelineEventItem[];
  lanes: TimelineLane[];
  bands: TimelineBackgroundBand[];
  windowStartUtc: string;
  windowEndUtc: string;
  venueTimezone: string;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEventTime: (eventId: string, startUtc: string, endUtc: string) => void;
  onUpdateEventLane: (eventId: string, laneId: string) => void;
  readOnly?: boolean;
};

export function TimelineCanvas({
  events,
  lanes,
  bands,
  windowStartUtc,
  windowEndUtc,
  venueTimezone,
  selectedEventId,
  onSelectEvent,
  onUpdateEventTime,
  onUpdateEventLane,
  readOnly = false,
}: TimelineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const itemsRef = useRef<DataSet<any>>(new DataSet());
  const groupsRef = useRef<DataSet<any>>(new DataSet());

  // Convert UTC to venue timezone for display
  const toVenueTime = useCallback(
    (utc: string) => DateTime.fromISO(utc, { zone: "utc" }).setZone(venueTimezone),
    [venueTimezone]
  );

  // Convert venue time back to UTC
  const toUtc = useCallback(
    (date: Date) => DateTime.fromJSDate(date).setZone(venueTimezone, { keepLocalTime: true }).toUTC().toISO(),
    [venueTimezone]
  );

  // Snap to nearest minute
  const snapToMinute = useCallback((date: Date): Date => {
    const dt = DateTime.fromJSDate(date);
    return dt.set({ second: 0, millisecond: 0 }).toJSDate();
  }, []);

  // Transform lanes to vis-timeline groups
  const groups = useMemo(() => {
    return lanes
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((lane) => ({
        id: lane.id,
        content: lane.name,
        className: `lane-${lane.laneType.toLowerCase()}`,
      }));
  }, [lanes]);

  // Transform events to vis-timeline items
  const items = useMemo(() => {
    return events.map((event) => {
      const start = toVenueTime(event.startUtc).toJSDate();
      const end = toVenueTime(event.endUtc).toJSDate();

      return {
        id: event.id,
        group: event.laneId,
        content: event.title,
        start,
        end,
        className: `event-item ${selectedEventId === event.id ? "selected" : ""}`,
        editable: !readOnly
          ? {
              updateTime: true,
              updateGroup: true,
              remove: false,
            }
          : false,
      };
    });
  }, [events, toVenueTime, selectedEventId, readOnly]);

  // Transform background bands
  const backgroundItems = useMemo(() => {
    return bands.map((band) => ({
      id: `band-${band.id}`,
      content: band.label,
      start: toVenueTime(band.startUtc).toJSDate(),
      end: toVenueTime(band.endUtc).toJSDate(),
      type: "background",
      className: `background-band band-${band.bandType.toLowerCase()}`,
    }));
  }, [bands, toVenueTime]);

  // Initialize timeline
  useEffect(() => {
    if (!containerRef.current || timelineRef.current) return;

    const windowStart = toVenueTime(windowStartUtc).toJSDate();
    const windowEnd = toVenueTime(windowEndUtc).toJSDate();

    const options = {
      editable: !readOnly
        ? {
            updateTime: true,
            updateGroup: true,
            add: false,
            remove: false,
          }
        : false,
      snap: snapToMinute,
      min: windowStart,
      max: windowEnd,
      start: windowStart,
      end: windowEnd,
      zoomMin: 1000 * 60 * 30, // 30 minutes
      zoomMax: 1000 * 60 * 60 * 24, // 24 hours
      orientation: "top",
      stack: false,
      showCurrentTime: false,
      groupOrder: "id",
      margin: {
        item: {
          horizontal: 0,
          vertical: 5,
        },
      },
      tooltip: {
        followMouse: true,
        overflowMethod: "cap" as const,
      },
    };

    const timeline = new Timeline(
      containerRef.current,
      itemsRef.current,
      groupsRef.current,
      options
    );

    // Handle selection
    timeline.on("select", (properties: { items: string[] }) => {
      const selectedId = properties.items[0] || null;
      // Filter out background band selections
      if (selectedId && selectedId.startsWith("band-")) {
        onSelectEvent(null);
      } else {
        onSelectEvent(selectedId);
      }
    });

    // Handle item move (time change)
    timeline.on("itemover", () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = readOnly ? "default" : "move";
      }
    });

    timeline.on("itemout", () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = "default";
      }
    });

    timelineRef.current = timeline;

    return () => {
      timeline.destroy();
      timelineRef.current = null;
    };
  }, [windowStartUtc, windowEndUtc, venueTimezone, readOnly, snapToMinute, toVenueTime, onSelectEvent]);

  // Handle drag end - update event time or lane
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || readOnly) return;

    const handleMove = (item: any, callback: (item: any) => void) => {
      const snappedStart = snapToMinute(item.start);
      const snappedEnd = snapToMinute(item.end);

      // Check bounds
      const windowStart = toVenueTime(windowStartUtc).toJSDate();
      const windowEnd = toVenueTime(windowEndUtc).toJSDate();

      if (snappedStart < windowStart || snappedEnd > windowEnd) {
        callback(null); // Cancel the move
        return;
      }

      // Ensure minimum duration of 1 minute
      if (snappedEnd.getTime() - snappedStart.getTime() < 60000) {
        callback(null);
        return;
      }

      const startUtc = toUtc(snappedStart);
      const endUtc = toUtc(snappedEnd);

      if (startUtc && endUtc) {
        // Find original event to check if lane changed
        const originalEvent = events.find((e) => e.id === item.id);
        if (originalEvent && originalEvent.laneId !== item.group) {
          onUpdateEventLane(item.id, item.group);
        }
        onUpdateEventTime(item.id, startUtc, endUtc);
      }

      // Update item with snapped values
      item.start = snappedStart;
      item.end = snappedEnd;
      callback(item);
    };

    timeline.setOptions({ onMove: handleMove });

    return () => {
      timeline.setOptions({ onMove: undefined });
    };
  }, [events, readOnly, snapToMinute, toUtc, toVenueTime, windowStartUtc, windowEndUtc, onUpdateEventTime, onUpdateEventLane]);

  // Update groups when lanes change
  useEffect(() => {
    groupsRef.current.clear();
    groupsRef.current.add(groups);
  }, [groups]);

  // Update items when events change
  useEffect(() => {
    itemsRef.current.clear();
    itemsRef.current.add([...items, ...backgroundItems]);
  }, [items, backgroundItems]);

  // Handle selection changes
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    if (selectedEventId) {
      timeline.setSelection([selectedEventId]);
    } else {
      timeline.setSelection([]);
    }
  }, [selectedEventId]);

  return (
    <div className="timeline-canvas-wrapper">
      <div
        ref={containerRef}
        className="timeline-canvas h-full w-full"
      />
      <style jsx global>{`
        .timeline-canvas-wrapper {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        .timeline-canvas .vis-timeline {
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-family: inherit;
        }

        .timeline-canvas .vis-panel.vis-left {
          background: hsl(var(--muted));
          border-right: 1px solid hsl(var(--border));
        }

        .timeline-canvas .vis-labelset .vis-label {
          color: hsl(var(--foreground));
          font-weight: 500;
          padding: 0 12px;
        }

        .timeline-canvas .vis-item {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          border-radius: 4px;
          font-size: 12px;
          padding: 2px 8px;
        }

        .timeline-canvas .vis-item.selected {
          background: hsl(var(--primary) / 0.9);
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }

        .timeline-canvas .vis-item.vis-range {
          border-radius: 4px;
        }

        .timeline-canvas .vis-item .vis-item-content {
          padding: 2px 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-canvas .vis-time-axis .vis-text {
          color: hsl(var(--muted-foreground));
          font-size: 11px;
        }

        .timeline-canvas .vis-time-axis .vis-grid.vis-minor {
          border-color: hsl(var(--border) / 0.5);
        }

        .timeline-canvas .vis-time-axis .vis-grid.vis-major {
          border-color: hsl(var(--border));
        }

        .timeline-canvas .background-band {
          opacity: 0.3;
        }

        .timeline-canvas .band-golden_hour {
          background: #fbbf24;
        }

        .timeline-canvas .band-sunset {
          background: #f97316;
        }

        .timeline-canvas .band-civil_twilight {
          background: #8b5cf6;
        }

        .timeline-canvas .band-blue_hour {
          background: #3b82f6;
        }

        .timeline-canvas .band-meal {
          background: #22c55e;
        }

        .timeline-canvas .band-custom {
          background: #6b7280;
        }

        /* Lane type colors */
        .timeline-canvas .lane-ceremony .vis-item {
          background: #ef4444;
          border-color: #dc2626;
        }

        .timeline-canvas .lane-photo .vis-item {
          background: #f59e0b;
          border-color: #d97706;
        }

        .timeline-canvas .lane-transport .vis-item {
          background: #3b82f6;
          border-color: #2563eb;
        }

        .timeline-canvas .lane-meal .vis-item {
          background: #22c55e;
          border-color: #16a34a;
        }

        .timeline-canvas .lane-music .vis-item {
          background: #8b5cf6;
          border-color: #7c3aed;
        }

        .timeline-canvas .lane-vendor .vis-item {
          background: #ec4899;
          border-color: #db2777;
        }

        .timeline-canvas .lane-custom .vis-item {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }

        .timeline-canvas .vis-drag-center {
          cursor: move;
        }

        .timeline-canvas .vis-drag-left,
        .timeline-canvas .vis-drag-right {
          cursor: ew-resize;
        }
      `}</style>
    </div>
  );
}
