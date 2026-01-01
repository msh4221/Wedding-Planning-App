"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function WeddingOverviewPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;

  // Demo data - will be replaced with real data from database
  const wedding = {
    name: "Sarah & John's Wedding",
    weddingDate: "2026-10-17",
    venueName: "The Grand Estate",
    venueAddress: "123 Wedding Lane, New York, NY",
    venueTimezone: "America/New_York",
  };

  const stats = {
    timelineEvents: 12,
    upcomingPayments: 5,
    totalBudget: 45000,
    paidAmount: 15000,
    daysUntilWedding: 289,
  };

  return (
    <div className="space-y-6">
      {/* Wedding Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{wedding.name}</h1>
          <p className="text-muted-foreground mt-1">
            {new Date(wedding.weddingDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {stats.daysUntilWedding} days to go
        </Badge>
      </div>

      {/* Venue Info */}
      <Card>
        <CardHeader>
          <CardTitle>Venue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-medium">{wedding.venueName}</p>
            <p className="text-sm text-muted-foreground">{wedding.venueAddress}</p>
            <p className="text-sm text-muted-foreground">
              Timezone: {wedding.venueTimezone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Timeline Events</CardDescription>
            <CardTitle className="text-2xl">{stats.timelineEvents}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/weddings/${weddingId}/timeline`}>
              <Button variant="link" className="p-0 h-auto">
                View Timeline
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Payments</CardDescription>
            <CardTitle className="text-2xl">{stats.upcomingPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/weddings/${weddingId}/cash`}>
              <Button variant="link" className="p-0 h-auto">
                View Payments
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-2xl">
              ${(stats.totalBudget).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ${(stats.paidAmount).toLocaleString()} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget Remaining</CardDescription>
            <CardTitle className="text-2xl">
              ${(stats.totalBudget - stats.paidAmount).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.paidAmount / stats.totalBudget) * 100)}% spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Day-of Timeline</CardTitle>
            <CardDescription>
              Plan and coordinate every moment of your wedding day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/weddings/${weddingId}/timeline`}>
              <Button className="w-full">Open Timeline</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Management</CardTitle>
            <CardDescription>
              Track payments, manage funding sources, and monitor cashflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/weddings/${weddingId}/cash`}>
              <Button variant="outline" className="w-full">
                Open Cash Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
