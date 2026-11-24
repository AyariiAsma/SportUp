import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../src/theme';
import { eventExtService, EventFinisherItem } from '../../../../src/services/eventExt.service';
import { formatPace } from '@sportup/shared';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function EventResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: results = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['event-results', id],
    queryFn: () => eventExtService.getEventResults(id!),
    enabled: Boolean(id),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Results & Finishers</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load results</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No finisher results yet</Text>
          <Text style={styles.emptyText}>
            Results will appear automatically as runners complete the group event.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />}
        >
          {results.map((item) => (
            <View key={item.id} style={styles.resultRow}>
              <View style={[styles.rankBadge, item.rank <= 3 && styles.podiumBadge]}>
                <Text style={[styles.rankText, item.rank <= 3 && styles.podiumRankText]}>
                  #{item.rank}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.user.name}</Text>
                <Text style={styles.userStats}>
                  {item.distanceKm.toFixed(1)} km · {formatPace(item.paceSec)}
                </Text>
              </View>
              <Text style={styles.finishTime}>{formatDuration(item.timeSec)}</Text>
            </View>
          ))}
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  list: { padding: theme.spacing.md, gap: theme.spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadge: { backgroundColor: theme.colors.tertiary + '33' },
  rankText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '700' },
  podiumRankText: { color: theme.colors.tertiary, fontWeight: '800' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: theme.typography.size.sm, color: theme.colors.text, fontWeight: '700' },
  userStats: { fontSize: 11, color: theme.colors.textMuted },
  finishTime: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
  errorText: { fontSize: theme.typography.size.md, color: theme.colors.textMuted },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.border.radius.round,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, textAlign: 'center' },
});
