import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLiveRunTracking } from '../../../src/hooks/useLiveRunTracking';
import { theme } from '../../../src/theme';
import { activityService } from '../../../src/services/activity.service';
import {
  SportActivityType,
  ActivityVisibility,
  ActivityStatus,
  formatPace,
  formatSpeed,
} from '@sportup/shared';

const SPORT_OPTIONS = [
  { type: SportActivityType.RUN, label: 'Run', icon: 'walk-outline' as const },
  { type: SportActivityType.TRAIL_RUN, label: 'Trail', icon: 'trail-sign-outline' as const },
  { type: SportActivityType.RIDE, label: 'Ride', icon: 'bicycle-outline' as const },
  { type: SportActivityType.WALK, label: 'Walk', icon: 'footsteps-outline' as const },
  { type: SportActivityType.HIKE, label: 'Hike', icon: 'earth-outline' as const },
];

export default function LiveRunScreen() {
  const router = useRouter();
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId?: string; eventTitle?: string }>();

  const {
    trackingStatus,
    sportType,
    clientSessionId,
    distanceKm,
    durationSec,
    movingDurationSec,
    currentPaceSec,
    avgPaceSec,
    currentSpeedKmh,
    avgSpeedKmh,
    elevationGainM,
    elevationLossM,
    calories,
    splits,
    route,
    gpsSignalQuality,
    crashedSession,
    isTracking,
    isPaused,
    isAutoPaused,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    discardTracking,
    setSportType,
    restoreCrashedSession,
    dismissCrashedSession,
  } = useLiveRunTracking();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [visibility, setVisibility] = useState<ActivityVisibility>(ActivityVisibility.PUBLIC);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'splits' | 'stats'>('splits');

  const isRide = sportType === SportActivityType.RIDE;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const min = Math.floor((totalSeconds % 3600) / 60);
    const sec = Math.floor(totalSeconds % 60);
    if (hours > 0) {
      return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getDefaultTitle = () => {
    if (eventTitle) return eventTitle;
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    const sportName = SPORT_OPTIONS.find((s) => s.type === sportType)?.label || 'Workout';
    return `${timeOfDay} ${sportName}`;
  };

  const handleStart = async () => {
    await startTracking(eventId, eventTitle);
  };

  const handleFinishPress = () => {
    pauseTracking();
    setWorkoutTitle(getDefaultTitle());
    setShowSaveModal(true);
  };

  const handleStopAndSave = async () => {
    setIsSaving(true);
    stopTracking();

    const payload = {
      clientSessionId,
      title: workoutTitle.trim() || getDefaultTitle(),
      sportType,
      visibility,
      status: ActivityStatus.COMPLETED,
      isManual: false,
      eventId: eventId || null,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationSec,
      movingDurationSec,
      avgPaceSec: Math.round(avgPaceSec),
      avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(2)),
      elevationGainM,
      elevationLossM,
      calories,
      route,
      splits,
      startTime: new Date(Date.now() - durationSec * 1000).toISOString(),
      endTime: new Date().toISOString(),
      notes: workoutNotes.trim() || null,
      sourceDevice: 'SportUp Mobile',
    };

    try {
      await activityService.syncActivity(payload);
      setIsSaving(false);
      setShowSaveModal(false);
      Alert.alert('Workout Saved', 'Your activity was recorded successfully!');
      router.back();
    } catch {
      setIsSaving(false);
      setShowSaveModal(false);
      Alert.alert(
        'Saved Offline',
        'Your workout was saved on your device and will be synced as soon as internet is available.'
      );
      router.back();
    }
  };

  const handleClose = () => {
    if (isTracking || isPaused) {
      Alert.alert(
        'Discard Workout?',
        'Do you want to discard your current workout session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              discardTracking();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const renderGpsBars = () => {
    const barsCount =
      gpsSignalQuality === 'EXCELLENT' ? 3 : gpsSignalQuality === 'GOOD' ? 2 : gpsSignalQuality === 'FAIR' ? 1 : 0;
    const color =
      gpsSignalQuality === 'EXCELLENT'
        ? theme.colors.success
        : gpsSignalQuality === 'GOOD'
        ? theme.colors.success
        : gpsSignalQuality === 'FAIR'
        ? theme.colors.warning
        : theme.colors.error;

    return (
      <View style={styles.gpsContainer}>
        <View style={styles.gpsBarsRow}>
          <View style={[styles.gpsBar, { height: 6, backgroundColor: barsCount >= 1 ? color : '#334155' }]} />
          <View style={[styles.gpsBar, { height: 10, backgroundColor: barsCount >= 2 ? color : '#334155' }]} />
          <View style={[styles.gpsBar, { height: 14, backgroundColor: barsCount >= 3 ? color : '#334155' }]} />
        </View>
        <Text style={[styles.gpsLabel, { color }]}>{gpsSignalQuality}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Sport Type Selector (enabled only in IDLE state) */}
        {trackingStatus === 'IDLE' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportSelector}>
            {SPORT_OPTIONS.map((sport) => {
              const isSelected = sportType === sport.type;
              return (
                <TouchableOpacity
                  key={sport.type}
                  style={[styles.sportChip, isSelected && styles.sportChipActive]}
                  onPress={() => setSportType(sport.type)}
                >
                  <Ionicons
                    name={sport.icon}
                    size={16}
                    color={isSelected ? '#fff' : theme.colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sportChipText, isSelected && styles.sportChipTextActive]}>
                    {sport.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.activeSportBadge}>
            <Text style={styles.activeSportText}>{sportType}</Text>
          </View>
        )}

        {renderGpsBars()}
      </View>

      {/* Crash Recovery Notification Banner */}
      {crashedSession && trackingStatus === 'IDLE' && (
        <View style={styles.recoveryBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.recoveryTitle}>Unsaved Workout Recovered</Text>
            <Text style={styles.recoverySub}>
              {crashedSession.distanceKm.toFixed(2)} km • {formatTime(crashedSession.durationSec)}
            </Text>
          </View>
          <View style={styles.recoveryActions}>
            <TouchableOpacity onPress={restoreCrashedSession} style={styles.recoveryResumeBtn}>
              <Text style={styles.recoveryResumeText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissCrashedSession} style={styles.recoveryDismissBtn}>
              <Ionicons name="close" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Auto-Paused Indicator Banner */}
      {isAutoPaused && (
        <View style={styles.autoPauseBanner}>
          <Ionicons name="pause-circle" size={18} color="#FFD166" style={{ marginRight: 6 }} />
          <Text style={styles.autoPauseText}>AUTO-PAUSED • START MOVING TO RESUME</Text>
        </View>
      )}

      {/* Hero Distance KPI */}
      <View style={styles.heroKpi}>
        <Text style={styles.distanceValue}>{distanceKm.toFixed(2)}</Text>
        <Text style={styles.distanceUnit}>KILOMETERS</Text>
      </View>

      {/* Secondary Metrics Grid (2x2) */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>DURATION</Text>
          <Text style={styles.metricValue}>{formatTime(durationSec)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{isRide ? 'CURRENT SPEED' : 'CURRENT PACE'}</Text>
          <Text style={styles.metricValue}>
            {isRide
              ? `${formatSpeed(currentSpeedKmh)} km/h`
              : `${formatPace(currentPaceSec)} /km`}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ELEVATION GAIN</Text>
          <Text style={styles.metricValue}>+{elevationGainM} m</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>EST. CALORIES</Text>
          <Text style={styles.metricValue}>{calories} kcal</Text>
        </View>
      </View>

      {/* Bottom Tabs: Splits vs Route */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'splits' && styles.tabButtonActive]}
          onPress={() => setActiveTab('splits')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'splits' && styles.tabButtonTextActive]}>
            Splits ({splits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'stats' && styles.tabButtonTextActive]}>
            Pacing Breakdown
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.splitsScroll}>
        {splits.length === 0 ? (
          <Text style={styles.emptySplits}>Complete 1 KM to log your first split.</Text>
        ) : (
          splits.map((split) => (
            <View key={split.km} style={styles.splitRow}>
              <View style={styles.splitKmCol}>
                <Text style={styles.splitKmText}>KM {split.km}</Text>
              </View>
              <Text style={styles.splitPaceText}>
                {isRide ? `${split.speedKmh} km/h` : `${formatPace(split.paceSec)} /km`}
              </Text>
              <Text style={styles.splitElevText}>+{split.elevationGainM}m</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Controls Bar */}
      <View style={styles.controlsBar}>
        {trackingStatus === 'IDLE' ? (
          <TouchableOpacity style={[styles.controlBtn, styles.startBtn]} onPress={handleStart}>
            <Ionicons name="play" size={28} color="#fff" />
            <Text style={styles.btnText}>START {sportType}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControlsRow}>
            {isTracking ? (
              <TouchableOpacity style={[styles.controlBtn, styles.pauseBtn]} onPress={pauseTracking}>
                <Ionicons name="pause" size={24} color="#fff" />
                <Text style={styles.btnText}>PAUSE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.controlBtn, styles.resumeBtn]} onPress={resumeTracking}>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.btnText}>RESUME</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.controlBtn, styles.finishBtn]} onPress={handleFinishPress}>
              <Ionicons name="flag" size={24} color="#fff" />
              <Text style={styles.btnText}>FINISH</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Save Workout Modal */}
      <Modal visible={showSaveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeading}>Save Activity</Text>
            <Text style={styles.modalSubheading}>Review workout summary & details</Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="e.g. Sunny Afternoon Run"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              placeholder="How did the workout feel? Shoes, terrain..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
            />

            <Text style={styles.inputLabel}>Visibility</Text>
            <View style={styles.visibilityRow}>
              {[
                { key: ActivityVisibility.PUBLIC, label: 'Everyone', icon: 'globe-outline' as const },
                { key: ActivityVisibility.FOLLOWERS, label: 'Followers', icon: 'people-outline' as const },
                { key: ActivityVisibility.ONLY_ME, label: 'Only Me', icon: 'lock-closed-outline' as const },
              ].map((item) => {
                const selected = visibility === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.visibilityBtn, selected && styles.visibilityBtnActive]}
                    onPress={() => setVisibility(item.key)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={selected ? '#fff' : theme.colors.textMuted}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.visibilityText, selected && styles.visibilityTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={() => {
                  setShowSaveModal(false);
                  discardTracking();
                  router.back();
                }}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleStopAndSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Workout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 12,
  },
  iconButton: {
    padding: 6,
  },
  sportSelector: {
    maxWidth: '65%',
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sportChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sportChipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sportChipTextActive: {
    color: '#fff',
  },
  activeSportBadge: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeSportText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  gpsContainer: {
    alignItems: 'center',
  },
  gpsBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  gpsBar: {
    width: 4,
    borderRadius: 2,
  },
  gpsLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  recoveryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recoverySub: {
    color: '#93C5FD',
    fontSize: 12,
    marginTop: 2,
  },
  recoveryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recoveryResumeBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  recoveryResumeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  recoveryDismissBtn: {
    padding: 6,
  },
  autoPauseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#78350F',
    paddingVertical: 6,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  autoPauseText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heroKpi: {
    alignItems: 'center',
    marginVertical: 18,
  },
  distanceValue: {
    fontSize: 88,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 94,
    letterSpacing: -2,
  },
  distanceUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 3,
    marginTop: -4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 10,
    marginRight: 20,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  splitsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptySplits: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  splitKmCol: {
    width: 70,
  },
  splitKmText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  splitPaceText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  splitElevText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  controlsBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 36,
  },
  startBtn: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  activeControlsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
  },
  resumeBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  finishBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalSubheading: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visibilityBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  visibilityText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  visibilityTextActive: {
    color: '#fff',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  discardBtnText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
