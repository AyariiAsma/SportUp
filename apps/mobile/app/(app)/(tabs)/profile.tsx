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

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '🌱 Beginner Runner',
  INTERMEDIATE: '🏃 Intermediate Runner',
  ADVANCED: '🔥 Advanced Runner',
};

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
  const runningLevelLabel = displayProfile?.runningLevel
    ? LEVEL_LABELS[displayProfile.runningLevel] || displayProfile.runningLevel
    : '🌱 Beginner Runner';

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
          <TouchableOpacity onPress={() => router.push('/(app)/profile/edit')}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {displayProfile?.avatar ? (
              <Image key={displayProfile.avatar} source={{ uri: resolveMediaUrl(displayProfile.avatar) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{displayProfile?.name?.charAt(0) || 'R'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{displayProfile?.name}</Text>
          <Text style={styles.username}>@{displayProfile?.username}</Text>
          <Text style={styles.runningLevel}>{runningLevelLabel}</Text>

          {/* ── Rank score ── */}
          <View style={styles.rankCard}>
            <Text style={styles.rankScore}>🏅 {rank.score} pts</Text>
            <Text style={styles.rankHint}>Earn 1 point per KM when an organizer confirms your presence at a run.</Text>
          </View>
          {Boolean(displayProfile?.region || displayProfile?.city || displayProfile?.locality) ? (
            <Text style={styles.city}>
              📍 {[displayProfile?.region, displayProfile?.city, displayProfile?.locality].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {Boolean(displayProfile?.bio) ? <Text style={styles.bio}>{displayProfile?.bio}</Text> : null}

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
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏃</Text>
            <Text style={styles.statValue}>{(profile as any)?.runsJoined ?? 0}</Text>
            <Text style={styles.statLabel}>Runs Joined</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={styles.statValue}>{(profile as any)?.runsOrganized ?? 0}</Text>
            <Text style={styles.statLabel}>Runs Organized</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={styles.statValue}>{(profile as any)?.runsAttended ?? 0}</Text>
            <Text style={styles.statLabel}>Presence Confirmed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📏</Text>
            <Text style={styles.statValue}>{Math.round((profile as any)?.totalDistanceKm ?? 0)}</Text>
            <Text style={styles.statLabel}>KM Total</Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <Button
            title="🏆 View Leaderboard"
            variant="secondary"
            onPress={() => router.push('/(app)/(tabs)/leaderboard')}
            style={styles.actionBtn}
          />
          <Button
            title="My Runs"
            variant="secondary"
            onPress={() => router.push('/(app)/(tabs)/events')}
            style={styles.actionBtn}
          />
          <Button
            title="Log Out"
            variant="outline"
            onPress={() => authService.logout()}
            style={styles.actionBtn}
          />
        </View>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isListLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.modalLoading} />
            ) : modalData.length === 0 ? (
              <View style={styles.emptyContainer}>
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
  editBtn: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.md,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.border.radius.lg,
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 36,
    color: theme.colors.text,
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
    marginBottom: theme.spacing.xs,
  },
  runningLevel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    marginBottom: theme.spacing.xs,
  },
  rankCard: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  rankScore: {
    fontSize: theme.typography.size.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  rankHint: {
    marginTop: 6,
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
  city: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  bio: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
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
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
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
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    marginBottom: 40,
  },
  actionBtn: {
    width: '100%',
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
  closeBtnText: {
    fontSize: 18,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.bold,
  },
  modalLoading: {
    marginTop: 40,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
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
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  userAvatarLetter: {
    fontSize: 18,
    color: theme.colors.text,
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
