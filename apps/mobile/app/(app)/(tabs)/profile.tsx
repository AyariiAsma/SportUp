import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/auth.store';
import { authService } from '../../../src/services/auth.service';
import { userSearchService } from '../../../src/services/user.service';
import { api } from '../../../src/services/api';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { resolveMediaUrl } from '../../../src/services/post.service';
import { useState } from 'react';
import type { UserProfile } from '@sportup/shared';
import type { ApiResponse } from '@sportup/shared';
import { Ionicons } from '@expo/vector-icons';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '🌱 Beginner',
  INTERMEDIATE: '🏃 Intermediate',
  ADVANCED: '🔥 Advanced',
};

const STAT_CONFIG = [
  { key: 'runsJoined', label: 'Runs Joined', icon: 'footsteps-outline' as const, color: theme.colors.secondary },
  { key: 'runsOrganized', label: 'Organized', icon: 'trophy-outline' as const, color: theme.colors.tertiary },
  { key: 'runsAttended', label: 'Confirmed', icon: 'checkmark-circle-outline' as const, color: theme.colors.success },
  { key: 'totalDistanceKm', label: 'KM Total', icon: 'map-outline' as const, color: theme.colors.primary, round: true },
];

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserProfile>>('/users/me');
      return res.data.data;
    },
  });

  const { data: followersList = [], isLoading: followersLoading } = useQuery({
    queryKey: ['followers', user?.id],
    queryFn: () => (user?.id ? userSearchService.getFollowers(user.id) : []),
    enabled: modalType === 'followers' && !!user?.id,
  });

  const { data: followingList = [], isLoading: followingLoading } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => (user?.id ? userSearchService.getFollowing(user.id) : []),
    enabled: modalType === 'following' && !!user?.id,
  });

  const displayProfile = profile || user;
  const rank = (profile as any)?.rank ?? {
    score: (displayProfile as any)?.rankScore ?? 0,
    nextLevel: null,
    pointsToNextLevel: 0,
    progress: 0,
  };
  const rankProgress = Math.min(Math.max(rank.progress ?? 0, 0), 1);
  const runningLevelLabel = displayProfile?.runningLevel
    ? LEVEL_LABELS[displayProfile.runningLevel] || displayProfile.runningLevel
    : '🌱 Beginner';

  const modalData = modalType === 'followers' ? followersList : followingList;
  const isListLoading = modalType === 'followers' ? followersLoading : followingLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.editBtnContainer}
            onPress={() => router.push('/(app)/profile/edit')}
          >
            <Ionicons name="pencil-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          {/* Avatar with gradient ring */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {displayProfile?.avatar ? (
                <Image
                  key={displayProfile.avatar}
                  source={{ uri: resolveMediaUrl(displayProfile.avatar) }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {displayProfile?.name?.charAt(0) || 'R'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.name}>{displayProfile?.name}</Text>
          <Text style={styles.username}>@{displayProfile?.username}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.runningLevel}>{runningLevelLabel}</Text>
          </View>

          {Boolean(displayProfile?.region || displayProfile?.city || displayProfile?.locality) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.city}>
                {[displayProfile?.region, displayProfile?.city, displayProfile?.locality].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {Boolean(displayProfile?.bio) && (
            <Text style={styles.bio}>{displayProfile?.bio}</Text>
          )}

          {/* ── Rank score with progress bar ── */}
          <View style={styles.rankCard}>
            <View style={styles.rankHeader}>
              <View style={styles.rankScoreRow}>
                <Ionicons name="medal-outline" size={18} color={theme.colors.tertiary} />
                <Text style={styles.rankScore}>{rank.score} pts</Text>
              </View>
              {rank.nextLevel && (
                <Text style={styles.rankNext}>→ {rank.pointsToNextLevel} pts to next level</Text>
              )}
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${rankProgress * 100}%` }]} />
            </View>
            <Text style={styles.rankHint}>1 point per KM when organizer confirms your presence</Text>
          </View>

          {/* ── Social counts ── */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => setModalType('followers')}
              activeOpacity={0.7}
            >
              <Text style={styles.socialCount}>{(profile as any)?.followersCount ?? 0}</Text>
              <Text style={styles.socialLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.socialDivider} />
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => setModalType('following')}
              activeOpacity={0.7}
            >
              <Text style={styles.socialCount}>{(profile as any)?.followingCount ?? 0}</Text>
              <Text style={styles.socialLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Running Stats ── */}
        <View style={styles.statsGrid}>
          {STAT_CONFIG.map((stat) => (
            <View key={stat.key} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '1A' }]}>
                <Ionicons name={stat.icon} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>
                {stat.round
                  ? Math.round((profile as any)?.[stat.key] ?? 0)
                  : ((profile as any)?.[stat.key] ?? 0)}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionRowBtn}
            onPress={() => router.push('/(app)/(tabs)/leaderboard')}
            activeOpacity={0.85}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(254,215,102,0.15)' }]}>
                <Ionicons name="trophy-outline" size={20} color={theme.colors.tertiary} />
              </View>
              <Text style={styles.actionRowText}>View Leaderboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRowBtn}
            onPress={() => router.push('/(app)/(tabs)/events')}
            activeOpacity={0.85}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(42,183,202,0.15)' }]}>
                <Ionicons name="footsteps-outline" size={20} color={theme.colors.secondary} />
              </View>
              <Text style={styles.actionRowText}>My Runs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRowBtn, styles.logoutBtn]}
            onPress={() => authService.logout()}
            activeOpacity={0.85}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(231,76,60,0.12)' }]}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              </View>
              <Text style={[styles.actionRowText, { color: theme.colors.error }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Followers / Following Modal ── */}
      <Modal
        visible={modalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {isListLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.modalLoading} />
            ) : modalData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={modalType === 'followers' ? 'people-outline' : 'person-add-outline'}
                  size={40}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  {modalType === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={modalData}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listPadding}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userListItem}
                    onPress={() => {
                      setModalType(null);
                      router.push(`/(app)/user/${item.id}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: resolveMediaUrl(item.avatar) }} style={styles.userAvatarImg} />
                    ) : (
                      <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarLetter}>{item.name?.charAt(0) || 'U'}</Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userHandle}>@{item.username}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  editBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.border.radius.round,
  },
  editBtn: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.sm,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.border.radius.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.primary + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 36,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
  name: {
    fontSize: theme.typography.size.xl,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 4,
  },
  username: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    marginBottom: theme.spacing.sm,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.border.radius.round,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  runningLevel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
  city: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
  },
  bio: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  rankCard: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankScore: {
    fontSize: theme.typography.size.lg,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  rankNext: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
    minWidth: 6,
  },
  rankHint: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 16,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    width: '100%',
    justifyContent: 'center',
  },
  socialItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  socialCount: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  socialLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: 2,
  },
  socialDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
    marginBottom: 40,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.md,
  },
  logoutBtn: {
    borderColor: 'rgba(231,76,60,0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.border.radius.xl,
    borderTopRightRadius: theme.border.radius.xl,
    maxHeight: '80%',
    minHeight: 300,
    padding: theme.spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  modalLoading: {
    marginTop: 40,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  listPadding: {
    paddingVertical: theme.spacing.sm,
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: theme.spacing.md,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  userAvatarLetter: {
    fontSize: 18,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  userHandle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
  },
});
