import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  syncActivitySchema,
  activityQuerySchema,
  importGpxSchema,
  exportToGpx,
  parseGpx,
  haversineDistance,
  calculateElevationGainLoss,
  calculateCalories,
  matchSegment,
  detectPersonalRecords,
  PRType,
  LocationPoint,
  ActivitySplit,
  SportActivityType,
} from '@sportup/shared';

export async function runRoutes(app: FastifyInstance) {
  // Authentication middleware
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // ─── 1. Idempotent Activity Sync ────────────────────────
  app.post('/sync', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = syncActivitySchema.parse(request.body);

    // Idempotency check: if clientSessionId was already uploaded, return existing without double-counting
    if (body.clientSessionId) {
      const existing = await prisma.runSession.findUnique({
        where: { clientSessionId: body.clientSessionId },
      });

      if (existing) {
        return reply.status(200).send({
          success: true,
          data: existing,
          isDuplicate: true,
          message: 'Activity already synced',
        });
      }
    }

    // Compute derived metrics if missing
    const durationSec = body.durationSec;
    const movingDurationSec = body.movingDurationSec ?? durationSec;
    const distanceKm = body.distanceKm;

    let avgSpeedKmh = body.avgSpeedKmh ?? 0;
    if (!avgSpeedKmh && movingDurationSec > 0 && distanceKm > 0) {
      avgSpeedKmh = parseFloat(((distanceKm / (movingDurationSec / 3600))).toFixed(2));
    }

    let calories = body.calories;
    if (!calories && distanceKm > 0 && durationSec > 0) {
      calories = calculateCalories({
        sportType: body.sportType,
        distanceKm,
        durationSec,
      });
    }

    let elevationGainM = body.elevationGainM ?? 0;
    let elevationLossM = body.elevationLossM ?? 0;
    if (!elevationGainM && !elevationLossM && body.route.length > 0) {
      const altitudes = body.route.map((p) => p.altitude);
      const ele = calculateElevationGainLoss(altitudes);
      elevationGainM = ele.gainM;
      elevationLossM = ele.lossM;
    }

    // Save session in transaction to ensure user stats consistency
    const runSession = await prisma.$transaction(async (tx) => {
      const session = await tx.runSession.create({
        data: {
          clientSessionId: body.clientSessionId,
          title: body.title || 'Workout',
          sportType: body.sportType as any,
          visibility: body.visibility as any,
          status: body.status as any,
          userId,
          eventId: body.eventId ?? null,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          distanceKm,
          durationSec,
          movingDurationSec,
          avgPaceSec: Math.round(body.avgPaceSec),
          avgSpeedKmh,
          maxSpeedKmh: body.maxSpeedKmh ?? avgSpeedKmh,
          elevationGainM,
          elevationLossM,
          calories,
          avgCadence: body.avgCadence ?? null,
          avgHeartRate: body.avgHeartRate ?? null,
          maxHeartRate: body.maxHeartRate ?? null,
          isManual: body.isManual,
          sourceDevice: body.sourceDevice,
          notes: body.notes ?? null,
          route: body.route,
          splits: body.splits,
        },
      });

      // Increment user cumulative distance
      await tx.user.update({
        where: { id: userId },
        data: {
          totalDistanceKm: {
            increment: distanceKm,
          },
        },
      });

      return session;
    });

    // ─── Auto-match Segments ─────────────────────────────────
    let matchedEffortsCount = 0;
    if (body.route.length >= 2) {
      try {
        const candidateSegments = await prisma.segment.findMany({
          where: { sportType: body.sportType as any },
        });

        for (const seg of candidateSegments) {
          const match = matchSegment(body.route, {
            startLat: seg.startLat,
            startLng: seg.startLng,
            endLat: seg.endLat,
            endLng: seg.endLng,
            distanceM: seg.distanceM,
          });

          if (match) {
            await prisma.segmentEffort.create({
              data: {
                segmentId: seg.id,
                activityId: runSession.id,
                userId,
                elapsedTimeSec: match.elapsedTimeSec,
                movingTimeSec: match.movingTimeSec,
                avgSpeedKmh: match.avgSpeedKmh,
                avgPaceSec: match.avgPaceSec,
                startDate: new Date(body.startTime),
              },
            });
            matchedEffortsCount++;
          }
        }
      } catch (err) {
        app.log.warn({ err }, 'Segment matching error');
      }
    }

    // ─── Auto-detect Personal Records ────────────────────────
    const newPRs: Array<{ type: PRType; value: number }> = [];
    try {
      const existingRecords = await prisma.personalRecord.findMany({
        where: { userId, sportType: body.sportType as any },
      });
      const prMap: Partial<Record<PRType, number>> = {};
      for (const r of existingRecords) {
        prMap[r.type as PRType] = r.value;
      }

      const detected = detectPersonalRecords(
        {
          distanceKm,
          durationSec,
          avgPaceSec: Math.round(body.avgPaceSec),
          splits: body.splits,
          sportType: body.sportType,
        },
        prMap
      );

      for (const pr of detected) {
        await prisma.personalRecord.upsert({
          where: {
            userId_sportType_type: {
              userId,
              sportType: body.sportType as any,
              type: pr.type as any,
            },
          },
          update: {
            value: pr.value,
            activityId: runSession.id,
            achievedAt: new Date(body.startTime),
          },
          create: {
            userId,
            sportType: body.sportType as any,
            type: pr.type as any,
            value: pr.value,
            activityId: runSession.id,
            achievedAt: new Date(body.startTime),
          },
        });
        newPRs.push(pr);
      }
    } catch (err) {
      app.log.warn({ err }, 'PR detection error');
    }

    // ─── Auto-post to Feed ───────────────────────────────────
    if (body.visibility !== 'ONLY_ME') {
      try {
        await prisma.post.create({
          data: {
            authorId: userId,
            runSessionId: runSession.id,
            category: 'ACHIEVEMENT',
            content: body.title || 'Completed an activity',
            activityCardData: {
              title: body.title,
              sportType: body.sportType,
              distanceKm,
              durationSec,
              avgPaceSec: Math.round(body.avgPaceSec),
              elevationGainM: body.elevationGainM,
              calories: body.calories,
            },
          },
        });
      } catch (err) {
        app.log.warn({ err }, 'Auto-post feed error');
      }
    }

    // ─── Update User Challenge Progress ──────────────────────
    try {
      const activeChallenges = await prisma.userChallenge.findMany({
        where: {
          userId,
          isCompleted: false,
          challenge: {
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
        include: { challenge: true },
      });

      for (const uc of activeChallenges) {
        let addedVal = 0;
        if (uc.challenge.type === 'MONTHLY_DISTANCE' || uc.challenge.type === 'SINGLE_ACTIVITY_DISTANCE') {
          addedVal = distanceKm;
        } else if (uc.challenge.type === 'ELEVATION_GAIN') {
          addedVal = body.elevationGainM || 0;
        }

        const newProg = uc.progress + addedVal;
        const reached = newProg >= uc.challenge.targetValue;
        await prisma.userChallenge.update({
          where: { id: uc.id },
          data: {
            progress: newProg,
            isCompleted: reached,
            completedAt: reached ? new Date() : undefined,
          },
        });

        if (reached) {
          if (uc.challenge.badgeKey) {
            await prisma.userBadge.upsert({
              where: { userId_badgeKey: { userId, badgeKey: uc.challenge.badgeKey } },
              update: {},
              create: {
                userId,
                badgeKey: uc.challenge.badgeKey,
                title: uc.challenge.title,
                description: uc.challenge.description,
                iconUrl: uc.challenge.badgeIconUrl,
              },
            });
          }
          await prisma.notification.create({
            data: {
              userId,
              type: 'CHALLENGE_COMPLETED' as any,
              title: 'Challenge Completed! 🏆',
              body: `Congratulations! You completed "${uc.challenge.title}"!`,
              data: { challengeId: uc.challengeId },
            },
          });
        }
      }
    } catch (err) {
      app.log.warn({ err }, 'Challenge progress update error');
    }

    return reply.status(201).send({
      success: true,
      data: runSession,
      matchedEffortsCount,
      newPersonalRecords: newPRs,
      isDuplicate: false,
    });
  });

  // ─── 2. List User Activities (Paginated + Filtered) ─────
  app.get('/my-runs', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const query = activityQuerySchema.parse(request.query);
    const { page, limit, sportType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (sportType) where.sportType = sportType;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [activities, total, aggregateStats] = await Promise.all([
      prisma.runSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          clientSessionId: true,
          title: true,
          sportType: true,
          visibility: true,
          status: true,
          startTime: true,
          endTime: true,
          distanceKm: true,
          durationSec: true,
          movingDurationSec: true,
          avgPaceSec: true,
          avgSpeedKmh: true,
          maxSpeedKmh: true,
          elevationGainM: true,
          elevationLossM: true,
          calories: true,
          avgCadence: true,
          avgHeartRate: true,
          maxHeartRate: true,
          isManual: true,
          sourceDevice: true,
          notes: true,
          eventId: true,
          createdAt: true,
          // Return splits for summary, but omit heavy full route array from list view for performance
          splits: true,
        },
      }),
      prisma.runSession.count({ where }),
      prisma.runSession.aggregate({
        where: { userId },
        _sum: {
          distanceKm: true,
          durationSec: true,
          elevationGainM: true,
          calories: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return reply.status(200).send({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalDistanceKm: aggregateStats._sum.distanceKm ?? 0,
        totalDurationSec: aggregateStats._sum.durationSec ?? 0,
        totalElevationGainM: aggregateStats._sum.elevationGainM ?? 0,
        totalCalories: aggregateStats._sum.calories ?? 0,
        totalActivities: aggregateStats._count.id ?? 0,
      },
    });
  });

  // ─── 3. Get Single Activity Details ─────────────────────
  app.get('/:id', async (request, reply) => {
    const { id: currentUserId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const activity = await prisma.runSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
          },
        },
        segmentEfforts: {
          include: {
            segment: {
              select: {
                id: true,
                name: true,
                distanceM: true,
                elevationGainM: true,
              },
            },
          },
        },
        personalRecords: true,
        kudos: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!activity) {
      return reply.status(404).send({ success: false, message: 'Activity not found' });
    }

    // Visibility / privacy check
    if (activity.visibility === 'ONLY_ME' && activity.userId !== currentUserId) {
      return reply.status(403).send({ success: false, message: 'This activity is private' });
    }

    return reply.status(200).send({ success: true, data: activity });
  });

  // ─── 4. Upload / attach photos to activity ──────────────
  app.post('/:id/photos', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    const { photoUrls } = request.body as { photoUrls: string[] };

    const session = await prisma.runSession.findUnique({ where: { id } });
    if (!session || session.userId !== userId) {
      return reply.status(404).send({ success: false, message: 'Activity not found' });
    }

    const updated = await prisma.runSession.update({
      where: { id },
      data: {
        photos: {
          push: photoUrls,
        },
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ─── 4. Export Activity as GPX File ─────────────────────
  app.get('/:id/gpx', async (request, reply) => {
    const { id: currentUserId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    const activity = await prisma.runSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        visibility: true,
        title: true,
        sportType: true,
        startTime: true,
        route: true,
      },
    });

    if (!activity) {
      return reply.status(404).send({ success: false, message: 'Activity not found' });
    }

    if (activity.visibility === 'ONLY_ME' && activity.userId !== currentUserId) {
      return reply.status(403).send({ success: false, message: 'Unauthorized access to private activity' });
    }

    const routePoints = (activity.route as unknown as LocationPoint[]) || [];
    const gpxXml = exportToGpx({
      title: activity.title,
      sportType: activity.sportType,
      startTime: activity.startTime.toISOString(),
      route: routePoints,
    });

    const safeTitle = activity.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    reply.header('Content-Type', 'application/gpx+xml; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="sportup-${safeTitle}-${activity.id}.gpx"`);
    return reply.send(gpxXml);
  });

  // ─── 5. Import GPX File as Activity ──────────────────────
  app.post('/import-gpx', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = importGpxSchema.parse(request.body);

    const parsed = parseGpx(body.gpxXml);
    if (parsed.points.length < 2) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid GPX file: route must contain at least 2 trackpoints',
      });
    }

    const altitudes = parsed.points.map((p) => p.altitude);
    const { gainM, lossM } = calculateElevationGainLoss(altitudes);

    const distanceKm = parsed.distanceKm;
    const durationSec = parsed.durationSec;
    const avgPaceSec = distanceKm > 0 ? Math.round(durationSec / distanceKm) : 0;
    const avgSpeedKmh = durationSec > 0 ? parseFloat((distanceKm / (durationSec / 3600)).toFixed(2)) : 0;

    const calories = calculateCalories({
      sportType: body.sportType,
      distanceKm,
      durationSec,
    });

    // Build splits every 1 km
    const splits: ActivitySplit[] = [];
    let splitStartIdx = 0;
    let accumulatedDistM = 0;
    let currentKm = 1;

    for (let i = 1; i < parsed.points.length; i++) {
      const prev = parsed.points[i - 1];
      const curr = parsed.points[i];
      const d = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      accumulatedDistM += d;

      if (accumulatedDistM >= currentKm * 1000) {
        const splitDurationSec = Math.max(1, Math.round((curr.timestamp - parsed.points[splitStartIdx].timestamp) / 1000));
        splits.push({
          km: currentKm,
          timeSec: splitDurationSec,
          paceSec: splitDurationSec,
          speedKmh: parseFloat((3600 / splitDurationSec).toFixed(2)),
          elevationGainM: 0,
          elevationLossM: 0,
        });
        currentKm++;
        splitStartIdx = i;
      }
    }

    const activity = await prisma.$transaction(async (tx) => {
      const session = await tx.runSession.create({
        data: {
          title: body.title || 'Imported GPX Activity',
          sportType: body.sportType as any,
          userId,
          startTime: new Date(parsed.startTime),
          endTime: new Date(parsed.endTime),
          distanceKm,
          durationSec,
          movingDurationSec: durationSec,
          avgPaceSec,
          avgSpeedKmh,
          maxSpeedKmh: avgSpeedKmh,
          elevationGainM: gainM,
          elevationLossM: lossM,
          calories,
          isManual: false,
          sourceDevice: 'GPX File Import',
          route: parsed.points as any,
          splits: splits as any,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          totalDistanceKm: { increment: distanceKm },
        },
      });

      return session;
    });

    return reply.status(201).send({
      success: true,
      data: activity,
      message: 'GPX activity successfully imported',
    });
  });
}
