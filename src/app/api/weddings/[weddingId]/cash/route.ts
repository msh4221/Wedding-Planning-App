import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ weddingId: string }>;
};

// GET /api/weddings/[weddingId]/cash
// Returns cash management overview with funding sources, milestones, and summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { weddingId } = await params;

  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        fundingSources: true,
        categories: {
          orderBy: { sortOrder: "asc" },
        },
        milestones: {
          include: {
            category: true,
            contract: true,
            fundingSource: true,
          },
          orderBy: { dueDate: "asc" },
        },
        contracts: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    // Calculate summary metrics
    const totalCommitted = wedding.fundingSources.reduce(
      (sum, fs) => sum + fs.committedAmount,
      0
    );

    const totalTargets = wedding.categories.reduce(
      (sum, cat) => sum + cat.targetAmount,
      0
    );

    const totalScheduledPayments = wedding.milestones.reduce(
      (sum, m) => sum + m.amount,
      0
    );

    const totalPaid = wedding.milestones
      .filter((m) => m.status === "paid")
      .reduce((sum, m) => sum + m.amount, 0);

    const unallocatedMilestones = wedding.milestones.filter(
      (m) => !m.fundingSourceId
    );

    // Calculate funding source usage
    const fundingSourceUsage = new Map<string, number>();
    for (const milestone of wedding.milestones) {
      if (milestone.fundingSourceId) {
        const current = fundingSourceUsage.get(milestone.fundingSourceId) || 0;
        fundingSourceUsage.set(milestone.fundingSourceId, current + milestone.amount);
      }
    }

    const fundingSources = wedding.fundingSources.map((fs) => {
      const assignedAmount = fundingSourceUsage.get(fs.id) || 0;
      return {
        id: fs.id,
        weddingId: fs.weddingId,
        name: fs.name,
        committedAmount: fs.committedAmount,
        notes: fs.notes,
        assignedAmount,
        availableAmount: fs.committedAmount - assignedAmount,
        milestoneCount: wedding.milestones.filter(
          (m) => m.fundingSourceId === fs.id
        ).length,
      };
    });

    // Calculate monthly cashflow
    const monthlyMap = new Map<string, { total: number; paid: number; count: number }>();
    for (const milestone of wedding.milestones) {
      const monthKey = milestone.dueDate.toISOString().slice(0, 7); // YYYY-MM
      const current = monthlyMap.get(monthKey) || { total: 0, paid: 0, count: 0 };
      current.total += milestone.amount;
      if (milestone.status === "paid") {
        current.paid += milestone.amount;
      }
      current.count += 1;
      monthlyMap.set(monthKey, current);
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        totalDue: data.total,
        paidAmount: data.paid,
        milestoneCount: data.count,
      }));

    // Get upcoming milestones (not paid, sorted by due date)
    const upcomingMilestones = wedding.milestones
      .filter((m) => m.status !== "paid")
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        weddingId: m.weddingId,
        categoryId: m.categoryId,
        categoryName: m.category?.name,
        contractId: m.contractId,
        vendorName: m.contract?.vendorName,
        fundingSourceId: m.fundingSourceId,
        fundingSourceName: m.fundingSource?.name,
        label: m.label,
        amount: m.amount,
        dueDate: m.dueDate.toISOString(),
        status: m.status,
        paidDate: m.paidDate?.toISOString(),
        notes: m.notes,
      }));

    // Generate alerts
    const alerts = [];

    // Check for overfunded plan
    if (totalTargets > totalCommitted) {
      alerts.push({
        type: "overfunded_plan",
        severity: "warning",
        title: "Budget exceeds funding",
        message: `Your planned budget ($${(totalTargets / 100).toLocaleString()}) exceeds committed funding ($${(totalCommitted / 100).toLocaleString()})`,
      });
    }

    // Check for unallocated milestones due soon
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const urgentUnallocated = unallocatedMilestones.filter(
      (m) => m.dueDate <= thirtyDaysFromNow && m.status !== "paid"
    );
    if (urgentUnallocated.length > 0) {
      alerts.push({
        type: "unallocated_milestone",
        severity: "warning",
        title: "Unallocated payments",
        message: `${urgentUnallocated.length} payment(s) due within 30 days are not assigned to a funding source`,
      });
    }

    // Check for overallocated funding sources
    for (const fs of fundingSources) {
      if (fs.assignedAmount > fs.committedAmount) {
        alerts.push({
          type: "over_allocated_source",
          severity: "error",
          title: "Over-allocated funding",
          message: `"${fs.name}" has $${((fs.assignedAmount - fs.committedAmount) / 100).toLocaleString()} more allocated than committed`,
          relatedId: fs.id,
          relatedType: "fundingSource",
        });
      }
    }

    // Check for upcoming payments
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
    const upcomingDue = wedding.milestones.filter(
      (m) => m.dueDate <= fourteenDaysFromNow && m.status !== "paid"
    );
    if (upcomingDue.length > 0) {
      alerts.push({
        type: "upcoming_due",
        severity: "info",
        title: "Payments due soon",
        message: `${upcomingDue.length} payment(s) due within the next 2 weeks`,
      });
    }

    return NextResponse.json({
      summary: {
        totalCommitted,
        totalTargets,
        totalScheduledPayments,
        totalPaid,
        totalUnallocated: unallocatedMilestones.reduce((sum, m) => sum + m.amount, 0),
        unallocatedCount: unallocatedMilestones.length,
      },
      fundingSources,
      categories: wedding.categories.map((cat) => ({
        id: cat.id,
        weddingId: cat.weddingId,
        name: cat.name,
        targetAmount: cat.targetAmount,
        notes: cat.notes,
        sortOrder: cat.sortOrder,
      })),
      upcomingMilestones,
      monthlyData,
      alerts,
    });
  } catch (error) {
    console.error("Error fetching cash data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash data" },
      { status: 500 }
    );
  }
}
