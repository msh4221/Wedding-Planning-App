"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
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

// Module cache for vis-timeline (loaded once, reused)
let visModulesPromise: Promise<{ Timeline: any; DataSet: any }> | null = null;

async function loadVisModules() {
  if (!visModulesPromise) {
    visModulesPromise = (async () => {
      // Load CSS once
      await import("vis-timeline/styles/vis-timeline-graph2d.css");
      const [{ Timeline }, { DataSet }] = await Promise.all([
        import("vis-timeline/standalone"),
        import("vis-data/standalone"),
      ]);
      return { Timeline, DataSet };
    })();
  }
  return visModulesPromise;
}

// Preload modules when this file is imported
if (typeof window !== 'undefined') {
  loadVisModules();
}

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
  const [isReady, setIsReady] = useState(false);

  // Store callbacks in refs to avoid effect dependency changes
  const callbacksRef = useRef({
    onSelectEvent,
    onUpdateEventTime,
    onUpdateEventLane,
  });

  // Keep callbacks ref updated (no dependency array - runs every render but cheap)
  callbacksRef.current = {
    onSelectEvent,
    onUpdateEventTime,
    onUpdateEventLane,
  };

  // Memoize timezone to prevent unnecessary recalculations
  const timezoneRef = useRef(venueTimezone);
  timezoneRef.current = venueTimezone;

  // Convert UTC to venue timezone for display - stable function
  const toVenueTime = useCallback(
    (utc: string) => DateTime.fromISO(utc, { zone: "utc" }).setZone(timezoneRef.current),
    [] // No dependencies - uses ref
  );

  // Convert venue time back to UTC - stable function
  const toUtc = useCallback(
    (date: Date) => DateTime.fromJSDate(date).setZone(timezoneRef.current, { keepLocalTime: true }).toUTC().toISO(),
    [] // No dependencies - uses ref
  );

  // Snap to nearest minute - completely stable
  const snapToMinute = useCallback((date: Date): Date => {
    const dt = DateTime.fromJSDate(date);
    return dt.set({ second: 0, millisecond: 0 }).toJSDate();
  }, []);

  // Transform lanes to vis-timeline groups - only when lanes change
  const groups = useMemo(() => {
    return lanes
      .filter((lane) => lane && lane.id) // Filter out undefined/invalid lanes
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((lane) => ({
        id: lane.id,
        content: lane.name || '',
        className: `lane-${(lane.laneType || 'misc').toLowerCase()}`,
      }));
  }, [lanes]);

  // Transform events to vis-timeline items - NO selectedEventId dependency!
  // Selection is handled by vis-timeline's setSelection() method
  const items = useMemo(() => {
    const tz = timezoneRef.current;
    return events
      .filter((event) => event && event.id && event.startUtc && event.endUtc) // Filter invalid events
      .map((event) => {
        const start = DateTime.fromISO(event.startUtc, { zone: "utc" }).setZone(tz).toJSDate();
        const end = DateTime.fromISO(event.endUtc, { zone: "utc" }).setZone(tz).toJSDate();

        return {
          id: event.id,
          group: event.laneId,
          content: event.title || '',
          start,
          end,
          className: "event-item",
          editable: !readOnly
            ? {
                updateTime: true,
                updateGroup: true,
                remove: false,
              }
            : false,
        };
      });
  }, [events, readOnly]);

  // Transform background bands - only when bands change
  const backgroundItems = useMemo(() => {
    const tz = timezoneRef.current;
    return bands
      .filter((band) => band && band.id && band.startUtc && band.endUtc) // Filter invalid bands
      .map((band) => ({
        id: `band-${band.id}`,
        content: band.label || '',
        start: DateTime.fromISO(band.startUtc, { zone: "utc" }).setZone(tz).toJSDate(),
        end: DateTime.fromISO(band.endUtc, { zone: "utc" }).setZone(tz).toJSDate(),
        type: "background",
        className: `background-band band-${(band.bandType || 'custom').toLowerCase()}`,
      }));
  }, [bands]);

  // Store current events in ref for move handler
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Track previous data for efficient updates
  const prevDataRef = useRef<{
    groups: typeof groups;
    items: typeof items;
    backgroundItems: typeof backgroundItems;
  } | null>(null);

  // EFFECT 1: Initialize and cleanup timeline
  useEffect(() => {
    if (!containerRef.current) return;
    if (lifecycleRef.current !== 'idle') return;

    lifecycleRef.current = 'initializing';

    let mounted = true;

    const initTimeline = async () => {
      try {
        const { Timeline, DataSet } = await loadVisModules();

        if (!mounted || !containerRef.current || lifecycleRef.current === 'destroying') {
          return;
        }

        // Create DataSets
        const itemsInstance = new DataSet();
        const groupsInstance = new DataSet();

        const tz = timezoneRef.current;
        const windowStart = DateTime.fromISO(windowStartUtc, { zone: "utc" }).setZone(tz).toJSDate();
        const windowEnd = DateTime.fromISO(windowEndUtc, { zone: "utc" }).setZone(tz).toJSDate();

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
          onMove: !readOnly ? (item: any, callback: (item: any) => void) => {
            if (lifecycleRef.current !== 'ready') {
              callback(null);
              return;
            }

            const snappedStart = snapToMinute(item.start);
            const snappedEnd = snapToMinute(item.end);

            if (snappedStart < windowStart || snappedEnd > windowEnd) {
              callback(null);
              return;
            }

            if (snappedEnd.getTime() - snappedStart.getTime() < 60000) {
              callback(null);
              return;
            }

            const startUtc = toUtc(snappedStart);
            const endUtc = toUtc(snappedEnd);

            if (startUtc && endUtc) {
              const originalEvent = eventsRef.current.find((e) => e.id === item.id);
              if (originalEvent && originalEvent.laneId !== item.group) {
                callbacksRef.current.onUpdateEventLane(item.id, item.group);
              }
              callbacksRef.current.onUpdateEventTime(item.id, startUtc, endUtc);
            }

            item.start = snappedStart;
            item.end = snappedEnd;
            callback(item);
          } : undefined,
        };

        const timelineInstance = new Timeline(
          containerRef.current,
          itemsInstance,
          groupsInstance,
          options
        );

        timelineInstance.on("select", (properties: { items: string[] }) => {
          if (lifecycleRef.current !== 'ready') return;

          const selectedId = properties.items[0] || null;
          if (selectedId && selectedId.startsWith("band-")) {
            callbacksRef.current.onSelectEvent(null);
          } else {
            callbacksRef.current.onSelectEvent(selectedId);
          }
        });

        timelineRef.current = timelineInstance;
        itemsRef.current = itemsInstance;
        groupsRef.current = groupsInstance;

        lifecycleRef.current = 'ready';
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize timeline:", error);
        lifecycleRef.current = 'idle';
      }
    };

    initTimeline();

    return () => {
      mounted = false;

      if (lifecycleRef.current === 'destroying' || lifecycleRef.current === 'idle') {
        return;
      }

      lifecycleRef.current = 'destroying';
      setIsReady(false);

      const timeline = timelineRef.current;
      const items = itemsRef.current;
      const groups = groupsRef.current;

      timelineRef.current = null;
      itemsRef.current = null;
      groupsRef.current = null;
      prevDataRef.current = null;

      if (timeline) {
        try {
          timeline.off("select");
        } catch (e) {}
      }

      if (items) {
        try { items.clear(); } catch (e) {}
      }
      if (groups) {
        try { groups.clear(); } catch (e) {}
      }

      if (timeline) {
        requestAnimationFrame(() => {
          try {
            timeline.destroy();
          } catch (e) {}
          lifecycleRef.current = 'idle';
        });
      } else {
        lifecycleRef.current = 'idle';
      }
    };
  }, [windowStartUtc, windowEndUtc, readOnly, snapToMinute, toUtc]);

  // EFFECT 2: Sync data efficiently when props change
  useEffect(() => {
    if (lifecycleRef.current !== 'ready') return;
    if (!groupsRef.current || !itemsRef.current || !timelineRef.current) return;

    try {
      const prev = prevDataRef.current;
      const allItems = [...items, ...backgroundItems];

      if (!prev) {
        // First sync - add all data
        groupsRef.current.add(groups);
        itemsRef.current.add(allItems);
      } else {
        // Efficient incremental updates for groups
        if (prev.groups !== groups) {
          const prevGroupIds = new Set(prev.groups.map(g => g.id));
          const newGroupIds = new Set(groups.map(g => g.id));

          // Remove deleted groups
          const toRemove = prev.groups.filter(g => !newGroupIds.has(g.id)).map(g => g.id);
          if (toRemove.length > 0) {
            groupsRef.current.remove(toRemove);
          }

          // Update or add groups
          const toUpdate = groups.filter(g => {
            const prevGroup = prev.groups.find(pg => pg.id === g.id);
            return !prevGroup || prevGroup.content !== g.content;
          });
          if (toUpdate.length > 0) {
            groupsRef.current.update(toUpdate);
          }
        }

        // Efficient incremental updates for items
        if (prev.items !== items || prev.backgroundItems !== backgroundItems) {
          const prevItemIds = new Set([...prev.items, ...prev.backgroundItems].map(i => i.id));
          const newItemIds = new Set(allItems.map(i => i.id));

          // Remove deleted items
          const toRemove = [...prev.items, ...prev.backgroundItems]
            .filter(i => !newItemIds.has(i.id))
            .map(i => i.id);
          if (toRemove.length > 0) {
            itemsRef.current.remove(toRemove);
          }

          // Update or add items - use update() which handles both
          if (allItems.length > 0) {
            itemsRef.current.update(allItems);
          }
        }
      }

      // Save current data for next comparison
      prevDataRef.current = { groups, items, backgroundItems };
    } catch (e) {
      // Ignore errors during data sync
    }
  }, [groups, items, backgroundItems]);

  // EFFECT 3: Handle selection separately (very cheap operation)
  useEffect(() => {
    if (lifecycleRef.current !== 'ready' || !timelineRef.current) return;

    try {
      if (selectedEventId) {
        timelineRef.current.setSelection([selectedEventId]);
      } else {
        timelineRef.current.setSelection([]);
      }
    } catch (e) {
      // Ignore errors
    }
  }, [selectedEventId]);

  return (
    <div className="timeline-canvas-wrapper relative h-full">
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
