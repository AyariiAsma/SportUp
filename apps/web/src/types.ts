export type SportType = 'running' | 'cycling' | 'football' | 'yoga' | 'hiking' | 'fitness' | 'swimming' | 'basketball' | 'tennis';

export type RunningLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export type EventDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp?: number;
  elevation?: number;
}

export interface SplitLap {
  km: number;
  timeSec: number;
  paceMinKm: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  region: string; // Governorate / City
  runningLevel: RunningLevel;
  rankScore: number;
  totalDistanceKm: number;
  totalRuns: number;
  eventsJoined: number;
  preferredSports: SportType[];
  isOnline?: boolean;
}

export interface SportEvent {
  id: string;
  title: string;
  description: string;
  sport: SportType;
  difficulty: EventDifficulty;
  startAt: string;
  locationName: string;
  region: string;
  lat: number;
  lng: number;
  distanceKm: number;
  maxParticipants: number;
  organizer: {
    id: string;
    name: string;
    avatar: string;
    level: RunningLevel;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  coverImage?: string;
  status: 'UPCOMING' | 'STARTED' | 'COMPLETED';
}

export interface RunSession {
  id: string;
  userId: string;
  title: string;
  sport: SportType;
  distanceKm: number;
  durationSec: number;
  avgPace: string;
  currentPace?: string;
  calories: number;
  createdAt: string;
  splits: SplitLap[];
  route: GeoPoint[];
  eventId?: string;
  eventTitle?: string;
}

export interface PostComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  likesCount: number;
  likedByMe?: boolean;
}

export interface SocialPost {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    level: RunningLevel;
  };
  content: string;
  sport: SportType;
  imageUrl?: string;
  runSummary?: {
    distanceKm: number;
    durationFormatted: string;
    avgPace: string;
  };
  likesCount: number;
  likedByMe: boolean;
  comments: PostComment[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'EVENT_INVITE' | 'NEW_FOLLOWER_EVENT' | 'RANK_UP' | 'POST_LIKED' | 'EVENT_REMINDER';
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  eventId?: string;
}
