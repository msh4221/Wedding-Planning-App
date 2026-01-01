"use client";

import { useParams } from "next/navigation";
import { useCanEditBudget } from "@/lib/mock-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/types/cash";

export default function CashManagementPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const canEdit = useCanEditBudget();

  // Demo data - will be replaced with real data from database
  const cashData = {
    summary: {
      totalCommitted: 5000000, // $50,000 in cents
      totalTargets: 4500000,   // $45,000 in cents
      totalScheduledPayments: 4500000,
      totalPaid: 1500000,      // $15,000 in cents
      unallocatedCount: 2,
    },
    fundingSources: [
      { id: "1", name: "Couple", committed: 2000000, assigned: 1800000 },
      { id: "2", name: "Bride's Parents", committed: 2000000, assigned: 1700000 },
      { id: "3", name: "Groom's Parents", committed: 1000000, assigned: 1000000 },
    ],
    upcomingPayments: [
      { id: "1", label: "Venue - Final Payment", vendor: "The Grand Estate", amount: 1000000, dueDate: "2026-09-01", status: "planned" },
      { id: "2", label: "Catering Deposit", vendor: "Elegant Catering", amount: 500000, dueDate: "2026-07-15", status: "planned" },
      { id: "3", label: "Photography - Deposit", vendor: "Mike Photography", amount: 200000, dueDate: "2026-06-01", status: "due" },
      { id: "4", label: "Florist - Deposit", vendor: "Bloom & Petal", amount: 150000, dueDate: "2026-08-01", status: "planned" },
      { id: "5", label: "DJ - Deposit", vendor: "Party Sounds", amount: 100000, dueDate: "2026-07-01", status: "planned" },
    ],
    monthlyData: [
      { month: "2026-06", total: 200000 },
      { month: "2026-07", total: 600000 },
      { month: "2026-08", total: 150000 },
      { month: "2026-09", total: 1500000 },
      { month: "2026-10", total: 2050000 },
    ],
  };

  const alerts = [
    { type: "warning", message: "2 milestones are unallocated to a funding source" },
    { type: "info", message: "Photography deposit due in 5 months" },
  ];

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
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-sm ${
                alert.type === "warning"
                  ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Committed</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(cashData.summary.totalCommitted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {cashData.fundingSources.length} sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Scheduled</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(cashData.summary.totalScheduledPayments)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {cashData.upcomingPayments.length} payments planned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(cashData.summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {Math.round((cashData.summary.totalPaid / cashData.summary.totalScheduledPayments) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(cashData.summary.totalScheduledPayments - cashData.summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {cashData.summary.unallocatedCount} unallocated
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
          <div className="space-y-4">
            {cashData.fundingSources.map((source) => {
              const available = source.committed - source.assigned;
              const percentUsed = Math.round((source.assigned / source.committed) * 100);

              return (
                <div key={source.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(source.assigned)} / {formatCurrency(source.committed)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(available)} available
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments</CardTitle>
          <CardDescription>Next payments due</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cashData.upcomingPayments.map((payment) => (
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
                    <p className="text-xs text-muted-foreground">{payment.vendor}</p>
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
                  {canEdit && (
                    <Button variant="ghost" size="sm">
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Cashflow Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cashflow</CardTitle>
          <CardDescription>Payments due by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cashData.monthlyData.map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm">
                  {new Date(month.month + "-01").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium">{formatCurrency(month.total)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Interactive charts coming in Phase 4
          </p>
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
