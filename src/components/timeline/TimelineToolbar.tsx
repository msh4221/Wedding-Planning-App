"use client";

import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Plus,
  Save,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type TimelineToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  isPublishing: boolean;
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddEvent: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function TimelineToolbar({
  canUndo,
  canRedo,
  isDirty,
  isPublishing,
  readOnly,
  onUndo,
  onRedo,
  onAddEvent,
  onPublish,
  onDiscard,
  onZoomIn,
  onZoomOut,
}: TimelineToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Edit controls - only show if not read-only */}
        {!readOnly && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="border-l pl-2 ml-2">
              <Button
                variant="default"
                size="sm"
                onClick={onAddEvent}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Publish/Discard - only show when dirty */}
      {!readOnly && isDirty && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Unsaved changes
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            disabled={isPublishing}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Discard
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onPublish}
            disabled={isPublishing}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {isPublishing ? "Saving..." : "Publish"}
          </Button>
        </div>
      )}
    </div>
  );
}
