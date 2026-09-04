import { FastifyInstance } from 'fastify';

export interface MotivationQuote {
  id: string;
  quote: string;
  author: string;
}

export const MOTIVATION_QUOTES: MotivationQuote[] = [
  {
    id: 'quote-1',
    quote: "The miracle isn't that I finished. The miracle is that I had the courage to start.",
    author: 'John Bingham',
  },
  {
    id: 'quote-2',
    quote: "Run when you can, walk if you have to, crawl if you must; just never give up.",
    author: 'Dean Karnazes',
  },
  {
    id: 'quote-3',
    quote: "Pain is inevitable. Suffering is optional.",
    author: 'Haruki Murakami',
  },
  {
    id: 'quote-4',
    quote: "It's very hard in the beginning, but if you keep going, you come out the other side.",
    author: 'Eliud Kipchoge',
  },
  {
    id: 'quote-5',
    quote: "Clear your mind of can't.",
    author: 'Samuel Johnson',
  },
  {
    id: 'quote-6',
    quote: "Running is real and relatively simple... but it isn't easy.",
    author: 'Mark Will-Weber',
  },
  {
    id: 'quote-7',
    quote: "No matter how slow you go, you are still lapping everybody on the couch.",
    author: 'Anonymous Runner',
  },
  {
    id: 'quote-8',
    quote: "The body achieves what the mind believes.",
    author: 'Napoleon Hill',
  },
  {
    id: 'quote-9',
    quote: "Running is about finding your inner peace, and so is a life well lived.",
    author: 'Bill Bowerman',
  },
  {
    id: 'quote-10',
    quote: "One run can change your day, many runs can change your life.",
    author: 'Runner Wisdom',
  },
  {
    id: 'quote-11',
    quote: "Fast runs heal the mind, slow runs heal the soul.",
    author: 'Ultra Marathoner',
  },
  {
    id: 'quote-12',
    quote: "Something happens to me when I run. It clears my mind and fills my heart.",
    author: 'Kathrine Switzer',
  },
  {
    id: 'quote-13',
    quote: "Don't dream of winning, train for it!",
    author: 'Mo Farah',
  },
  {
    id: 'quote-14',
    quote: "If you want to win something, run 100 meters. If you want to experience something, run a marathon.",
    author: 'Emil Zátopek',
  },
  {
    id: 'quote-15',
    quote: "A 12-minute mile is just as far as a 6-minute mile.",
    author: 'Running Proverb',
  },
];

// Stores user likes for quotes: quoteId -> Set of userIds
const quoteLikesMap = new Map<string, Set<string>>();

function getTodayQuote(): MotivationQuote {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = (now.getFullYear() + dayOfYear) % MOTIVATION_QUOTES.length;
  return MOTIVATION_QUOTES[index];
}

export async function motivationRoutes(app: FastifyInstance) {
  // GET /api/v1/motivation/today - Optional auth to check if current user liked it
  app.get('/today', async (request, reply) => {
    let currentUserId: string | null = null;
    try {
      await request.jwtVerify();
      const user = request.user as { id: string };
      currentUserId = user.id;
    } catch {
      // Unauthenticated
    }

    const todayQuote = getTodayQuote();
    const userLikesSet = quoteLikesMap.get(todayQuote.id) || new Set<string>();

    const likesCount = userLikesSet.size;
    const isLiked = currentUserId ? userLikesSet.has(currentUserId) : false;

    return reply.send({
      success: true,
      data: {
        id: todayQuote.id,
        quote: todayQuote.quote,
        author: todayQuote.author,
        likesCount,
        isLiked,
      },
    });
  });

  // POST /api/v1/motivation/today/like - Protected: toggle like
  app.post('/today/like', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const todayQuote = getTodayQuote();

    let userLikesSet = quoteLikesMap.get(todayQuote.id);
    if (!userLikesSet) {
      userLikesSet = new Set<string>();
      quoteLikesMap.set(todayQuote.id, userLikesSet);
    }

    let isLiked = false;
    if (userLikesSet.has(userId)) {
      userLikesSet.delete(userId);
      isLiked = false;
    } else {
      userLikesSet.add(userId);
      isLiked = true;
    }

    return reply.send({
      success: true,
      data: {
        id: todayQuote.id,
        isLiked,
        likesCount: userLikesSet.size,
      },
    });
  });
}
