import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  createClubSchema,
  clubQuerySchema,
  createClubPostSchema,
  ClubRole,
  SportActivityType,
} from '@sportup/shared';

export const clubRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /clubs/explore - list/search clubs
  fastify.get('/explore', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const query = clubQuerySchema.parse(request.query);

    const where: any = {};
    if (query.sportType) where.sportType = query.sportType;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, clubs] = await Promise.all([
      prisma.club.count({ where }),
      prisma.club.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          members: {
            select: { userId: true, role: true },
          },
          _count: {
            select: { members: true, challenges: true },
          },
        },
        orderBy: { members: { _count: 'desc' } },
      }),
    ]);

    const formatted = clubs.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverUrl: c.coverUrl,
      avatarUrl: c.avatarUrl,
      city: c.city,
      country: c.country,
      sportType: c.sportType,
      isPrivate: c.isPrivate,
      membersCount: c._count.members,
      challengesCount: c._count.challenges,
      isMember: c.members.some((m) => m.userId === currentUserId),
      myRole: c.members.find((m) => m.userId === currentUserId)?.role || null,
    }));

    return reply.send({
      success: true,
      data: {
        clubs: formatted,
        total,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  // GET /clubs/:id - club details
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;

    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        members: {
          take: 10,
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true },
            },
          },
        },
        challenges: {
          where: { endDate: { gte: new Date() } },
          take: 5,
        },
        _count: {
          select: { members: true, posts: true, challenges: true },
        },
      },
    });

    if (!club) {
      return reply.status(404).send({ success: false, message: 'Club not found' });
    }

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: currentUserId } },
    });

    return reply.send({
      success: true,
      data: {
        ...club,
        isMember: Boolean(membership),
        myRole: membership?.role || null,
      },
    });
  });

  // POST /clubs - create a club
  fastify.post('/', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const body = createClubSchema.parse(request.body);

    const club = await prisma.club.create({
      data: {
        name: body.name,
        description: body.description,
        coverUrl: body.coverUrl,
        avatarUrl: body.avatarUrl,
        city: body.city,
        country: body.country,
        sportType: body.sportType,
        isPrivate: body.isPrivate,
        members: {
          create: {
            userId: currentUserId,
            role: ClubRole.OWNER,
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        ...club,
        isMember: true,
        myRole: ClubRole.OWNER,
      },
    });
  });

  // POST /clubs/:id/join - toggle join/leave club
  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;

    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) {
      return reply.status(404).send({ success: false, message: 'Club not found' });
    }

    const existingMember = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: currentUserId } },
    });

    if (existingMember) {
      if (existingMember.role === ClubRole.OWNER) {
        return reply.status(400).send({
          success: false,
          message: 'Owner cannot leave their own club without transferring ownership',
        });
      }
      await prisma.clubMember.delete({
        where: { clubId_userId: { clubId: id, userId: currentUserId } },
      });
      return reply.send({
        success: true,
        data: { isMember: false, message: 'Left club' },
      });
    }

    await prisma.clubMember.create({
      data: {
        clubId: id,
        userId: currentUserId,
        role: ClubRole.MEMBER,
      },
    });

    return reply.send({
      success: true,
      data: { isMember: true, message: 'Joined club' },
    });
  });

  // GET /clubs/:id/posts - get club posts
  fastify.get<{ Params: { id: string } }>('/:id/posts', async (request, reply) => {
    await request.jwtVerify();
    const { id } = request.params;

    const posts = await prisma.clubPost.findMany({
      where: { clubId: id },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return reply.send({
      success: true,
      data: posts,
    });
  });

  // POST /clubs/:id/posts - post to club
  fastify.post<{ Params: { id: string } }>('/:id/posts', async (request, reply) => {
    await request.jwtVerify();
    const currentUserId = (request.user as { id: string }).id;
    const { id } = request.params;
    const body = createClubPostSchema.parse(request.body);

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: currentUserId } },
    });
    if (!membership) {
      return reply.status(403).send({ success: false, message: 'Must be a club member to post' });
    }

    const post = await prisma.clubPost.create({
      data: {
        clubId: id,
        authorId: currentUserId,
        content: body.content,
        mediaUrls: body.mediaUrls,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    return reply.status(201).send({
      success: true,
      data: post,
    });
  });

  // GET /clubs/:id/leaderboard - weekly member distance leaderboard
  fastify.get<{ Params: { id: string } }>('/:id/leaderboard', async (request, reply) => {
    await request.jwtVerify();
    const { id } = request.params;

    const members = await prisma.clubMember.findMany({
      where: { clubId: id },
      select: {
        userId: true,
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const activities = await prisma.runSession.findMany({
      where: {
        userId: { in: memberIds },
        startTime: { gte: startOfWeek },
      },
      select: {
        userId: true,
        distanceKm: true,
        durationSec: true,
      },
    });

    const userStats = new Map<string, { totalDistanceKm: number; activitiesCount: number; totalDurationSec: number }>();
    for (const m of members) {
      userStats.set(m.userId, { totalDistanceKm: 0, activitiesCount: 0, totalDurationSec: 0 });
    }

    for (const act of activities) {
      const stat = userStats.get(act.userId);
      if (stat) {
        stat.totalDistanceKm += act.distanceKm;
        stat.activitiesCount += 1;
        stat.totalDurationSec += act.durationSec;
      }
    }

    const leaderboard = members
      .map((m) => {
        const stats = userStats.get(m.userId) || { totalDistanceKm: 0, activitiesCount: 0, totalDurationSec: 0 };
        return {
          user: m.user,
          ...stats,
        };
      })
      .sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)
      .map((item, idx) => ({ rank: idx + 1, ...item }));

    return reply.send({
      success: true,
      data: leaderboard,
    });
  });
};
