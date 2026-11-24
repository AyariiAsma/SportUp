import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { analyticsService } from '../../../src/services/analytics.service';
import { PRType } from '@sportup/shared';
import { format } from 'date-fns';

const PR_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  [PRType.BEST_1K]: 'flash-outline',
  [PRType.BEST_5K]: 'timer-outline',
  [PRType.BEST_10K]: 'stopwatch-outline',
  [PRType.HALF_MARATHON]: 'ribbon-outline',
  [PRType.MARATHON]: 'medal-outline',
  [PRType.FASTEST_PACE]: 'speedometer-outline',
  [PRType.LONGEST_DISTANCE]: 'map-outline',
};

const PR_LABELS: Record<string, string> = {
  [PRType.BEST_1K]: 'Fastest 1K',
  [PRType.BEST_5K]: 'Fastest 5K',
  [PRType.BEST_10K]: 'Fastest 10K',
  [PRType.HALF_MARATHON]: 'Half Marathon',
  [PRType.MARATHON]: 'Marathon',
  [PRType.FASTEST_PACE]: 'Fastest Pace',
  [PRType.LONGEST_DISTANCE]: 'Longest Run',
};

const PR_COLORS = [
  theme.colors.primary,
  theme.colors.secondary,
  theme.colors.tertiary,
  theme.colors.success,
  theme.colors.info,
  theme.colors.warning,
  '#A855F7',
];

export default function PersonalRecordsScreen() {
  const router = useRouter();

  const { data: prs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['personal-records'],
    queryFn: () => analyticsService.getPersonalRecords(),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Records</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>Failed to load records</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : prs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="ribbon-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.emptyText}>
            Complete activities to set your personal records.
          </Text>
          <TouchableOpacity
            style={styles.startRunBtn}
            onPress={() => router.push('/(app)/run/live')}
          >
            <Text style={styles.startRunBtnText}>Start a Run</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          <Text style={styles.subtitle}>
            {prs.length} record{prs.length !== 1 ? 's' : ''} across all activities
          </Text>

          {prs.map((pr, index) => {
            const color = PR_COLORS[index % PR_COLORS.length] ?? theme.colors.primary;
            const icon = PR_ICONS[pr.type] ?? 'trophy-outline';
            const label = PR_LABELS[pr.type] ?? pr.type;
            let dateStr = '';
            try {
              dateStr = format(new Date(pr.achievedAt), 'dd MMM yyyy');
            } catch {
              dateStr = pr.achievedAt;
            }

            return (
              <TouchableOpacity
                key={pr.id}
                style={styles.prCard}
                onPress={() => router.push(`/(app)/run/${pr.activityId}` as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.prIconWrap, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon} size={24} color={color} />
                </View>
                <View style={styles.prInfo}>
                  <Text style={styles.prLabel}>{label}</Text>
                  <Text style={styles.prActivity} numberOfLines={1}>
                    {pr.activityTitle}
                  </Text>
                  <Text style={styles.prDate}>{dateStr}</Text>
                </View>
                <View style={styles.prValueWrap}>
                  <Text style={[styles.prValue, { color }]}>{pr.formattedValue}</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 32,
    gap: theme.spacing.sm,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  prIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prLabel: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  prActivity: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
  },
  prDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  prValueWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  prValue: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
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
  emptyTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  startRunBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: theme.border.radius.round,
    marginTop: 4,
  },
  startRunBtnText: {
    color: '#fff',
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    fontSize: theme.typography.size.sm,
  },
});
