import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../prisma/client';

const syncRunSchema = z.object({
  title: z.string().optional(),
  distanceKm: z.number(),
  durationSec: z.number(),
  avgPaceSec: z.number(),
  route: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.number(),
    })
  ),
  splits: z.array(
    z.object({
      km: z.number(),
      timeSec: z.number(),
      paceSec: z.number(),
    })
  ),
  startTime: z.string(), // ISO date string
  endTime: z.string(),
  eventId: z.string().optional(),
});

export async function runRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.post('/sync', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = syncRunSchema.parse(request.body);

    const runSession = await prisma.runSession.create({
      data: {
        title: body.title || 'Free Run',
        userId,
        eventId: body.eventId,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        distanceKm: body.distanceKm,
        durationSec: body.durationSec,
        avgPaceSec: body.avgPaceSec,
        route: body.route,
        splits: body.splits,
      },
    });

    // Optionally update user's total distance
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalDistanceKm: {
          increment: body.distanceKm,
        },
      },
    });

    return reply.status(201).send({ success: true, data: runSession });
  });

  app.get('/my-runs', async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const runs = await prisma.runSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
    });

    return reply.status(200).send({ success: true, data: runs });
  });
}
