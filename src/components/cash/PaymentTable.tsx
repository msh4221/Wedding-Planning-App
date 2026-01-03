"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/types/cash";
import type { MilestoneWithDetails } from "@/types/cash";
import { Loader2, Check, X, ArrowRight, ArrowLeft } from "lucide-react";

type PaymentTableProps = {
  payments: MilestoneWithDetails[];
  variant: "unpaid" | "paid";
  canEdit: boolean;
  onToggleStatus: (milestoneId: string) => Promise<boolean>;
};

// Check if a date is overdue (in the past)
function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  // Set time to start of day for comparison
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return due < now;
}

// Format date for display
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PaymentTable({
  payments,
  variant,
  canEdit,
  onToggleStatus,
}: PaymentTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (milestoneId: string) => {
    setLoadingId(milestoneId);
    try {
      await onToggleStatus(milestoneId);
    } finally {
      setLoadingId(null);
    }
  };

  // Determine button style based on variant and payment status
  const getButtonStyle = (payment: MilestoneWithDetails) => {
    if (variant === "paid") {
      // Green for paid items
      return "bg-green-500 hover:bg-green-600 text-white border-green-600";
    } else {
      // Check if overdue
      if (isOverdue(payment.dueDate)) {
        // Red for overdue
        return "bg-red-500 hover:bg-red-600 text-white border-red-600";
      } else {
        // White/neutral for not due yet
        return "bg-white hover:bg-gray-100 text-gray-700 border-gray-300";
      }
    }
  };

  const getButtonIcon = () => {
    if (variant === "paid") {
      return <ArrowLeft className="h-4 w-4 mr-1" />;
    }
    return <ArrowRight className="h-4 w-4 mr-1" />;
  };

  const getButtonText = () => {
    if (variant === "paid") {
      return "Mark Unpaid";
    }
    return "Mark Paid";
  };

  // Sort payments: overdue first (for unpaid), then by due date
  const sortedPayments = [...payments].sort((a, b) => {
    if (variant === "unpaid") {
      // Sort overdue items first
      const aOverdue = isOverdue(a.dueDate);
      const bOverdue = isOverdue(b.dueDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
    }
    // Then by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {variant === "unpaid"
          ? "No unpaid payments. All caught up!"
          : "No payments marked as paid yet."}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Due Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category / Vendor</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {variant === "paid" && <TableHead>Paid Date</TableHead>}
            {canEdit && <TableHead className="w-32 text-center">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayments.map((payment) => {
            const overdue = variant === "unpaid" && isOverdue(payment.dueDate);
            const isLoading = loadingId === payment.id;

            return (
              <TableRow
                key={payment.id}
                className={overdue ? "bg-red-50" : undefined}
              >
                <TableCell className="font-medium">
                  <span className={overdue ? "text-red-600 font-semibold" : ""}>
                    {formatDate(payment.dueDate)}
                  </span>
                  {overdue && (
                    <span className="block text-xs text-red-500">OVERDUE</span>
                  )}
                </TableCell>
                <TableCell>{payment.label}</TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.vendorName || payment.categoryName || "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                {variant === "paid" && (
                  <TableCell className="text-green-600">
                    {payment.paidDate ? formatDate(payment.paidDate) : "—"}
                  </TableCell>
                )}
                {canEdit && (
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleToggle(payment.id)}
                      className={`${getButtonStyle(payment)} transition-colors`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {getButtonIcon()}
                          {getButtonText()}
                        </>
                      )}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
