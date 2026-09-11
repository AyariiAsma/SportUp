import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { rankService, LeaderboardEntry } from '../../../src/services/rank.service';
import { useAuthStore } from '../../../src/stores/auth.store';
import { resolveMediaUrl } from '../../../src/services/post.service';
import { theme } from '../../../src/theme';

// ─── Medal colours ────────────────────────────────────────────
const MEDAL: Record<number, { color: string; icon: string }> = {
  1: { color: '#FFD700', icon: '🥇' },
  2: { color: '#C0C0C0', icon: '🥈' },
  3: { color: '#CD7F32', icon: '🥉' },
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: '#4CAF50',
  INTERMEDIATE: '#FF9800',
  ADVANCED: '#F44336',
};

// ─── Podium card (top 3) ──────────────────────────────────────
function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const medal = MEDAL[position];
  const isFirst = position === 1;
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.podiumCard, isFirst && styles.podiumCardFirst]}
      onPress={() => router.push(`/(app)/user/${entry.id}` as any)}
      activeOpacity={0.85}
    >
      <Text style={styles.podiumIcon}>{medal.icon}</Text>
      <View style={[styles.podiumAvatar, { borderColor: medal.color }]}>
        {entry.avatar ? (
          <Image source={{ uri: resolveMediaUrl(entry.avatar) }} style={styles.podiumAvatarImg} />
        ) : (
          <View style={[styles.podiumAvatarFallback, { backgroundColor: medal.color + '33' }]}>
            <Text style={[styles.podiumAvatarLetter, { color: medal.color }]}>
              {entry.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.name}</Text>
      <Text style={[styles.podiumScore, { color: medal.color }]}>{entry.rankScore} pts</Text>
      <Text style={styles.podiumKm}>{entry.totalDistanceKm.toFixed(1)} km</Text>
    </TouchableOpacity>
  );
}

// ─── List row (rank 4+) ───────────────────────────────────────
function RankRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.row, isMe && styles.rowMe]}
        onPress={() => router.push(`/(app)/user/${entry.id}` as any)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Rank number */}
        <Text style={[styles.rowRank, isMe && styles.rowRankMe]}>{entry.rank}</Text>

        {/* Avatar */}
        <View style={styles.rowAvatarWrap}>
          {entry.avatar ? (
            <Image source={{ uri: resolveMediaUrl(entry.avatar) }} style={styles.rowAvatar} />
          ) : (
            <View style={styles.rowAvatarFallback}>
              <Text style={styles.rowAvatarLetter}>{entry.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Name + level */}
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
            {entry.name}
            {isMe ? ' (You)' : ''}
          </Text>
          <Text style={[styles.rowLevel, { color: LEVEL_COLOR[entry.runningLevel] ?? theme.colors.textMuted }]}>
            {LEVEL_LABEL[entry.runningLevel] ?? entry.runningLevel}
            {entry.city ? ` · ${entry.city}` : ''}
          </Text>
        </View>

        {/* Score + km */}
        <View style={styles.rowScoreWrap}>
          <Text style={[styles.rowScore, isMe && styles.rowScoreMe]}>{entry.rankScore}</Text>
          <Text style={styles.rowScoreUnit}>pts</Text>
          <Text style={styles.rowKm}>{entry.totalDistanceKm.toFixed(1)} km</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function LeaderboardScreen() {
  const { user } = useAuthStore();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => rankService.getLeaderboard(100, 0),
    staleTime: 30_000,
  });

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const entries = data?.data ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const renderItem = ({ item }: { item: LeaderboardEntry }) => (
    <RankRow entry={item} isMe={item.id === user?.id} />
  );

  const ListHeader = () => (
    <>
      {/* Header */}
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <Text style={styles.heroEmoji}>🏆</Text>
        <Text style={styles.heroTitle}>Leaderboard</Text>
        <Text style={styles.heroSub}>
          {data?.meta.total ?? 0} runners ranked by points earned
        </Text>
      </Animated.View>

      {/* Podium */}
      {top3.length >= 3 && (
        <View style={styles.podiumRow}>
          {/* 2nd place left */}
          <PodiumCard entry={top3[1]} position={2} />
          {/* 1st place centre (elevated) */}
          <PodiumCard entry={top3[0]} position={1} />
          {/* 3rd place right */}
          <PodiumCard entry={top3[2]} position={3} />
        </View>
      )}

      {rest.length > 0 && (
        <Text style={styles.sectionLabel}>Rankings</Text>
      )}
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading rankings…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏁</Text>
            <Text style={styles.emptyText}>No runners yet.</Text>
            <Text style={styles.emptyHint}>Join a run and get your presence confirmed to earn points!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  list: {
    paddingBottom: 40,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },

  // ── Podium ──
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: 8,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  podiumCardFirst: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    transform: [{ translateY: -12 }],
  },
  podiumIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
  },
  podiumAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarLetter: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bold,
  },
  podiumName: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 1,
  },
  podiumKm: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.border.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rowMe: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.primary + '60',
  },
  rowRank: {
    width: 28,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  rowRankMe: {
    color: theme.colors.primary,
  },
  rowAvatarWrap: {
    position: 'relative',
  },
  rowAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  rowAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarLetter: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowNameMe: {
    color: theme.colors.primary,
  },
  rowLevel: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.medium,
  },
  rowScoreWrap: {
    alignItems: 'flex-end',
  },
  rowScore: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  rowScoreMe: {
    color: theme.colors.primary,
  },
  rowScoreUnit: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  rowKm: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: 1,
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
