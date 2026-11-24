import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../server';
import { prisma } from '../../prisma/client';
import { SportActivityType, GoalPeriod, GoalTargetType } from '@sportup/shared';
import crypto from 'node:crypto';

describe('Segments, PRs & Analytics API Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let createdSegmentId: string;
  const testEmail = `analyst_${Date.now()}@test.sportup.app`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Analyst Runner',
        username: `analyst_${Date.now()}`,
        totalDistanceKm: 0,
      },
    });
    testUserId = user.id;
    authToken = app.jwt.sign({ id: user.id, email: user.email });
  });

  after(async () => {
    await prisma.segmentEffort.deleteMany({ where: { userId: testUserId } });
    await prisma.personalRecord.deleteMany({ where: { userId: testUserId } });
    await prisma.athleteGoal.deleteMany({ where: { userId: testUserId } });
    await prisma.segment.deleteMany({ where: { creatorId: testUserId } });
    await prisma.runSession.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  it('POST /api/v1/segments - creates a new competitive route segment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/segments',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Avenue Habib Bourguiba Sprint',
        sportType: SportActivityType.RUN,
        distanceM: 500,
        startLat: 36.8000,
        startLng: 10.1800,
        endLat: 36.8045,
        endLng: 10.1800,
        polyline: [
          { latitude: 36.8000, longitude: 10.1800, timestamp: 0 },
          { latitude: 36.8045, longitude: 10.1800, timestamp: 0 },
        ],
        elevationGainM: 5,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Avenue Habib Bourguiba Sprint');
    createdSegmentId = body.data.id;
  });

  it('GET /api/v1/segments/explore - discovers nearby segments sorted by user distance', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/segments/explore?lat=36.8000&lng=10.1800&radiusKm=10',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
    assert.equal(body.data[0].id, createdSegmentId);
    assert.equal(body.data[0].distanceFromUserKm, 0);
  });

  it('POST /api/v1/runs/sync - automatically matches segment and detects new personal records', async () => {
    const clientSessionId = crypto.randomUUID();
    const startTime = new Date(Date.now() - 1800000).toISOString();

    const payload = {
      clientSessionId,
      title: '5K PR Run crossing Habib Bourguiba Sprint',
      sportType: SportActivityType.RUN,
      distanceKm: 5.5,
      durationSec: 1500,
      movingDurationSec: 1500,
      avgPaceSec: 272,
      elevationGainM: 30,
      elevationLossM: 25,
      calories: 420,
      route: [
        { latitude: 36.7995, longitude: 10.1800, timestamp: 1000 },
        { latitude: 36.80005, longitude: 10.18005, timestamp: 5000 },  // Segment Start matched
        { latitude: 36.8020, longitude: 10.1800, timestamp: 60000 },
        { latitude: 36.80455, longitude: 10.18005, timestamp: 120000 }, // Segment Finish matched (115s)
        { latitude: 36.8100, longitude: 10.1800, timestamp: 300000 },
      ],
      splits: [
        { km: 1, timeSec: 270, paceSec: 270, elevationGainM: 5, elevationLossM: 2 },
        { km: 2, timeSec: 265, paceSec: 265, elevationGainM: 5, elevationLossM: 5 },
        { km: 3, timeSec: 275, paceSec: 275, elevationGainM: 10, elevationLossM: 5 },
        { km: 4, timeSec: 280, paceSec: 280, elevationGainM: 5, elevationLossM: 5 },
        { km: 5, timeSec: 270, paceSec: 270, elevationGainM: 5, elevationLossM: 8 },
      ],
      startTime,
      endTime: new Date().toISOString(),
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/runs/sync',
      headers: { authorization: `Bearer ${authToken}` },
      payload,
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.matchedEffortsCount >= 1, 'Expected segment effort to be recorded');
    assert.ok(body.newPersonalRecords.length >= 1, 'Expected new personal records to be detected');
  });

  it('GET /api/v1/segments/:id/leaderboard - returns ranked segment efforts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/segments/${createdSegmentId}/leaderboard`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 1);
    assert.equal(body.data[0].rank, 1);
    assert.equal(body.data[0].user.id, testUserId);
    assert.ok(body.data[0].elapsedTimeSec > 0);
  });

  it('GET /api/v1/analytics/dashboard - returns weekly metrics, training load and timeline', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/dashboard?period=week',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.data.summary.totalDistanceKm >= 5.0);
    assert.ok(body.data.trainingLoad.score > 0);
    assert.ok(Array.isArray(body.data.timeline));
    assert.ok(body.data.heatmapPoints.length >= 1);
  });

  it('GET /api/v1/analytics/personal-records - returns formatted personal records', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/personal-records',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
    assert.ok(body.data[0].formattedValue);
  });

  it('POST & GET /api/v1/analytics/goals - creates and evaluates distance goals', async () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/goals',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        sportType: SportActivityType.RUN,
        period: GoalPeriod.WEEKLY,
        targetType: GoalTargetType.DISTANCE_KM,
        targetValue: 20.0,
        startDate,
        endDate,
      },
    });

    assert.equal(createRes.statusCode, 201);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/goals',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(getRes.statusCode, 200);
    const body = JSON.parse(getRes.body);
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 1);
    assert.ok(body.data[0].currentValue >= 5.0);
    assert.ok(body.data[0].progressPercentage >= 25);
  });
});
