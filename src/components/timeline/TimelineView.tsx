"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTimeline } from "@/hooks/useTimeline";
import { TimelineToolbar } from "./TimelineToolbar";
import { TimelineInspector } from "./TimelineInspector";
import { AddEventDialog } from "./AddEventDialog";
import { TimelineErrorBoundary } from "./TimelineErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

// Dynamically import TimelineCanvas with SSR disabled
const TimelineCanvas = dynamic(
  () => import("./TimelineCanvas").then((mod) => mod.TimelineCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading timeline...</span>
      </div>
    ),
  }
);

type TimelineViewProps = {
  weddingId: string;
  venueTimezone: string;
  readOnly?: boolean;
};

export function TimelineView({
  weddingId,
  venueTimezone,
  readOnly = false,
}: TimelineViewProps) {
  const {
    timeline,
    isLoading,
    error,
    isDirty,
    displayEvents,
    displayLanes,
    refresh,
    addEvent,
    updateEventTime,
    updateEventLane,
    updateEventTitle,
    deleteEvent,
    publish,
    discard,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedEventId,
    setSelectedEventId,
  } = useTimeline(weddingId);

  const [isPublishing, setIsPublishing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showInspector, setShowInspector] = useState(true);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;

      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }

      // Delete/Backspace to delete selected event
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEventId) {
        e.preventDefault();
        deleteEvent(selectedEventId);
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedEventId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [readOnly, undo, redo, deleteEvent, selectedEventId, setSelectedEventId]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    await publish();
    setIsPublishing(false);
  }, [publish]);

  const handleZoomIn = useCallback(() => {
    // Zoom is handled directly by vis-timeline
  }, []);

  const handleZoomOut = useCallback(() => {
    // Zoom is handled directly by vis-timeline
  }, []);

  const selectedEvent = selectedEventId
    ? displayEvents.find((e) => e.id === selectedEventId) || null
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button
              onClick={refresh}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <TimelineToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        isDirty={isDirty}
        isPublishing={isPublishing}
        readOnly={readOnly}
        onUndo={undo}
        onRedo={redo}
        onAddEvent={() => setShowAddDialog(true)}
        onPublish={handlePublish}
        onDiscard={discard}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline canvas */}
        <div className={`flex-1 ${showInspector ? "mr-0" : ""}`}>
          <TimelineErrorBoundary>
            <TimelineCanvas
              events={displayEvents}
              lanes={displayLanes}
              bands={timeline.bands}
              windowStartUtc={timeline.windowStartUtc}
              windowEndUtc={timeline.windowEndUtc}
              venueTimezone={timeline.venueTimezone}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onUpdateEventTime={updateEventTime}
              onUpdateEventLane={updateEventLane}
              readOnly={readOnly}
            />
          </TimelineErrorBoundary>
        </div>

        {/* Inspector panel */}
        {showInspector && (
          <div className="w-80 border-l bg-background flex-shrink-0">
            <TimelineInspector
              event={selectedEvent}
              lanes={displayLanes}
              venueTimezone={timeline.venueTimezone}
              readOnly={readOnly}
              onClose={() => setSelectedEventId(null)}
              onUpdateTitle={updateEventTitle}
              onUpdateTime={updateEventTime}
              onUpdateLane={updateEventLane}
              onDelete={deleteEvent}
            />
          </div>
        )}
      </div>

      {/* Add event dialog */}
      <AddEventDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addEvent}
        lanes={displayLanes}
        venueTimezone={timeline.venueTimezone}
        windowStartUtc={timeline.windowStartUtc}
        windowEndUtc={timeline.windowEndUtc}
      />
    </div>
  );
}
