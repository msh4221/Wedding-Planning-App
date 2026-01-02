"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { TimelineEventItem, TimelineLane, TimelineBackgroundBand } from "@/types/timeline";
import { DateTime } from "luxon";
import "./timeline-canvas.css";

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

// Lifecycle states for the timeline component
type LifecycleState = 'idle' | 'initializing' | 'ready' | 'destroying';

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
  const timelineRef = useRef<any>(null);
  const itemsRef = useRef<any>(null);
  const groupsRef = useRef<any>(null);

  // Lifecycle state machine to prevent race conditions
  const lifecycleRef = useRef<LifecycleState>('idle');

  // Store callbacks in refs to avoid effect dependency changes
  const callbacksRef = useRef({
    onSelectEvent,
    onUpdateEventTime,
    onUpdateEventLane,
  });

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = {
      onSelectEvent,
      onUpdateEventTime,
      onUpdateEventLane,
    };
  }, [onSelectEvent, onUpdateEventTime, onUpdateEventLane]);

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

  // Store current events in ref for move handler
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // EFFECT 1: Initialize and cleanup timeline (consolidated)
  useEffect(() => {
    if (!containerRef.current) return;
    if (lifecycleRef.current !== 'idle') return; // Prevent re-initialization

    lifecycleRef.current = 'initializing';

    let mounted = true;
    let timelineInstance: any = null;
    let itemsInstance: any = null;
    let groupsInstance: any = null;

    const initTimeline = async () => {
      try {
        // Dynamically import vis-timeline CSS and modules
        await import("vis-timeline/styles/vis-timeline-graph2d.css");
        const [{ Timeline }, { DataSet }] = await Promise.all([
          import("vis-timeline/standalone"),
          import("vis-data/standalone"),
        ]);

        if (!mounted || !containerRef.current || lifecycleRef.current === 'destroying') {
          return;
        }

        // Create DataSets
        itemsInstance = new DataSet();
        groupsInstance = new DataSet();

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
          orientation: "top" as const,
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
          // Set up onMove handler during initialization
          onMove: !readOnly ? (item: any, callback: (item: any) => void) => {
            // Guard against operations during cleanup
            if (lifecycleRef.current !== 'ready') {
              callback(null);
              return;
            }

            const snappedStart = snapToMinute(item.start);
            const snappedEnd = snapToMinute(item.end);

            // Check bounds
            if (snappedStart < windowStart || snappedEnd > windowEnd) {
              callback(null);
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
              const originalEvent = eventsRef.current.find((e) => e.id === item.id);
              if (originalEvent && originalEvent.laneId !== item.group) {
                callbacksRef.current.onUpdateEventLane(item.id, item.group);
              }
              callbacksRef.current.onUpdateEventTime(item.id, startUtc, endUtc);
            }

            // Update item with snapped values
            item.start = snappedStart;
            item.end = snappedEnd;
            callback(item);
          } : undefined,
        };

        timelineInstance = new Timeline(
          containerRef.current,
          itemsInstance,
          groupsInstance,
          options
        );

        // Handle selection
        timelineInstance.on("select", (properties: { items: string[] }) => {
          if (lifecycleRef.current !== 'ready') return;

          const selectedId = properties.items[0] || null;
          // Filter out background band selections
          if (selectedId && selectedId.startsWith("band-")) {
            callbacksRef.current.onSelectEvent(null);
          } else {
            callbacksRef.current.onSelectEvent(selectedId);
          }
        });

        // Store refs
        timelineRef.current = timelineInstance;
        itemsRef.current = itemsInstance;
        groupsRef.current = groupsInstance;

        // Mark as ready
        lifecycleRef.current = 'ready';
      } catch (error) {
        console.error("Failed to initialize timeline:", error);
        lifecycleRef.current = 'idle';
      }
    };

    initTimeline();

    return () => {
      mounted = false;

      // Prevent double cleanup
      if (lifecycleRef.current === 'destroying' || lifecycleRef.current === 'idle') {
        return;
      }

      lifecycleRef.current = 'destroying';

      // Capture refs before nullifying
      const timeline = timelineRef.current;
      const items = itemsRef.current;
      const groups = groupsRef.current;

      // Nullify refs immediately to prevent access from other code
      timelineRef.current = null;
      itemsRef.current = null;
      groupsRef.current = null;

      // Clean up event listeners
      if (timeline) {
        try {
          timeline.off("select");
        } catch (e) {
          // Ignore
        }
      }

      // Clear DataSets before destroying timeline
      if (items) {
        try {
          items.clear();
        } catch (e) {
          // Ignore
        }
      }
      if (groups) {
        try {
          groups.clear();
        } catch (e) {
          // Ignore
        }
      }

      // Delay destroy to let pending handlers complete
      if (timeline) {
        requestAnimationFrame(() => {
          try {
            timeline.destroy();
          } catch (e) {
            // Ignore cleanup errors
          }
          // Reset lifecycle state after destruction is complete
          lifecycleRef.current = 'idle';
        });
      } else {
        lifecycleRef.current = 'idle';
      }
    };
  }, [windowStartUtc, windowEndUtc, venueTimezone, readOnly, snapToMinute, toVenueTime, toUtc]);

  // EFFECT 2: Sync data (groups, items, selection) when props change
  useEffect(() => {
    // Only sync when timeline is ready
    if (lifecycleRef.current !== 'ready') return;
    if (!groupsRef.current || !itemsRef.current || !timelineRef.current) return;

    try {
      // Update groups
      groupsRef.current.clear();
      groupsRef.current.add(groups);

      // Update items (events + background bands)
      itemsRef.current.clear();
      itemsRef.current.add([...items, ...backgroundItems]);

      // Update selection
      if (selectedEventId) {
        timelineRef.current.setSelection([selectedEventId]);
      } else {
        timelineRef.current.setSelection([]);
      }
    } catch (e) {
      // Ignore errors during data sync (component may be unmounting)
    }
  }, [groups, items, backgroundItems, selectedEventId]);

  const isReady = lifecycleRef.current === 'ready';

  return (
    <div className="timeline-canvas-wrapper">
      <div
        ref={containerRef}
        className="timeline-canvas h-full w-full"
      />
      {!isReady && lifecycleRef.current !== 'destroying' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      )}
    </div>
  );
}
