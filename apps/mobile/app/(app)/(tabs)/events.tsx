import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../../../src/services/event.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { theme } from '../../../src/theme';
import { useState } from 'react';
import { Button } from '../../../src/components/common/Button';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

export default function MyEventsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'joined' | 'organized' | 'invites'>('joined');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventService.getMyEvents(),
  });

  const { data: invitations = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => eventService.getMyInvitations(),
    enabled: activeTab === 'invites',
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
      eventService.respondToInvitation(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      Alert.alert(
        variables.status === 'ACCEPTED' ? '🎉 Accepted!' : 'Declined',
        variables.status === 'ACCEPTED' ? 'You have joined the run!' : 'Invitation declined.'
      );
    },
    onError: () => Alert.alert('Error', 'Action failed. Please try again.'),
  });

  const events = data ? (activeTab === 'joined' ? data.joined : data.organized) : [];

  const renderInvitation = ({ item }: { item: any }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <Text style={styles.inviterText}>
          📩 <Text style={{ fontFamily: theme.typography.fontFamily.bold }}>{item.inviter.name}</Text> invited you to:
        </Text>
      </View>

      <TouchableOpacity onPress={() => router.push(`/(app)/event/${item.event.id}`)}>
        <Text style={styles.eventTitle}>{item.event.title}</Text>
        <Text style={styles.eventMeta}>
          📍 {[item.event.city, item.event.region].filter(Boolean).join(', ') || 'Location TBD'}
          {item.event.distanceKm ? ` • 📏 ${item.event.distanceKm} KM` : ''}
        </Text>
        <Text style={styles.eventDate}>
          📅 {format(new Date(item.event.startAt), 'EEE, MMM d, yyyy @ h:mm a')}
        </Text>
      </TouchableOpacity>

      <View style={styles.inviteActions}>
        <Button
          title="Decline"
          variant="outline"
          size="sm"
          onPress={() => respondMutation.mutate({ id: item.id, status: 'DECLINED' })}
          isLoading={respondMutation.isPending}
          style={styles.actionBtn}
        />
        <Button
          title="Accept & Join 🏃"
          size="sm"
          onPress={() => respondMutation.mutate({ id: item.id, status: 'ACCEPTED' })}
          isLoading={respondMutation.isPending}
          style={[styles.actionBtn, { marginLeft: theme.spacing.sm }]}
        />
      </View>
    </View>
  );

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
          <Button
            title="Invites"
            variant={activeTab === 'invites' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setActiveTab('invites')}
            style={styles.tabBtn}
          />
        </View>
      </View>

      {activeTab === 'invites' ? (
        invitesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={renderInvitation}
            contentContainerStyle={styles.list}
            refreshing={invitesLoading}
            onRefresh={refetchInvites}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No pending run invitations.</Text>
              </View>
            }
          />
        )
      ) : isLoading ? (
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
    marginRight: theme.spacing.xs,
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
  },
  inviteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  inviteHeader: {
    marginBottom: theme.spacing.xs,
  },
  inviterText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
  },
  eventTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    marginBottom: 2,
  },
  eventMeta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
    marginBottom: 2,
  },
  eventDate: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.xs,
    marginBottom: theme.spacing.md,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flex: 1,
  },
});
