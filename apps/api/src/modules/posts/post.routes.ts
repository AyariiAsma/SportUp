import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/client';
import { createPostSchema, updatePostSchema, createCommentSchema } from '@sportup/shared';

export async function postRoutes(app: FastifyInstance) {
  // ─── Feed ──────────────────────────────────────────────

  app.get('/', async (request, reply) => {
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let currentUserId: string | null = null;
    try {
      await request.jwtVerify();
      currentUserId = (request.user as { id: string }).id;
    } catch {
      // Not authenticated
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { isPublic: true },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          media: true,
          _count: { select: { likes: true, comments: true } },
          tags: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
          },
        },
      }),
      prisma.post.count({ where: { isPublic: true } }),
    ]);

    // Check if current user liked each post
    let likedPostIds: Set<string> = new Set();
    if (currentUserId) {
      const likes = await prisma.like.findMany({
        where: {
          userId: currentUserId,
          postId: { in: posts.map((p) => p.id) },
        },
        select: { postId: true },
      });
      likedPostIds = new Set(likes.map((l) => l.postId).filter(Boolean) as string[]);
    }

    return reply.send({
      success: true,
      data: posts.map((post) => ({
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: likedPostIds.has(post.id),
        _count: undefined,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  // ─── Create Post ───────────────────────────────────────

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: authorId } = request.user as { id: string };
    const body = createPostSchema.parse(request.body);

    if (!body.content && (!body.mediaIds || body.mediaIds.length === 0)) {
      return reply.status(400).send({
        success: false,
        message: 'Post must have content or media',
      });
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        content: body.content,
        category: body.category,
        tags: body.tags && body.tags.length > 0 ? {
          create: body.tags.map(userId => ({ userId }))
        } : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        media: true,
        tags: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    // Link media to post if provided
    if (body.mediaIds && body.mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: { id: { in: body.mediaIds } },
        data: { postId: post.id },
      });
    }

    return reply.status(201).send({ success: true, data: post });
  });

  // ─── Get Post ──────────────────────────────────────────

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        media: true,
        tags: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      return reply.status(404).send({ success: false, message: 'Post not found' });
    }

    return reply.send({
      success: true,
      data: {
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        _count: undefined,
      },
    });
  });

  // ─── Delete Post ───────────────────────────────────────

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ success: false, message: 'Post not found' });
    }
    if (post.authorId !== userId) {
      return reply.status(403).send({ success: false, message: 'Not authorized' });
    }

    await prisma.post.delete({ where: { id } });
    return reply.send({ success: true, message: 'Post deleted' });
  });

  // ─── Edit Post ─────────────────────────────────────────

  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };
    const body = updatePostSchema.parse(request.body);

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return reply.status(404).send({ success: false, message: 'Post not found' });
    }
    if (post.authorId !== userId) {
      return reply.status(403).send({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        content: body.content !== undefined ? body.content : undefined,
        category: body.category !== undefined ? body.category : undefined,
      },
    });

    if (body.mediaIds !== undefined) {
      await prisma.media.deleteMany({ where: { postId: id } });
      if (body.mediaIds.length > 0) {
        await prisma.media.updateMany({
          where: { id: { in: body.mediaIds } },
          data: { postId: id },
        });
      }
    }

    return reply.send({ success: true, data: updated });
  });

  // ─── Like Post ─────────────────────────────────────────

  app.post('/:id/like', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: postId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    const liker = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    try {
      await prisma.like.create({
        data: { userId, postId },
      });

      // Notify post author
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'POST_LIKED',
            title: '❤️ Post Liked',
            body: `${liker?.name || 'Someone'} liked your post!`,
            data: { postId, userId },
          },
        }).catch(() => {});
      }
    } catch {
      // Already liked
    }

    return reply.send({ success: true, message: 'Liked' });
  });

  // ─── Unlike Post ───────────────────────────────────────

  app.delete('/:id/like', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: postId } = request.params as { id: string };
    const { id: userId } = request.user as { id: string };

    await prisma.like.deleteMany({
      where: { userId, postId },
    });

    return reply.send({ success: true, message: 'Unliked' });
  });

  // ─── Get Comments ──────────────────────────────────────

  app.get('/:id/comments', async (request, reply) => {
    const { id: postId } = request.params as { id: string };
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, parentCommentId: null },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          replies: {
            include: {
              author: {
                select: { id: true, name: true, username: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.comment.count({ where: { postId, parentCommentId: null } }),
    ]);

    return reply.send({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  // ─── Add Comment ───────────────────────────────────────

  app.post('/:id/comments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: postId } = request.params as { id: string };
    const { id: authorId } = request.user as { id: string };
    const body = createCommentSchema.parse(request.body);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return reply.status(404).send({ success: false, message: 'Post not found' });
    }

    let targetParentId = body.parentCommentId;
    if (targetParentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: targetParentId } });
      if (parentComment && parentComment.parentCommentId) {
        targetParentId = parentComment.parentCommentId;
      }
    }

    const comment = await prisma.comment.create({
      data: { 
        authorId, 
        postId, 
        content: body.content,
        parentCommentId: targetParentId,
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        replies: true,
      },
    });

    // Notify post author
    if (post.authorId !== authorId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'POST_COMMENTED',
          title: '💬 New Comment',
          body: `${comment.author.name} commented on your post`,
          data: { postId, commentId: comment.id, userId: authorId },
        },
      }).catch(() => {});
    }

    // Notify @mentioned users
    const mentionMatches = body.content.match(/@(\w+)/g);
    if (mentionMatches && mentionMatches.length > 0) {
      const usernames = mentionMatches.map((m: string) => m.slice(1));
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: usernames } },
        select: { id: true, username: true },
      });

      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id === authorId || mentionedUser.id === post.authorId) continue;
        await prisma.notification.create({
          data: {
            userId: mentionedUser.id,
            type: 'COMMENT_MENTION',
            title: '💬 You were mentioned',
            body: `${comment.author.name} mentioned you in a comment`,
            data: { postId, commentId: comment.id },
          },
        }).catch(() => {});
      }
    }

    return reply.status(201).send({ success: true, data: comment });
  });

  // ─── Edit Comment ──────────────────────────────────────

  app.put('/:id/comments/:commentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: postId, commentId } = request.params as { id: string; commentId: string };
    const { id: userId } = request.user as { id: string };
    const body = createCommentSchema.parse(request.body);

    const comment = await prisma.comment.findUnique({ where: { id: commentId, postId } });
    if (!comment) return reply.status(404).send({ success: false, message: 'Comment not found' });
    if (comment.authorId !== userId) return reply.status(403).send({ success: false, message: 'Not authorized' });

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: body.content },
    });

    return reply.send({ success: true, data: updated });
  });

  // ─── Delete Comment ────────────────────────────────────

  app.delete('/:id/comments/:commentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: postId, commentId } = request.params as { id: string; commentId: string };
    const { id: userId } = request.user as { id: string };

    const comment = await prisma.comment.findUnique({ where: { id: commentId, postId } });
    if (!comment) return reply.status(404).send({ success: false, message: 'Comment not found' });
    
    const post = await prisma.post.findUnique({ where: { id: postId } });
    
    // Author of comment or author of post can delete
    if (comment.authorId !== userId && post?.authorId !== userId) {
      return reply.status(403).send({ success: false, message: 'Not authorized' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return reply.send({ success: true, message: 'Comment deleted' });
  });
}
