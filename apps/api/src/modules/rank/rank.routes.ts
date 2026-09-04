import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import { buildRank } from './rank.service';

export async function rankRoutes(app: FastifyInstance) {
  // ─── Leaderboard ──────────────────────────────────────
  // Returns users ranked by rankScore, highest first.
  // Public — no auth required so anyone can share/view the board.

  app.get('/leaderboard', async (request, reply) => {
    const { limit = '50', offset = '0' } = request.query as {
      limit?: string;
      offset?: string;
    };

    const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = Math.max(parseInt(offset, 10) || 0, 0);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ rankScore: 'desc' }, { totalDistanceKm: 'desc' }],
      take,
      skip,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        city: true,
        region: true,
        runningLevel: true,
        rankScore: true,
        totalDistanceKm: true,
        isOnline: true,
        _count: {
          select: {
            participations: true,
          },
        },
      },
    });

    const total = await prisma.user.count({ where: { isActive: true } });

    const data = users.map((u, idx) => ({
      rank: skip + idx + 1,
      id: u.id,
      name: u.name,
      username: u.username,
      avatar: u.avatar,
      city: u.city,
      region: u.region,
      runningLevel: u.runningLevel,
      rankScore: u.rankScore,
      totalDistanceKm: u.totalDistanceKm,
      isOnline: u.isOnline,
      runsJoined: u._count.participations,
      rankInfo: buildRank(u.rankScore),
    }));

    return reply.send({ success: true, data, meta: { total, take, skip } });
  });

  // ─── Single User Rank ─────────────────────────────────
  // Useful for profile deep-links: fetch the rank position of one user.

  app.get('/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        runningLevel: true,
        rankScore: true,
        totalDistanceKm: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, message: 'User not found' });
    }

    // Count how many active users have a higher score
    const higherCount = await prisma.user.count({
      where: { isActive: true, rankScore: { gt: user.rankScore } },
    });
    const rankPosition = higherCount + 1;

    return reply.send({
      success: true,
      data: {
        ...user,
        rank: rankPosition,
        rankInfo: buildRank(user.rankScore),
      },
    });
  });
}
