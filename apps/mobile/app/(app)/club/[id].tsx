import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { clubService } from '../../../src/services/club.service';

type Tab = 'wall' | 'leaderboard' | 'about';

export default function ClubDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('wall');
  const [postContent, setPostContent] = useState('');

  const { data: club, isLoading, isError, refetch } = useQuery({
    queryKey: ['club-detail', id],
    queryFn: () => clubService.getClubDetails(id!),
    enabled: Boolean(id),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['club-posts', id],
    queryFn: () => clubService.getClubPosts(id!),
    enabled: Boolean(id) && activeTab === 'wall',
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['club-leaderboard', id],
    queryFn: () => clubService.getClubLeaderboard(id!),
    enabled: Boolean(id) && activeTab === 'leaderboard',
  });

  const { mutate: toggleJoin, isPending: joinPending } = useMutation({
    mutationFn: () => clubService.joinClub(id!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['club-detail', id] });
      qc.invalidateQueries({ queryKey: ['clubs-explore'] });
      Alert.alert('Notice', data.message);
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed'),
  });

  const { mutate: submitPost, isPending: postPending } = useMutation({
    mutationFn: () => clubService.createClubPost(id!, postContent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-posts', id] });
      setPostContent('');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to post'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (isError || !club) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Club not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.retryBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{club.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero Banner */}
      <View style={styles.hero}>
        <View style={styles.clubIconLarge}>
          <Ionicons name="people" size={36} color={theme.colors.primary} />
        </View>
        <Text style={styles.heroTitle}>{club.name}</Text>
        {club.city && (
          <Text style={styles.heroCity}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} /> {club.city}
          </Text>
        )}
        <View style={styles.heroStatsRow}>
          <Text style={styles.heroStatText}>{club.membersCount} members</Text>
          <Text style={styles.heroStatDot}>·</Text>
          <Text style={styles.heroStatText}>{club.challengesCount} challenges</Text>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, club.isMember && styles.joinedBtn]}
          onPress={() => toggleJoin()}
          disabled={joinPending}
        >
          {joinPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.joinBtnText, club.isMember && styles.joinedBtnText]}>
              {club.isMember ? (club.myRole === 'OWNER' ? 'Owner' : 'Leave Club') : 'Join Club'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        {(['wall', 'leaderboard', 'about'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <Text style={[styles.tabItemText, activeTab === tab && styles.tabItemTextActive]}>
              {tab === 'wall' ? 'Club Wall' : tab === 'leaderboard' ? 'Leaderboard' : 'About'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'wall' && (
          <View style={styles.wallSection}>
            {club.isMember && (
              <View style={styles.postBox}>
                <TextInput
                  style={styles.postInput}
                  placeholder="Share an update with the club..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  value={postContent}
                  onChangeText={setPostContent}
                />
                <TouchableOpacity
                  style={[styles.postSubmitBtn, !postContent.trim() && { opacity: 0.5 }]}
                  disabled={!postContent.trim() || postPending}
                  onPress={() => submitPost()}
                >
                  <Text style={styles.postSubmitText}>Post</Text>
                </TouchableOpacity>
              </View>
            )}

            {posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postAuthorRow}>
                  <View style={styles.postAuthorAvatar}>
                    <Ionicons name="person" size={16} color={theme.colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.postAuthorName}>{post.author.name}</Text>
                    <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text style={styles.postBody}>{post.content}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardSection}>
            <Text style={styles.sectionSubtitle}>Weekly Distance Rankings</Text>
            {leaderboard.map((entry) => (
              <View key={entry.user.id} style={styles.leaderboardRow}>
                <Text style={[styles.rankNumber, entry.rank <= 3 && { color: theme.colors.tertiary, fontWeight: '800' }]}>
                  #{entry.rank}
                </Text>
                <View style={styles.leaderboardUser}>
                  <Text style={styles.leaderboardUserName}>{entry.user.name}</Text>
                  <Text style={styles.leaderboardUserRuns}>{entry.activitiesCount} runs this week</Text>
                </View>
                <Text style={styles.leaderboardDistance}>{entry.totalDistanceKm.toFixed(1)} km</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutDesc}>{club.description || 'No description provided.'}</Text>
            <View style={styles.aboutMeta}>
              <Text style={styles.aboutMetaLabel}>Sport Type: {club.sportType}</Text>
              <Text style={styles.aboutMetaLabel}>Access: {club.isPrivate ? 'Private' : 'Public'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  clubIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroCity: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatText: { fontSize: 11, color: theme.colors.textSecondary },
  heroStatDot: { fontSize: 11, color: theme.colors.textMuted },
  joinBtn: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: theme.border.radius.round,
  },
  joinedBtn: { backgroundColor: 'rgba(255,255,255,0.08)' },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.typography.size.sm },
  joinedBtnText: { color: theme.colors.textMuted },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabItemText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, fontWeight: '600' },
  tabItemTextActive: { color: theme.colors.primary },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  wallSection: { gap: theme.spacing.sm },
  postBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  postInput: { color: theme.colors.text, fontSize: theme.typography.size.sm, minHeight: 60 },
  postSubmitBtn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.border.radius.round,
  },
  postSubmitText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: 8,
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postAuthorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthorName: { fontSize: theme.typography.size.xs, color: theme.colors.text, fontWeight: '700' },
  postTime: { fontSize: 10, color: theme.colors.textMuted },
  postBody: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary, lineHeight: 20 },
  leaderboardSection: { gap: theme.spacing.sm },
  sectionSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4 },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    gap: 12,
  },
  rankNumber: { fontSize: 16, color: theme.colors.textMuted, width: 28, fontWeight: '600' },
  leaderboardUser: { flex: 1 },
  leaderboardUserName: { fontSize: theme.typography.size.sm, color: theme.colors.text, fontWeight: '700' },
  leaderboardUserRuns: { fontSize: 11, color: theme.colors.textMuted },
  leaderboardDistance: { fontSize: theme.typography.size.sm, color: theme.colors.primary, fontWeight: '800' },
  aboutSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: 12,
  },
  aboutDesc: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary, lineHeight: 22 },
  aboutMeta: { gap: 4 },
  aboutMetaLabel: { fontSize: 12, color: theme.colors.textMuted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  errorText: { fontSize: theme.typography.size.md, color: theme.colors.textMuted },
  retryBtnText: { color: theme.colors.primary, fontWeight: '600' },
});
