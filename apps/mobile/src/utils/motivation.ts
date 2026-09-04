import { storage } from './storage';

export interface MotivationQuote {
  id: string;
  quote: string;
  author: string;
  baseLikes: number;
}

export const MOTIVATION_QUOTES: MotivationQuote[] = [
  {
    id: 'quote-1',
    quote: "The miracle isn't that I finished. The miracle is that I had the courage to start.",
    author: 'John Bingham',
    baseLikes: 142,
  },
  {
    id: 'quote-2',
    quote: "Run when you can, walk if you have to, crawl if you must; just never give up.",
    author: 'Dean Karnazes',
    baseLikes: 218,
  },
  {
    id: 'quote-3',
    quote: "Pain is inevitable. Suffering is optional.",
    author: 'Haruki Murakami',
    baseLikes: 305,
  },
  {
    id: 'quote-4',
    quote: "It's very hard in the beginning, but if you keep going, you come out the other side.",
    author: 'Eliud Kipchoge',
    baseLikes: 412,
  },
  {
    id: 'quote-5',
    quote: "Clear your mind of can't.",
    author: 'Samuel Johnson',
    baseLikes: 189,
  },
  {
    id: 'quote-6',
    quote: "Running is real and relatively simple... but it isn't easy.",
    author: 'Mark Will-Weber',
    baseLikes: 97,
  },
  {
    id: 'quote-7',
    quote: "No matter how slow you go, you are still lapping everybody on the couch.",
    author: 'Anonymous Runner',
    baseLikes: 531,
  },
  {
    id: 'quote-8',
    quote: "The body achieves what the mind believes.",
    author: 'Napoleon Hill',
    baseLikes: 274,
  },
  {
    id: 'quote-9',
    quote: "Running is about finding your inner peace, and so is a life well lived.",
    author: 'Bill Bowerman',
    baseLikes: 340,
  },
  {
    id: 'quote-10',
    quote: "One run can change your day, many runs can change your life.",
    author: 'Runner Wisdom',
    baseLikes: 489,
  },
  {
    id: 'quote-11',
    quote: "Fast runs heal the mind, slow runs heal the soul.",
    author: 'Ultra Marathoner',
    baseLikes: 265,
  },
  {
    id: 'quote-12',
    quote: "Something happens to me when I run. It clears my mind and fills my heart.",
    author: 'Kathrine Switzer',
    baseLikes: 198,
  },
  {
    id: 'quote-13',
    quote: "Don't dream of winning, train for it!",
    author: 'Mo Farah',
    baseLikes: 376,
  },
  {
    id: 'quote-14',
    quote: "If you want to win something, run 100 meters. If you want to experience something, run a marathon.",
    author: 'Emil Zátopek',
    baseLikes: 450,
  },
  {
    id: 'quote-15',
    quote: "A 12-minute mile is just as far as a 6-minute mile.",
    author: 'Running Proverb',
    baseLikes: 612,
  },
];

export function getTodayMotivationQuote(): MotivationQuote {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = (now.getFullYear() + dayOfYear) % MOTIVATION_QUOTES.length;
  return MOTIVATION_QUOTES[index];
}

const LIKED_MOTIVATIONS_KEY = 'sportup_liked_motivations';

export async function getLikedQuoteIds(): Promise<string[]> {
  try {
    const raw = await storage.getItem(LIKED_MOTIVATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleLikeQuoteStorage(quoteId: string): Promise<boolean> {
  try {
    const current = await getLikedQuoteIds();
    const exists = current.includes(quoteId);
    const updated = exists ? current.filter(id => id !== quoteId) : [...current, quoteId];
    await storage.setItem(LIKED_MOTIVATIONS_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}
