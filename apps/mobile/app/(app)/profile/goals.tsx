import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { analyticsService, AthleteGoalItem } from '../../../src/services/analytics.service';
import { SportActivityType } from '@sportup/shared';
import { format } from 'date-fns';

const GOAL_TARGET_LABELS: Record<string, string> = {
  DISTANCE_KM: 'Distance (km)',
  DURATION_MIN: 'Time (min)',
  ACTIVITIES_COUNT: 'Workouts',
};

const GOAL_PERIOD_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

function CircularProgress({
  pct,
  size,
  color,
  strokeWidth,
}: {
  pct: number;
  size: number;
  color: string;
  strokeWidth: number;
}) {
  // Simple View-based approximation (no SVG library required)
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      />
      {/* Foreground arc (we simulate with a colored ring clipped by opacity fade) */}
      {filled > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            opacity: filled,
          }}
        />
      )}
      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>
        {Math.round(pct)}%
      </Text>
    </View>
  );
}

function GoalCard({ goal }: { goal: AthleteGoalItem }) {
  const pct = Math.min(goal.progressPercentage, 100);
  const color = goal.isCompleted ? theme.colors.success : theme.colors.primary;
  let endStr = '';
  try {
    endStr = format(new Date(goal.endDate), 'dd MMM');
  } catch {
    endStr = goal.endDate;
  }

  const targetLabel = GOAL_TARGET_LABELS[goal.targetType] ?? goal.targetType;
  const periodLabel = GOAL_PERIOD_LABELS[goal.period] ?? goal.period;

  return (
    <View style={[styles.goalCard, goal.isCompleted && styles.goalCardCompleted]}>
      <View style={styles.goalLeft}>
        <CircularProgress pct={pct} size={64} color={color} strokeWidth={5} />
      </View>
      <View style={styles.goalInfo}>
        <View style={styles.goalTitleRow}>
          <Text style={styles.goalPeriod}>{periodLabel}</Text>
          {goal.isCompleted && (
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          )}
        </View>
        <Text style={styles.goalTarget}>{targetLabel}</Text>
        <Text style={styles.goalProgress}>
          {goal.currentValue.toFixed(1)} / {goal.targetValue.toFixed(1)}
        </Text>
        <Text style={styles.goalEnd}>Ends {endStr}</Text>
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [targetType, setTargetType] = useState<'DISTANCE_KM' | 'DURATION_MIN' | 'ACTIVITIES_COUNT'>('DISTANCE_KM');
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [targetValue, setTargetValue] = useState('');

  const { data: goals = [], isLoading, isError, refetch } = useQuery<AthleteGoalItem[]>({
    queryKey: ['goals'],
    queryFn: () => analyticsService.getGoals(),
  });

  const { mutate: createGoal, isPending } = useMutation({
    mutationFn: () => {
      const val = parseFloat(targetValue);
      if (isNaN(val) || val <= 0) throw new Error('Enter a valid target value');
      const now = new Date();
      let endDate: Date;
      if (period === 'WEEKLY') {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
      } else if (period === 'MONTHLY') {
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        endDate = new Date(now.getFullYear(), 11, 31);
      }
      return analyticsService.createGoal({
        sportType: SportActivityType.RUN,
        period: period as any,
        targetType: targetType as any,
        targetValue: val,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setModalVisible(false);
      setTargetValue('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to create goal');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training Goals</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>Failed to load goals</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : goals.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="flag-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No goals set</Text>
          <Text style={styles.emptyText}>Set a goal to track your training progress.</Text>
          <TouchableOpacity style={styles.createGoalBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.createGoalBtnText}>Create a Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          <Text style={styles.subtitle}>
            {goals.filter((g) => g.isCompleted).length} of {goals.length} goals completed
          </Text>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
          <TouchableOpacity style={styles.addGoalInline} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.addGoalInlineText}>Add another goal</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Create Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Training Goal</Text>

            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.chipRow}>
              {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.chip, period === p && styles.chipActive]}
                >
                  <Text style={[styles.chipText, period === p && styles.chipTextActive]}>
                    {GOAL_PERIOD_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Goal Type</Text>
            <View style={styles.chipRow}>
              {(['DISTANCE_KM', 'DURATION_MIN', 'ACTIVITIES_COUNT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTargetType(t)}
                  style={[styles.chip, targetType === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, targetType === t && styles.chipTextActive]}>
                    {t === 'DISTANCE_KM' ? 'Distance' : t === 'DURATION_MIN' ? 'Time' : 'Workouts'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>
              Target ({targetType === 'DISTANCE_KM' ? 'km' : targetType === 'DURATION_MIN' ? 'minutes' : 'sessions'})
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 50"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={targetValue}
              onChangeText={setTargetValue}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => createGoal()} style={styles.saveBtn} disabled={isPending}>
                {isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Create Goal</Text>
                )}
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  goalCardCompleted: {
    borderColor: theme.colors.success + '44',
  },
  goalLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfo: {
    flex: 1,
    gap: 2,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalPeriod: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  goalTarget: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
  },
  goalProgress: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  goalEnd: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  addGoalInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.md,
  },
  addGoalInlineText: {
    color: theme.colors.primary,
    fontSize: theme.typography.size.sm,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
  },
  errorText: { fontSize: theme.typography.size.md, color: theme.colors.textMuted },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.border.radius.round,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
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
  createGoalBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: theme.border.radius.round,
    marginTop: 4,
  },
  createGoalBtnText: { color: '#fff', fontFamily: theme.typography.fontFamily.bold, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: 40,
    gap: theme.spacing.sm,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.border.radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.border.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.border.radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: theme.border.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.typography.size.sm },
});
