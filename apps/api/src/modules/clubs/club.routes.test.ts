import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../server';
import { prisma } from '../../prisma/client';
import { SportActivityType, ChallengeType } from '@sportup/shared';
import crypto from 'node:crypto';

describe('Phase 3 & 4 Social, Clubs, Kudos & Check-in API Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let testClubId: string;
  let testChallengeId: string;
  let testRunId: string;
  let testEventId: string;
  let testCheckinToken: string;
  const testEmail = `social_${Date.now()}@test.sportup.app`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Social Athlete',
        username: `social_${Date.now()}`,
      },
    });
    testUserId = user.id;
    authToken = app.jwt.sign({ id: user.id, email: user.email });

    // Create a dummy activity for kudos test
    const run = await prisma.runSession.create({
      data: {
        userId: testUserId,
        title: 'Morning Social 5K',
        sportType: SportActivityType.RUN,
        distanceKm: 5.0,
        durationSec: 1500,
        route: [],
        splits: [],
      },
    });
    testRunId = run.id;

    // Create a test sport and event for check-in test
    let sport = await prisma.sport.findFirst();
    if (!sport) {
      sport = await prisma.sport.create({
        data: { name: 'running_test', label: 'Running', icon: 'run', color: '#FF6B35' },
      });
    }

    testCheckinToken = 'TESTQR123';
    const event = await prisma.event.create({
      data: {
        title: 'Weekly Saturday Group 10K',
        description: 'Community run test',
        organizerId: testUserId,
        sportId: sport.id,
        startAt: new Date(),
        checkinToken: testCheckinToken,
      },
    });
    testEventId = event.id;
  });

  after(async () => {
    await prisma.activityKudos.deleteMany({ where: { userId: testUserId } });
    await prisma.userChallenge.deleteMany({ where: { userId: testUserId } });
    await prisma.challenge.deleteMany({ where: { title: { contains: 'Test' } } });
    await prisma.clubPost.deleteMany({ where: { authorId: testUserId } });
    await prisma.clubMember.deleteMany({ where: { userId: testUserId } });
    if (testClubId) {
      await prisma.club.delete({ where: { id: testClubId } }).catch(() => {});
    }
    await prisma.eventParticipant.deleteMany({ where: { userId: testUserId } });
    if (testEventId) {
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    await prisma.privacyZone.deleteMany({ where: { userId: testUserId } });
    await prisma.runSession.deleteMany({ where: { userId: testUserId } });
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  it('POST /api/v1/clubs - creates a new club with user as OWNER', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/clubs',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Casablanca Striders',
        description: 'Fast paced running community',
        city: 'Casablanca',
        sportType: SportActivityType.RUN,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Casablanca Striders');
    assert.equal(body.data.isMember, true);
    assert.equal(body.data.myRole, 'OWNER');
    testClubId = body.data.id;
  });

  it('GET /api/v1/clubs/explore - returns list of clubs with membership status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clubs/explore',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.clubs));
    assert.ok(body.data.clubs.some((c: any) => c.id === testClubId));
  });

  it('POST /api/v1/clubs/:id/posts - posts content to club wall', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/clubs/${testClubId}/posts`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        content: 'Ready for the weekend long run!',
        mediaUrls: [],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.content, 'Ready for the weekend long run!');
  });

  it('GET /api/v1/clubs/:id/leaderboard - gets weekly club leaderboard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/clubs/${testClubId}/leaderboard`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
  });

  it('POST /api/v1/challenges - creates a monthly distance challenge', async () => {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/challenges',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: 'November 100K Test Challenge',
        description: 'Log 100 km this month',
        type: ChallengeType.MONTHLY_DISTANCE,
        targetValue: 100,
        sportType: SportActivityType.RUN,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        clubId: testClubId,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.title, 'November 100K Test Challenge');
    testChallengeId = body.data.id;
  });

  it('POST /api/v1/challenges/:id/join - user joins a challenge', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/challenges/${testChallengeId}/join`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.userId, testUserId);
  });

  it('POST /api/v1/runs/:id/kudos - toggles kudos on an activity', async () => {
    // 1st toggle: add kudos
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/runs/${testRunId}/kudos`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res1.statusCode, 201);
    const body1 = JSON.parse(res1.body);
    assert.equal(body1.success, true);
    assert.equal(body1.data.hasKudos, true);
    assert.equal(body1.data.count, 1);

    // 2nd toggle: remove kudos
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/runs/${testRunId}/kudos`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(res2.statusCode, 200);
    const body2 = JSON.parse(res2.body);
    assert.equal(body2.success, true);
    assert.equal(body2.data.hasKudos, false);
    assert.equal(body2.data.count, 0);
  });

  it('POST /api/v1/events/:id/checkin - scans QR check-in code and confirms attendance', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/events/${testEventId}/checkin`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        checkinToken: testCheckinToken,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.data.participant.attendance, 'PRESENT');
  });

  it('POST /api/v1/privacy/zones & GET /privacy/zones - manages user privacy zones', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/privacy/zones',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Home',
        lat: 33.5731,
        lng: -7.5898,
        radiusMeters: 500,
      },
    });

    assert.equal(createRes.statusCode, 201);
    const created = JSON.parse(createRes.body);
    assert.equal(created.success, true);
    assert.equal(created.data.name, 'Home');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/privacy/zones',
      headers: { authorization: `Bearer ${authToken}` },
    });

    assert.equal(getRes.statusCode, 200);
    const list = JSON.parse(getRes.body);
    assert.equal(list.success, true);
    assert.ok(list.data.length >= 1);
  });
});
