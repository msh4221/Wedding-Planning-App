"use client";

import Link from "next/link";
import { useAuth } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Wedding Planner</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Signed in as: {user?.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Welcome to Wedding Planner</h2>
            <p className="text-xl text-muted-foreground">
              AI-powered wedding planning with intelligent timeline and budget management
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Day-of Timeline</CardTitle>
                <CardDescription>
                  Plan every moment of your wedding day with our interactive timeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li>Venue timezone-aware scheduling</li>
                  <li>Golden hour and sunset tracking</li>
                  <li>Vendor coordination with proposals</li>
                  <li>Real-time collaboration</li>
                </ul>
                <Link href="/weddings/demo/timeline">
                  <Button className="w-full">Open Timeline</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cash Management</CardTitle>
                <CardDescription>
                  Track your budget, payments, and cash flow in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li>Multiple funding sources</li>
                  <li>Payment milestone tracking</li>
                  <li>Monthly cashflow forecasting</li>
                  <li>Smart alerts for upcoming payments</li>
                </ul>
                <Link href="/weddings/demo/cash">
                  <Button className="w-full" variant="outline">Open Cash Management</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Demo Notice */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                This is a demo with sample wedding data.
                {" "}
                <Link href="/weddings/demo" className="text-primary underline">
                  View Wedding Overview
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
