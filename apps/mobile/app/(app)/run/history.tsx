import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { api } from '../../../src/services/api';
import { format } from 'date-fns';

type RunSplit = {
  km: number;
  timeSec: number;
  paceSec: number;
};

type RunSession = {
  id: string;
  title: string;
  startTime: string;
  distanceKm: number;
  durationSec: number;
  avgPaceSec: number;
  splits: RunSplit[];
};

export default function RunHistoryScreen() {
  const router = useRouter();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const { data: runs, isLoading, isError } = useQuery({
    queryKey: ['my-runs'],
    queryFn: async () => {
      const { data } = await api.get('/runs/my-runs');
      return data.data as RunSession[];
    },
  });

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.floor(totalSeconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedRunId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Runs</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load run history.</Text>
        </View>
      ) : runs?.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="footsteps-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>You haven't recorded any runs yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {runs?.map((run) => {
            const isExpanded = expandedRunId === run.id;
            return (
              <TouchableOpacity
                key={run.id}
                style={styles.card}
                onPress={() => toggleExpand(run.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.runTitle}>{run.title}</Text>
                    <Text style={styles.dateText}>
                      {format(new Date(run.startTime), 'EEEE, MMM d, yyyy - h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.rightSide}>
                    <Text style={styles.distanceText}>{run.distanceKm.toFixed(2)} KM</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={theme.colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{formatTime(run.durationSec)}</Text>
                    <Text style={styles.statLabel}>Time</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{formatTime(run.avgPaceSec)}</Text>
                    <Text style={styles.statLabel}>Avg Pace</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.splitsContainer}>
                    <Text style={styles.splitsTitle}>KM Splits</Text>
                    {run.splits.length === 0 ? (
                      <Text style={styles.emptySplits}>No full kilometers completed.</Text>
                    ) : (
                      run.splits.map((split, index) => (
                        <View key={index} style={styles.splitRow}>
                          <Text style={styles.splitKm}>KM {split.km}</Text>
                          <Text style={styles.splitPace}>{formatTime(split.paceSec)} /km</Text>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {},
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginTop: 12,
    fontSize: 16,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  runTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  distanceText: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 40,
  },
  statBox: {},
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  splitsContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  splitsTitle: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
  },
  emptySplits: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  splitKm: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  splitPace: {
    color: theme.colors.textSecondary,
  },
});
