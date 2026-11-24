import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma/client';
import { NotificationType } from '@sportup/shared';

export const kudosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /runs/:id/kudos - toggle kudos
  fastify.post<{ Params: { id: string } }>('/:id/kudos', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id: runSessionId } = request.params;

    const session = await prisma.runSession.findUnique({
      where: { id: runSessionId },
      select: { id: true, userId: true, title: true },
    });

    if (!session) {
      return reply.status(404).send({ success: false, message: 'Activity not found' });
    }

    const existingKudos = await prisma.activityKudos.findUnique({
      where: { runSessionId_userId: { runSessionId, userId: currentUserId } },
    });

    if (existingKudos) {
      await prisma.activityKudos.delete({
        where: { id: existingKudos.id },
      });
      const count = await prisma.activityKudos.count({ where: { runSessionId } });
      return reply.send({
        success: true,
        data: { hasKudos: false, count },
      });
    }

    await prisma.activityKudos.create({
      data: {
        runSessionId,
        userId: currentUserId,
      },
    });

    // Notify author if not giving kudos to oneself
    if (session.userId !== currentUserId) {
      const giver = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { name: true },
      });
      await prisma.notification.create({
        data: {
          userId: session.userId,
          type: NotificationType.ACTIVITY_KUDOS,
          title: 'New Kudos!',
          body: `${giver?.name || 'Someone'} gave kudos to your activity "${session.title}"`,
          data: { runSessionId, actorId: currentUserId },
        },
      });
    }

    const count = await prisma.activityKudos.count({ where: { runSessionId } });
    return reply.status(201).send({
      success: true,
      data: { hasKudos: true, count },
    });
  });

  // GET /runs/:id/kudos - list users who gave kudos
  fastify.get<{ Params: { id: string } }>('/:id/kudos', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id: runSessionId } = request.params;

    const kudos = await prisma.activityKudos.findMany({
      where: { runSessionId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send({
      success: true,
      data: {
        count: kudos.length,
        hasKudos: kudos.some((k) => k.userId === currentUserId),
        users: kudos.map((k) => k.user),
      },
    });
  });
};
