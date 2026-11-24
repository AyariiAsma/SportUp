import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  createPrivacyZoneSchema,
  updatePrivacyZoneSchema,
} from '@sportup/shared';

export const privacyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /privacy/zones - get user's privacy zones
  fastify.get('/zones', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;

    const zones = await prisma.privacyZone.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: zones,
    });
  });

  // POST /privacy/zones - create privacy zone
  fastify.post('/zones', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const body = createPrivacyZoneSchema.parse(request.body);

    const count = await prisma.privacyZone.count({ where: { userId: currentUserId } });
    if (count >= 5) {
      return reply.status(400).send({
        success: false,
        message: 'Maximum 5 privacy zones allowed per account',
      });
    }

    const zone = await prisma.privacyZone.create({
      data: {
        userId: currentUserId,
        name: body.name,
        lat: body.lat,
        lng: body.lng,
        radiusMeters: body.radiusMeters,
      },
    });

    return reply.status(201).send({
      success: true,
      data: zone,
    });
  });

  // DELETE /privacy/zones/:id - delete privacy zone
  fastify.delete<{ Params: { id: string } }>('/zones/:id', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;

    const zone = await prisma.privacyZone.findUnique({ where: { id } });
    if (!zone || zone.userId !== currentUserId) {
      return reply.status(404).send({ success: false, message: 'Privacy zone not found' });
    }

    await prisma.privacyZone.delete({ where: { id } });

    return reply.send({
      success: true,
      data: { message: 'Privacy zone deleted' },
    });
  });
};
