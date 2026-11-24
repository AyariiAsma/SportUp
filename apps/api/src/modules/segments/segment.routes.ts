import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  createSegmentSchema,
  segmentQuerySchema,
  haversineDistance,
  formatPace,
  formatSpeed,
  LocationPoint,
} from '@sportup/shared';

export async function segmentRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // ─── 1. Create a New Segment ─────────────────────────────
  app.post('/', async (request, reply) => {
    const { id: creatorId } = request.user as { id: string };
    const body = createSegmentSchema.parse(request.body);

    const segment = await prisma.segment.create({
      data: {
        name: body.name,
        sportType: body.sportType as any,
        distanceM: body.distanceM,
        startLat: body.startLat,
        startLng: body.startLng,
        endLat: body.endLat,
        endLng: body.endLng,
        polyline: body.polyline as any,
        elevationGainM: body.elevationGainM,
        creatorId,
      },
    });

    return reply.status(201).send({ success: true, data: segment });
  });

  // ─── 2. Explore Nearby Segments ──────────────────────────
  app.get('/explore', async (request, reply) => {
    const query = segmentQuerySchema.parse(request.query);
    const { lat, lng, radiusKm, sportType, page, limit } = query;

    const where: any = {};
    if (sportType) where.sportType = sportType;

    // Approximate bounding box filter for fast DB index lookup
    if (lat != null && lng != null) {
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
      where.startLat = { gte: lat - latDelta, lte: lat + latDelta };
      where.startLng = { gte: lng - lngDelta, lte: lng + lngDelta };
    }

    const segments = await prisma.segment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        _count: {
          select: { efforts: true },
        },
      },
    });

    // Compute exact distance from user location
    const withDistance = segments.map((seg) => {
      let distanceFromUserM: number | null = null;
      if (lat != null && lng != null) {
        distanceFromUserM = haversineDistance(lat, lng, seg.startLat, seg.startLng);
      }
      return {
        ...seg,
        distanceFromUserKm: distanceFromUserM != null ? parseFloat((distanceFromUserM / 1000).toFixed(2)) : null,
        totalEffortsCount: seg._count.efforts,
        _count: undefined,
      };
    });

    if (lat != null && lng != null) {
      withDistance.sort((a, b) => (a.distanceFromUserKm ?? 9999) - (b.distanceFromUserKm ?? 9999));
    }

    return reply.status(200).send({
      success: true,
      data: withDistance,
    });
  });

  // ─── 3. Get Segment Details ──────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const segment = await prisma.segment.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        _count: {
          select: { efforts: true },
        },
      },
    });

    if (!segment) {
      return reply.status(404).send({ success: false, message: 'Segment not found' });
    }

    return reply.status(200).send({ success: true, data: segment });
  });

  // ─── 4. Segment Leaderboard ──────────────────────────────
  app.get('/:id/leaderboard', async (request, reply) => {
    const { id: segmentId } = request.params as { id: string };
    const { timeframe = 'all_time' } = request.query as { timeframe?: 'all_time' | 'this_month' };

    const where: any = { segmentId };
    if (timeframe === 'this_month') {
      const now = new Date();
      where.startDate = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    }

    // Top efforts sorted by fastest elapsed time
    const efforts = await prisma.segmentEffort.findMany({
      where,
      orderBy: { elapsedTimeSec: 'asc' },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    // Deduplicate to show each athlete's best effort on the leaderboard
    const athleteBestMap = new Map<string, typeof efforts[0]>();
    for (const effort of efforts) {
      if (!athleteBestMap.has(effort.userId)) {
        athleteBestMap.set(effort.userId, effort);
      }
    }

    const leaderboard = Array.from(athleteBestMap.values()).map((effort, index) => ({
      rank: index + 1,
      effortId: effort.id,
      elapsedTimeSec: effort.elapsedTimeSec,
      formattedTime: formatPace(effort.elapsedTimeSec),
      avgSpeedKmh: effort.avgSpeedKmh,
      avgPaceSec: effort.avgPaceSec,
      startDate: effort.startDate,
      user: effort.user,
    }));

    return reply.status(200).send({
      success: true,
      data: leaderboard,
    });
  });
}
