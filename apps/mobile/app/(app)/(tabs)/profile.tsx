import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/auth.store';
import { authService } from '../../../src/services/auth.service';
import { api } from '../../../src/services/api';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
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

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserProfile>>('/users/me');
      return res.data.data;
    },
  });

  const displayProfile = profile || user;
  const runningLevelLabel = displayProfile?.runningLevel
    ? LEVEL_LABELS[displayProfile.runningLevel] || displayProfile.runningLevel
    : '🌱 Beginner Runner';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
              <Image source={{ uri: displayProfile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{displayProfile?.name?.charAt(0) || 'R'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{displayProfile?.name}</Text>
          <Text style={styles.username}>@{displayProfile?.username}</Text>
          <Text style={styles.runningLevel}>{runningLevelLabel}</Text>
          {displayProfile?.city && <Text style={styles.city}>📍 {displayProfile.city}</Text>}
          {displayProfile?.bio && <Text style={styles.bio}>{displayProfile.bio}</Text>}

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
            <Text style={styles.statValue}>{(profile as any)?.runsCompleted ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
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
});
