import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './prisma/client';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { sportRoutes } from './modules/sports/sport.routes';
import { eventRoutes } from './modules/events/event.routes';
import { postRoutes } from './modules/posts/post.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';
import { reportRoutes } from './modules/reports/report.routes';
import { rankRoutes } from './modules/rank/rank.routes';
import { motivationRoutes } from './modules/motivation/motivation.routes';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Plugins ─────────────────────────────────────────

  await app.register(cors, {
    origin: true, // Allow all origins in dev; restrict in production
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Decorators ──────────────────────────────────────

  // Make Prisma available to all routes via app.prisma
  app.decorate('prisma', prisma);

  // Auth decorator for protected routes
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // ─── Health Check ────────────────────────────────────

  app.get('/api/v1/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  });

  // ─── Routes ──────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(sportRoutes, { prefix: '/api/v1/sports' });
  await app.register(eventRoutes, { prefix: '/api/v1/events' });
  await app.register(postRoutes, { prefix: '/api/v1/posts' });
  await app.register(mediaRoutes, { prefix: '/api/v1/media' });
  await app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });
  await app.register(rankRoutes, { prefix: '/api/v1/rank' });
  await app.register(motivationRoutes, { prefix: '/api/v1/motivation' });

  // ─── Global Error Handler ───────────────────────────

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        message: 'Validation error',
        errors: JSON.parse(error.message),
      });
    }

    // Prisma known errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return reply.status(409).send({
        success: false,
        message: 'Database conflict',
      });
    }

    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      message: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  return app;
}

// ─── Start Server ────────────────────────────────────────

async function start() {
  try {
    const app = await buildServer();

    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🏃 SportUp API running at http://${HOST}:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/v1/health\n`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
