"use client";

import { useParams } from "next/navigation";
import { useCanEditTimeline } from "@/lib/mock-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TimelinePage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const canEdit = useCanEditTimeline();

  // Demo data - will be replaced with real data from database
  const timelineData = {
    venueTimezone: "America/New_York",
    weddingDate: "2026-10-17",
    events: [
      { id: "1", title: "Hair & Makeup", lane: "Prep", start: "8:00 AM", end: "11:00 AM", status: "confirmed" },
      { id: "2", title: "First Look Photos", lane: "Photo", start: "12:00 PM", end: "1:00 PM", status: "tentative" },
      { id: "3", title: "Wedding Party Photos", lane: "Photo", start: "1:00 PM", end: "2:30 PM", status: "tentative" },
      { id: "4", title: "Guest Arrival", lane: "Transport", start: "3:00 PM", end: "3:30 PM", status: "confirmed" },
      { id: "5", title: "Ceremony", lane: "Ceremony", start: "4:00 PM", end: "4:30 PM", status: "confirmed" },
      { id: "6", title: "Cocktail Hour", lane: "Meal", start: "4:30 PM", end: "5:30 PM", status: "confirmed" },
      { id: "7", title: "Reception Entrance", lane: "Music", start: "5:30 PM", end: "6:00 PM", status: "tentative" },
      { id: "8", title: "Dinner Service", lane: "Meal", start: "6:00 PM", end: "7:30 PM", status: "confirmed" },
      { id: "9", title: "First Dance", lane: "Music", start: "7:30 PM", end: "7:45 PM", status: "tentative" },
      { id: "10", title: "Dancing & Celebration", lane: "Music", start: "7:45 PM", end: "11:00 PM", status: "confirmed" },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Day-of Timeline</h1>
          <p className="text-muted-foreground">
            Saturday, October 17, 2026
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline">Add Lane</Button>
            <Button>Add Event</Button>
          </div>
        )}
      </div>

      {/* Timeline Notice */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">📅</div>
            <div>
              <h3 className="font-semibold">Interactive Timeline Coming Soon</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The drag-and-drop timeline with vis-timeline will be implemented in Phase 2.
                <br />
                Below is a preview of your scheduled events.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List (temporary view) */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Events</CardTitle>
          <CardDescription>
            {timelineData.events.length} events planned for your wedding day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timelineData.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium w-32">
                    {event.start} - {event.end}
                  </div>
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.lane}</p>
                  </div>
                </div>
                <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      {!canEdit && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              You have view-only access to this timeline.
              Contact the couple or planner to request changes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
