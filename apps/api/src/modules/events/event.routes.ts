import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  createEventSchema,
  updateEventSchema,
  createRouteSchema,
  createCommentSchema,
  eventQuerySchema,
} from '@sportup/shared';

// Helper: compute event status from current time
function computeEventStatus(startAt: Date, endAt: Date | null, durationMin: number | null): string {
  const now = new Date();
  const end = endAt ?? (durationMin ? new Date(startAt.getTime() + durationMin * 60000) : null);

  if (now < startAt) return 'UPCOMING';
  if (end && now >= startAt && now < end) return 'STARTED';
  if (end && now >= end) return 'COMPLETED';
  if (!end && now >= startAt) return 'STARTED'; // no end time, started
  return 'UPCOMING';
}

// Helper: format an event row for API response
function formatEvent(event: any, currentUserId?: string | null) {
  const computedStatus = computeEventStatus(event.startAt, event.endAt, event.durationMin);
  const participantCount = event._count?.participants ?? event.participantCount ?? 0;
  const isJoined = currentUserId
    ? (event.participants?.some((p: any) => p.userId === currentUserId && p.status === 'CONFIRMED') ?? false)
    : false;

  return {
    ...event,
    status: computedStatus,
    participantCount,
    isJoined,
    _count: undefined,
    participants: event.participants,
  };
}

export async function eventRoutes(app: FastifyInstance) {
  // ─── List / Search Events ──────────────────────────────

  app.get('/', async (request, reply) => {
    const query = eventQuerySchema.parse(request.query);
    const { page, limit, sortBy, lat, lng, radiusKm, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.sportId) where.sportId = filters.sportId;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters.region) where.region = { contains: filters.region, mode: 'insensitive' };
    if (filters.difficulty) where.difficulty = filters.difficulty;

    if (filters.startDate || filters.endDate) {
      where.startAt = {};
      if (filters.startDate) where.startAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.startAt.lte = new Date(filters.endDate);
    }

    let orderBy: any = { startAt: 'asc' };
    if (sortBy === 'created') orderBy = { createdAt: 'desc' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          sport: true,
          organizer: { select: { id: true, name: true, username: true, avatar: true } },
          _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithMeta = events.map((event) => {
      let distanceFromUser: number | null = null;
      if (lat && lng && event.lat && event.lng) {
        distanceFromUser = calculateDistance(lat, lng, event.lat, event.lng);
      }
      return { ...formatEvent(event), distanceFromUser };
    });

    if (sortBy === 'distance' && lat && lng) {
      eventsWithMeta.sort((a, b) => (a.distanceFromUser ?? Infinity) - (b.distanceFromUser ?? Infinity));
    }

    const filteredEvents =
      lat && lng
        ? eventsWithMeta.filter((e) => e.distanceFromUser === null || e.distanceFromUser <= radiusKm)
        : eventsWithMeta;

    return reply.send({
      success: true,
      data: filteredEvents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Get My Events ─────────────────────────────────────

  app.get('/my', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const [organized, joined] = await Promise.all([
      prisma.event.findMany({
        where: { organizerId: userId },
        orderBy: { startAt: 'desc' },
        include: {
          sport: true,
          organizer: { select: { id: true, name: true, username: true, avatar: true } },
          _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
        },
      }),
      prisma.eventParticipant.findMany({
        where: { userId, status: 'CONFIRMED' },
        include: {
          event: {
            include: {
              sport: true,
              organizer: { select: { id: true, name: true, username: true, avatar: true } },
              _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
            },
          },
        },
        orderBy: { event: { startAt: 'desc' } },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        organized: organized.map((e) => formatEvent(e, userId)),
        joined: joined.map((p) => formatEvent(p.event, userId)),
      },
    });
  });

  // ─── Get Single Event ──────────────────────────────────

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    let currentUserId: string | null = null;

    try {
      await request.jwtVerify();
      currentUserId = (request.user as { id: string }).id;
    } catch { /* Not authenticated */ }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        sport: true,
        organizer: { select: { id: true, name: true, username: true, avatar: true } },
        route: true,
        participants: {
          where: { status: 'CONFIRMED' },
          include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
          orderBy: { joinedAt: 'asc' },
          take: 20,
        },
        comments: {
          include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
      },
    });

    if (!event) {
      return reply.status(404).send({ success: false, message: 'Event not found' });
    }

    return reply.send({ success: true, data: formatEvent(event, currentUserId) });
  });

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: organizerId } = request.user as { id: string };
    const body = createEventSchema.parse(request.body);

    const sport = await prisma.sport.findUnique({ where: { id: body.sportId } });
    if (!sport) {
      return reply.status(400).send({ success: false, message: 'Invalid sport' });
    }

    const { routeCoordinates, ...eventData } = body;

    const event = await prisma.event.create({
      data: {
        ...eventData,
        startAt: new Date(eventData.startAt),
        endAt: eventData.endAt ? new Date(eventData.endAt) : undefined,
        organizerId,
        status: 'PUBLISHED',
        route: routeCoordinates && routeCoordinates.length > 0 ? {
          create: {
            points: routeCoordinates.map((pt, idx) => ({ ...pt, order: idx })),
            distanceKm: eventData.distanceKm,
          }
        } : undefined,
      },
      include: {
        sport: true,
        organizer: { select: { id: true, name: true, username: true, avatar: true } },
        route: true,
        _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
      },
    });

    return reply.status(201).send({ success: true, data: formatEvent(event, organizerId) });
  });

  // ─── Update Event ──────────────────────────────────────

  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };
    const body = updateEventSchema.parse(request.body);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return reply.status(404).send({ success: false, message: 'Event not found' });
    if (event.organizerId !== userId) return reply.status(403).send({ success: false, message: 'Not authorized' });

    const { routeCoordinates, ...eventData } = body;

    if (routeCoordinates !== undefined) {
      await prisma.eventRoute.deleteMany({ where: { eventId: id } });
      if (routeCoordinates && routeCoordinates.length > 0) {
        await prisma.eventRoute.create({
          data: {
            eventId: id,
            points: routeCoordinates.map((pt, idx) => ({ ...pt, order: idx })),
            distanceKm: eventData.distanceKm,
          }
        });
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        startAt: eventData.startAt ? new Date(eventData.startAt) : undefined,
        endAt: eventData.endAt ? new Date(eventData.endAt) : undefined,
      },
      include: {
        sport: true,
        organizer: { select: { id: true, name: true, username: true, avatar: true } },
        route: true,
        _count: { select: { participants: { where: { status: 'CONFIRMED' } } } },
      },
    });

    return reply.send({ success: true, data: formatEvent(updated, userId) });
  });

  // ─── Delete Event ──────────────────────────────────────

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return reply.status(404).send({ success: false, message: 'Event not found' });
    if (event.organizerId !== userId) return reply.status(403).send({ success: false, message: 'Not authorized' });

    await prisma.event.delete({ where: { id } });
    return reply.send({ success: true, message: 'Event deleted' });
  });

  // ─── Join Event ────────────────────────────────────────

  app.post('/:id/join', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: eventId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { participants: { where: { status: 'CONFIRMED' } } } } },
    });

    if (!event) return reply.status(404).send({ success: false, message: 'Event not found' });
    if (event.organizerId === userId) return reply.status(400).send({ success: false, message: 'You are the organizer of this event' });

    // Enforce computed status business rules
    const computedStatus = computeEventStatus(event.startAt, event.endAt, event.durationMin);
    if (computedStatus === 'STARTED') return reply.status(400).send({ success: false, message: 'This run has already started' });
    if (computedStatus === 'COMPLETED') return reply.status(400).send({ success: false, message: 'This run has already completed' });
    if (computedStatus === 'CANCELLED' || event.status === 'CANCELLED') return reply.status(400).send({ success: false, message: 'This run has been cancelled' });

    // Enforce capacity — full events cannot accept confirmed participants
    if (event.maxParticipants && event._count.participants >= event.maxParticipants) {
      return reply.status(400).send({ success: false, message: 'This run is full' });
    }

    try {
      await prisma.eventParticipant.create({ data: { eventId, userId, status: 'CONFIRMED' } });
      await prisma.notification.create({
        data: {
          userId: event.organizerId,
          type: 'EVENT_JOINED',
          title: 'New Runner Joined!',
          body: `Someone joined your run "${event.title}"`,
          data: { eventId, userId },
        },
      });
    } catch {
      return reply.status(409).send({ success: false, message: 'You have already joined this run' });
    }

    return reply.status(201).send({ success: true, message: 'Joined successfully' });
  });

  // ─── Leave Event ───────────────────────────────────────

  app.delete('/:id/join', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: eventId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return reply.status(404).send({ success: false, message: 'Event not found' });

    const computedStatus = computeEventStatus(event.startAt, event.endAt, event.durationMin);
    if (computedStatus === 'STARTED') return reply.status(400).send({ success: false, message: 'Cannot leave a run that has already started' });
    if (computedStatus === 'COMPLETED') return reply.status(400).send({ success: false, message: 'Cannot leave a completed run' });

    await prisma.eventParticipant.deleteMany({ where: { eventId, userId } });
    return reply.send({ success: true, message: 'Left run successfully' });
  });

  // ─── Get Participants ──────────────────────────────────

  app.get('/:id/participants', async (request, reply) => {
    const { id: eventId } = request.params as { id: string };

    const participants = await prisma.eventParticipant.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return reply.send({ success: true, data: participants });
  });

  // ─── Get Event Comments ────────────────────────────────

  app.get('/:id/comments', async (request, reply) => {
    const { id: eventId } = request.params as { id: string };

    const comments = await prisma.comment.findMany({
      where: { eventId },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({ success: true, data: comments });
  });

  // ─── Post Event Comment ────────────────────────────────

  app.post('/:id/comments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: eventId } = request.params as { id: string };
    const { id: authorId } = request.user as { id: string };
    const { content } = createCommentSchema.parse(request.body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return reply.status(404).send({ success: false, message: 'Event not found' });

    const comment = await prisma.comment.create({
      data: { eventId, authorId, content },
      include: { author: { select: { id: true, name: true, username: true, avatar: true } } },
    });

    // Notify organizer if commenter is not the organizer
    if (authorId !== event.organizerId) {
      await prisma.notification.create({
        data: {
          userId: event.organizerId,
          type: 'POST_COMMENTED',
          title: 'New comment on your run',
          body: `Someone commented on "${event.title}"`,
          data: { eventId, commentId: comment.id },
        },
      });
    }

    return reply.status(201).send({ success: true, data: comment });
  });

  // ─── Delete Event Comment ──────────────────────────────

  app.delete('/:id/comments/:commentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: eventId, commentId } = request.params as { id: string; commentId: string };
    const { id: userId } = request.user as { id: string };

    const comment = await prisma.comment.findFirst({ where: { id: commentId, eventId } });
    if (!comment) return reply.status(404).send({ success: false, message: 'Comment not found' });

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    const isAuthor = comment.authorId === userId;
    const isOrganizer = event?.organizerId === userId;

    if (!isAuthor && !isOrganizer) {
      return reply.status(403).send({ success: false, message: 'Not authorized' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return reply.send({ success: true, message: 'Comment deleted' });
  });

  // ─── Get / Save Route ──────────────────────────────────

  app.get('/:id/route', async (request, reply) => {
    const { id: eventId } = request.params as { id: string };
    const route = await prisma.eventRoute.findUnique({ where: { eventId } });
    if (!route) return reply.status(404).send({ success: false, message: 'Route not found' });
    return reply.send({ success: true, data: route });
  });

  app.post('/:id/route', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: eventId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };
    const body = createRouteSchema.parse(request.body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== userId) {
      return reply.status(403).send({ success: false, message: 'Not authorized' });
    }

    const route = await prisma.eventRoute.upsert({
      where: { eventId },
      create: { eventId, points: body.points, distanceKm: body.distanceKm, encodedPath: body.encodedPath },
      update: { points: body.points, distanceKm: body.distanceKm, encodedPath: body.encodedPath },
    });

    return reply.send({ success: true, data: route });
  });
}

// ─── Haversine Distance Calculation ──────────────────────

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
