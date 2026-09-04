/**
 * Backfill: enroll the organizer as a CONFIRMED participant
 * for every event that doesn't already have them in the list.
 *
 * Run once:  npx tsx apps/api/prisma/backfill-organizer-participant.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch all events with their organizer id
  const events = await prisma.event.findMany({
    select: { id: true, organizerId: true, title: true },
  });

  console.log(`Found ${events.length} events to check…\n`);

  let added = 0;
  let skipped = 0;

  for (const event of events) {
    // Check if organizer is already a participant
    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId: event.id, userId: event.organizerId },
      },
    });

    if (existing) {
      console.log(`  ⏭  "${event.title}" — organizer already enrolled`);
      skipped++;
      continue;
    }

    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: event.organizerId,
        status: 'CONFIRMED',
      },
    });

    console.log(`  ✅ "${event.title}" — organizer enrolled`);
    added++;
  }

  console.log(`\nDone. Added: ${added}  |  Already existed: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
