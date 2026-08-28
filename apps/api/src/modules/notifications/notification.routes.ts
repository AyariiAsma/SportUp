import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';

export async function notificationRoutes(app: FastifyInstance) {
  // ─── List Notifications ────────────────────────────────

  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return reply.send({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  // ─── Mark as Read ──────────────────────────────────────

  app.patch('/:id/read', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return reply.send({ success: true });
  });

  // ─── Mark All as Read ──────────────────────────────────

  app.patch('/read-all', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return reply.send({ success: true });
  });
}
