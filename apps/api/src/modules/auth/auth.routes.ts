import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../prisma/client';
import { registerSchema, loginSchema } from '@sportup/shared';

export async function authRoutes(app: FastifyInstance) {
  // ─── Register ──────────────────────────────────────────

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if email or username already taken
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existing) {
      const field = existing.email === body.email ? 'email' : 'username';
      return reply.status(409).send({
        success: false,
        message: `This ${field} is already registered`,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        username: body.username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        city: true,
        region: true,
        country: true,
        lat: true,
        lng: true,
        preferredSports: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Create default settings
    await prisma.userSettings.create({
      data: { userId: user.id },
    });

    // Generate tokens
    const accessToken = app.jwt.sign({ id: user.id, email: user.email });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        user,
        tokens: { accessToken, refreshToken },
      },
    });
  });

  // ─── Login ─────────────────────────────────────────────

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        city: true,
        region: true,
        country: true,
        lat: true,
        lng: true,
        preferredSports: true,
        isVerified: true,
        isActive: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        success: false,
        message: 'Account has been deactivated',
      });
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = app.jwt.sign({ id: user.id, email: user.email });
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Mark user as online
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    // Strip passwordHash from response
    const { passwordHash: _, isActive: __, ...userData } = user;

    return reply.send({
      success: true,
      data: {
        user: userData,
        tokens: { accessToken, refreshToken },
      },
    });
  });

  // ─── Refresh Token ─────────────────────────────────────

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Delete expired token if exists
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Rotate refresh token (delete old, create new)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newAccessToken = app.jwt.sign({
      id: storedToken.user.id,
      email: storedToken.user.email,
    });
    const newRefreshToken = crypto.randomBytes(64).toString('hex');

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    });
  });

  // ─── Logout ────────────────────────────────────────────

  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { refreshToken } = request.body as { refreshToken: string };

    // Mark user as offline immediately
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // ─── Forgot Password ──────────────────────────────────

  app.post('/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string };

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // TODO: Generate reset token and send email via Resend/Nodemailer
      app.log.info(`Password reset requested for: ${email}`);
    }

    return reply.send({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  });
}
