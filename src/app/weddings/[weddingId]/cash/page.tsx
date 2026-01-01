"use client";

import { useParams } from "next/navigation";
import { useCanEditBudget } from "@/lib/mock-auth";
import { useCashManagement } from "@/hooks/useCashManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/types/cash";
import { Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function CashManagementPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const canEdit = useCanEditBudget();

  const { data, isLoading, error, refresh, markMilestonePaid } = useCashManagement(weddingId);

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

  const handleMarkPaid = async (milestoneId: string) => {
    if (confirm("Mark this payment as paid?")) {
      await markMilestonePaid(milestoneId);
    }
  };

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
              {formatCurrency(data.summary.totalScheduledPayments)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data.upcomingMilestones.length} payment{data.upcomingMilestones.length !== 1 ? "s" : ""} planned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(data.summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalScheduledPayments > 0
                ? Math.round((data.summary.totalPaid / data.summary.totalScheduledPayments) * 100)
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(data.summary.totalScheduledPayments - data.summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data.summary.unallocatedCount} unallocated
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

      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Next payments due</CardDescription>
        </CardHeader>
        <CardContent>
          {data.upcomingMilestones.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No upcoming payments scheduled
            </p>
          ) : (
            <div className="space-y-3">
              {data.upcomingMilestones.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground w-24">
                      {new Date(payment.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div>
                      <p className="font-medium">{payment.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.vendorName || payment.categoryName || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <Badge
                      variant={
                        payment.status === "paid"
                          ? "default"
                          : payment.status === "due"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                    {canEdit && payment.status !== "paid" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkPaid(payment.id)}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
