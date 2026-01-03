import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ weddingId: string; milestoneId: string }>;
};

// PATCH /api/weddings/[weddingId]/milestones/[milestoneId]
// Update a payment milestone (mark as paid, assign funding source, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { weddingId, milestoneId } = await params;

  try {
    const body = await request.json();

    // Verify the milestone belongs to this wedding
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Payment milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.weddingId !== weddingId) {
      return NextResponse.json(
        { error: "Milestone does not belong to this wedding" },
        { status: 403 }
      );
    }

    // Build update data - handle both setting values and clearing them (null)
    const updateData: any = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Handle paidDate - can be set to a date or cleared with null
    if (body.paidDate !== undefined) {
      updateData.paidDate = body.paidDate === null ? null : new Date(body.paidDate);
    }

    // Handle paidAmount - can be set or cleared
    if (body.paidAmount !== undefined) {
      updateData.paidAmount = body.paidAmount;
    }

    // Handle paymentMethod - can be set or cleared
    if (body.paymentMethod !== undefined) {
      updateData.paymentMethod = body.paymentMethod;
    }

    // Handle confirmationRef - can be set or cleared
    if (body.confirmationRef !== undefined) {
      updateData.confirmationRef = body.confirmationRef;
    }

    if (body.fundingSourceId !== undefined) {
      updateData.fundingSourceId = body.fundingSourceId;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // If marking as paid and no paidAmount specified, use the full amount
    if (body.status === "paid" && updateData.paidAmount === undefined) {
      updateData.paidAmount = milestone.amount;
    }

    // If reverting to unpaid, determine correct status based on due date
    if (body.status === "planned") {
      const now = new Date();
      const dueDate = new Date(milestone.dueDate);
      // If due date is in the past, set to "due" instead of "planned"
      if (dueDate < now) {
        updateData.status = "due";
      }
    }

    // Update the milestone
    const updatedMilestone = await prisma.paymentMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      milestone: {
        id: updatedMilestone.id,
        status: updatedMilestone.status,
        paidDate: updatedMilestone.paidDate?.toISOString(),
        paidAmount: updatedMilestone.paidAmount,
      },
    });
  } catch (error) {
    console.error("Error updating payment milestone:", error);
    return NextResponse.json(
      { error: "Failed to update payment milestone" },
      { status: 500 }
    );
  }
}
