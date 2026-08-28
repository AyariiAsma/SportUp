import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { SportEvent } from '@sportup/shared';
import { theme } from '../../theme';
import { format } from 'date-fns';
import { useLocationStore } from '../../stores/location.store';
import { getDistanceKm } from '../../utils/distance';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: 'Upcoming', color: theme.colors.secondary },
  STARTED: { label: '🔴 Live Now', color: '#FF4444' },
  COMPLETED: { label: 'Completed', color: theme.colors.textMuted },
  CANCELLED: { label: 'Cancelled', color: theme.colors.error },
  PUBLISHED: { label: 'Open', color: theme.colors.secondary },
  DRAFT: { label: 'Draft', color: theme.colors.textMuted },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#4CAF50',
  INTERMEDIATE: '#FF9800',
  ADVANCED: '#F44336',
  ELITE: '#9C27B0',
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
  const difficultyColor = event.difficulty ? DIFFICULTY_COLOR[event.difficulty] : DIFFICULTY_COLOR.BEGINNER;

  const spotsLeft = event.maxParticipants
    ? event.maxParticipants - event.participantCount
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/event/${event.id}`)}
      activeOpacity={0.8}
    >
      {/* ── Top row: sport + status ── */}
      <View style={styles.topRow}>
        <View style={styles.sportBadge}>
          <Text style={styles.sportText}>{event.sport.name.toUpperCase()}</Text>
        </View>
        <Text style={[styles.status, { color: statusConfig.color }]}>{statusConfig.label}</Text>
      </View>

      {/* ── Title ── */}
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

      {/* ── Running meta row ── */}
      <View style={styles.metaRow}>
        {event.distanceKm != null && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>🏃 {event.distanceKm} KM</Text>
          </View>
        )}
        {event.difficulty && (
          <View style={[styles.metaChip, { borderColor: difficultyColor }]}>
            <Text style={[styles.metaChipText, { color: difficultyColor }]}>
              {event.difficulty.charAt(0) + event.difficulty.slice(1).toLowerCase()}
            </Text>
          </View>
        )}
        {distanceFromUser !== null && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>📍 {distanceFromUser} km away</Text>
          </View>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.date}>{formattedDate}</Text>
          {event.city && <Text style={styles.location}>{event.city}</Text>}
        </View>
        <View style={styles.participants}>
          <Text style={styles.participantsCount}>
            👥 {event.participantCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
          </Text>
          {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
            <Text style={styles.spotsLeft}>{spotsLeft} left!</Text>
          )}
          {spotsLeft === 0 && <Text style={styles.full}>Full</Text>}
        </View>
      </View>

      {/* ── "Joined" indicator ── */}
      {event.isJoined && (
        <View style={styles.joinedBanner}>
          <Text style={styles.joinedText}>✓ You're running this!</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sportBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.border.radius.sm,
  },
  sportText: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
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
  joinedBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: theme.border.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  joinedText: {
    color: '#4CAF50',
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.xs,
  },
});
