// Timeline Module Type Definitions
// Based on the Day-of Timeline MVP spec

export type OwnerType = "couple" | "planner" | "vendor" | "person" | "group" | "system";

export type OwnerRef = {
  id: string;
  type: OwnerType;
  displayName: string;
};

export type LaneType =
  | "photo"
  | "ceremony"
  | "transport"
  | "venue_ops"
  | "music"
  | "meal"
  | "prep"
  | "misc";

export type TimelineLane = {
  id: string;
  weddingId: string;
  name: string;
  type: LaneType;
  owner: OwnerRef;
  sortOrder: number;
};

export type EventStatus = "tentative" | "confirmed";

export type TimelineEventItem = {
  id: string;
  weddingId: string;
  title: string;
  startUtc: string; // ISO UTC
  endUtc: string; // ISO UTC
  laneId: string;
  category: LaneType;
  assignedOwner: OwnerRef;
  status: EventStatus;
  locked: boolean;
  notes?: string;
};

export type BandType = "night" | "golden" | "forecast";

export type TimelineBackgroundBand = {
  id: string;
  weddingId: string;
  bandType: BandType;
  startUtc: string;
  endUtc: string;
  label: string;
};

// Timeline roles
export type TimelineRole =
  | "COUPLE_TIMELINE_ADMIN"
  | "PLANNER_TIMELINE_ADMIN"
  | "VENDOR_TIMELINE_COLLAB"
  | "VIEW_ONLY";

// Patch operations for timeline updates
export type PatchOp =
  | { op: "create_event"; event: TimelineEventItem }
  | { op: "update_event_time"; eventId: string; startUtc: string; endUtc: string }
  | { op: "update_event_lane"; eventId: string; laneId: string }
  | { op: "update_event_title"; eventId: string; title: string }
  | { op: "update_event_owner"; eventId: string; owner: OwnerRef }
  | { op: "delete_event"; eventId: string }
  | { op: "create_lane"; lane: TimelineLane }
  | { op: "update_lane"; laneId: string; name?: string; owner?: OwnerRef; sortOrder?: number }
  | { op: "delete_lane"; laneId: string };

// Proposal status
export type ProposalStatus = "pending" | "applied" | "rejected" | "needs_review";

export type TimelineProposal = {
  id: string;
  weddingId: string;
  createdBy: OwnerRef;
  baseVersion: number;
  patchOps: PatchOp[];
  message?: string;
  status: ProposalStatus;
  appliedAt?: string;
  appliedById?: string;
  createdAt: string;
};

// API response types
export type TimelineResponse = {
  version: number;
  venueTimezone: string;
  windowStartUtc: string;
  windowEndUtc: string;
  lanes: TimelineLane[];
  events: TimelineEventItem[];
  bands: TimelineBackgroundBand[];
};

export type TimelineUpdateRequest = {
  baseVersion: number;
  patchOps: PatchOp[];
};

export type ProposalCreateRequest = {
  baseVersion: number;
  patchOps: PatchOp[];
  message?: string;
};

// Duration presets for Add Block form
export const DURATION_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
] as const;

// Lane type display names
export const LANE_TYPE_LABELS: Record<LaneType, string> = {
  photo: "Photography",
  ceremony: "Ceremony",
  transport: "Transportation",
  venue_ops: "Venue Operations",
  music: "Music & Entertainment",
  meal: "Meals & Catering",
  prep: "Getting Ready",
  misc: "Miscellaneous",
};
