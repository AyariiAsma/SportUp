import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../../src/theme';
import { useLocationStore } from '../../../src/stores/location.store';
import { eventService } from '../../../src/services/event.service';
import { sportService } from '../../../src/services/sport.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { TextInput } from '../../../src/components/common/TextInput';
import { useState } from 'react';
import MapView, { Marker, Callout } from '../../../src/components/common/MapView';

export default function ExploreScreen() {
  const router = useRouter();
  const { latitude, longitude, city } = useLocationStore();
  const [search, setSearch] = useState('');
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: () => sportService.getSports(),
  });

  const { data: nearbyEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['events', 'nearby', latitude, longitude],
    queryFn: () => eventService.getNearbyEvents(latitude || 0, longitude || 0),
    enabled: !!latitude && !!longitude,
  });

  // Filter events locally by search query and selected sport
  const filteredEvents = nearbyEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) || 
                          event.description.toLowerCase().includes(search.toLowerCase());
    const matchesSport = selectedSportId ? event.sportId === selectedSportId : true;
    return matchesSearch && matchesSport;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Explore Activities</Text>
          <Text style={styles.location}>📍 {city || 'Near you'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.toggleBtn}
            onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
          >
            <Text style={styles.toggleBtnText}>{viewMode === 'list' ? '🗺️ Map' : '📋 List'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/(app)/event/create')}
          >
            <Text style={styles.addBtnText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          placeholder="Search activities..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedSportId && styles.filterChipActive]}
            onPress={() => setSelectedSportId(null)}
          >
            <Text style={[styles.filterChipText, !selectedSportId && styles.filterChipTextActive]}>All Sports</Text>
          </TouchableOpacity>
          {sports.map(sport => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.filterChip, selectedSportId === sport.id && styles.filterChipActive]}
              onPress={() => setSelectedSportId(sport.id)}
            >
              <Text style={[styles.filterChipText, selectedSportId === sport.id && styles.filterChipTextActive]}>
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
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
  location: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: theme.spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  toggleBtn: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.round,
  },
  toggleBtnText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  addBtn: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.round,
  },
  addBtnText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    marginBottom: theme.spacing.sm,
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
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  filterChipTextActive: {
    color: theme.colors.text,
  },
  list: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
