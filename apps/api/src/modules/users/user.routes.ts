import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import { minScoreForLevel, updateProfileSchema } from '@sportup/shared';
import { buildRank } from '../rank/rank.service';

// Helper: build full user profile with running stats
async function buildUserProfile(userId: string, currentUserId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      city: true,
      region: true,
      locality: true,
      country: true,
      lat: true,
      lng: true,
      runningLevel: true,
      rankScore: true,
      totalDistanceKm: true,
      preferredSports: true,
      isVerified: true,
      isOnline: true,
      lastSeenAt: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          organizedEvents: true,
          posts: true,
        },
      },
    },
  });

  if (!user) return null;

  // Running stats
  const [runsJoined, runsCompleted, runsAttended] = await Promise.all([
    prisma.eventParticipant.count({
      where: { userId, status: 'CONFIRMED' },
    }),
    prisma.eventParticipant.count({
      where: {
        userId,
        status: 'CONFIRMED',
        event: { status: 'COMPLETED' },
      },
    }),
    prisma.eventParticipant.count({
      where: { userId, status: 'CONFIRMED', attendance: 'PRESENT' },
    }),
  ]);

  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: userId } },
    });
    isFollowing = !!follow;
  }

  return {
    ...user,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    runsJoined,
    runsOrganized: user._count.organizedEvents,
    runsCompleted,
    runsAttended,
    postsCount: user._count.posts,
    isFollowing,
    rank: buildRank(user.rankScore),
    _count: undefined,
  };
}

export async function userRoutes(app: FastifyInstance) {
  // ─── Search Users ──────────────────────────────────────

  app.get('/search', async (request, reply) => {
    const { q = '', limit = '10' } = request.query as { q?: string; limit?: string };

    if (!q || q.length < 2) {
      return reply.send({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: Math.min(parseInt(limit), 20),
      select: { id: true, name: true, username: true, avatar: true, isOnline: true },
    });

    return reply.send({ success: true, data: users });
  });

  // ─── Get Own Profile ───────────────────────────────────


  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };

    const profile = await buildUserProfile(id, id);
    if (!profile) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    return reply.send({ success: true, data: profile });
  });

  // ─── Update Own Profile ────────────────────────────────

  app.patch('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.user as { id: string };
    const body = updateProfileSchema.parse(request.body);

    if (body.username) {
      const existing = await prisma.user.findFirst({
        where: { username: body.username, NOT: { id } },
      });
      if (existing) {
        return reply.status(409).send({ success: false, message: 'Username is already taken' });
      }
    }

    const data: Record<string, unknown> = { ...body };
    const rawAvatar = (request.body as any)?.avatar;
    if (rawAvatar !== undefined) {
      data.avatar = rawAvatar;
    }

    if (body.runningLevel) {
      const current = await prisma.user.findUniqueOrThrow({ where: { id }, select: { rankScore: true } });
      data.rankScore = Math.max(current.rankScore, minScoreForLevel(body.runningLevel));
    }

    await prisma.user.update({ where: { id }, data });

    const profile = await buildUserProfile(id, id);
    return reply.send({ success: true, data: profile });
  });

  // ─── Get Public Profile ────────────────────────────────

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    let currentUserId: string | null = null;

    try {
      await request.jwtVerify();
      currentUserId = (request.user as { id: string }).id;
    } catch { /* Not authenticated */ }

    const profile = await buildUserProfile(id, currentUserId);
    if (!profile) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    return reply.send({ success: true, data: profile });
  });

  // ─── Follow User ───────────────────────────────────────

  app.post('/:id/follow', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: followingId } = request.params as { id: string };
    const { id: followerId } = request.user as { id: string };

    if (followerId === followingId) {
      return reply.status(400).send({ success: false, message: 'You cannot follow yourself' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) return reply.status(404).send({ success: false, message: 'User not found' });

    try {
      await prisma.follow.create({ data: { followerId, followingId } });
      await prisma.notification.create({
        data: {
          userId: followingId,
          type: 'NEW_FOLLOWER',
          title: 'New Follower',
          body: `${targetUser.name} started following you`,
          data: { followerId },
        },
      });
    } catch { /* Already following */ }

    return reply.send({ success: true, message: 'Following' });
  });

  // ─── Get User Followers ─────────────────────────────────

  app.get('/:id/followers', async (request, reply) => {
    const { id: userId } = request.params as { id: string };

    const followers = await prisma.follow.findMany({
      where: { followingId: userId, follower: { isActive: true } },
      select: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            city: true,
            runningLevel: true,
            rankScore: true,
            isOnline: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reply.send({ success: true, data: followers.map((f) => f.follower) });
  });

  // ─── Get User Following ─────────────────────────────────

  app.get('/:id/following', async (request, reply) => {
    const { id: userId } = request.params as { id: string };

    const following = await prisma.follow.findMany({
      where: { followerId: userId, following: { isActive: true } },
      select: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            city: true,
            runningLevel: true,
            rankScore: true,
            isOnline: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reply.send({ success: true, data: following.map((f) => f.following) });
  });

  // ─── Unfollow User ─────────────────────────────────────

  app.delete('/:id/follow', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: followingId } = request.params as { id: string };
    const { id: followerId } = request.user as { id: string };

    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return reply.send({ success: true, message: 'Unfollowed' });
  });

  // ─── Presence Heartbeat ────────────────────────────────

  app.post('/presence', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
      }
    });

    return reply.send({ success: true });
  });

  // ─── Get Online / Active Users ─────────────────────────

  app.get('/online', async (request, reply) => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        city: true,
        runningLevel: true,
        rankScore: true,
        isOnline: true,
        lastSeenAt: true,
      },
      orderBy: [{ isOnline: 'desc' }, { lastSeenAt: 'desc' }],
      take: 100,
    });

    return reply.send({ success: true, data: users });
  });
}
