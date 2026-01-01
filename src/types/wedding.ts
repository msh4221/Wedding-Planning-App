// Core Wedding Types

import type { TimelineRole } from "./timeline";
import type { BudgetRole } from "./cash";

export type Wedding = {
  id: string;
  name: string;
  weddingDate: string; // YYYY-MM-DD in venue local time
  venueName?: string;
  venueAddress?: string;
  venueTimezone: string; // IANA timezone (e.g., "America/New_York")
  lat?: number;
  lng?: number;
  timelineVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type WeddingMembership = {
  id: string;
  weddingId: string;
  userId: string;
  timelineRole: TimelineRole;
  budgetRole: BudgetRole;
  vendorName?: string;
  vendorType?: string;
  user?: User;
};

// Current user context (for mock auth)
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  // Current wedding context
  currentWeddingId?: string;
  timelineRole?: TimelineRole;
  budgetRole?: BudgetRole;
};

// Wedding with membership info for dashboard
export type WeddingWithMembership = Wedding & {
  membership: WeddingMembership;
};

// Notification types
export type NotificationType =
  | "timeline_change"
  | "proposal_received"
  | "proposal_applied"
  | "proposal_rejected"
  | "payment_due"
  | "payment_reminder"
  | "general";

export type Notification = {
  id: string;
  weddingId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
};

// Permission check helpers
export function canEditTimeline(role?: TimelineRole): boolean {
  return role === "COUPLE_TIMELINE_ADMIN" || role === "PLANNER_TIMELINE_ADMIN";
}

export function canEditBudget(role?: BudgetRole): boolean {
  return role === "COUPLE_BUDGET_ADMIN";
}

export function isVendor(role?: TimelineRole): boolean {
  return role === "VENDOR_TIMELINE_COLLAB";
}

// Timezone helpers
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
] as const;
