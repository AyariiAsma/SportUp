import {
  EventStatus,
  Difficulty,
  RunningLevel,
  ParticipantStatus,
  PostCategory,
  MediaType,
  NotificationType,
  ReportTarget,
  ReportStatus,
  FoodCategory,
} from './enums';

// ─── Sport ───────────────────────────────────────────────

export interface Sport {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
}

// ─── User ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string | null;
  bio?: string | null;
  city?: string | null;
  region?: string | null;
  locality?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  runningLevel: RunningLevel;
  preferredSports: string[];
  totalDistanceKm: number;
  isVerified: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
}

export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  runsJoined: number;
  runsOrganized: number;
  runsCompleted: number;
  postsCount: number;
  isFollowing?: boolean;
}

// ─── Event ───────────────────────────────────────────────

export interface RoutePoint {
  lat: number;
  lng: number;
  order: number;
}

export interface EventRoute {
  id: string;
  eventId: string;
  points: RoutePoint[];
  distanceKm?: number | null;
  encodedPath?: string | null;
}

export interface SportEvent {
  id: string;
  title: string;
  description: string;
  sportId: string;
  sport: Sport;
  organizerId: string;
  organizer: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  status: EventStatus;
  difficulty?: Difficulty | null;
  maxParticipants?: number | null;
  distanceKm?: number | null; // first-class running distance in km
  startAt: string;
  endAt?: string | null;
  durationMin?: number | null;
  locationName?: string | null;
  city?: string | null;
  region?: string | null;
  locality?: string | null;
  country?: string | null;
  lat: number;
  lng: number;
  coverImage?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown>;
  likesCount?: number;
  isLiked?: boolean;
  participantCount: number;
  isJoined: boolean; // always present
  route?: EventRoute | null;
  distanceFromUser?: number | null; // calculated distance from user's location
  createdAt: string;
}

// EventDetail adds comments and participant list
export interface EventDetail extends SportEvent {
  participants: EventParticipant[];
  comments: EventComment[];
}

export interface EventParticipant {
  id: string;
  eventId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  joinedAt: string;
  status: ParticipantStatus;
}

export interface EventComment {
  id: string;
  eventId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  content: string;
  likesCount?: number;
  isLiked?: boolean;
  parentCommentId?: string | null;
  replies?: EventComment[];
  createdAt: string;
  updatedAt: string;
}

// ─── Post ────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;
  type: MediaType;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface Post {
  id: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  content?: string | null;
  category: PostCategory;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  content: string;
  createdAt: string;
}

// ─── Reel ────────────────────────────────────────────────

export interface Reel {
  id: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  likesCount: number;
  commentsCount: number;
  views: number;
  isLiked?: boolean;
  createdAt: string;
}

// ─── Notification ────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Food ────────────────────────────────────────────────

export interface FoodRecommendation {
  id: string;
  title: string;
  description: string;
  category: FoodCategory;
  imageUrl?: string | null;
  tags: string[];
  createdAt: string;
}

// ─── Report ──────────────────────────────────────────────

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

// ─── API Response Wrappers ───────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Location ────────────────────────────────────────────

export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
}
