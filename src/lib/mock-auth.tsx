"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { CurrentUser } from "@/types/wedding";
import type { TimelineRole } from "@/types/timeline";
import type { BudgetRole } from "@/types/cash";

// Mock users for development
export const MOCK_USERS: Record<string, CurrentUser & { timelineRole: TimelineRole; budgetRole: BudgetRole }> = {
  couple: {
    id: "user-couple-1",
    email: "sarah.john@example.com",
    name: "Sarah & John",
    timelineRole: "COUPLE_TIMELINE_ADMIN",
    budgetRole: "COUPLE_BUDGET_ADMIN",
  },
  planner: {
    id: "user-planner-1",
    email: "planner@example.com",
    name: "Emily Planner",
    timelineRole: "PLANNER_TIMELINE_ADMIN",
    budgetRole: "NONE",
  },
  photographer: {
    id: "user-vendor-photo-1",
    email: "photo@example.com",
    name: "Mike Photography",
    timelineRole: "VENDOR_TIMELINE_COLLAB",
    budgetRole: "NONE",
  },
  viewer: {
    id: "user-viewer-1",
    email: "guest@example.com",
    name: "Guest Viewer",
    timelineRole: "VIEW_ONLY",
    budgetRole: "NONE",
  },
};

type AuthContextType = {
  user: CurrentUser | null;
  timelineRole: TimelineRole | null;
  budgetRole: BudgetRole | null;
  currentWeddingId: string | null;
  setCurrentWeddingId: (id: string | null) => void;
  switchUser: (userKey: keyof typeof MOCK_USERS) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to couple admin for development
  const [currentUserKey, setCurrentUserKey] = useState<keyof typeof MOCK_USERS>("couple");
  const [currentWeddingId, setCurrentWeddingId] = useState<string | null>(null);
  const [isLoading] = useState(false);

  const mockUser = MOCK_USERS[currentUserKey];

  const user: CurrentUser = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    currentWeddingId: currentWeddingId ?? undefined,
    timelineRole: mockUser.timelineRole,
    budgetRole: mockUser.budgetRole,
  };

  const switchUser = (userKey: keyof typeof MOCK_USERS) => {
    setCurrentUserKey(userKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        timelineRole: mockUser.timelineRole,
        budgetRole: mockUser.budgetRole,
        currentWeddingId,
        setCurrentWeddingId,
        switchUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Role check hooks
export function useCanEditTimeline() {
  const { timelineRole } = useAuth();
  return timelineRole === "COUPLE_TIMELINE_ADMIN" || timelineRole === "PLANNER_TIMELINE_ADMIN";
}

export function useCanEditBudget() {
  const { budgetRole } = useAuth();
  return budgetRole === "COUPLE_BUDGET_ADMIN";
}

export function useIsVendor() {
  const { timelineRole } = useAuth();
  return timelineRole === "VENDOR_TIMELINE_COLLAB";
}
