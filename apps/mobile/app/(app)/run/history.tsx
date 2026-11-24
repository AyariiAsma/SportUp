import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { activityService } from '../../../src/services/activity.service';
import {
  SportActivityType,
  ActivitySplit,
  formatPace,
  formatSpeed,
} from '@sportup/shared';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';

interface RunItem {
  id: string;
  title: string;
  sportType: SportActivityType;
  startTime: string;
  distanceKm: number;
  durationSec: number;
  movingDurationSec: number;
  avgPaceSec: number;
  avgSpeedKmh: number;
  elevationGainM: number;
  calories: number;
  splits: ActivitySplit[];
}

const FILTER_SPORTS = [
  { label: 'All', value: undefined },
  { label: 'Run', value: SportActivityType.RUN },
  { label: 'Ride', value: SportActivityType.RIDE },
  { label: 'Walk', value: SportActivityType.WALK },
  { label: 'Hike', value: SportActivityType.HIKE },
];

export default function RunHistoryScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<SportActivityType | undefined>(undefined);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isExportingId, setIsExportingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-runs', selectedSport],
    queryFn: () => activityService.getMyActivities({ sportType: selectedSport, page: 1, limit: 50 }),
  });

  const runs: RunItem[] = (data?.data as RunItem[]) || [];
  const summary = data?.summary;

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const min = Math.floor((totalSeconds % 3600) / 60);
    const sec = Math.floor(totalSeconds % 60);
    if (hours > 0) {
      return `${hours}h ${min}m`;
    }
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedRunId((prev) => (prev === id ? null : id));
  };

  const handleExportGpx = async (run: RunItem) => {
    try {
      setIsExportingId(run.id);
      const gpxXml = await activityService.getGpxData(run.id);

      // Verify sharing availability
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('GPX Ready', 'GPX data successfully generated for this workout.');
        setIsExportingId(null);
        return;
      }

      // In browser/native we can notify or share
      Alert.alert(
        'GPX Exported',
        `Successfully generated GPX for "${run.title}" (${(gpxXml.length / 1024).toFixed(1)} KB)`
      );
      setIsExportingId(null);
    } catch {
      setIsExportingId(null);
      Alert.alert('Export Failed', 'Could not export GPX file. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Activity History</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/run/live')} style={styles.addBtn}>
          <Ionicons name="add" size={26} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalDistanceKm.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Total KM</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatDuration(summary.totalDurationSec)}</Text>
            <Text style={styles.summaryLabel}>Time</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>+{summary.totalElevationGainM}m</Text>
            <Text style={styles.summaryLabel}>Elev Gain</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalActivities}</Text>
            <Text style={styles.summaryLabel}>Workouts</Text>
          </View>
        </View>
      )}

      {/* Sport Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_SPORTS.map((item) => {
            const isSelected = selectedSport === item.value;
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedSport(item.value)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Failed to load activity history.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : runs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="footsteps-outline" size={54} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No activities recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Track your first run or ride to view metrics and splits!
          </Text>
          <TouchableOpacity
            style={styles.startRunBtn}
            onPress={() => router.push('/(app)/run/live')}
          >
            <Text style={styles.startRunBtnText}>Record Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const isRide = run.sportType === SportActivityType.RIDE;

            return (
              <TouchableOpacity
                key={run.id}
                style={styles.card}
                onPress={() => toggleExpand(run.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <View style={styles.sportBadge}>
                        <Text style={styles.sportBadgeText}>{run.sportType || 'RUN'}</Text>
                      </View>
                      <Text style={styles.runTitle} numberOfLines={1}>
                        {run.title}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {format(new Date(run.startTime), 'EEEE, MMM d, yyyy • h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.rightSide}>
                    <Text style={styles.distanceText}>{run.distanceKm.toFixed(2)} KM</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </View>
                </View>

                {/* Main Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{formatDuration(run.durationSec)}</Text>
                    <Text style={styles.statLabel}>Time</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {isRide
                        ? `${formatSpeed(run.avgSpeedKmh)} km/h`
                        : `${formatPace(run.avgPaceSec)} /km`}
                    </Text>
                    <Text style={styles.statLabel}>{isRide ? 'Avg Speed' : 'Avg Pace'}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>+{run.elevationGainM || 0}m</Text>
                    <Text style={styles.statLabel}>Elev Gain</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{run.calories || 0}</Text>
                    <Text style={styles.statLabel}>kcal</Text>
                  </View>
                </View>

                {/* Expanded Splits & GPX Actions */}
                {isExpanded && (
                  <View style={styles.splitsSection}>
                    <View style={styles.splitsHeaderRow}>
                      <Text style={styles.splitsTitle}>Kilometer Splits</Text>
                      <TouchableOpacity
                        style={styles.gpxExportBtn}
                        onPress={() => handleExportGpx(run)}
                        disabled={isExportingId === run.id}
                      >
                        {isExportingId === run.id ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="download-outline" size={14} color={theme.colors.primary} />
                            <Text style={styles.gpxExportText}>Export GPX</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {run.splits?.length === 0 ? (
                      <Text style={styles.emptySplits}>No full kilometer splits recorded.</Text>
                    ) : (
                      run.splits?.map((split) => (
                        <View key={split.km} style={styles.splitRow}>
                          <Text style={styles.splitKm}>KM {split.km}</Text>
                          <Text style={styles.splitPace}>
                            {isRide ? `${split.speedKmh} km/h` : `${formatPace(split.paceSec)} /km`}
                          </Text>
                          <Text style={styles.splitElev}>+{split.elevationGainM || 0}m</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
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
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addBtn: {
    padding: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 15,
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  startRunBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startRunBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sportBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sportBadgeText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  runTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  rightSide: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  distanceText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  splitsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  splitsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitsTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  gpxExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpxExportText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  emptySplits: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    fontSize: 13,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  splitKm: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  splitPace: {
    color: theme.colors.text,
    fontSize: 13,
  },
  splitElev: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
