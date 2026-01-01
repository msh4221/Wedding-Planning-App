"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimelineEventItem, TimelineLane } from "@/types/timeline";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";

type AddEventDialogProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (event: TimelineEventItem) => void;
  lanes: TimelineLane[];
  venueTimezone: string;
  windowStartUtc: string;
  windowEndUtc: string;
};

export function AddEventDialog({
  open,
  onClose,
  onAdd,
  lanes,
  venueTimezone,
  windowStartUtc,
  windowEndUtc,
}: AddEventDialogProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [laneId, setLaneId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!laneId) {
      setError("Please select a lane");
      return;
    }

    // Parse times in venue timezone
    const windowStart = DateTime.fromISO(windowStartUtc, { zone: "utc" }).setZone(venueTimezone);
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startDt = windowStart.set({
      hour: startHour,
      minute: startMin,
      second: 0,
      millisecond: 0,
    });

    let endDt = windowStart.set({
      hour: endHour,
      minute: endMin,
      second: 0,
      millisecond: 0,
    });

    // Handle crossing midnight (e.g., event starts at 11pm ends at 1am)
    if (endDt <= startDt) {
      endDt = endDt.plus({ days: 1 });
    }

    // Validate against window
    const windowEnd = DateTime.fromISO(windowEndUtc, { zone: "utc" }).setZone(venueTimezone);

    if (startDt < windowStart) {
      setError(`Start time cannot be before ${windowStart.toFormat("h:mm a")}`);
      return;
    }

    if (endDt > windowEnd) {
      setError(`End time cannot be after ${windowEnd.toFormat("h:mm a")}`);
      return;
    }

    // Create the event
    const newEvent: TimelineEventItem = {
      id: uuidv4(),
      weddingId: "", // Will be set by the API
      laneId,
      title: title.trim(),
      startUtc: startDt.toUTC().toISO()!,
      endUtc: endDt.toUTC().toISO()!,
      notes: notes.trim() || undefined,
    };

    onAdd(newEvent);
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setStartTime("12:00");
    setEndTime("13:00");
    setLaneId("");
    setNotes("");
    setError(null);
    onClose();
  };

  // Set default lane when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && lanes.length > 0 && !laneId) {
      setLaneId(lanes[0].id);
    }
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription>
              Create a new event on the timeline. All times are in{" "}
              {venueTimezone.replace(/_/g, " ")}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="new-title">Title *</Label>
              <Input
                id="new-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., First Look Photos"
                autoFocus
              />
            </div>

            {/* Lane */}
            <div className="grid gap-2">
              <Label htmlFor="new-lane">Lane *</Label>
              <Select value={laneId} onValueChange={setLaneId}>
                <SelectTrigger id="new-lane">
                  <SelectValue placeholder="Select a lane" />
                </SelectTrigger>
                <SelectContent>
                  {lanes.map((lane) => (
                    <SelectItem key={lane.id} value={lane.id}>
                      {lane.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="new-start">Start Time</Label>
                <Input
                  id="new-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-end">End Time</Label>
                <Input
                  id="new-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="new-notes">Notes (optional)</Label>
              <Textarea
                id="new-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Add Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
