import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { theme } from '../../../src/theme';
import { useLocationStore } from '../../../src/stores/location.store';
import { useAuthStore } from '../../../src/stores/auth.store';
import { eventService } from '../../../src/services/event.service';
import { userSearchService } from '../../../src/services/user.service';
import { OnlineIndicator } from '../../../src/components/common/OnlineIndicator';
import { resolveMediaUrl } from '../../../src/services/post.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { motivationService } from '../../../src/services/motivation.service';
import { Ionicons } from '@expo/vector-icons';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { latitude, longitude } = useLocationStore();
  const { user } = useAuthStore();

  const { data: motivation, refetch: refetchMotivation } = useQuery({
    queryKey: ['motivation', 'today'],
    queryFn: () => motivationService.getTodayMotivation(),
  });

  const toggleLikeMotivationMutation = useMutation({
    mutationFn: () => motivationService.toggleLikeTodayMotivation(),
    onSuccess: (data) => {
      queryClient.setQueryData(['motivation', 'today'], (old: any) => {
        if (!old) return old;
        return { ...old, isLiked: data.isLiked, likesCount: data.likesCount };
      });
    },
  });

  const { data: nearbyEvents = [], isLoading: nearbyLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events', 'nearby', latitude, longitude],
    queryFn: () => eventService.getNearbyEvents(latitude || 0, longitude || 0, 30),
    enabled: !!latitude && !!longitude,
  });

  const { data: allRunners = [], refetch: refetchUsers } = useQuery({
    queryKey: ['users', 'runners'],
    queryFn: () => userSearchService.getOnlineUsers(),
  });

  const handleRefresh = () => {
    refetchEvents();
    refetchUsers();
    refetchMotivation();
  };

  const popularEvents = [...nearbyEvents]
    .sort((a, b) => (b.participantCount ?? 0) - (a.participantCount ?? 0))
    .slice(0, 5);

  const upcomingEvents = nearbyEvents
    .filter((e) => e.status === 'UPCOMING')
    .slice(0, 5);

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={nearbyLoading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroBorder} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={styles.name}>{user?.name?.split(' ')[0] || 'Runner'}</Text>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => router.push('/(app)/notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.dateText}>{today}</Text>
          </View>

          {/* ── Quick Actions ── */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.createRunBtn}
              onPress={() => router.push('/(app)/event/create')}
              activeOpacity={0.85}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="add" size={20} color="#fff" />
              </View>
              <Text style={styles.createRunText}>Create Run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconSecondary]}>
                <Ionicons name="map-outline" size={18} color={theme.colors.secondary} />
              </View>
              <Text style={styles.quickBtnText}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(app)/(tabs)/events')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIcon, styles.quickActionIconTertiary]}>
                <Ionicons name="footsteps-outline" size={18} color={theme.colors.tertiary} />
              </View>
              <Text style={styles.quickBtnText}>My Runs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── All Runners ── */}
        {allRunners.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="people-outline" size={14} color={theme.colors.secondary} />
                <Text style={styles.sectionTitle}>RUNNERS</Text>
              </View>
              <Text style={styles.sectionCount}>{allRunners.length} members</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineUsersList}>
              {allRunners.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.onlineUserCard}
                  onPress={() => router.push(`/(app)/user/${u.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.onlineAvatarWrap}>
                    {u.avatar ? (
                      <Image source={{ uri: resolveMediaUrl(u.avatar) }} style={styles.onlineAvatar} />
                    ) : (
                      <View style={styles.onlineAvatarPlaceholder}>
                        <Text style={styles.onlineAvatarLetter}>{u.name.charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.onlineUserName} numberOfLines={1}>{u.name.split(' ')[0]}</Text>
                  <Text style={styles.onlineUserHandle} numberOfLines={1}>@{u.username}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Runs Near You ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.sectionTitle}>RUNS NEAR YOU</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {nearbyLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={32} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No upcoming runs nearby.</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push('/(app)/event/create')}
              >
                <Text style={styles.emptyActionText}>Create one 🔥</Text>
              </TouchableOpacity>
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
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flame-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>POPULAR RUNS</Text>
              </View>
            </View>
            {popularEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        )}

        {/* ── Running Motivation ── */}
        {motivation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bulb-outline" size={14} color={theme.colors.tertiary} />
                <Text style={styles.sectionTitle}>DAILY MOTIVATION</Text>
              </View>
            </View>
            <View style={styles.motivationCard}>
              <View style={styles.motivationAccent} />
              <Text style={styles.motivationQuote}>"{motivation.quote}"</Text>
              <View style={styles.motivationFooter}>
                <Text style={styles.motivationAuthor}>— {motivation.author}</Text>
                <TouchableOpacity
                  style={styles.motivationLikeBtn}
                  onPress={() => toggleLikeMotivationMutation.mutate()}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={motivation.isLiked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={motivation.isLiked ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={[styles.motivationLikeCount, motivation.isLiked && styles.motivationLikeCountActive]}>
                    {motivation.likesCount}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Community CTA ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={14} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>RUNNING COMMUNITY</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.communityCard}
            onPress={() => router.push('/(app)/(tabs)/feed')}
            activeOpacity={0.85}
          >
            <View style={styles.communityCardContent}>
              <View>
                <Text style={styles.communityCardTitle}>Join the conversation</Text>
                <Text style={styles.communityCardSub}>Share runs, tips & achievements</Text>
              </View>
              <View style={styles.communityArrow}>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.secondary} />
              </View>
            </View>
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  heroBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.primary,
    opacity: 0.7,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.lg,
  },
  dateText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  createRunBtn: {
    flex: 1.2,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIconSecondary: {
    backgroundColor: 'rgba(42,183,202,0.15)',
  },
  quickActionIconTertiary: {
    backgroundColor: 'rgba(254,215,102,0.15)',
  },
  createRunText: {
    fontSize: theme.typography.size.xs,
    color: '#fff',
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
  },
  quickBtnText: {
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
  liveBadge: {},
  liveText: {},
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  emptyAction: {
    marginTop: 4,
  },
  emptyActionText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
  },
  motivationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.xl,
    paddingLeft: theme.spacing.xl + 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  motivationAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.border.radius.lg,
    borderBottomLeftRadius: theme.border.radius.lg,
  },
  motivationQuote: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.md,
    lineHeight: 26,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  motivationAuthor: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.sm,
    flex: 1,
  },
  motivationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  motivationLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  motivationLikeCount: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.bold,
  },
  motivationLikeCountActive: {
    color: theme.colors.primary,
  },
  communityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(42,183,202,0.2)',
  },
  communityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  communityArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(42,183,202,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineUsersList: { gap: theme.spacing.md, paddingVertical: 4 },
  onlineUserCard: { alignItems: 'center', width: 68 },
  onlineAvatarWrap: { position: 'relative', width: 52, height: 52, marginBottom: 4 },
  onlineAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  onlineAvatarActive: {
    borderColor: theme.colors.success,
  },
  onlineAvatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  onlineAvatarLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 20 },
  onlineUserName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: 12, textAlign: 'center' },
  onlineUserHandle: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 10, textAlign: 'center' },
});
