import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { analyticsService, DashboardResponse } from '../../../src/services/analytics.service';
import { formatPace } from '@sportup/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = 28;

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

const LOAD_COLORS: Record<string, string> = {
  RECOVERY: theme.colors.info,
  MAINTENANCE: theme.colors.success,
  OPTIMAL: theme.colors.primary,
  OVERREACHING: theme.colors.error,
};

const LOAD_LABELS: Record<string, string> = {
  RECOVERY: 'Recovery',
  MAINTENANCE: 'Maintenance',
  OPTIMAL: 'Optimal',
  OVERREACHING: 'Overreaching',
};

function formatDuration(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${min}m`;
  return `${min}m`;
}

function BarChart({ data }: { data: DashboardResponse['timeline'] }) {
  if (!data.length) return null;
  const maxDist = Math.max(...data.map((d) => d.distanceKm), 1);

  return (
    <View style={styles.chartContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartBars}>
          {data.map((item, index) => {
            const heightPct = item.distanceKm / maxDist;
            const barH = Math.max(heightPct * 100, 2);
            const label =
              item.date.length === 10
                ? item.date.slice(5)   // MM-DD
                : item.date;
            return (
              <View key={index} style={styles.barGroup}>
                <Text style={styles.barValue}>
                  {item.distanceKm > 0 ? `${item.distanceKm.toFixed(1)}` : ''}
                </Text>
                <View style={[styles.bar, { height: barH }]} />
                <Text style={styles.barLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function KpiCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('week');

  const { data, isLoading, isError, refetch } = useQuery<DashboardResponse>({
    queryKey: ['analytics-dashboard', period],
    queryFn: () => analyticsService.getDashboard(period),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/profile/personal-records')} style={styles.prButton}>
          <Ionicons name="ribbon-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.prButtonText}>PRs</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['week', 'month', 'year'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
          >
            <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="map-outline"
              value={`${(data?.summary.totalDistanceKm ?? 0).toFixed(1)} km`}
              label="Distance"
              color={theme.colors.primary}
            />
            <KpiCard
              icon="time-outline"
              value={formatDuration(data?.summary.totalDurationSec ?? 0)}
              label="Time"
              color={theme.colors.secondary}
            />
            <KpiCard
              icon="trending-up-outline"
              value={`${Math.round(data?.summary.totalElevationGainM ?? 0)} m`}
              label="Elevation"
              color={theme.colors.tertiary}
            />
            <KpiCard
              icon="flash-outline"
              value={`${Math.round(data?.summary.totalCalories ?? 0)}`}
              label="Calories"
              color={theme.colors.warning}
            />
            <KpiCard
              icon="barbell-outline"
              value={`${data?.summary.totalWorkouts ?? 0}`}
              label="Workouts"
              color={theme.colors.success}
            />
            <KpiCard
              icon="speedometer-outline"
              value={
                data?.summary.avgPaceSec && data.summary.avgPaceSec > 0
                  ? formatPace(data.summary.avgPaceSec)
                  : '—'
              }
              label="Avg Pace"
              color={theme.colors.info}
            />
          </View>

          {/* Training Load */}
          {data?.trainingLoad && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Training Load</Text>
              <View style={styles.loadRow}>
                <View style={styles.loadScoreContainer}>
                  <Text style={styles.loadScore}>{Math.round(data.trainingLoad.score)}</Text>
                  <Text style={styles.loadScoreLabel}>/ 100</Text>
                </View>
                <View style={styles.loadInfo}>
                  <View
                    style={[
                      styles.loadPill,
                      { backgroundColor: (LOAD_COLORS[data.trainingLoad.level] ?? theme.colors.primary) + '33' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.loadPillText,
                        { color: LOAD_COLORS[data.trainingLoad.level] ?? theme.colors.primary },
                      ]}
                    >
                      {LOAD_LABELS[data.trainingLoad.level] ?? data.trainingLoad.level}
                    </Text>
                  </View>
                  <Text style={styles.loadDetail}>
                    {data.trainingLoad.totalDistanceKm.toFixed(1)} km ·{' '}
                    {Math.round(data.trainingLoad.totalDurationMin)} min
                  </Text>
                </View>
              </View>
              {/* Load bar */}
              <View style={styles.loadBarTrack}>
                <View
                  style={[
                    styles.loadBarFill,
                    {
                      width: `${Math.min(data.trainingLoad.score, 100)}%` as any,
                      backgroundColor: LOAD_COLORS[data.trainingLoad.level] ?? theme.colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Timeline Chart */}
          {data?.timeline && data.timeline.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Distance Timeline</Text>
              <BarChart data={data.timeline} />
            </View>
          )}

          {data?.summary.totalWorkouts === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptyText}>Start a run to see your stats here.</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/profile/personal-records')}
            >
              <Ionicons name="ribbon-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.actionLabel}>Personal Records</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/profile/goals')}
            >
              <Ionicons name="flag-outline" size={20} color={theme.colors.secondary} />
              <Text style={styles.actionLabel}>Training Goals</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/run/history')}
            >
              <Ionicons name="list-outline" size={20} color={theme.colors.tertiary} />
              <Text style={styles.actionLabel}>Activity History</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  prButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.round,
  },
  prButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: theme.border.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: theme.colors.primary,
  },
  periodChipText: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  periodChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 24,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - theme.spacing.md * 2 - 20) / 3,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  loadScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  loadScore: {
    fontSize: 40,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '800',
  },
  loadScoreLabel: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
  },
  loadInfo: {
    flex: 1,
    gap: 6,
  },
  loadPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.border.radius.round,
  },
  loadPillText: {
    fontSize: theme.typography.size.xs,
    fontWeight: '700',
  },
  loadDetail: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  loadBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartContainer: {
    marginTop: 4,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: 4,
    minHeight: 120,
  },
  barGroup: {
    alignItems: 'center',
    gap: 4,
    width: BAR_WIDTH,
  },
  bar: {
    width: BAR_WIDTH - 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  actionsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  actionLabel: {
    flex: 1,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.border.radius.round,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
