"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Trash2, Clock, MapPin, User } from "lucide-react";
import type { TimelineEventItem, TimelineLane } from "@/types/timeline";
import { DateTime } from "luxon";

type TimelineInspectorProps = {
  event: TimelineEventItem | null;
  lanes: TimelineLane[];
  venueTimezone: string;
  readOnly: boolean;
  onClose: () => void;
  onUpdateTitle: (eventId: string, title: string) => void;
  onUpdateTime: (eventId: string, startUtc: string, endUtc: string) => void;
  onUpdateLane: (eventId: string, laneId: string) => void;
  onDelete: (eventId: string) => void;
};

export function TimelineInspector({
  event,
  lanes,
  venueTimezone,
  readOnly,
  onClose,
  onUpdateTitle,
  onUpdateTime,
  onUpdateLane,
  onDelete,
}: TimelineInspectorProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [laneId, setLaneId] = useState("");

  // Format time for display in venue timezone
  const formatTimeForInput = (utc: string) => {
    return DateTime.fromISO(utc, { zone: "utc" })
      .setZone(venueTimezone)
      .toFormat("HH:mm");
  };

  // Format full date for display
  const formatDateForDisplay = (utc: string) => {
    return DateTime.fromISO(utc, { zone: "utc" })
      .setZone(venueTimezone)
      .toFormat("ccc, MMM d");
  };

  // Parse time input back to UTC
  const parseTimeToUtc = (time: string, referenceUtc: string) => {
    const refDt = DateTime.fromISO(referenceUtc, { zone: "utc" }).setZone(venueTimezone);
    const [hours, minutes] = time.split(":").map(Number);

    return refDt
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
      .toUTC()
      .toISO();
  };

  // Update local state when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStartTime(formatTimeForInput(event.startUtc));
      setEndTime(formatTimeForInput(event.endUtc));
      setLaneId(event.laneId);
    }
  }, [event, venueTimezone]);

  if (!event) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Event Details</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <p className="text-center text-sm">
            Select an event on the timeline to view its details
          </p>
        </div>
      </div>
    );
  }

  const handleTitleBlur = () => {
    if (title !== event.title && title.trim()) {
      onUpdateTitle(event.id, title.trim());
    }
  };

  const handleTimeBlur = () => {
    const newStartUtc = parseTimeToUtc(startTime, event.startUtc);
    const newEndUtc = parseTimeToUtc(endTime, event.endUtc);

    if (newStartUtc && newEndUtc) {
      if (newStartUtc !== event.startUtc || newEndUtc !== event.endUtc) {
        onUpdateTime(event.id, newStartUtc, newEndUtc);
      }
    }
  };

  const handleLaneChange = (newLaneId: string) => {
    setLaneId(newLaneId);
    if (newLaneId !== event.laneId) {
      onUpdateLane(event.id, newLaneId);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this event?")) {
      onDelete(event.id);
    }
  };

  // Calculate duration
  const duration = DateTime.fromISO(event.endUtc)
    .diff(DateTime.fromISO(event.startUtc), ["hours", "minutes"])
    .toObject();
  const durationStr =
    duration.hours && duration.hours > 0
      ? `${duration.hours}h ${Math.round(duration.minutes || 0)}m`
      : `${Math.round(duration.minutes || 0)}m`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Event Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          {readOnly ? (
            <p className="text-sm">{event.title}</p>
          ) : (
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Event title"
            />
          )}
        </div>

        {/* Date display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatDateForDisplay(event.startUtc)}</span>
          <span className="text-xs">({durationStr})</span>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start</Label>
            {readOnly ? (
              <p className="text-sm">{startTime}</p>
            ) : (
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                onBlur={handleTimeBlur}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End</Label>
            {readOnly ? (
              <p className="text-sm">{endTime}</p>
            ) : (
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                onBlur={handleTimeBlur}
              />
            )}
          </div>
        </div>

        {/* Lane */}
        <div className="space-y-2">
          <Label htmlFor="lane">Lane</Label>
          {readOnly ? (
            <p className="text-sm">
              {lanes.find((l) => l.id === event.laneId)?.name || "Unknown"}
            </p>
          ) : (
            <Select value={laneId} onValueChange={handleLaneChange}>
              <SelectTrigger id="lane">
                <SelectValue placeholder="Select lane" />
              </SelectTrigger>
              <SelectContent>
                {lanes.map((lane) => (
                  <SelectItem key={lane.id} value={lane.id}>
                    {lane.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Owner */}
        {event.assignedOwner && (
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{event.assignedOwner}</span>
            </div>
          </div>
        )}

        {/* Location */}
        {event.locationLabel && (
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.locationLabel}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="space-y-2">
            <Label>Notes</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {event.notes}
            </p>
          </div>
        )}
      </div>

      {/* Delete button */}
      {!readOnly && (
        <div className="border-t p-4">
          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-2"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Event
          </Button>
        </div>
      )}
    </div>
  );
}
