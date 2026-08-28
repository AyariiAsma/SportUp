import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SportEvent } from '@sportup/shared';
import { theme } from '../../theme';
import { format } from 'date-fns';

interface EventFlyerProps {
  event: SportEvent;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#2ECC71',
  INTERMEDIATE: '#F1C40F',
  ADVANCED: '#E67E22',
  ELITE: '#E74C3C',
};

export function EventFlyer({ event }: EventFlyerProps) {
  const formattedDate = format(new Date(event.startAt), 'EEEE, MMMM d, yyyy');
  const formattedTime = format(new Date(event.startAt), 'h:mm a');
  const difficultyColor = event.difficulty ? DIFFICULTY_COLOR[event.difficulty] : theme.colors.primary;

  return (
    <View style={styles.flyerContainer}>
      {/* Background Graphic Accents */}
      <View style={[styles.circleAccent, styles.circleAccent1]} />
      <View style={[styles.circleAccent, styles.circleAccent2]} />

      {/* Header / Brand */}
      <View style={styles.header}>
        <Text style={styles.brandText}>SportUp</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>DISCOVER • JOIN • SHARE</Text>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        {/* Sport and Difficulty Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeText}>{event.sport.name.toUpperCase()}</Text>
          </View>
          {event.difficulty && (
            <View style={[styles.badge, { backgroundColor: 'transparent', borderColor: difficultyColor, borderWidth: 1.5 }]}>
              <Text style={[styles.badgeText, { color: difficultyColor }]}>
                {event.difficulty}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>
          {event.title}
        </Text>

        {/* Event Stats */}
        <View style={styles.statsGrid}>
          {event.distanceKm != null && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>🏃 {event.distanceKm} KM</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DATE</Text>
            <Text style={styles.statValue}>📅 {formattedDate}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.statValue}>⏰ {formattedTime}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SPOTS</Text>
            <Text style={styles.statValue}>
              👥 {event.participantCount}
              {event.maxParticipants ? ` / ${event.maxParticipants}` : ' Joined'}
            </Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.locationSection}>
          <Text style={styles.sectionLabel}>📍 LOCATION</Text>
          {event.locationName && (
            <Text style={styles.locationTitle}>{event.locationName}</Text>
          )}
          {(event.locality || event.city || event.region || event.country) && (
            <Text style={styles.locationSubtitle}>
              {[event.locality, event.city, event.region, event.country].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>

        {/* Organizer Section */}
        <View style={styles.organizerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {event.organizer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.organizerLabel}>Organized by</Text>
            <Text style={styles.organizerName}>{event.organizer.name}</Text>
          </View>
        </View>
      </View>

      {/* Footer Call To Action */}
      <View style={styles.footer}>
        <Text style={styles.ctaText}>Join the activity on SportUp App</Text>
        <Text style={styles.website}>www.sportup.app</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flyerContainer: {
    width: 600,
    height: 800,
    backgroundColor: '#0A0E1A', // Deep space-navy background
    padding: 32,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  circleAccent: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  circleAccent1: {
    width: 300,
    height: 300,
    backgroundColor: theme.colors.primary,
    top: -50,
    right: -50,
  },
  circleAccent2: {
    width: 400,
    height: 400,
    backgroundColor: theme.colors.secondary,
    bottom: -100,
    left: -100,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: theme.typography.fontFamily.heading,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 2,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: theme.colors.primary,
    marginVertical: 8,
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 3,
  },
  card: {
    backgroundColor: 'rgba(25, 34, 56, 0.85)',
    borderRadius: theme.border.radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: theme.typography.weight.bold,
    lineHeight: 32,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    columnGap: 24,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 20,
  },
  statItem: {
    width: '45%',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: theme.typography.weight.medium,
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: theme.typography.weight.semiBold,
    marginBottom: 2,
  },
  locationSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: theme.typography.weight.bold,
  },
  organizerLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
    letterSpacing: 1,
  },
  organizerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: theme.typography.weight.medium,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: theme.typography.weight.medium,
    marginBottom: 4,
  },
  website: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: theme.typography.weight.bold,
  },
});
