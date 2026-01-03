"use client";

import { useState, useCallback, useEffect } from "react";
import type { CashOverviewResponse, FundingSourceWithUsage, MilestoneWithDetails } from "@/types/cash";

type UseCashManagementReturn = {
  // State
  data: CashOverviewResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  markMilestonePaid: (milestoneId: string) => Promise<boolean>;
  markMilestoneUnpaid: (milestoneId: string) => Promise<boolean>;
  assignFundingSource: (milestoneId: string, fundingSourceId: string) => Promise<boolean>;
};

export function useCashManagement(weddingId: string): UseCashManagementReturn {
  const [data, setData] = useState<CashOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weddings/${weddingId}/cash`);
      if (!res.ok) {
        throw new Error("Failed to fetch cash data");
      }

      const responseData = await res.json();
      setData(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  const markMilestonePaid = useCallback(
    async (milestoneId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/weddings/${weddingId}/milestones/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "paid",
            paidDate: new Date().toISOString(),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to mark milestone as paid");
        }

        // Refresh data
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        return false;
      }
    },
    [weddingId, refresh]
  );

  const markMilestoneUnpaid = useCallback(
    async (milestoneId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/weddings/${weddingId}/milestones/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "planned",
            paidDate: null,
            paidAmount: null,
            paymentMethod: null,
            confirmationRef: null,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to mark milestone as unpaid");
        }

        // Refresh data
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        return false;
      }
    },
    [weddingId, refresh]
  );

  const assignFundingSource = useCallback(
    async (milestoneId: string, fundingSourceId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/weddings/${weddingId}/milestones/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fundingSourceId,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to assign funding source");
        }

        // Refresh data
        await refresh();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
        return false;
      }
    },
    [weddingId, refresh]
  );

  return {
    data,
    isLoading,
    error,
    refresh,
    markMilestonePaid,
    markMilestoneUnpaid,
    assignFundingSource,
  };
}
