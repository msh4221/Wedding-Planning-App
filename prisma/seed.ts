import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing data
  await prisma.notification.deleteMany();
  await prisma.paymentMilestone.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.budgetFundingSource.deleteMany();
  await prisma.timelineBackgroundBand.deleteMany();
  await prisma.timelineProposal.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.timelineLane.deleteMany();
  await prisma.weddingMembership.deleteMany();
  await prisma.wedding.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const coupleUser = await prisma.user.create({
    data: {
      id: "user-couple-1",
      email: "sarah.john@example.com",
      name: "Sarah & John",
    },
  });

  const plannerUser = await prisma.user.create({
    data: {
      id: "user-planner-1",
      email: "planner@example.com",
      name: "Emily Planner",
    },
  });

  const photographerUser = await prisma.user.create({
    data: {
      id: "user-vendor-photo-1",
      email: "photo@example.com",
      name: "Mike Photography",
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      id: "user-viewer-1",
      email: "guest@example.com",
      name: "Guest Viewer",
    },
  });

  console.log("Created users");

  // Create wedding
  const wedding = await prisma.wedding.create({
    data: {
      id: "demo",
      name: "Sarah & John's Wedding",
      weddingDate: "2026-10-17",
      venueName: "The Grand Estate",
      venueAddress: "123 Wedding Lane, New York, NY 10001",
      venueTimezone: "America/New_York",
      lat: 40.7128,
      lng: -74.006,
      timelineVersion: 1,
    },
  });

  console.log("Created wedding");

  // Create memberships
  await prisma.weddingMembership.createMany({
    data: [
      {
        weddingId: wedding.id,
        userId: coupleUser.id,
        timelineRole: "COUPLE_TIMELINE_ADMIN",
        budgetRole: "COUPLE_BUDGET_ADMIN",
      },
      {
        weddingId: wedding.id,
        userId: plannerUser.id,
        timelineRole: "PLANNER_TIMELINE_ADMIN",
        budgetRole: "NONE",
      },
      {
        weddingId: wedding.id,
        userId: photographerUser.id,
        timelineRole: "VENDOR_TIMELINE_COLLAB",
        budgetRole: "NONE",
        vendorName: "Mike Photography",
        vendorType: "photographer",
      },
      {
        weddingId: wedding.id,
        userId: viewerUser.id,
        timelineRole: "VIEW_ONLY",
        budgetRole: "NONE",
      },
    ],
  });

  console.log("Created memberships");

  // Create timeline lanes
  const lanes = await Promise.all([
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Getting Ready",
        type: "prep",
        ownerType: "couple",
        ownerId: coupleUser.id,
        ownerName: "Sarah & John",
        sortOrder: 0,
      },
    }),
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Photography",
        type: "photo",
        ownerType: "vendor",
        ownerId: photographerUser.id,
        ownerName: "Mike Photography",
        sortOrder: 1,
      },
    }),
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Transportation",
        type: "transport",
        ownerType: "planner",
        ownerId: plannerUser.id,
        ownerName: "Emily Planner",
        sortOrder: 2,
      },
    }),
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Ceremony",
        type: "ceremony",
        ownerType: "couple",
        ownerId: coupleUser.id,
        ownerName: "Sarah & John",
        sortOrder: 3,
      },
    }),
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Meals",
        type: "meal",
        ownerType: "planner",
        ownerId: plannerUser.id,
        ownerName: "Emily Planner",
        sortOrder: 4,
      },
    }),
    prisma.timelineLane.create({
      data: {
        weddingId: wedding.id,
        name: "Music & Entertainment",
        type: "music",
        ownerType: "planner",
        ownerId: plannerUser.id,
        ownerName: "Emily Planner",
        sortOrder: 5,
      },
    }),
  ]);

  console.log("Created timeline lanes");

  // Helper to create UTC times for the wedding date
  const weddingDateLocal = DateTime.fromISO("2026-10-17", { zone: "America/New_York" });

  function createEventTime(hour: number, minute: number): Date {
    return weddingDateLocal.set({ hour, minute, second: 0, millisecond: 0 }).toUTC().toJSDate();
  }

  // Create timeline events
  const events = [
    {
      title: "Hair & Makeup Starts",
      laneId: lanes[0].id, // Prep
      startUtc: createEventTime(8, 0),
      endUtc: createEventTime(11, 0),
      category: "prep" as const,
      status: "confirmed" as const,
    },
    {
      title: "First Look Photos",
      laneId: lanes[1].id, // Photo
      startUtc: createEventTime(12, 0),
      endUtc: createEventTime(13, 0),
      category: "photo" as const,
      status: "tentative" as const,
    },
    {
      title: "Wedding Party Photos",
      laneId: lanes[1].id, // Photo
      startUtc: createEventTime(13, 0),
      endUtc: createEventTime(14, 30),
      category: "photo" as const,
      status: "tentative" as const,
    },
    {
      title: "Guest Bus Arrives",
      laneId: lanes[2].id, // Transport
      startUtc: createEventTime(15, 0),
      endUtc: createEventTime(15, 30),
      category: "transport" as const,
      status: "confirmed" as const,
    },
    {
      title: "Ceremony",
      laneId: lanes[3].id, // Ceremony
      startUtc: createEventTime(16, 0),
      endUtc: createEventTime(16, 30),
      category: "ceremony" as const,
      status: "confirmed" as const,
    },
    {
      title: "Cocktail Hour",
      laneId: lanes[4].id, // Meals
      startUtc: createEventTime(16, 30),
      endUtc: createEventTime(17, 30),
      category: "meal" as const,
      status: "confirmed" as const,
    },
    {
      title: "Reception Entrance",
      laneId: lanes[5].id, // Music
      startUtc: createEventTime(17, 30),
      endUtc: createEventTime(18, 0),
      category: "music" as const,
      status: "tentative" as const,
    },
    {
      title: "Dinner Service",
      laneId: lanes[4].id, // Meals
      startUtc: createEventTime(18, 0),
      endUtc: createEventTime(19, 30),
      category: "meal" as const,
      status: "confirmed" as const,
    },
    {
      title: "First Dance & Toasts",
      laneId: lanes[5].id, // Music
      startUtc: createEventTime(19, 30),
      endUtc: createEventTime(20, 0),
      category: "music" as const,
      status: "tentative" as const,
    },
    {
      title: "Dancing & Celebration",
      laneId: lanes[5].id, // Music
      startUtc: createEventTime(20, 0),
      endUtc: createEventTime(23, 0),
      category: "music" as const,
      status: "confirmed" as const,
    },
    {
      title: "Sunset Photos",
      laneId: lanes[1].id, // Photo
      startUtc: createEventTime(18, 15),
      endUtc: createEventTime(18, 45),
      category: "photo" as const,
      status: "tentative" as const,
      notes: "Sunset is around 6:20 PM on this date",
    },
    {
      title: "Cake Cutting",
      laneId: lanes[4].id, // Meals
      startUtc: createEventTime(21, 0),
      endUtc: createEventTime(21, 15),
      category: "meal" as const,
      status: "confirmed" as const,
    },
  ];

  for (const event of events) {
    await prisma.timelineEvent.create({
      data: {
        weddingId: wedding.id,
        title: event.title,
        laneId: event.laneId,
        startUtc: event.startUtc,
        endUtc: event.endUtc,
        category: event.category,
        assignedOwnerType: "couple",
        assignedOwnerId: coupleUser.id,
        assignedOwnerName: "Sarah & John",
        status: event.status,
        notes: (event as { notes?: string }).notes,
      },
    });
  }

  console.log("Created timeline events");

  // Create golden hour band (approximate for October 17 in NY)
  await prisma.timelineBackgroundBand.create({
    data: {
      weddingId: wedding.id,
      bandType: "golden",
      startUtc: createEventTime(17, 50),
      endUtc: createEventTime(18, 40),
      label: "Golden Hour",
    },
  });

  console.log("Created background bands");

  // Create funding sources
  const fundingSources = await Promise.all([
    prisma.budgetFundingSource.create({
      data: {
        weddingId: wedding.id,
        name: "Couple",
        committedAmount: 2000000, // $20,000
        notes: "Our savings",
      },
    }),
    prisma.budgetFundingSource.create({
      data: {
        weddingId: wedding.id,
        name: "Bride's Parents",
        committedAmount: 2000000, // $20,000
      },
    }),
    prisma.budgetFundingSource.create({
      data: {
        weddingId: wedding.id,
        name: "Groom's Parents",
        committedAmount: 1000000, // $10,000
      },
    }),
  ]);

  console.log("Created funding sources");

  // Create budget categories
  const categories = await Promise.all([
    prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: "Venue",
        targetAmount: 1500000, // $15,000
        sortOrder: 0,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: "Catering",
        targetAmount: 1200000, // $12,000
        sortOrder: 1,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: "Photography",
        targetAmount: 500000, // $5,000
        sortOrder: 2,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: "Florist",
        targetAmount: 400000, // $4,000
        sortOrder: 3,
      },
    }),
    prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: "DJ / Music",
        targetAmount: 200000, // $2,000
        sortOrder: 4,
      },
    }),
  ]);

  console.log("Created budget categories");

  // Create contracts
  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        weddingId: wedding.id,
        categoryId: categories[0].id, // Venue
        vendorName: "The Grand Estate",
        vendorEmail: "events@grandestate.com",
        vendorPhone: "555-0101",
        totalAmount: 1500000,
        signedDate: new Date("2025-01-15"),
      },
    }),
    prisma.contract.create({
      data: {
        weddingId: wedding.id,
        categoryId: categories[1].id, // Catering
        vendorName: "Elegant Catering Co.",
        vendorEmail: "booking@elegantcatering.com",
        vendorPhone: "555-0102",
        totalAmount: 1200000,
      },
    }),
    prisma.contract.create({
      data: {
        weddingId: wedding.id,
        categoryId: categories[2].id, // Photography
        vendorName: "Mike Photography",
        vendorEmail: "mike@mikephoto.com",
        vendorPhone: "555-0103",
        totalAmount: 500000,
        signedDate: new Date("2025-02-01"),
      },
    }),
    prisma.contract.create({
      data: {
        weddingId: wedding.id,
        categoryId: categories[3].id, // Florist
        vendorName: "Bloom & Petal",
        vendorEmail: "orders@bloompetal.com",
        totalAmount: 400000,
      },
    }),
    prisma.contract.create({
      data: {
        weddingId: wedding.id,
        categoryId: categories[4].id, // DJ
        vendorName: "Party Sounds DJ",
        vendorEmail: "book@partysounds.com",
        totalAmount: 200000,
      },
    }),
  ]);

  console.log("Created contracts");

  // Create payment milestones
  const milestones = [
    // Venue
    {
      categoryId: categories[0].id,
      contractId: contracts[0].id,
      fundingSourceId: fundingSources[1].id, // Bride's parents
      label: "Venue - Deposit",
      amount: 500000,
      dueDate: new Date("2025-03-01"),
      status: "paid" as const,
      paidDate: new Date("2025-03-01"),
    },
    {
      categoryId: categories[0].id,
      contractId: contracts[0].id,
      fundingSourceId: fundingSources[1].id,
      label: "Venue - Final Payment",
      amount: 1000000,
      dueDate: new Date("2026-09-01"),
      status: "planned" as const,
    },
    // Catering
    {
      categoryId: categories[1].id,
      contractId: contracts[1].id,
      fundingSourceId: fundingSources[0].id, // Couple
      label: "Catering - Deposit",
      amount: 500000,
      dueDate: new Date("2026-07-15"),
      status: "planned" as const,
    },
    {
      categoryId: categories[1].id,
      contractId: contracts[1].id,
      fundingSourceId: null, // Unallocated
      label: "Catering - Final",
      amount: 700000,
      dueDate: new Date("2026-10-10"),
      status: "planned" as const,
    },
    // Photography
    {
      categoryId: categories[2].id,
      contractId: contracts[2].id,
      fundingSourceId: fundingSources[0].id,
      label: "Photography - Deposit",
      amount: 200000,
      dueDate: new Date("2026-06-01"),
      status: "planned" as const,
    },
    {
      categoryId: categories[2].id,
      contractId: contracts[2].id,
      fundingSourceId: fundingSources[0].id,
      label: "Photography - Final",
      amount: 300000,
      dueDate: new Date("2026-10-17"),
      status: "planned" as const,
    },
    // Florist
    {
      categoryId: categories[3].id,
      contractId: contracts[3].id,
      fundingSourceId: fundingSources[2].id, // Groom's parents
      label: "Florist - Deposit",
      amount: 150000,
      dueDate: new Date("2026-08-01"),
      status: "planned" as const,
    },
    {
      categoryId: categories[3].id,
      contractId: contracts[3].id,
      fundingSourceId: null, // Unallocated
      label: "Florist - Final",
      amount: 250000,
      dueDate: new Date("2026-10-15"),
      status: "planned" as const,
    },
    // DJ
    {
      categoryId: categories[4].id,
      contractId: contracts[4].id,
      fundingSourceId: fundingSources[2].id,
      label: "DJ - Deposit",
      amount: 100000,
      dueDate: new Date("2026-07-01"),
      status: "planned" as const,
    },
    {
      categoryId: categories[4].id,
      contractId: contracts[4].id,
      fundingSourceId: fundingSources[2].id,
      label: "DJ - Final",
      amount: 100000,
      dueDate: new Date("2026-10-17"),
      status: "planned" as const,
    },
  ];

  for (const milestone of milestones) {
    await prisma.paymentMilestone.create({
      data: {
        weddingId: wedding.id,
        ...milestone,
      },
    });
  }

  console.log("Created payment milestones");

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
