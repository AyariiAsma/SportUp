import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  eventCheckinSchema,
  createEventAnnouncementSchema,
  NotificationType,
  AttendanceStatus,
} from '@sportup/shared';
import crypto from 'crypto';

export const eventExtRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /events/:id/checkin-code - get or generate event QR checkin token (organizer only)
  fastify.get<{ Params: { id: string } }>('/:id/checkin-code', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id: eventId } = request.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, checkinToken: true, title: true },
    });

    if (!event) {
      return reply.status(404).send({ success: false, message: 'Event not found' });
    }

    if (event.organizerId !== currentUserId) {
      return reply.status(403).send({ success: false, message: 'Only organizer can access check-in code' });
    }

    let token = event.checkinToken;
    if (!token) {
      token = crypto.randomBytes(8).toString('hex').toUpperCase();
      await prisma.event.update({
        where: { id: eventId },
        data: { checkinToken: token },
      });
    }

    return reply.send({
      success: true,
      data: {
        eventId,
        eventTitle: event.title,
        checkinToken: token,
      },
    });
  });

  // POST /events/:id/checkin - scan/submit QR check-in
  fastify.post<{ Params: { id: string } }>('/:id/checkin', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id: eventId } = request.params;
    const body = eventCheckinSchema.parse(request.body);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, checkinToken: true, title: true, organizerId: true },
    });

    if (!event) {
      return reply.status(404).send({ success: false, message: 'Event not found' });
    }

    if (!event.checkinToken || event.checkinToken !== body.checkinToken.trim().toUpperCase()) {
      return reply.status(400).send({ success: false, message: 'Invalid check-in code' });
    }

    // Upsert participant attendance
    const participant = await prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId: currentUserId } },
      update: { attendance: AttendanceStatus.PRESENT },
      create: {
        eventId,
        userId: currentUserId,
        attendance: AttendanceStatus.PRESENT,
      },
    });

    // Reward rank score +25 for event attendance
    await prisma.user.update({
      where: { id: currentUserId },
      data: { rankScore: { increment: 25 } },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: currentUserId,
        type: NotificationType.EVENT_CHECKIN,
        title: 'Check-in Confirmed! 🎉',
        body: `You checked in at "${event.title}". +25 ranking points earned!`,
        data: { eventId },
      },
    });

    return reply.send({
      success: true,
      data: {
        message: 'Check-in successful! +25 ranking points.',
        participant,
      },
    });
  });

  // GET /events/:id/results - finisher results table
  fastify.get<{ Params: { id: string } }>('/:id/results', async (request, reply) => {
    await request.jwtVerify();
    const { id: eventId } = request.params;

    const results = await prisma.eventFinisherResult.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { rank: 'asc' },
    });

    return reply.send({
      success: true,
      data: results,
    });
  });

  // GET /events/:id/announcements - list announcements
  fastify.get<{ Params: { id: string } }>('/:id/announcements', async (request, reply) => {
    await request.jwtVerify();
    const { id: eventId } = request.params;

    const announcements = await prisma.eventAnnouncement.findMany({
      where: { eventId },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return reply.send({
      success: true,
      data: announcements,
    });
  });

  // POST /events/:id/announcements - post announcement (organizer only)
  fastify.post<{ Params: { id: string } }>('/:id/announcements', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id: eventId } = request.params;
    const body = createEventAnnouncementSchema.parse(request.body);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, title: true },
    });

    if (!event) {
      return reply.status(404).send({ success: false, message: 'Event not found' });
    }

    if (event.organizerId !== currentUserId) {
      return reply.status(403).send({ success: false, message: 'Only organizer can post announcements' });
    }

    const announcement = await prisma.eventAnnouncement.create({
      data: {
        eventId,
        authorId: currentUserId,
        title: body.title,
        content: body.content,
        isPinned: body.isPinned,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    return reply.status(201).send({
      success: true,
      data: announcement,
    });
  });
};
