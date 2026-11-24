import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from '../../../src/components/common/MapView';
import { theme } from '../../../src/theme';
import { activityService } from '../../../src/services/activity.service';
import {
  SportActivityType,
  ActivitySplit,
  LocationPoint,
  formatPace,
  formatSpeed,
} from '@sportup/shared';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const { data: activity, isLoading, isError, refetch } = useQuery({
    queryKey: ['activity-detail', id],
    queryFn: () => activityService.getActivityDetails(id!),
    enabled: Boolean(id),
  });

  const isRide = activity?.sportType === SportActivityType.RIDE;
  const routePoints: LocationPoint[] = (activity?.route as LocationPoint[]) || [];
  const splits: ActivitySplit[] = (activity?.splits as ActivitySplit[]) || [];
  const segments = activity?.segmentEfforts || [];
  const prs = activity?.personalRecords || [];

  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = Math.floor(totalSec % 60);
    if (hours > 0) {
      return `${hours}h ${min}m ${sec}s`;
    }
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleExportGpx = async () => {
    if (!activity) return;
    try {
      const gpxXml = await activityService.getGpxData(activity.id);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('GPX Generated', 'GPX data successfully generated.');
        return;
      }
      Alert.alert(
        'GPX Exported',
        `Successfully generated GPX (${(gpxXml.length / 1024).toFixed(1)} KB)`
      );
    } catch {
      Alert.alert('Export Error', 'Failed to export GPX.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  if (isError || !activity) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Could not load activity details.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initialRegion = routePoints.length > 0 ? {
    latitude: routePoints[0].latitude,
    longitude: routePoints[0].longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : {
    latitude: 36.8065,
    longitude: 10.1815,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{activity.title}</Text>
        <TouchableOpacity onPress={handleExportGpx} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        {/* Map Preview */}
        {routePoints.length >= 2 && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={routePoints.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor={theme.colors.primary}
                strokeWidth={4}
              />
              <Marker
                coordinate={{
                  latitude: routePoints[0].latitude,
                  longitude: routePoints[0].longitude,
                }}
                pinColor="green"
                title="Start"
              />
              <Marker
                coordinate={{
                  latitude: routePoints[routePoints.length - 1].latitude,
                  longitude: routePoints[routePoints.length - 1].longitude,
                }}
                pinColor="red"
                title="Finish"
              />
              {selectedPointIndex != null && routePoints[selectedPointIndex] && (
                <Marker
                  coordinate={{
                    latitude: routePoints[selectedPointIndex].latitude,
                    longitude: routePoints[selectedPointIndex].longitude,
                  }}
                  pinColor="#2AB7CA"
                  title="Scrub Point"
                />
              )}
            </MapView>
          </View>
        )}

        {/* PR Achievement Badges */}
        {prs.length > 0 && (
          <View style={styles.prsContainer}>
            <Text style={styles.prsTitle}>🏆 Personal Records Unlocked!</Text>
            <View style={styles.prsRow}>
              {prs.map((pr: any) => (
                <View key={pr.id} style={styles.prBadge}>
                  <Ionicons name="trophy" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                  <Text style={styles.prBadgeText}>
                    {pr.type.replace('_', ' ')} • {pr.value > 100 ? formatPace(pr.value) : `${pr.value.toFixed(1)} km`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Hero Activity Stats */}
        <View style={styles.statsCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroDistance}>{activity.distanceKm.toFixed(2)}</Text>
              <Text style={styles.heroDistanceUnit}>KILOMETERS</Text>
            </View>
            <View style={styles.sportTag}>
              <Text style={styles.sportTagText}>{activity.sportType}</Text>
            </View>
          </View>

          <Text style={styles.dateSubtext}>
            {format(new Date(activity.startTime), 'EEEE, MMMM d, yyyy • h:mm a')}
          </Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>MOVING TIME</Text>
              <Text style={styles.metricVal}>{formatDuration(activity.movingDurationSec || activity.durationSec)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{isRide ? 'AVG SPEED' : 'AVG PACE'}</Text>
              <Text style={styles.metricVal}>
                {isRide ? `${formatSpeed(activity.avgSpeedKmh)} km/h` : `${formatPace(activity.avgPaceSec)} /km`}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ELEVATION GAIN</Text>
              <Text style={styles.metricVal}>+{Math.round(activity.elevationGainM || 0)} m</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ENERGY</Text>
              <Text style={styles.metricVal}>{activity.calories || 0} kcal</Text>
            </View>
          </View>

          {activity.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>ATHLETE NOTES</Text>
              <Text style={styles.notesText}>{activity.notes}</Text>
            </View>
          )}
        </View>

        {/* Matched Segments */}
        {segments.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Matched Segments ({segments.length})</Text>
            {segments.map((effort: any) => (
              <View key={effort.id} style={styles.segmentCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.segmentName}>{effort.segment.name}</Text>
                  <Text style={styles.segmentDistance}>
                    {(effort.segment.distanceM / 1000).toFixed(2)} KM • +{effort.segment.elevationGainM}m
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.segmentTime}>{formatPace(effort.elapsedTimeSec)}</Text>
                  <Text style={styles.segmentSpeed}>{effort.avgSpeedKmh} km/h</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Splits Breakdown */}
        {splits.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Kilometer Splits</Text>
            {splits.map((split) => (
              <View key={split.km} style={styles.splitRow}>
                <Text style={styles.splitKm}>KM {split.km}</Text>
                <Text style={styles.splitPace}>
                  {isRide ? `${split.speedKmh} km/h` : `${formatPace(split.paceSec)} /km`}
                </Text>
                <Text style={styles.splitElev}>+{split.elevationGainM || 0}m</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: {
    padding: 6,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    maxWidth: SCREEN_WIDTH - 120,
  },
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 240,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  prsContainer: {
    backgroundColor: '#78350F',
    margin: 16,
    borderRadius: 14,
    padding: 14,
  },
  prsTitle: {
    color: '#FDE68A',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 8,
  },
  prsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  prBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    margin: 16,
    marginTop: 8,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroDistance: {
    fontSize: 54,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 60,
  },
  heroDistanceUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  sportTag: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sportTagText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 16,
  },
  metricItem: {
    width: '45%',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 3,
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },
  segmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  segmentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentDistance: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  segmentTime: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  segmentSpeed: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 6,
  },
  splitKm: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  splitPace: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  splitElev: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
