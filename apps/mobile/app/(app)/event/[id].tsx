import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
  Alert, Platform, Share, TextInput, TouchableOpacity, KeyboardAvoidingView, Linking, RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../../../src/services/event.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useState, useRef } from 'react';
import type { EventComment } from '@sportup/shared';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventFlyer } from '../../../src/components/events/EventFlyer';
import { Image } from 'react-native';
import { OnlineIndicator } from '../../../src/components/common/OnlineIndicator';
import { InviteModal } from '../../../src/components/common/InviteModal';
import { resolveMediaUrl } from '../../../src/services/post.service';
import { MentionTextInput, CommentText } from '../../../src/components/common/MentionTextInput';

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const viewShotRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  const { data: rawEvent, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEventById(id as string),
  });
  const event = rawEvent as any;

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

  const likeMutation = useMutation({
    mutationFn: () => eventService.likeEvent(id as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  const likeCommentMutation = useMutation({
    mutationFn: (commentId: string) => eventService.likeComment(id as string, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ userId, attendance }: { userId: string; attendance: 'PRESENT' | 'ABSENT' }) =>
      eventService.markAttendance(id as string, userId, attendance as any),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (result?.attendance === 'PRESENT') {
        Alert.alert('Presence confirmed', `Runner earned ${result.pointsAwarded} rank points.`);
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Could not update attendance');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventService.deleteEvent(id as string),
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
    const fullAddress = [event.locationName, event.locality, event.city, event.region, event.country]
      .filter(Boolean)
      .join(', ') || 'See location in app';

    const shareMessage = `🏃 ${event.title}\n\n${event.distanceKm ? `📏 ${event.distanceKm} KM\n` : ''}📍 ${fullAddress}\n🗓 ${format(new Date(event.startAt), 'EEEE, MMMM d')}\n⏰ ${format(new Date(event.startAt), 'h:mm a')}\n\nJoin us on SportUp!`;

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
          await Share.share({ message: shareMessage });
        }
      } else {
        await Share.share({ message: shareMessage });
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
  const canMarkAttendance = event.status === 'STARTED' || event.status === 'COMPLETED';
  const difficultyColor = event.difficulty ? DIFFICULTY_COLOR[event.difficulty] : '#4CAF50';
  const spotsLeft = event.maxParticipants ? event.maxParticipants - event.participantCount : null;

  const renderComment = ({ item }: { item: EventComment }) => {
    const isOwn = item.authorId === user?.id;
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    const CommentLikeButton = ({ comment }: { comment: EventComment }) => (
      <TouchableOpacity
        style={styles.commentLikeBtn}
        onPress={() => likeCommentMutation.mutate(comment.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.commentLikeIcon, comment.isLiked && styles.commentLikedIcon]}>
          {comment.isLiked ? '❤️' : '🤍'}
        </Text>
        {(comment.likesCount ?? 0) > 0 && (
          <Text style={[styles.commentLikeCount, comment.isLiked && styles.commentLikedCount]}>
            {comment.likesCount}
          </Text>
        )}
      </TouchableOpacity>
    );

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
          <View style={styles.commentActions}>
            <CommentLikeButton comment={item} />
            {(isOwn || isOrganizer) && (
              <TouchableOpacity onPress={() => deleteCommentMutation.mutate(item.id)}>
                <Text style={styles.deleteComment}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <CommentText text={item.content} style={styles.commentContent} />
        {/* Replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply: EventComment) => (
              <View key={reply.id} style={styles.replyCard}>
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, styles.replyAvatar]}>
                    <Text style={styles.commentAvatarLetter}>{reply.author.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{reply.author.name}</Text>
                    <Text style={styles.commentTime}>
                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                  <View style={styles.commentActions}>
                    <CommentLikeButton comment={reply} />
                    {(reply.authorId === user?.id || isOrganizer) && (
                      <TouchableOpacity onPress={() => deleteCommentMutation.mutate(reply.id)}>
                        <Text style={styles.deleteComment}>🗑</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <CommentText text={reply.content} style={[styles.commentContent, { marginLeft: 8 }]} />
              </View>
            ))}
          </View>
        )}
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
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

          {/* ── Location Section ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>
            {event.locationName ? <Text style={styles.locationName}>{event.locationName}</Text> : null}
            {(event.locality || event.city || event.region || event.country) && (
              <Text style={styles.city}>
                {[event.locality, event.city, event.region, event.country].filter(Boolean).join(', ')}
              </Text>
            )}

            <Button
              title="Get Directions 🗺️"
              variant="outline"
              onPress={() => {
                const fullAddressString = [event.locationName, event.locality, event.city, event.region, event.country]
                  .filter(Boolean)
                  .join(', ');
                
                if (!fullAddressString && (event.lat == null || event.lng == null)) {
                  Alert.alert('No Location', 'Location details are not specified for this run.');
                  return;
                }

                const query = encodeURIComponent(fullAddressString || `${event.lat},${event.lng}`);
                const url = Platform.select({
                  ios: `maps://app?daddr=${query}`,
                  android: `google.navigation:q=${query}`,
                  default: `https://www.google.com/maps/search/?api=1&query=${query}`,
                });
                Linking.openURL(url).catch(() => {
                  Alert.alert('Error', 'Could not open navigation application.');
                });
              }}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>

          {/* ── Participants ── */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={styles.sectionTitle}>👟 Participants</Text>
              <TouchableOpacity
                onPress={() => setShowInviteModal(true)}
                style={{
                  backgroundColor: 'rgba(255, 107, 53, 0.1)',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 6,
                  borderRadius: theme.border.radius.round,
                }}
              >
                <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.sm }}>
                  + Invite
                </Text>
              </TouchableOpacity>
            </View>
            {event.participants && event.participants.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.participantsList}>
                  {event.participants.map((p: any) => (
                    <View key={p.id} style={styles.participantAvatarContainer}>
                      {p.user.avatar ? (
                        <Image source={{ uri: resolveMediaUrl(p.user.avatar) }} style={styles.participantAvatarImg} />
                      ) : (
                        <View style={styles.participantAvatarPlaceholder}>
                          <Text style={styles.participantLetter}>{p.user.name.charAt(0)}</Text>
                        </View>
                      )}
                      <OnlineIndicator isOnline={p.user.isOnline} size="sm" />
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noComments}>No participants yet.</Text>
            )}
          </View>

          {/* ── Attendance (organizer only, once the run has started) ── */}
          {isOrganizer && canMarkAttendance && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Confirm presence</Text>
              <Text style={styles.attendanceHint}>
                Confirming a runner's presence awards them rank points and can level up their rank.
              </Text>
              {event.participants && event.participants.length > 0 ? (
                event.participants.map((p: any) => (
                  <View key={p.id} style={styles.attendanceRow}>
                    <Text style={styles.attendanceName} numberOfLines={1}>
                      {p.user.name}
                      {p.attendance === 'PRESENT' && p.pointsAwarded ? ` · +${p.pointsAwarded} pts` : ''}
                    </Text>
                    <View style={styles.attendanceActions}>
                      <TouchableOpacity
                        style={[styles.attendanceBtn, p.attendance === 'PRESENT' && styles.attendanceBtnPresent]}
                        disabled={attendanceMutation.isPending}
                        onPress={() => attendanceMutation.mutate({ userId: p.userId, attendance: 'PRESENT' })}
                      >
                        <Text style={[styles.attendanceBtnText, p.attendance === 'PRESENT' && styles.attendanceBtnTextActive]}>
                          Present
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.attendanceBtn, p.attendance === 'ABSENT' && styles.attendanceBtnAbsent]}
                        disabled={attendanceMutation.isPending}
                        onPress={() => attendanceMutation.mutate({ userId: p.userId, attendance: 'ABSENT' })}
                      >
                        <Text style={[styles.attendanceBtnText, p.attendance === 'ABSENT' && styles.attendanceBtnTextActive]}>
                          Absent
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noComments}>Nobody joined this run.</Text>
              )}
            </View>
          )}

          <InviteModal
            eventId={event.id}
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
          />

          {/* ── Like Event ── */}
          <TouchableOpacity
            style={[styles.eventLikeBtn, event.isLiked && styles.eventLikeBtnActive]}
            onPress={() => likeMutation.mutate()}
            activeOpacity={0.8}
          >
            <Text style={styles.eventLikeEmoji}>{event.isLiked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.eventLikeText, event.isLiked && styles.eventLikeTextActive]}>
              {event.isLiked ? 'Liked' : 'Like this run'}
            </Text>
            {(event.likesCount ?? 0) > 0 && (
              <Text style={[styles.eventLikeCount, event.isLiked && styles.eventLikeTextActive]}>
                · {event.likesCount} {event.likesCount === 1 ? 'like' : 'likes'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Comments ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              💬 Comments ({event.comments?.length ?? 0})
            </Text>

            {event.comments && event.comments.length > 0 ? (
              event.comments.map((c: any) => (
                <View key={c.id}>
                  {renderComment({ item: c })}
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            )}

            {/* Comment input with @mention */}
            <View style={styles.commentInputRow}>
              <MentionTextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment... type @ to mention"
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
  participantsList: { flexDirection: 'row', gap: theme.spacing.sm },
  participantAvatarContainer: { position: 'relative', width: 40, height: 40 },
  participantAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  participantAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  participantLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 16 },
  attendanceHint: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, marginBottom: theme.spacing.sm },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, padding: theme.spacing.sm, marginBottom: theme.spacing.xs },
  attendanceName: { flex: 1, color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, marginRight: theme.spacing.sm },
  attendanceActions: { flexDirection: 'row', gap: theme.spacing.xs },
  attendanceBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.border.radius.round, borderWidth: 1, borderColor: theme.colors.textMuted },
  attendanceBtnPresent: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  attendanceBtnAbsent: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  attendanceBtnText: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm },
  attendanceBtnTextActive: { color: '#fff' },
  commentCard: { backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  replyAvatar: { width: 26, height: 26, borderRadius: 13 },
  commentAvatarLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 14 },
  commentMeta: { flex: 1 },
  commentAuthor: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm },
  commentTime: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteComment: { fontSize: 14 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 2 },
  commentLikeIcon: { fontSize: 14 },
  commentLikedIcon: { fontSize: 14 },
  commentLikeCount: { color: theme.colors.textMuted, fontSize: 11, fontFamily: theme.typography.fontFamily.medium },
  commentLikedCount: { color: theme.colors.primary },
  commentContent: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.regular, lineHeight: 20 },
  repliesContainer: { marginTop: theme.spacing.sm, marginLeft: theme.spacing.lg, gap: theme.spacing.xs },
  replyCard: { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.border.radius.sm, padding: theme.spacing.sm, marginTop: 4 },
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
  eventLikeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: theme.border.radius.round,
    paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  eventLikeBtnActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)', borderColor: theme.colors.primary,
  },
  eventLikeEmoji: { fontSize: 20 },
  eventLikeText: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.md },
  eventLikeTextActive: { color: theme.colors.primary },
  eventLikeCount: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.md },
});
