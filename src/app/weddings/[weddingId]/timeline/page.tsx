"use client";

import { useParams } from "next/navigation";
import { useCanEditTimeline } from "@/lib/mock-auth";
import { TimelineView } from "@/components/timeline/TimelineView";

export default function TimelinePage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const canEdit = useCanEditTimeline();

  return (
    <div className="h-[calc(100vh-120px)]">
      <TimelineView
        weddingId={weddingId}
        venueTimezone="America/New_York"
        readOnly={!canEdit}
      />
    </div>
  );
}
