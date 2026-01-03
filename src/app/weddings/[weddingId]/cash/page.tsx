"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useCanEditBudget } from "@/lib/mock-auth";
import { useCashManagement } from "@/hooks/useCashManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaymentTable } from "@/components/cash/PaymentTable";
import { formatCurrency } from "@/types/cash";
import { Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function CashManagementPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const canEdit = useCanEditBudget();

  const {
    data,
    isLoading,
    error,
    refresh,
    markMilestonePaid,
    markMilestoneUnpaid,
  } = useCashManagement(weddingId);

  // Separate payments into unpaid and paid, and calculate totals
  const { unpaidPayments, paidPayments, totalPaid, totalScheduled, totalRemaining } = useMemo(() => {
    if (!data?.upcomingMilestones) {
      return {
        unpaidPayments: [],
        paidPayments: [],
        totalPaid: 0,
        totalScheduled: 0,
        totalRemaining: 0
      };
    }

    const unpaid = data.upcomingMilestones.filter((p) => p.status !== "paid");
    const paid = data.upcomingMilestones.filter((p) => p.status === "paid");

    // Calculate totals from actual payment data
    const paidSum = paid.reduce((sum, p) => sum + p.amount, 0);
    const unpaidSum = unpaid.reduce((sum, p) => sum + p.amount, 0);
    const scheduledSum = paidSum + unpaidSum;

    return {
      unpaidPayments: unpaid,
      paidPayments: paid,
      totalPaid: paidSum,
      totalScheduled: scheduledSum,
      totalRemaining: unpaidSum
    };
  }, [data?.upcomingMilestones]);

  // Count overdue payments
  const overdueCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return unpaidPayments.filter((p) => {
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < now;
    }).length;
  }, [unpaidPayments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading cash data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button
              onClick={refresh}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No cash data available</p>
      </div>
    );
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (severity: string): "default" | "destructive" => {
    return severity === "error" ? "destructive" : "default";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Management</h1>
          <p className="text-muted-foreground">
            Track payments and manage your wedding budget
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline">Add Funding Source</Button>
            <Button>Add Payment</Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.severity)}>
              {getAlertIcon(alert.severity)}
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Committed</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(data.summary.totalCommitted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {data.fundingSources.length} source{data.fundingSources.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scheduled</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(totalScheduled)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {unpaidPayments.length + paidPayments.length} payment{(unpaidPayments.length + paidPayments.length) !== 1 ? "s" : ""} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {paidPayments.length} payment{paidPayments.length !== 1 ? "s" : ""} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className={`text-2xl ${overdueCount > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(totalRemaining)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xs ${overdueCount > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              {overdueCount > 0
                ? `${overdueCount} payment${overdueCount !== 1 ? "s" : ""} overdue!`
                : `${unpaidPayments.length} payment${unpaidPayments.length !== 1 ? "s" : ""} pending`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funding Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Funding Sources</CardTitle>
          <CardDescription>Who is contributing to the wedding</CardDescription>
        </CardHeader>
        <CardContent>
          {data.fundingSources.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No funding sources added yet
            </p>
          ) : (
            <div className="space-y-4">
              {data.fundingSources.map((source) => {
                const percentUsed = source.committedAmount > 0
                  ? Math.round((source.assignedAmount / source.committedAmount) * 100)
                  : 0;

                return (
                  <div key={source.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{source.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(source.assignedAmount)} / {formatCurrency(source.committedAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentUsed > 100 ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(source.availableAmount)} available</span>
                      <span>{source.milestoneCount} payment{source.milestoneCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unpaid Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Unpaid Payments
                {overdueCount > 0 && (
                  <span className="text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-normal">
                    {overdueCount} overdue
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Payments pending - click to mark as paid
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(unpaidPayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {unpaidPayments.length} payment{unpaidPayments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentTable
            payments={unpaidPayments}
            variant="unpaid"
            canEdit={canEdit}
            onToggleStatus={markMilestonePaid}
          />
        </CardContent>
      </Card>

      {/* Paid Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Paid Payments
                <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal">
                  {paidPayments.length} completed
                </span>
              </CardTitle>
              <CardDescription>
                Completed payments - click to revert if needed
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(paidPayments.reduce((sum, p) => sum + p.amount, 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {paidPayments.length} payment{paidPayments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PaymentTable
            payments={paidPayments}
            variant="paid"
            canEdit={canEdit}
            onToggleStatus={markMilestoneUnpaid}
          />
        </CardContent>
      </Card>

      {/* Monthly Cashflow */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cashflow</CardTitle>
          <CardDescription>Payments due by month</CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No monthly data available
            </p>
          ) : (
            <div className="space-y-3">
              {data.monthlyData.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm w-32">
                      {new Date(month.month + "-01").toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {month.milestoneCount} payment{month.milestoneCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-green-600">
                      {formatCurrency(month.paidAmount)} paid
                    </span>
                    <span className="font-medium">{formatCurrency(month.totalDue)} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Info */}
      {!canEdit && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              You have view-only access to cash management.
              Only the couple can edit budget information.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
