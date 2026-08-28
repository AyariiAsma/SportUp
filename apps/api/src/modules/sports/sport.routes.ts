import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';

export async function sportRoutes(app: FastifyInstance) {
  // ─── List All Sports ───────────────────────────────────

  app.get('/', async (_request, reply) => {
    const sports = await prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' },
    });

    return reply.send({
      success: true,
      data: sports,
    });
  });

  // ─── Get Single Sport ──────────────────────────────────

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const sport = await prisma.sport.findUnique({
      where: { id },
    });

    if (!sport) {
      return reply.status(404).send({ success: false, message: 'Sport not found' });
    }

    return reply.send({ success: true, data: sport });
  });
}
