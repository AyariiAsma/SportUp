import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../server';
import { prisma } from '../../prisma/client';
import { SportActivityType, ActivityVisibility } from '@sportup/shared';
import crypto from 'node:crypto';

describe('Run & Activity Tracking API Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  const testEmail = `runner_${Date.now()}@test.sportup.app`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();

    // Create a dedicated test user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test Runner',
        username: `runner_${Date.now()}`,
        totalDistanceKm: 0,
      },
    });
    testUserId = user.id;

    // Generate JWT token for test user
    authToken = app.jwt.sign({ id: user.id, email: user.email });
  });

  after(async () => {
    // Clean up test data
    await prisma.runSession.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  it('POST /api/v1/runs/sync - creates a new activity and updates user total distance', async () => {
    const clientSessionId = crypto.randomUUID();
    const payload = {
      clientSessionId,
      title: 'Morning 5K Test Run',
      sportType: SportActivityType.RUN,
      visibility: ActivityVisibility.PUBLIC,
      distanceKm: 5.0,
      durationSec: 1500,
      movingDurationSec: 1450,
      avgPaceSec: 300,
      elevationGainM: 45,
      elevationLossM: 40,
      calories: 350,
      route: [
        { latitude: 36.8000, longitude: 10.1800, altitude: 20, timestamp: Date.now() - 1500000 },
        { latitude: 36.8050, longitude: 10.1850, altitude: 45, timestamp: Date.now() - 750000 },
        { latitude: 36.8100, longitude: 10.1900, altitude: 25, timestamp: Date.now() },
      ],
      splits: [
        { km: 1, timeSec: 300, paceSec: 300, elevationGainM: 10, elevationLossM: 5 },
        { km: 2, timeSec: 295, paceSec: 295, elevationGainM: 15, elevationLossM: 10 },
      ],
      startTime: new Date(Date.now() - 1500000).toISOString(),
      endTime: new Date().toISOString(),
      sourceDevice: 'SportUp Android Tester',
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
    assert.equal(body.isDuplicate, false);
    assert.equal(body.data.distanceKm, 5.0);
    assert.equal(body.data.sportType, 'RUN');
    assert.equal(body.data.clientSessionId, clientSessionId);

    // Verify user totalDistanceKm was incremented
    const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.equal(updatedUser?.totalDistanceKm, 5.0);
  });

  it('POST /api/v1/runs/sync - handles idempotency gracefully (returns 200 without double counting)', async () => {
    const clientSessionId = crypto.randomUUID();
    const payload = {
      clientSessionId,
      title: 'Idempotency Check Run',
      sportType: SportActivityType.RUN,
      distanceKm: 3.0,
      durationSec: 900,
      avgPaceSec: 300,
      route: [
        { latitude: 36.800, longitude: 10.180, timestamp: Date.now() - 900000 },
        { latitude: 36.805, longitude: 10.185, timestamp: Date.now() },
      ],
      splits: [],
      startTime: new Date(Date.now() - 900000).toISOString(),
      endTime: new Date().toISOString(),
    };

    // First sync
    const firstRes = await app.inject({
      method: 'POST',
      url: '/api/v1/runs/sync',
      headers: { authorization: `Bearer ${authToken}` },
      payload,
    });
    assert.equal(firstRes.statusCode, 201);

    const userAfterFirst = await prisma.user.findUnique({ where: { id: testUserId } });
    const distAfterFirst = userAfterFirst?.totalDistanceKm ?? 0;

    // Retry same sync
    const retryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/runs/sync',
      headers: { authorization: `Bearer ${authToken}` },
      payload,
    });

    assert.equal(retryRes.statusCode, 200);
    const retryBody = JSON.parse(retryRes.body);
    assert.equal(retryBody.isDuplicate, true);

    // Verify distance was NOT incremented again
    const userAfterRetry = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.equal(userAfterRetry?.totalDistanceKm, distAfterFirst);
  });

  it('GET /api/v1/runs/my-runs - returns paginated workouts and cumulative aggregates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/runs/my-runs?page=1&limit=10',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination.total >= 2);
    assert.ok(body.summary.totalDistanceKm >= 8.0);
    assert.ok(body.summary.totalActivities >= 2);
  });

  it('GET /api/v1/runs/:id/gpx - exports standard GPX file with correct headers and XML content', async () => {
    const userRuns = await prisma.runSession.findMany({ where: { userId: testUserId } });
    const runId = userRuns[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/runs/${runId}/gpx`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    assert.ok(String(res.headers['content-type']).includes('application/gpx+xml'));
    assert.ok(res.body.includes('<gpx version="1.1"'));
    assert.ok(res.body.includes('<trkpt lat='));
  });

  it('POST /api/v1/runs/import-gpx - parses valid GPX and imports as a new activity', async () => {
    const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SportUp">
  <trk>
    <name>Imported Trail Route</name>
    <type>TRAIL_RUN</type>
    <trkseg>
      <trkpt lat="36.8000" lon="10.1800">
        <ele>10.0</ele>
        <time>2026-11-24T08:00:00Z</time>
      </trkpt>
      <trkpt lat="36.8100" lon="10.1800">
        <ele>35.0</ele>
        <time>2026-11-24T08:10:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/runs/import-gpx',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: 'Imported Trail Route',
        sportType: SportActivityType.TRAIL_RUN,
        gpxXml: sampleGpx,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.sportType, 'TRAIL_RUN');
    assert.ok(body.data.distanceKm > 1.0);
    assert.ok(body.data.elevationGainM >= 20);
  });
});
