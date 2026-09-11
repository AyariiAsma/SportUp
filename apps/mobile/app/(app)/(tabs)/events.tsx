import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../../../src/services/event.service';
import { EventCard } from '../../../src/components/events/EventCard';
import { theme } from '../../../src/theme';
import { useState } from 'react';
import { Button } from '../../../src/components/common/Button';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TabKey = 'joined' | 'organized' | 'invites';

function SegmentedControl({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: TabKey; label: string; badgeCount?: number }[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <View style={segStyles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[segStyles.tab, active === tab.key && segStyles.tabActive]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.8}
        >
          <Text style={[segStyles.label, active === tab.key && segStyles.labelActive]}>
            {tab.label}
          </Text>
          {tab.badgeCount != null && tab.badgeCount > 0 && (
            <View style={segStyles.badge}>
              <Text style={segStyles.badgeText}>
                {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.round,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.border.radius.round,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.border.radius.round,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
  },
});

export default function MyEventsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('joined');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventService.getMyEvents(),
  });

  const { data: invitations = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => eventService.getMyInvitations(),
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
      <View style={styles.inviteAccentBar} />
      <View style={styles.inviteCardInner}>
        <View style={styles.inviteHeader}>
          <View style={styles.inviteIconWrap}>
            <Ionicons name="mail" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.inviterText}>
            <Text style={{ fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text }}>
              {item.inviter.name}
            </Text>
            {' '}invited you to join:
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push(`/(app)/event/${item.event.id}`)}>
          <Text style={styles.eventTitle}>{item.event.title}</Text>
          <View style={styles.eventMetaRow}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.eventMeta}>
              {[item.event.city, item.event.region].filter(Boolean).join(', ') || 'Location TBD'}
              {item.event.distanceKm ? ` • ${item.event.distanceKm} KM` : ''}
            </Text>
          </View>
          <View style={styles.eventMetaRow}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
            <Text style={styles.eventDate}>
              {format(new Date(item.event.startAt), 'EEE, MMM d, yyyy @ h:mm a')}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => respondMutation.mutate({ id: item.id, status: 'DECLINED' })}
            disabled={respondMutation.isPending}
          >
            <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => respondMutation.mutate({ id: item.id, status: 'ACCEPTED' })}
            disabled={respondMutation.isPending}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.acceptBtnText}>Accept & Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const tabs: { key: TabKey; label: string; badgeCount?: number }[] = [
    { key: 'joined', label: 'Joined', badgeCount: undefined },
    { key: 'organized', label: 'Organized', badgeCount: undefined },
    { key: 'invites', label: 'Invites', badgeCount: invitations.length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Runs</Text>
        <SegmentedControl
          tabs={tabs}
          active={activeTab}
          onChange={setActiveTab}
        />
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
                <Ionicons name="mail-open-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No pending invitations</Text>
                <Text style={styles.emptyText}>When someone invites you, it'll appear here.</Text>
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
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
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
              <Ionicons
                name={activeTab === 'joined' ? 'footsteps-outline' : 'trophy-outline'}
                size={48}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'joined' ? 'No runs joined yet' : 'No runs organized yet'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'joined'
                  ? 'Explore nearby events and join your first run!'
                  : 'Create a run and invite others to join you!'}
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
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
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
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.medium,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.18)',
  },
  inviteAccentBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
  },
  inviteCardInner: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  inviteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,53,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviterText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    flex: 1,
  },
  eventTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventMeta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  eventDate: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.xs,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: theme.colors.surfaceElevated,
  },
  declineBtnText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.sm,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.border.radius.lg,
    backgroundColor: theme.colors.primary,
  },
  acceptBtnText: {
    color: '#fff',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
  },
});
