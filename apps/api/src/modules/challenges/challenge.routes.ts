import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  createChallengeSchema,
  challengeQuerySchema,
  ChallengeType,
  SportActivityType,
} from '@sportup/shared';

export const challengeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /challenges - list challenges
  fastify.get('/', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const query = challengeQuerySchema.parse(request.query);

    const now = new Date();
    const where: any = {};
    if (query.status === 'active') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (query.status === 'upcoming') {
      where.startDate = { gt: now };
    } else if (query.status === 'completed') {
      where.endDate = { lt: now };
    }
    if (query.clubId) where.clubId = query.clubId;
    if (query.sportType) where.sportType = query.sportType;

    const challenges = await prisma.challenge.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        club: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { participants: true } },
        participants: {
          where: { userId: currentUserId },
          select: { progress: true, isCompleted: true, completedAt: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const formatted = challenges.map((c) => {
      const myParticipation = c.participants[0] || null;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        badgeKey: c.badgeKey,
        badgeIconUrl: c.badgeIconUrl,
        type: c.type,
        targetValue: c.targetValue,
        sportType: c.sportType,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        club: c.club,
        participantsCount: c._count.participants,
        isJoined: Boolean(myParticipation),
        myProgress: myParticipation?.progress ?? 0,
        myProgressPercentage: myParticipation
          ? Math.min(Math.round((myParticipation.progress / c.targetValue) * 100), 100)
          : 0,
        isCompleted: myParticipation?.isCompleted ?? false,
      };
    });

    return reply.send({
      success: true,
      data: formatted,
    });
  });

  // GET /challenges/my - user's joined challenges
  fastify.get('/my', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;

    const userChallenges = await prisma.userChallenge.findMany({
      where: { userId: currentUserId },
      include: {
        challenge: {
          include: {
            club: { select: { id: true, name: true } },
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const formatted = userChallenges.map((uc) => ({
      id: uc.challenge.id,
      title: uc.challenge.title,
      description: uc.challenge.description,
      type: uc.challenge.type,
      targetValue: uc.challenge.targetValue,
      badgeKey: uc.challenge.badgeKey,
      badgeIconUrl: uc.challenge.badgeIconUrl,
      startDate: uc.challenge.startDate.toISOString(),
      endDate: uc.challenge.endDate.toISOString(),
      progress: uc.progress,
      progressPercentage: Math.min(
        Math.round((uc.progress / uc.challenge.targetValue) * 100),
        100
      ),
      isCompleted: uc.isCompleted,
      completedAt: uc.completedAt?.toISOString() || null,
      club: uc.challenge.club,
      participantsCount: uc.challenge._count.participants,
    }));

    return reply.send({
      success: true,
      data: formatted,
    });
  });

  // GET /challenges/:id - challenge detail
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { participants: true } },
        participants: {
          take: 20,
          orderBy: { progress: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!challenge) {
      return reply.status(404).send({ success: false, message: 'Challenge not found' });
    }

    const myParticipation = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: currentUserId, challengeId: id } },
    });

    return reply.send({
      success: true,
      data: {
        ...challenge,
        isJoined: Boolean(myParticipation),
        myProgress: myParticipation?.progress ?? 0,
        isCompleted: myParticipation?.isCompleted ?? false,
      },
    });
  });

  // POST /challenges - create challenge
  fastify.post('/', async (request, reply) => {
    await request.jwtVerify();
    const body = createChallengeSchema.parse(request.body);

    const challenge = await prisma.challenge.create({
      data: {
        title: body.title,
        description: body.description,
        badgeKey: body.badgeKey,
        badgeIconUrl: body.badgeIconUrl,
        type: body.type,
        targetValue: body.targetValue,
        sportType: body.sportType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        clubId: body.clubId,
      },
    });

    return reply.status(201).send({
      success: true,
      data: challenge,
    });
  });

  // POST /challenges/:id/join - join challenge
  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;

    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) {
      return reply.status(404).send({ success: false, message: 'Challenge not found' });
    }

    const existing = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: currentUserId, challengeId: id } },
    });

    if (existing) {
      return reply.send({
        success: true,
        data: { message: 'Already participating', userChallenge: existing },
      });
    }

    const userChallenge = await prisma.userChallenge.create({
      data: {
        userId: currentUserId,
        challengeId: id,
        progress: 0,
      },
    });

    return reply.status(201).send({
      success: true,
      data: userChallenge,
    });
  });
};
