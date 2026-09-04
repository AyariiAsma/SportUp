import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/auth.store';
import { userSearchService } from '../../../src/services/user.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import type { UserProfile } from '@sportup/shared';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '🌱 Beginner Runner',
  INTERMEDIATE: '🏃 Intermediate Runner',
  ADVANCED: '🔥 Advanced Runner',
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isOwnProfile = currentUser?.id === id;

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile', id],
    queryFn: () => userSearchService.getUserProfile(id!),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: () => userSearchService.followUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', id] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => userSearchService.unfollowUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', id] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.id] });
    },
  });

  const handleToggleFollow = () => {
    if (profile?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rank = (profile as any)?.rank ?? {
    score: (profile as any)?.rankScore ?? 0,
    nextLevel: null,
    pointsToNextLevel: 0,
    progress: 0,
  };
  const runningLevelLabel = profile.runningLevel
    ? LEVEL_LABELS[profile.runningLevel] || profile.runningLevel
    : '🌱 Beginner Runner';

  const isFollowLoading = followMutation.isPending || unfollowMutation.isPending;

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Runner Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{profile.name?.charAt(0) || 'R'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.runningLevel}>{runningLevelLabel}</Text>

          {/* ── Follow / Edit Action Button ── */}
          {isOwnProfile ? (
            <Button
              title="Edit Profile"
              variant="outline"
              onPress={() => router.push('/(app)/profile/edit')}
              style={styles.followBtn}
            />
          ) : (
            <Button
              title={profile.isFollowing ? '✓ Following' : '+ Follow'}
              variant={profile.isFollowing ? 'outline' : 'primary'}
              onPress={handleToggleFollow}
              isLoading={isFollowLoading}
              style={styles.followBtn}
            />
          )}

          {/* ── Rank score ── */}
          <View style={styles.rankCard}>
            <Text style={styles.rankScore}>🏅 {rank.score} pts</Text>
          </View>

          {(profile.region || profile.city || profile.locality) && (
            <Text style={styles.city}>
              📍 {[profile.region, profile.city, profile.locality].filter(Boolean).join(', ')}
            </Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* ── Social counts ── */}
          <View style={styles.socialRow}>
            <View style={styles.socialItem}>
              <Text style={styles.socialCount}>{(profile as any)?.followersCount ?? 0}</Text>
              <Text style={styles.socialLabel}>Followers</Text>
            </View>
            <View style={styles.socialDivider} />
            <View style={styles.socialItem}>
              <Text style={styles.socialCount}>{(profile as any)?.followingCount ?? 0}</Text>
              <Text style={styles.socialLabel}>Following</Text>
            </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.size.lg,
    color: theme.colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backBtn: {
    paddingVertical: theme.spacing.xs,
  },
  backBtnText: {
    color: theme.colors.primary,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
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
    marginBottom: theme.spacing.md,
  },
  followBtn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  rankCard: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  rankScore: {
    fontSize: theme.typography.size.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
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
});
