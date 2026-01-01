import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTimelineWindow } from "@/lib/time";
import type { PatchOp } from "@/types/timeline";

type RouteParams = {
  params: Promise<{ weddingId: string }>;
};

// GET /api/weddings/[weddingId]/timeline
// Returns the official timeline with version, lanes, events, and bands
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { weddingId } = await params;

  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        lanes: {
          orderBy: { sortOrder: "asc" },
        },
        events: {
          orderBy: { startUtc: "asc" },
        },
        backgroundBands: true,
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    // Calculate timeline window bounds
    const { windowStartUtc, windowEndUtc } = getTimelineWindow(
      wedding.weddingDate,
      wedding.venueTimezone
    );

    // Transform lanes to include owner as OwnerRef
    const lanes = wedding.lanes.map((lane) => ({
      id: lane.id,
      weddingId: lane.weddingId,
      name: lane.name,
      laneType: lane.type,
      owner: lane.ownerId
        ? {
            id: lane.ownerId,
            type: lane.ownerType,
            displayName: lane.ownerName,
          }
        : null,
      sortOrder: lane.sortOrder,
    }));

    // Transform events
    const events = wedding.events.map((event) => ({
      id: event.id,
      weddingId: event.weddingId,
      title: event.title,
      startUtc: event.startUtc.toISOString(),
      endUtc: event.endUtc.toISOString(),
      laneId: event.laneId,
      category: event.category,
      assignedOwner: event.assignedOwnerName || null,
      status: event.status,
      locked: event.locked,
      notes: event.notes,
      locationLabel: event.locationLabel,
      locationLat: event.locationLat,
      locationLng: event.locationLng,
    }));

    // Transform bands
    const bands = wedding.backgroundBands.map((band) => ({
      id: band.id,
      weddingId: band.weddingId,
      bandType: band.bandType,
      startUtc: band.startUtc.toISOString(),
      endUtc: band.endUtc.toISOString(),
      label: band.label,
    }));

    return NextResponse.json({
      version: wedding.timelineVersion,
      venueTimezone: wedding.venueTimezone,
      weddingDate: wedding.weddingDate,
      windowStartUtc,
      windowEndUtc,
      lanes,
      events,
      bands,
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}

// PUT /api/weddings/[weddingId]/timeline
// Updates the official timeline with version control
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { weddingId } = await params;

  try {
    const body = await request.json();
    const { baseVersion, patchOps } = body as {
      baseVersion: number;
      patchOps: PatchOp[];
    };

    // Get current wedding with version
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    // Check for version conflict
    if (wedding.timelineVersion !== baseVersion) {
      // Return 409 with current state for conflict resolution
      const currentTimeline = await getFullTimeline(weddingId, wedding);
      return NextResponse.json(
        {
          error: "Version conflict",
          currentVersion: wedding.timelineVersion,
          ...currentTimeline,
        },
        { status: 409 }
      );
    }

    // Get timeline bounds for validation
    const { windowStartUtc, windowEndUtc } = getTimelineWindow(
      wedding.weddingDate,
      wedding.venueTimezone
    );

    // Apply patch operations
    for (const op of patchOps) {
      await applyPatchOp(weddingId, op, windowStartUtc, windowEndUtc);
    }

    // Increment version
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { timelineVersion: { increment: 1 } },
    });

    // Return updated timeline
    const updatedWedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
    });

    const updatedTimeline = await getFullTimeline(weddingId, updatedWedding!);

    return NextResponse.json(updatedTimeline);
  } catch (error) {
    console.error("Error updating timeline:", error);
    return NextResponse.json(
      { error: "Failed to update timeline" },
      { status: 500 }
    );
  }
}

// Helper to get full timeline data
async function getFullTimeline(weddingId: string, wedding: { timelineVersion: number; venueTimezone: string; weddingDate: string }) {
  const [lanes, events, bands] = await Promise.all([
    prisma.timelineLane.findMany({
      where: { weddingId },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.timelineEvent.findMany({
      where: { weddingId },
      orderBy: { startUtc: "asc" },
    }),
    prisma.timelineBackgroundBand.findMany({
      where: { weddingId },
    }),
  ]);

  const { windowStartUtc, windowEndUtc } = getTimelineWindow(
    wedding.weddingDate,
    wedding.venueTimezone
  );

  return {
    version: wedding.timelineVersion,
    venueTimezone: wedding.venueTimezone,
    weddingDate: wedding.weddingDate,
    windowStartUtc,
    windowEndUtc,
    lanes: lanes.map((lane) => ({
      id: lane.id,
      weddingId: lane.weddingId,
      name: lane.name,
      type: lane.type,
      owner: {
        id: lane.ownerId,
        type: lane.ownerType,
        displayName: lane.ownerName,
      },
      sortOrder: lane.sortOrder,
    })),
    events: events.map((event) => ({
      id: event.id,
      weddingId: event.weddingId,
      title: event.title,
      startUtc: event.startUtc.toISOString(),
      endUtc: event.endUtc.toISOString(),
      laneId: event.laneId,
      category: event.category,
      assignedOwner: {
        id: event.assignedOwnerId,
        type: event.assignedOwnerType,
        displayName: event.assignedOwnerName,
      },
      status: event.status,
      locked: event.locked,
      notes: event.notes,
    })),
    bands: bands.map((band) => ({
      id: band.id,
      weddingId: band.weddingId,
      bandType: band.bandType,
      startUtc: band.startUtc.toISOString(),
      endUtc: band.endUtc.toISOString(),
      label: band.label,
    })),
  };
}

// Apply a single patch operation
async function applyPatchOp(
  weddingId: string,
  op: PatchOp,
  windowStartUtc: string,
  windowEndUtc: string
) {
  switch (op.op) {
    case "create_event": {
      const event = op.event;
      // Validate times are within window
      const start = new Date(event.startUtc);
      const end = new Date(event.endUtc);
      const windowStart = new Date(windowStartUtc);
      const windowEnd = new Date(windowEndUtc);

      if (start < windowStart) start.setTime(windowStart.getTime());
      if (end > windowEnd) end.setTime(windowEnd.getTime());

      // Snap to minute
      start.setSeconds(0, 0);
      end.setSeconds(0, 0);

      await prisma.timelineEvent.create({
        data: {
          id: event.id,
          weddingId,
          title: event.title,
          startUtc: start,
          endUtc: end,
          laneId: event.laneId,
          category: event.category || "misc",
          assignedOwnerType: "couple",
          assignedOwnerId: "system",
          assignedOwnerName: event.assignedOwner || "Couple",
          status: event.status || "tentative",
          locked: event.locked || false,
          notes: event.notes,
          locationLabel: event.locationLabel,
          locationLat: event.locationLat,
          locationLng: event.locationLng,
        },
      });
      break;
    }

    case "update_event_time": {
      let start = new Date(op.startUtc);
      let end = new Date(op.endUtc);
      const windowStart = new Date(windowStartUtc);
      const windowEnd = new Date(windowEndUtc);

      // Clamp to window
      if (start < windowStart) start = windowStart;
      if (end > windowEnd) end = windowEnd;

      // Snap to minute
      start.setSeconds(0, 0);
      end.setSeconds(0, 0);

      await prisma.timelineEvent.update({
        where: { id: op.eventId },
        data: { startUtc: start, endUtc: end },
      });
      break;
    }

    case "update_event_lane": {
      await prisma.timelineEvent.update({
        where: { id: op.eventId },
        data: { laneId: op.laneId },
      });
      break;
    }

    case "update_event_title": {
      await prisma.timelineEvent.update({
        where: { id: op.eventId },
        data: { title: op.title },
      });
      break;
    }

    case "update_event_owner": {
      await prisma.timelineEvent.update({
        where: { id: op.eventId },
        data: {
          assignedOwnerName: op.owner,
        },
      });
      break;
    }

    case "delete_event": {
      await prisma.timelineEvent.delete({
        where: { id: op.eventId },
      });
      break;
    }

    case "create_lane": {
      const lane = op.lane;
      await prisma.timelineLane.create({
        data: {
          id: lane.id,
          weddingId,
          name: lane.name,
          type: lane.laneType,
          ownerType: lane.owner?.type || "couple",
          ownerId: lane.owner?.id || "system",
          ownerName: lane.owner?.displayName || "Couple",
          sortOrder: lane.sortOrder,
        },
      });
      break;
    }

    case "update_lane": {
      const updates: Record<string, unknown> = {};
      if (op.name !== undefined) updates.name = op.name;
      if (op.sortOrder !== undefined) updates.sortOrder = op.sortOrder;
      if (op.owner !== undefined) {
        updates.ownerType = op.owner.type;
        updates.ownerId = op.owner.id;
        updates.ownerName = op.owner.displayName;
      }

      await prisma.timelineLane.update({
        where: { id: op.laneId },
        data: updates,
      });
      break;
    }

    case "delete_lane": {
      // First delete all events in the lane
      await prisma.timelineEvent.deleteMany({
        where: { laneId: op.laneId },
      });
      await prisma.timelineLane.delete({
        where: { id: op.laneId },
      });
      break;
    }
  }
}
