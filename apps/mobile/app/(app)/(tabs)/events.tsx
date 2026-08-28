import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '../../../src/services/event.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { theme } from '../../../src/theme';
import { useState } from 'react';
import { Button } from '../../../src/components/common/Button';

export default function MyEventsScreen() {
  const [activeTab, setActiveTab] = useState<'joined' | 'organized'>('joined');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventService.getMyEvents(),
  });

  const events = data ? data[activeTab] : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        <View style={styles.tabs}>
          <Button 
            title="Joined" 
            variant={activeTab === 'joined' ? 'primary' : 'ghost'} 
            size="sm"
            onPress={() => setActiveTab('joined')}
            style={styles.tabBtn}
          />
          <Button 
            title="Organized" 
            variant={activeTab === 'organized' ? 'primary' : 'ghost'} 
            size="sm"
            onPress={() => setActiveTab('organized')}
            style={styles.tabBtn}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load events.</Text>
          <Button title="Retry" onPress={() => refetch()} variant="outline" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'joined' 
                  ? "You haven't joined any events yet." 
                  : "You haven't organized any events yet."}
              </Text>
            </View>
          }
        />
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
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceElevated,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tabs: {
    flexDirection: 'row',
  },
  tabBtn: {
    marginRight: theme.spacing.sm,
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
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.medium,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.md,
  }
});
