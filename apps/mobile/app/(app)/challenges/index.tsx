import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { challengeService, ChallengeItem } from '../../../src/services/challenge.service';
import { format } from 'date-fns';

export default function ChallengesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'my'>('all');

  const { data: allChallenges = [], isLoading: allLoading, refetch: refetchAll } = useQuery({
    queryKey: ['challenges-all'],
    queryFn: () => challengeService.getChallenges({ status: 'active' }),
  });

  const { data: myChallenges = [], isLoading: myLoading, refetch: refetchMy } = useQuery({
    queryKey: ['challenges-my'],
    queryFn: () => challengeService.getMyChallenges(),
  });

  const { mutate: joinChallenge, isPending: joinPending } = useMutation({
    mutationFn: (id: string) => challengeService.joinChallenge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges-all'] });
      qc.invalidateQueries({ queryKey: ['challenges-my'] });
      Alert.alert('Joined!', 'Challenge added to your dashboard.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to join'),
  });

  const list = tab === 'all' ? allChallenges : myChallenges;
  const isLoading = tab === 'all' ? allLoading : myLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'all' && styles.tabItemActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>Active Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'my' && styles.tabItemActive]}
          onPress={() => setTab('my')}
        >
          <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>
            My Challenges ({myChallenges.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {tab === 'all' ? 'No active challenges' : 'You have not joined any challenges yet'}
          </Text>
          <Text style={styles.emptyText}>Join a challenge to earn exclusive badges.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={tab === 'all' ? refetchAll : refetchMy}
              tintColor={theme.colors.primary}
            />
          }
        >
          {list.map((item) => {
            let endStr = '';
            try {
              endStr = format(new Date(item.endDate), 'dd MMM');
            } catch {
              endStr = item.endDate;
            }

            return (
              <View key={item.id} style={styles.challengeCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeWrap}>
                    <Ionicons name="medal" size={28} color={theme.colors.tertiary} />
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={styles.challengeTitle}>{item.title}</Text>
                    <Text style={styles.challengeMeta}>Ends {endStr} · {item.participantsCount} athletes</Text>
                  </View>
                </View>

                <Text style={styles.challengeDesc}>{item.description}</Text>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressInfoRow}>
                    <Text style={styles.progressLabel}>
                      {item.myProgress.toFixed(1)} / {item.targetValue} km
                    </Text>
                    <Text style={styles.progressPct}>{item.myProgressPercentage}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(item.myProgressPercentage, 100)}%` as any,
                          backgroundColor: item.isCompleted ? theme.colors.success : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {!item.isJoined ? (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => joinChallenge(item.id)}
                    disabled={joinPending}
                  >
                    <Text style={styles.joinBtnText}>Join Challenge</Text>
                  </TouchableOpacity>
                ) : item.isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.completedText}>Completed! Badge Awarded</Text>
                  </View>
                ) : (
                  <View style={styles.inProgressBadge}>
                    <Text style={styles.inProgressText}>In Progress</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
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
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary },
  list: { padding: theme.spacing.md, gap: theme.spacing.md },
  challengeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.tertiary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: 2 },
  challengeTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  challengeMeta: { fontSize: 11, color: theme.colors.textMuted },
  challengeDesc: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary, lineHeight: 18 },
  progressContainer: { gap: 4 },
  progressInfoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, color: theme.colors.textMuted },
  progressPct: { fontSize: 11, color: theme.colors.text, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  joinBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.typography.size.xs },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: theme.colors.success + '1A',
    borderRadius: theme.border.radius.md,
  },
  completedText: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  inProgressBadge: {
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
  },
  inProgressText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
  emptyTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, textAlign: 'center' },
});
