import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  ActivityIndicator, TouchableOpacity, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../../src/theme';
import { useLocationStore } from '../../../src/stores/location.store';
import { useAuthStore } from '../../../src/stores/auth.store';
import { eventService } from '../../../src/services/event.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { format } from 'date-fns';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { latitude, longitude, city } = useLocationStore();
  const { user } = useAuthStore();

  const { data: nearbyEvents = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['events', 'nearby', latitude, longitude],
    queryFn: () => eventService.getNearbyEvents(latitude || 0, longitude || 0, 30),
    enabled: !!latitude && !!longitude,
  });

  const popularEvents = [...nearbyEvents]
    .sort((a, b) => (b.participantCount ?? 0) - (a.participantCount ?? 0))
    .slice(0, 5);

  const upcomingEvents = nearbyEvents
    .filter((e) => e.status === 'UPCOMING')
    .slice(0, 5);

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.name}>{user?.name?.split(' ')[0] || 'Runner'}</Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => router.push('/(app)/notifications')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>📅 {today}</Text>
            <Text style={styles.locationText}>📍 {city || 'Near you'}</Text>
          </View>

          {/* ── Quick Actions ── */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.createRunBtn}
              onPress={() => router.push('/(app)/event/create')}
            >
              <Text style={styles.createRunIcon}>➕</Text>
              <Text style={styles.createRunText}>Create Run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/(app)/(tabs)/index')}
            >
              <Text style={styles.createRunIcon}>🗺️</Text>
              <Text style={styles.createRunText}>Explore Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.myRunsBtn}
              onPress={() => router.push('/(app)/(tabs)/events')}
            >
              <Text style={styles.createRunIcon}>🏃</Text>
              <Text style={styles.createRunText}>My Runs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Runs Near You ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏃 RUNS NEAR YOU</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/index')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {nearbyLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming runs nearby. Create one! 🔥</Text>
            </View>
          ) : (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </View>

        {/* ── Popular Runs ── */}
        {popularEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 POPULAR RUNS</Text>
            </View>
            {popularEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        )}

        {/* ── Running Motivation ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 DAILY MOTIVATION</Text>
          <View style={styles.motivationCard}>
            <Text style={styles.motivationQuote}>
              "The miracle isn't that I finished. The miracle is that I had the courage to start."
            </Text>
            <Text style={styles.motivationAuthor}>— John Bingham</Text>
          </View>
        </View>

        {/* ── Community CTA ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 RUNNING COMMUNITY</Text>
          <TouchableOpacity
            style={styles.communityCard}
            onPress={() => router.push('/(app)/(tabs)/feed')}
          >
            <Text style={styles.communityCardTitle}>Join the conversation</Text>
            <Text style={styles.communityCardSub}>Share your runs, tips, and achievements →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: theme.spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  name: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 20,
  },
  dateBadge: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  dateText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  locationText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  createRunBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  exploreBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  myRunsBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  createRunIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  createRunText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.semiBold,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: theme.spacing.md,
  },
  seeAll: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  motivationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  motivationQuote: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.md,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  motivationAuthor: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.sm,
  },
  communityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.lg,
  },
  communityCardTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    marginBottom: 4,
  },
  communityCardSub: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
  },
});
