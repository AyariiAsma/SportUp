import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Platform, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../../src/theme';
import { useLocationStore } from '../../../src/stores/location.store';
import { eventService } from '../../../src/services/event.service';
import { sportService } from '../../../src/services/sport.service';
import { EventCard } from '../../../src/components/events/EventCard';

import { useAuthStore } from '../../../src/stores/auth.store';
import { useState } from 'react';
import MapView, { Marker, Callout } from '../../../src/components/common/MapView';
import { Ionicons } from '@expo/vector-icons';

const SPORT_EMOJIS: Record<string, string> = {
  Running: '🏃',
  Walking: '🚶',
  Cycling: '🚴',
  Hiking: '🥾',
  Football: '⚽',
  Basketball: '🏀',
  Fitness: '💪',
  Yoga: '🧘',
  Swimming: '🏊',
  Tennis: '🎾',
};

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { latitude, longitude, city } = useLocationStore();
  const [search, setSearch] = useState('');
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const displayLocation = city || user?.region || user?.city || user?.locality || 'Near you';

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportService.getSports(),
  });

  const { data: nearbyEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['events', 'explore', latitude, longitude, user?.region, user?.city],
    queryFn: async () => {
      if (latitude && longitude) {
        return eventService.getNearbyEvents(latitude, longitude);
      }
      const profileGovernorate = user?.region || user?.city;
      if (profileGovernorate) {
        const regionalEvents = await eventService.getEvents({ region: profileGovernorate });
        if (regionalEvents.length > 0) return regionalEvents;
      }
      return eventService.getEvents();
    },
  });

  const filteredEvents = nearbyEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                          event.description.toLowerCase().includes(search.toLowerCase());
    const matchesSport = selectedSportId ? event.sportId === selectedSportId : true;
    return matchesSearch && matchesSport;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Explore Activities</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={theme.colors.primary} />
            <Text style={styles.location}>{displayLocation}</Text>
          </View>
        </View>
        {/* Map / List segmented control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? '#fff' : theme.colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map"
              size={16}
              color={viewMode === 'map' ? '#fff' : theme.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search + Filters ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <RNTextInput
            placeholder="Search activities..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedSportId && styles.filterChipActive]}
            onPress={() => setSelectedSportId(null)}
          >
            <Text style={[styles.filterChipText, !selectedSportId && styles.filterChipTextActive]}>
              🏅 All
            </Text>
          </TouchableOpacity>
          {sports.map(sport => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.filterChip, selectedSportId === sport.id && styles.filterChipActive]}
              onPress={() => setSelectedSportId(sport.id)}
            >
              <Text style={[styles.filterChipText, selectedSportId === sport.id && styles.filterChipTextActive]}>
                {SPORT_EMOJIS[sport.name] || '⚡'} {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Result count label */}
      {!isLoading && !error && viewMode === 'list' && (
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>Could not load events.</Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.icon}>🏜️</Text>
              <Text style={styles.emptyTitle}>No events found.</Text>
              <Text style={styles.emptyText}>Try adjusting your search or filters.</Text>
            </View>
          }
        />
      ) : Platform.OS !== 'web' ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: latitude || 48.8566,
              longitude: longitude || 2.3522,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {filteredEvents.map(event => (
              <Marker
                key={event.id}
                coordinate={{ latitude: event.lat, longitude: event.lng }}
                title={event.title}
                description={event.sport.name}
              >
                <Callout onPress={() => router.push(`/(app)/event/${event.id}`)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{event.title}</Text>
                    <Text style={styles.calloutSport}>{event.sport.name}</Text>
                    <Text style={styles.calloutAction}>Tap to view details</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.textMuted }}>Map view is not supported on web.</Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/event/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  location: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.round,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.border.radius.round,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.round,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: 'transparent',
  },
  filterChipText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultRow: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    letterSpacing: 0.3,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: 80,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.medium,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  callout: {
    width: 150,
    padding: theme.spacing.sm,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bold,
    color: '#000',
  },
  calloutSport: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: 2,
  },
  calloutAction: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  }
});
