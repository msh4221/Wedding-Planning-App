// Cash Management Module Type Definitions
// Based on the Cash Management MVP spec

export type MilestoneStatus = "planned" | "due" | "paid";

export type BudgetRole = "COUPLE_BUDGET_ADMIN" | "NONE";

// Funding source - where money comes from
export type FundingSource = {
  id: string;
  weddingId: string;
  name: string;
  committedAmount: number; // in cents
  notes?: string;
};

// Budget category - spending categories with targets
export type BudgetCategory = {
  id: string;
  weddingId: string;
  name: string;
  targetAmount: number; // in cents
  notes?: string;
  sortOrder: number;
};

// Vendor contract
export type Contract = {
  id: string;
  weddingId: string;
  categoryId?: string;
  vendorName: string;
  vendorContact?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  totalAmount: number; // in cents
  notes?: string;
  signedDate?: string;
};

// Payment milestone - scheduled payments
export type PaymentMilestone = {
  id: string;
  weddingId: string;
  categoryId?: string;
  contractId?: string;
  fundingSourceId?: string;
  label: string;
  amount: number; // in cents
  dueDate: string; // ISO date
  status: MilestoneStatus;
  paidDate?: string;
  paidAmount?: number; // for partial payments (v1)
  paymentMethod?: string;
  confirmationRef?: string;
  notes?: string;
};

// Calculated summary metrics
export type CashSummary = {
  totalCommitted: number;
  totalTargets: number;
  totalScheduledPayments: number;
  totalPaid: number;
  totalUnallocated: number;
  unallocatedCount: number;
};

// Monthly cashflow aggregation
export type MonthlyCashflow = {
  month: string; // YYYY-MM
  totalDue: number;
  paidAmount: number;
  milestoneCount: number;
};

// Alert types for the cash module
export type AlertType =
  | "overfunded_plan"
  | "unallocated_milestone"
  | "upcoming_due"
  | "over_allocated_source"
  | "late_payment";

export type CashAlert = {
  type: AlertType;
  severity: "warning" | "error" | "info";
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "milestone" | "category" | "fundingSource";
};

// Funding source with calculated usage
export type FundingSourceWithUsage = FundingSource & {
  assignedAmount: number;
  availableAmount: number;
  milestoneCount: number;
};

// API response types
export type CashOverviewResponse = {
  summary: CashSummary;
  fundingSources: FundingSourceWithUsage[];
  categories: BudgetCategory[];
  upcomingMilestones: PaymentMilestone[];
  monthlyData: MonthlyCashflow[];
  alerts: CashAlert[];
};

export type MilestoneUpdateRequest = {
  dueDate?: string;
  amount?: number;
  fundingSourceId?: string | null;
  status?: MilestoneStatus;
  paidDate?: string;
  label?: string;
  notes?: string;
};

// Display formatting helpers
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(isoDate: string, timezone?: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
}

// Category display labels
export const CATEGORY_PRESETS = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Florist",
  "DJ / Music",
  "Officiant",
  "Transportation",
  "Attire",
  "Hair & Makeup",
  "Rentals",
  "Invitations",
  "Cake",
  "Favors",
  "Decor",
  "Other",
] as const;

// Funding source presets
export const FUNDING_SOURCE_PRESETS = [
  "Couple",
  "Bride's Parents",
  "Groom's Parents",
  "Other Family",
  "Savings",
] as const;
