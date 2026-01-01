"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  TimelineEventItem,
  TimelineLane,
  TimelineBackgroundBand,
  TimelineResponse,
  PatchOp,
} from "@/types/timeline";
import {
  DraftState,
  createDraftState,
  addPatchOp,
  clearDraft,
  resetDraft,
  applyDraftToEvents,
  applyDraftToLanes,
} from "@/lib/timeline/draft";
import {
  HistoryState,
  createHistory,
  recordAction,
  undo as historyUndo,
  redo as historyRedo,
  canUndo,
  canRedo,
  clearHistory,
} from "@/lib/timeline/history";

type TimelineState = {
  version: number;
  venueTimezone: string;
  weddingDate: string;
  windowStartUtc: string;
  windowEndUtc: string;
  lanes: TimelineLane[];
  events: TimelineEventItem[];
  bands: TimelineBackgroundBand[];
};

type UseTimelineReturn = {
  // State
  timeline: TimelineState | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;

  // Computed (with draft applied)
  displayEvents: TimelineEventItem[];
  displayLanes: TimelineLane[];

  // Actions
  refresh: () => Promise<void>;
  addEvent: (event: TimelineEventItem) => void;
  updateEventTime: (eventId: string, startUtc: string, endUtc: string) => void;
  updateEventLane: (eventId: string, laneId: string) => void;
  updateEventTitle: (eventId: string, title: string) => void;
  deleteEvent: (eventId: string) => void;
  addLane: (lane: TimelineLane) => void;
  deleteLane: (laneId: string) => void;

  // Draft management
  publish: () => Promise<boolean>;
  discard: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Selection
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
};

export function useTimeline(weddingId: string): UseTimelineReturn {
  const [timeline, setTimeline] = useState<TimelineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(createDraftState(0));
  const [history, setHistory] = useState<HistoryState>(createHistory(50));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch timeline data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weddings/${weddingId}/timeline`);
      if (!res.ok) {
        throw new Error("Failed to fetch timeline");
      }

      const data: TimelineResponse = await res.json();
      setTimeline(data);
      setDraft(createDraftState(data.version));
      setHistory(clearHistory(history));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Apply draft to get display state
  const displayEvents = timeline
    ? applyDraftToEvents(timeline.events, draft.patchOps)
    : [];
  const displayLanes = timeline
    ? applyDraftToLanes(timeline.lanes, draft.patchOps)
    : [];

  // Helper to add patch op and record history
  const applyPatch = useCallback(
    (ops: PatchOp[]) => {
      for (const op of ops) {
        setDraft((d) => addPatchOp(d, op));
      }
      setHistory((h) => recordAction(h, ops));
    },
    []
  );

  // Actions
  const addEvent = useCallback(
    (event: TimelineEventItem) => {
      applyPatch([{ op: "create_event", event }]);
    },
    [applyPatch]
  );

  const updateEventTime = useCallback(
    (eventId: string, startUtc: string, endUtc: string) => {
      applyPatch([{ op: "update_event_time", eventId, startUtc, endUtc }]);
    },
    [applyPatch]
  );

  const updateEventLane = useCallback(
    (eventId: string, laneId: string) => {
      applyPatch([{ op: "update_event_lane", eventId, laneId }]);
    },
    [applyPatch]
  );

  const updateEventTitle = useCallback(
    (eventId: string, title: string) => {
      applyPatch([{ op: "update_event_title", eventId, title }]);
    },
    [applyPatch]
  );

  const deleteEvent = useCallback(
    (eventId: string) => {
      applyPatch([{ op: "delete_event", eventId }]);
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
    },
    [applyPatch, selectedEventId]
  );

  const addLane = useCallback(
    (lane: TimelineLane) => {
      applyPatch([{ op: "create_lane", lane }]);
    },
    [applyPatch]
  );

  const deleteLane = useCallback(
    (laneId: string) => {
      applyPatch([{ op: "delete_lane", laneId }]);
    },
    [applyPatch]
  );

  // Publish changes to server
  const publish = useCallback(async (): Promise<boolean> => {
    if (!draft.isDirty || draft.patchOps.length === 0) {
      return true;
    }

    try {
      const res = await fetch(`/api/weddings/${weddingId}/timeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersion: draft.baseVersion,
          patchOps: draft.patchOps,
        }),
      });

      if (res.status === 409) {
        // Version conflict
        const data = await res.json();
        setError(
          `Timeline was updated by someone else. Your version: ${draft.baseVersion}, Current: ${data.currentVersion}`
        );
        return false;
      }

      if (!res.ok) {
        throw new Error("Failed to publish changes");
      }

      const data: TimelineResponse = await res.json();
      setTimeline(data);
      setDraft(resetDraft(data.version));
      setHistory(clearHistory(history));
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
      return false;
    }
  }, [weddingId, draft, history]);

  // Discard changes
  const discard = useCallback(() => {
    setDraft(createDraftState(draft.baseVersion));
    setHistory(clearHistory(history));
  }, [draft.baseVersion, history]);

  // Undo
  const undo = useCallback(() => {
    const { newHistory, patchOps } = historyUndo(history);
    if (patchOps) {
      // Remove the last N operations from draft
      setDraft((d) => ({
        ...d,
        patchOps: d.patchOps.slice(0, d.patchOps.length - patchOps.length),
        isDirty: d.patchOps.length - patchOps.length > 0,
      }));
      setHistory(newHistory);
    }
  }, [history]);

  // Redo
  const redo = useCallback(() => {
    const { newHistory, patchOps } = historyRedo(history);
    if (patchOps) {
      setDraft((d) => ({
        ...d,
        patchOps: [...d.patchOps, ...patchOps],
        isDirty: true,
      }));
      setHistory(newHistory);
    }
  }, [history]);

  return {
    timeline,
    isLoading,
    error,
    isDirty: draft.isDirty,
    displayEvents,
    displayLanes,
    refresh,
    addEvent,
    updateEventTime,
    updateEventLane,
    updateEventTitle,
    deleteEvent,
    addLane,
    deleteLane,
    publish,
    discard,
    undo,
    redo,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    selectedEventId,
    setSelectedEventId,
  };
}
