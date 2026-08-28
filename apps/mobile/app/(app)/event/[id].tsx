import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
  Alert, Platform, Share, TextInput, TouchableOpacity, KeyboardAvoidingView, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../../../src/services/event.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../../src/stores/auth.store';
import MapView, { Marker, Polyline } from '../../../src/components/common/MapView';
import { useState, useRef } from 'react';
import type { EventComment } from '@sportup/shared';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventFlyer } from '../../../src/components/events/EventFlyer';

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#4CAF50',
  INTERMEDIATE: '#FF9800',
  ADVANCED: '#F44336',
  ELITE: '#9C27B0',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const viewShotRef = useRef<ViewShot>(null);
  const insets = useSafeAreaInsets();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id as string),
  });

  const joinMutation = useMutation({
    mutationFn: () => eventService.joinEvent(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      Alert.alert('🎉 Joined!', 'You\'re now registered for this run. See you there!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Could not join run');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => eventService.leaveEvent(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      Alert.alert('Left', 'You have left this run.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Could not leave run');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => eventService.postComment(id as string, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: () => Alert.alert('Error', 'Could not post comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => eventService.deleteComment(id as string, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventService.deleteEvent ? eventService.deleteEvent(id as string) : api.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      queryClient.removeQueries({ queryKey: ['event', id] });
      Alert.alert('Deleted', 'Your run has been deleted.');
      router.replace('/(app)/(tabs)/home');
    },
    onError: () => {
      Alert.alert('Error', 'Could not delete run');
    },
  });

  const shareEvent = async () => {
    if (!event) return;
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Share ${event.title}`,
            UTI: 'public.png',
          });
        } else {
          await Share.share({
            message: `🏃 ${event.title}\n\n${event.distanceKm ? `📏 ${event.distanceKm} KM\n` : ''}📍 ${event.city || event.locationName || 'See location in app'}\n🗓 ${format(new Date(event.startAt), 'EEEE, MMMM d')}\n⏰ ${format(new Date(event.startAt), 'h:mm a')}\n\nJoin us on SportUp!`,
          });
        }
      } else {
        await Share.share({
          message: `🏃 ${event.title}\n\n${event.distanceKm ? `📏 ${event.distanceKm} KM\n` : ''}📍 ${event.city || event.locationName || 'See location in app'}\n🗓 ${format(new Date(event.startAt), 'EEEE, MMMM d')}\n⏰ ${format(new Date(event.startAt), 'h:mm a')}\n\nJoin us on SportUp!`,
        });
      }
    } catch (err) {
      console.error('Error sharing flyer:', err);
      Alert.alert('Error', 'Could not open share dialog.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Run not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const isOrganizer = event.organizerId === user?.id;
  const difficultyColor = event.difficulty ? DIFFICULTY_COLOR[event.difficulty] : '#4CAF50';
  const spotsLeft = event.maxParticipants ? event.maxParticipants - event.participantCount : null;

  const renderComment = ({ item }: { item: EventComment }) => {
    const isOwn = item.authorId === user?.id;
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarLetter}>{item.author.name.charAt(0)}</Text>
          </View>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>{item.author.name}</Text>
            <Text style={styles.commentTime}>{timeAgo}</Text>
          </View>
          {(isOwn || isOrganizer) && (
            <TouchableOpacity onPress={() => deleteCommentMutation.mutate(item.id)}>
              <Text style={styles.deleteComment}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Header Row (Back Button + Badges) ── */}
          <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.badgeRow}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportText}>{event.sport.name.toUpperCase()}</Text>
              </View>
              {event.difficulty && (
                <View style={[styles.diffBadge, { borderColor: difficultyColor }]}>
                  <Text style={[styles.diffText, { color: difficultyColor }]}>
                    {event.difficulty.charAt(0) + event.difficulty.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Title ── */}
          <Text style={styles.title}>{event.title}</Text>

          {/* ── Key stats ── */}
          <View style={styles.statsRow}>
            {event.distanceKm != null && (
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🏃</Text>
                <Text style={styles.statValue}>{event.distanceKm} KM</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>📅</Text>
              <Text style={styles.statValue}>{format(new Date(event.startAt), 'EEE, MMM d')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⏰</Text>
              <Text style={styles.statValue}>{format(new Date(event.startAt), 'h:mm a')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>👥</Text>
              <Text style={styles.statValue}>
                {event.participantCount}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
              </Text>
              {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
                <Text style={styles.spotsLeft}>{spotsLeft} spots left</Text>
              )}
            </View>
          </View>

          {/* ── Organizer ── */}
          <View style={styles.organizerCard}>
            <View style={styles.orgAvatar}>
              <Text style={styles.orgAvatarLetter}>{event.organizer.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.orgLabel}>Organized by</Text>
              <Text style={styles.orgName}>{event.organizer.name}</Text>
              <Text style={styles.orgUsername}>@{event.organizer.username}</Text>
            </View>
          </View>

          {/* ── Description ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this run</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* ── Map & Route Section ── */}
          {(() => {
            let parsedRoutePoints: Array<{ lat: number, lng: number }> = [];
            if (event.route?.points) {
              try {
                const pts = typeof event.route.points === 'string'
                  ? JSON.parse(event.route.points)
                  : event.route.points;
                if (Array.isArray(pts)) {
                  const sortedPts = [...pts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                  parsedRoutePoints = sortedPts.map(p => ({ lat: p.lat, lng: p.lng }));
                }
              } catch {
                parsedRoutePoints = [];
              }
            }

            const handleGetDirections = () => {
              if (event.lat == null || event.lng == null) return;
              const url = Platform.select({
                ios: `maps://app?saddr=&daddr=${event.lat},${event.lng}`,
                android: `google.navigation:q=${event.lat},${event.lng}`,
                default: `https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`,
              });
              Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open navigation application.');
              });
            };

            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Location & Route</Text>
                {event.locationName ? <Text style={styles.locationName}>{event.locationName}</Text> : null}
                {event.city ? (
                  <Text style={styles.city}>
                    {event.city}{event.region ? `, ${event.region}` : ''}{event.country ? `, ${event.country}` : ''}
                  </Text>
                ) : null}

                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: event.lat,
                      longitude: event.lng,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    routeCoordinates={parsedRoutePoints}
                  >
                    <Marker coordinate={{ latitude: event.lat, longitude: event.lng }} />
                    {parsedRoutePoints.map((pt, idx) => (
                      <Marker 
                        key={idx} 
                        coordinate={{ latitude: pt.lat, longitude: pt.lng }} 
                        pinColor="#ff6b35"
                      />
                    ))}
                    {parsedRoutePoints.length > 0 && (
                      <Polyline
                        coordinates={[
                          { latitude: event.lat, longitude: event.lng },
                          ...parsedRoutePoints.map(p => ({ latitude: p.lat, longitude: p.lng }))
                        ]}
                        strokeColor="#ff6b35"
                        strokeWidth={4}
                      />
                    )}
                  </MapView>
                </View>

                <Button
                  title="Get Directions 🗺️"
                  variant="outline"
                  onPress={handleGetDirections}
                  style={{ marginTop: theme.spacing.sm }}
                />
              </View>
            );
          })()}

          {/* ── Participants ── */}
          {event.participants && event.participants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👟 Participants</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.participantsList}>
                  {event.participants.map((p) => (
                    <View key={p.id} style={styles.participantAvatar}>
                      <Text style={styles.participantLetter}>{p.user.name.charAt(0)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Comments ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              💬 Comments ({event.comments?.length ?? 0})
            </Text>

            {event.comments && event.comments.length > 0 ? (
              event.comments.map((c) => (
                <View key={c.id}>
                  {renderComment({ item: c })}
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            )}

            {/* Comment input */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                onPress={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                <Text style={styles.sendBtnText}>
                  {commentMutation.isPending ? '...' : '→'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom action bar ── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          {isOrganizer ? (
            <View style={styles.actionRow}>
              <Button
                title="Edit"
                variant="outline"
                onPress={() => router.push(`/(app)/event/edit?id=${event.id}`)}
                style={styles.flexBtn}
              />
              <Button
                title="Delete"
                variant="outline"
                onPress={() => {
                  Alert.alert(
                    'Delete Run',
                    'Are you sure you want to delete this run? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() }
                    ]
                  );
                }}
                isLoading={deleteMutation.isPending}
                style={[styles.flexBtn, { borderColor: theme.colors.error }]}
              />
              <Button title="Share" variant="outline" onPress={shareEvent} style={styles.flexBtn} />
            </View>
          ) : event.isJoined ? (
            <View style={styles.actionRow}>
              <View style={styles.joinedPill}>
                <Text style={styles.joinedText}>✓ You're in!</Text>
              </View>
              <Button title="Leave" variant="outline" onPress={() => leaveMutation.mutate()} isLoading={leaveMutation.isPending} style={styles.flexBtn} />
              <Button title="Share" variant="outline" onPress={shareEvent} style={styles.flexBtn} />
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Button
                title={spotsLeft === 0 ? 'Run Full' : 'Join Run'}
                onPress={() => joinMutation.mutate()}
                isLoading={joinMutation.isPending}
                disabled={spotsLeft === 0}
                style={styles.flexBtn}
              />
              <Button title="Share" variant="outline" onPress={shareEvent} style={styles.flexBtn} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Hidden flyer generator component */}
      <View style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0 }} pointerEvents="none">
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <EventFlyer event={event} />
        </ViewShot>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md },
  backBtn: { paddingVertical: theme.spacing.xs },
  backText: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.medium },
  badgeRow: { flexDirection: 'row', gap: theme.spacing.sm },
  sportBadge: { backgroundColor: 'rgba(255,107,53,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sportText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 11, letterSpacing: 1 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  diffText: { fontFamily: theme.typography.fontFamily.semiBold, fontSize: 11 },
  title: { fontSize: theme.typography.size.xl, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, padding: theme.spacing.md, paddingTop: theme.spacing.sm, lineHeight: 28 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  statItem: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, padding: theme.spacing.sm, minWidth: 70, alignItems: 'center' },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statValue: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm, textAlign: 'center' },
  spotsLeft: { color: '#FF9800', fontFamily: theme.typography.fontFamily.medium, fontSize: 10, marginTop: 2 },
  organizerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.border.radius.lg, marginBottom: theme.spacing.md },
  orgAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  orgAvatarLetter: { color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  orgLabel: { color: theme.colors.textMuted, fontSize: 11, fontFamily: theme.typography.fontFamily.regular },
  orgName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.md },
  orgUsername: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 12 },
  section: { paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.typography.size.md, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.text, marginBottom: theme.spacing.sm },
  description: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.regular, lineHeight: 22 },
  locationName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, marginBottom: 2 },
  city: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, marginBottom: theme.spacing.sm },
  mapContainer: { height: 180, borderRadius: theme.border.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.surfaceElevated },
  map: { width: '100%', height: '100%' },
  participantsList: { flexDirection: 'row', gap: theme.spacing.sm },
  participantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  participantLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 16 },
  commentCard: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  commentAvatarLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 14 },
  commentMeta: { flex: 1 },
  commentAuthor: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm },
  commentTime: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11 },
  deleteComment: { fontSize: 14 },
  commentContent: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.regular, lineHeight: 20 },
  noComments: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontStyle: 'italic' },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: theme.spacing.md, gap: theme.spacing.sm },
  commentInput: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.lg, padding: theme.spacing.md, color: theme.colors.text, fontFamily: theme.typography.fontFamily.regular, maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  errorText: { color: theme.colors.error, marginBottom: theme.spacing.md },
  bottomBar: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flexBtn: { flex: 1 },
  joinedPill: { flex: 1, backgroundColor: 'rgba(76,175,80,0.12)', borderRadius: theme.border.radius.round, height: 44, justifyContent: 'center', alignItems: 'center' },
  joinedText: { color: '#4CAF50', fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.sm },
});
