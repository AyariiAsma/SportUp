import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10) * 1024 * 1024;

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export async function mediaRoutes(app: FastifyInstance) {
  // Register multipart
  await app.register(import('@fastify/multipart'), {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 5,
    },
  });

  // ─── Upload File ───────────────────────────────────────

  app.post('/upload', { preHandler: [app.authenticate] }, async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({ success: false, message: 'No file provided' });
    }

    const mimeType = file.mimetype;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return reply.status(400).send({
        success: false,
        message: `File type not allowed. Allowed: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
      });
    }

    // Generate unique filename
    const ext = path.extname(file.filename) || (isImage ? '.jpg' : '.mp4');
    const filename = `${randomUUID()}${ext}`;
    const subDir = isImage ? 'images' : 'videos';
    const dirPath = path.join(UPLOAD_DIR, subDir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(dirPath, filename);

    // Write file to disk
    const writeStream = fs.createWriteStream(filePath);
    const buffer = await file.toBuffer();
    writeStream.write(buffer);
    writeStream.end();

    // Save media record
    const media = await prisma.media.create({
      data: {
        url: `/uploads/${subDir}/${filename}`,
        type: isImage ? 'IMAGE' : 'VIDEO',
        mimeType,
        sizeBytes: buffer.length,
      },
    });

    return reply.status(201).send({
      success: true,
      data: media,
    });
  });

  // ─── Serve Uploads (development only) ──────────────────

  app.get('/uploads/*', async (request, reply) => {
    const filePath = path.join(UPLOAD_DIR, (request.params as any)['*']);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ success: false, message: 'File not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    };

    reply.header('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
    return reply.send(fs.createReadStream(filePath));
  });
}
