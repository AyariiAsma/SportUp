import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import {
  analyticsDashboardQuerySchema,
  createGoalSchema,
  calculateWeeklyTrainingLoad,
  formatPace,
  PRType,
  SportActivityType,
  PersonalRecordItem,
} from '@sportup/shared';

function formatPRValue(type: PRType, val: number): string {
  switch (type) {
    case PRType.LONGEST_DISTANCE:
      return `${val.toFixed(2)} KM`;
    case PRType.FASTEST_PACE:
      return `${formatPace(val)} /km`;
    case PRType.BEST_1K:
    case PRType.BEST_5K:
    case PRType.BEST_10K:
    case PRType.HALF_MARATHON:
    case PRType.MARATHON: {
      const hours = Math.floor(val / 3600);
      const min = Math.floor((val % 3600) / 60);
      const sec = Math.floor(val % 60);
      if (hours > 0) {
        return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      }
      return `${min}:${sec.toString().padStart(2, '0')}`;
    }
    default:
      return `${val}`;
  }
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // ─── 1. Athlete Performance Dashboard ────────────────────
  app.get('/dashboard', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const query = analyticsDashboardQuerySchema.parse(request.query);
    const { period, sportType } = query;

    const now = new Date();
    let startDate = new Date();
    let dayCount = 7;

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      dayCount = 7;
    } else if (period === 'month') {
      startDate.setDate(now.getDate() - 30);
      dayCount = 30;
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
      dayCount = 365;
    }

    const where: any = {
      userId,
      startTime: { gte: startDate, lte: now },
    };
    if (sportType) where.sportType = sportType;

    const activities = await prisma.runSession.findMany({
      where,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        distanceKm: true,
        durationSec: true,
        movingDurationSec: true,
        avgPaceSec: true,
        elevationGainM: true,
        calories: true,
        sportType: true,
        route: true,
      },
    });

    // 1. Compute Totals
    let totalDistanceKm = 0;
    let totalDurationSec = 0;
    let totalElevationGainM = 0;
    let totalCalories = 0;
    const heatmapPoints: Array<{ lat: number; lng: number }> = [];

    for (const act of activities) {
      totalDistanceKm += act.distanceKm;
      totalDurationSec += act.durationSec;
      totalElevationGainM += act.elevationGainM;
      totalCalories += act.calories;

      if (Array.isArray(act.route)) {
        for (let i = 0; i < act.route.length; i += 5) {
          const pt = act.route[i] as any;
          if (pt?.latitude && pt?.longitude) {
            heatmapPoints.push({ lat: pt.latitude, lng: pt.longitude });
          }
        }
      }
    }

    // 2. Compute Training Load
    const trainingLoad = calculateWeeklyTrainingLoad(
      activities.map((a) => ({
        durationSec: a.durationSec,
        distanceKm: a.distanceKm,
      }))
    );

    // 3. Build Timeline Chart Bars
    const timelineMap = new Map<string, { distanceKm: number; durationSec: number; elevationGainM: number }>();
    for (let i = 0; i < (period === 'year' ? 12 : dayCount); i++) {
      const d = new Date(startDate);
      if (period === 'year') {
        d.setMonth(startDate.getMonth() + i);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        timelineMap.set(key, { distanceKm: 0, durationSec: 0, elevationGainM: 0 });
      } else {
        d.setDate(startDate.getDate() + i);
        const key = d.toISOString().split('T')[0];
        timelineMap.set(key, { distanceKm: 0, durationSec: 0, elevationGainM: 0 });
      }
    }

    for (const act of activities) {
      const dateKey =
        period === 'year'
          ? `${act.startTime.getFullYear()}-${(act.startTime.getMonth() + 1).toString().padStart(2, '0')}`
          : act.startTime.toISOString().split('T')[0];

      const entry = timelineMap.get(dateKey);
      if (entry) {
        entry.distanceKm += act.distanceKm;
        entry.durationSec += act.durationSec;
        entry.elevationGainM += act.elevationGainM;
      }
    }

    const timeline = Array.from(timelineMap.entries()).map(([date, stats]) => ({
      date,
      distanceKm: parseFloat(stats.distanceKm.toFixed(2)),
      durationMin: Math.round(stats.durationSec / 60),
      elevationGainM: Math.round(stats.elevationGainM),
    }));

    return reply.status(200).send({
      success: true,
      data: {
        period,
        summary: {
          totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
          totalDurationSec,
          totalElevationGainM: Math.round(totalElevationGainM),
          totalCalories,
          totalWorkouts: activities.length,
          avgPaceSec: totalDistanceKm > 0 ? Math.round(totalDurationSec / totalDistanceKm) : 0,
        },
        trainingLoad,
        timeline,
        heatmapPoints: heatmapPoints.slice(0, 1000), // capped for performance
      },
    });
  });

  // ─── 2. Personal Records ─────────────────────────────────
  app.get('/personal-records', async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const prs = await prisma.personalRecord.findMany({
      where: { userId },
      include: {
        activity: {
          select: { id: true, title: true, startTime: true },
        },
      },
      orderBy: { achievedAt: 'desc' },
    });

    const formatted: PersonalRecordItem[] = prs.map((pr) => ({
      id: pr.id,
      type: pr.type as PRType,
      sportType: pr.sportType as SportActivityType,
      value: pr.value,
      formattedValue: formatPRValue(pr.type as PRType, pr.value),
      activityId: pr.activityId,
      activityTitle: pr.activity.title,
      achievedAt: pr.achievedAt.toISOString(),
    }));

    return reply.status(200).send({
      success: true,
      data: formatted,
    });
  });

  // ─── 3. Athlete Goals Management ─────────────────────────
  app.get('/goals', async (request, reply) => {
    const { id: userId } = request.user as { id: string };

    const goals = await prisma.athleteGoal.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });

    // Refresh current values from activities
    const updatedGoals = await Promise.all(
      goals.map(async (goal) => {
        const activities = await prisma.runSession.findMany({
          where: {
            userId,
            sportType: goal.sportType,
            startTime: { gte: goal.startDate, lte: goal.endDate },
          },
          select: { distanceKm: true, durationSec: true },
        });

        let currentVal = 0;
        if (goal.targetType === 'DISTANCE_KM') {
          currentVal = activities.reduce((sum, a) => sum + a.distanceKm, 0);
        } else if (goal.targetType === 'DURATION_MIN') {
          currentVal = activities.reduce((sum, a) => sum + a.durationSec / 60, 0);
        } else {
          currentVal = activities.length;
        }

        const isCompleted = currentVal >= goal.targetValue;
        return {
          ...goal,
          currentValue: parseFloat(currentVal.toFixed(1)),
          progressPercentage: Math.min(100, Math.round((currentVal / goal.targetValue) * 100)),
          isCompleted,
        };
      })
    );

    return reply.status(200).send({ success: true, data: updatedGoals });
  });

  app.post('/goals', async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const body = createGoalSchema.parse(request.body);

    const goal = await prisma.athleteGoal.create({
      data: {
        userId,
        sportType: body.sportType as any,
        period: body.period as any,
        targetType: body.targetType as any,
        targetValue: body.targetValue,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
      },
    });

    return reply.status(201).send({ success: true, data: goal });
  });
}
