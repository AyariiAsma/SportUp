import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import { createReportSchema } from '@sportup/shared';

export async function reportRoutes(app: FastifyInstance) {
  // ─── Submit Report ─────────────────────────────────────

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: reporterId } = request.user as { id: string };
    const body = createReportSchema.parse(request.body);

    // Prevent duplicate reports
    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: body.targetType as any,
        targetId: body.targetId,
        status: 'PENDING',
      },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        message: 'You have already reported this content',
      });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: body.targetType as any,
        targetId: body.targetId,
        reason: body.reason,
      },
    });

    return reply.status(201).send({ success: true, data: report });
  });
}
