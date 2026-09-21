import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLiveRunTracking } from '../../../src/hooks/useLiveRunTracking';
import { theme } from '../../../src/theme';
import { api } from '../../../src/services/api';

export default function LiveRunScreen() {
  const router = useRouter();
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId?: string; eventTitle?: string }>();
  const {
    isTracking,
    distanceKm,
    durationSec,
    currentPaceSec,
    avgPaceSec,
    splits,
    route,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
  } = useLiveRunTracking();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [runTitle, setRunTitle] = useState('');

  // Helper to format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.floor(totalSeconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getDefaultTitle = () => {
    if (eventTitle) return eventTitle;
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning Run';
    if (hour < 17) return 'Afternoon Run';
    return 'Evening Run';
  };

  const handleFinishPress = () => {
    pauseTracking();
    setRunTitle(getDefaultTitle());
    setShowSaveModal(true);
  };

  const handleStopAndSave = async () => {
    setShowSaveModal(false);
    stopTracking();
    try {
      await api.post('/runs/sync', {
        title: runTitle,
        eventId,
        distanceKm,
        durationSec,
        avgPaceSec,
        route,
        splits,
        startTime: new Date(Date.now() - durationSec * 1000).toISOString(),
        endTime: new Date().toISOString(),
      });
      alert('Run saved successfully!');
      router.back();
    } catch (e) {
      console.error('Failed to save run', e);
      alert('Failed to save run. Check connection.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Live Run</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Main KPI */}
      <View style={styles.kpiContainer}>
        <Text style={styles.distanceValue}>{distanceKm.toFixed(2)}</Text>
        <Text style={styles.distanceLabel}>Kilometers</Text>
      </View>

      {/* Sub KPIs */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(durationSec)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{currentPaceSec === 0 ? '--:--' : formatTime(currentPaceSec)}</Text>
          <Text style={styles.statLabel}>Current Pace</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{avgPaceSec === 0 ? '--:--' : formatTime(avgPaceSec)}</Text>
          <Text style={styles.statLabel}>Avg Pace</Text>
        </View>
      </View>

      {/* Splits List */}
      <View style={styles.splitsContainer}>
        <Text style={styles.splitsTitle}>Splits</Text>
        <ScrollView style={styles.splitsScroll}>
          {splits.length === 0 ? (
            <Text style={styles.emptySplits}>Complete 1 KM to see your first split.</Text>
          ) : (
            splits.map((split, index) => (
              <View key={index} style={styles.splitRow}>
                <Text style={styles.splitKm}>KM {split.km}</Text>
                <Text style={styles.splitPace}>{formatTime(split.paceSec)} /km</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!isTracking && durationSec === 0 ? (
          <TouchableOpacity style={[styles.controlButton, styles.startButton]} onPress={startTracking}>
            <Text style={styles.controlText}>START</Text>
          </TouchableOpacity>
        ) : (
          <>
            {isTracking ? (
              <TouchableOpacity style={[styles.controlButton, styles.pauseButton]} onPress={pauseTracking}>
                <Ionicons name="pause" size={24} color="#fff" />
                <Text style={styles.controlText}>PAUSE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.controlButton, styles.resumeButton]} onPress={resumeTracking}>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.controlText}>RESUME</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={handleFinishPress}>
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.controlText}>FINISH</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Save Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Run</Text>
            <Text style={styles.modalSub}>Give your run a name</Text>
            <TextInput
              style={styles.input}
              value={runTitle}
              onChangeText={setRunTitle}
              placeholder="e.g. Morning Run"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleStopAndSave}
              >
                <Text style={styles.modalSaveText}>Save Run</Text>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {},
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  kpiContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  distanceValue: {
    fontSize: 84,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 90,
  },
  distanceLabel: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  splitsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  splitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  splitsScroll: {
    flex: 1,
  },
  emptySplits: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  splitKm: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  splitPace: {
    fontSize: 16,
    color: theme.colors.text,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 50,
    paddingTop: 20,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    minWidth: 140,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    minWidth: 200,
  },
  pauseButton: {
    backgroundColor: '#FF9500',
  },
  resumeButton: {
    backgroundColor: theme.colors.primary,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  controlText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    width: '100%',
    borderRadius: theme.border.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.border.radius.lg,
    padding: 16,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.border.radius.md,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
