import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { SportEvent } from '@sportup/shared';
import { theme } from '../../theme';
import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { useLocationStore } from '../../stores/location.store';
import { getDistanceKm } from '../../utils/distance';
import { Ionicons } from '@expo/vector-icons';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: 'Upcoming', color: theme.colors.secondary },
  STARTED: { label: '🔴 Live Now', color: '#FF4444' },
  COMPLETED: { label: 'Completed', color: theme.colors.textMuted },
  CANCELLED: { label: 'Cancelled', color: theme.colors.error },
  PUBLISHED: { label: 'Open', color: theme.colors.secondary },
  DRAFT: { label: 'Draft', color: theme.colors.textMuted },
};

const DIFFICULTY_CONFIG: Record<string, { color: string; label: string }> = {
  BEGINNER: { color: '#4CAF50', label: 'Beginner' },
  INTERMEDIATE: { color: '#FF9800', label: 'Intermediate' },
  ADVANCED: { color: '#F44336', label: 'Advanced' },
  ELITE: { color: '#9C27B0', label: 'Elite' },
};

// Map sport names to theme sport colors
const SPORT_ACCENT: Record<string, string> = {
  Running: theme.colors.sport.running,
  Walking: theme.colors.sport.walking,
  Cycling: theme.colors.sport.cycling,
  Hiking: theme.colors.sport.hiking,
  Football: theme.colors.sport.football,
  Basketball: theme.colors.sport.basketball,
  Fitness: theme.colors.sport.fitness,
  Yoga: theme.colors.sport.yoga,
  Swimming: theme.colors.sport.swimming,
  Tennis: theme.colors.sport.tennis,
};

interface EventCardProps {
  event: SportEvent;
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const { latitude, longitude } = useLocationStore();

  const formattedDate = format(new Date(event.startAt), 'EEE, MMM d • h:mm a');

  const distanceFromUser =
    latitude && longitude && event.lat && event.lng
      ? getDistanceKm(latitude, longitude, event.lat, event.lng)
      : null;

  const statusConfig = STATUS_CONFIG[event.status] || STATUS_CONFIG.PUBLISHED;
  const difficultyConfig = event.difficulty
    ? DIFFICULTY_CONFIG[event.difficulty] || { color: '#4CAF50', label: event.difficulty }
    : null;

  const spotsLeft = event.maxParticipants
    ? event.maxParticipants - event.participantCount
    : null;

  // Sport-specific left accent color
  const accentColor =
    SPORT_ACCENT[event.sport?.name] || theme.colors.primary;

  // Countdown for upcoming events
  const startDate = new Date(event.startAt);
  const countdownText =
    event.status === 'UPCOMING' && isFuture(startDate)
      ? formatDistanceToNow(startDate, { addSuffix: true })
      : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/event/${event.id}`)}
      activeOpacity={0.8}
    >
      {/* Sport-color left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Joined top-right badge */}
      {event.isJoined && (
        <View style={styles.joinedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
          <Text style={styles.joinedBadgeText}>Joined</Text>
        </View>
      )}

      <View style={styles.cardInner}>
        {/* ── Top row: sport + status ── */}
        <View style={styles.topRow}>
          <View style={[styles.sportBadge, { backgroundColor: accentColor + '18' }]}>
            <Text style={[styles.sportText, { color: accentColor }]}>
              {event.sport.name.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.status, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* ── Title ── */}
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        {/* ── Running meta row ── */}
        <View style={styles.metaRow}>
          {event.distanceKm != null && (
            <View style={styles.metaChip}>
              <Ionicons name="footsteps-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={styles.metaChipText}>{event.distanceKm} KM</Text>
            </View>
          )}
          {difficultyConfig && (
            <View style={[styles.metaChip, { borderColor: difficultyConfig.color + '60' }]}>
              <Text style={[styles.metaChipText, { color: difficultyConfig.color }]}>
                {difficultyConfig.label}
              </Text>
            </View>
          )}
          {distanceFromUser !== null && (
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={11} color={theme.colors.textSecondary} />
              <Text style={styles.metaChipText}>{distanceFromUser} km away</Text>
            </View>
          )}
          {countdownText && (
            <View style={[styles.metaChip, styles.countdownChip]}>
              <Ionicons name="time-outline" size={11} color={accentColor} />
              <Text style={[styles.metaChipText, { color: accentColor }]}>{countdownText}</Text>
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
            <View>
              <Text style={styles.date}>{formattedDate}</Text>
              {event.city && <Text style={styles.location}>{event.city}</Text>}
            </View>
          </View>
          <View style={styles.participants}>
            <View style={styles.participantsRow}>
              <Ionicons name="people-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.participantsCount}>
                {event.participantCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
              </Text>
            </View>
            {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
              <Text style={styles.spotsLeft}>{spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left!</Text>
            )}
            {spotsLeft === 0 && <Text style={styles.full}>Full</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: theme.border.radius.lg,
    borderBottomLeftRadius: theme.border.radius.lg,
  },
  cardInner: {
    flex: 1,
    padding: theme.spacing.md,
  },
  joinedBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46,204,113,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.border.radius.round,
    zIndex: 1,
  },
  joinedBadgeText: {
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    paddingRight: 56, // space for joined badge
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.border.radius.sm,
  },
  sportText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.xs,
    letterSpacing: 0.8,
  },
  status: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.xs,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  countdownChip: {
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  metaChipText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  date: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  location: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.xs,
    marginTop: 2,
  },
  participants: {
    alignItems: 'flex-end',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsCount: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  spotsLeft: {
    color: '#FF9800',
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.xs,
    marginTop: 2,
  },
  full: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.xs,
    marginTop: 2,
  },
});
