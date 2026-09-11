import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView,
  TouchableOpacity, Image, Alert, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { mediaService } from '../../../src/services/media.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService, type Post, type PostComment, resolveMediaUrl } from '../../../src/services/post.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useState } from 'react';
import { MentionTextInput, CommentText } from '../../../src/components/common/MentionTextInput';
import { Ionicons } from '@expo/vector-icons';

function CommentItem({
  comment,
  postId,
  currentUserId,
  depth = 0,
  onReplyToUser,
}: {
  comment: PostComment;
  postId: string;
  currentUserId: string;
  depth?: number;
  onReplyToUser?: (username: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showReplyList, setShowReplyList] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const isOwn = comment.authorId === currentUserId;

  const replyMutation = useMutation({
    mutationFn: (text: string) => postService.addComment(postId, text, comment.id),
    onSuccess: () => {
      setReplyText('');
      setShowReplyInput(false);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: () => Alert.alert('Error', 'Could not post reply'),
  });

  const editMutation = useMutation({
    mutationFn: (text: string) => postService.editComment(postId, comment.id, text),
    onSuccess: () => {
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: () => Alert.alert('Error', 'Could not edit comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postService.deleteComment(postId, comment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId] }),
    onError: () => Alert.alert('Error', 'Could not delete comment'),
  });

  const handleReplyPress = () => {
    if (depth > 0 && onReplyToUser) {
      onReplyToUser(comment.author.username);
    } else {
      setShowReplyInput(true);
      setShowReplyList(true);
    }
  };

  return (
    <View style={[styles.commentItem, depth > 0 && styles.commentItemNested]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>{comment.author.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.commentAuthor}>{comment.author.name}</Text>
          <Text style={styles.commentTime}>{timeAgo}</Text>
        </View>
        {isOwn && (
          <View style={styles.commentActions}>
            <TouchableOpacity onPress={() => setEditMode(v => !v)} style={styles.commentActionBtn}>
              <Ionicons name="pencil-outline" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Delete Comment', 'Remove this comment?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                ])
              }
              style={styles.commentActionBtn}
            >
              <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editMode ? (
        <View style={styles.editRow}>
          <MentionTextInput
            value={editText}
            onChangeText={setEditText}
            placeholder="Edit comment..."
          />
          <TouchableOpacity
            style={styles.sendSmallBtn}
            onPress={() => editText.trim() && editMutation.mutate(editText.trim())}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <CommentText text={comment.content} style={styles.commentContent} />
      )}

      <View style={styles.commentActionBar}>
        <TouchableOpacity onPress={handleReplyPress} style={styles.replyToggle}>
          <Ionicons name="return-down-forward-outline" size={12} color={theme.colors.primary} />
          <Text style={styles.replyToggleText}>Reply</Text>
        </TouchableOpacity>

        {depth === 0 && comment.replies && comment.replies.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplyList(v => !v)} style={styles.replyToggle}>
            <Ionicons name="chatbubble-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.replyCountText}>
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showReplyList && depth === 0 && (
        <>
          {comment.replies?.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              depth={1}
              onReplyToUser={(username) => {
                setShowReplyInput(true);
                setShowReplyList(true);
                setReplyText(`@${username} `);
              }}
            />
          ))}

          {showReplyInput && (
            <View style={styles.replyInputRow}>
              <MentionTextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Reply to ${comment.author.name}...`}
              />
              <TouchableOpacity
                style={[styles.sendSmallBtn, !replyText.trim() && { opacity: 0.4 }]}
                onPress={() => replyText.trim() && replyMutation.mutate(replyText.trim())}
                disabled={!replyText.trim() || replyMutation.isPending}
              >
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function PostCard({ post, currentUserId }: { post: Post; currentUserId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.content || '');
  const existingImage = post.media?.[0] ? resolveMediaUrl(post.media[0].url) : null;
  const [editImageUri, setEditImageUri] = useState<string | null>(existingImage);
  const [editImageRemoved, setEditImageRemoved] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const isOwn = post.authorId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  // Recent = posted in the last 1 hour
  const isRecent = differenceInHours(new Date(), new Date(post.createdAt)) < 1;

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => postService.getComments(post.id),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => post.isLiked ? postService.unlikePost(post.id) : postService.likePost(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const toggleEditMode = () => {
    if (!editMode) {
      setEditText(post.content || '');
      setEditImageUri(existingImage);
      setEditImageRemoved(false);
    }
    setEditMode(!editMode);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEditImageUri(result.assets[0].uri);
      setEditImageRemoved(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() && !editImageUri) {
      Alert.alert('Error', 'Post must have content or an image');
      return;
    }
    let mediaIds = undefined;
    if (editImageUri && !editImageUri.startsWith('http')) {
      const uploaded = await mediaService.uploadMedia(editImageUri);
      mediaIds = [uploaded.id];
    } else if (editImageRemoved) {
      mediaIds = [];
    }
    editMutation.mutate({ text: editText.trim(), mediaIds });
  };

  const editMutation = useMutation({
    mutationFn: ({ text, mediaIds }: { text: string; mediaIds?: string[] }) => postService.updatePost(post.id, text, mediaIds),
    onSuccess: () => {
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => Alert.alert('Error', 'Could not edit post'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postService.deletePost(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
    onError: () => Alert.alert('Error', 'Could not delete post'),
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => postService.addComment(post.id, text),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => Alert.alert('Error', 'Could not post comment'),
  });

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/user/${post.authorId}` as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.avatarPlaceholder, isRecent && styles.avatarPlaceholderRecent]}>
            {post.author.avatar ? (
              <Image source={{ uri: resolveMediaUrl(post.author.avatar) }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>{post.author.name.charAt(0)}</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorMeta}>@{post.author.username} · {timeAgo}</Text>
        </View>
        {isOwn && (
          <View style={styles.postMenuRow}>
            <TouchableOpacity style={styles.postMenuBtn} onPress={toggleEditMode}>
              <Ionicons name="pencil-outline" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postMenuBtn}
              onPress={() =>
                Alert.alert('Delete Post', 'Remove this post?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                ])
              }
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content / Edit */}
      {editMode ? (
        <View style={styles.editBlock}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            placeholder="Edit post..."
            placeholderTextColor={theme.colors.textMuted}
          />
          {editImageUri ? (
            <View style={styles.editImageContainer}>
              <Image source={{ uri: editImageUri }} style={styles.editImagePreview} />
              <TouchableOpacity 
                style={styles.removeImageBtn} 
                onPress={() => { setEditImageUri(null); setEditImageRemoved(true); }}
              >
                <Text style={styles.removeText}>✕ Remove Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editAddPhotoBtn} onPress={pickImage}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.editAddPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={styles.editCancelBtn} onPress={toggleEditMode}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editSaveBtn, editMutation.isPending && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={editMutation.isPending}
            >
              <Text style={styles.editSaveText}>
                {editMutation.isPending ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {post.content ? <CommentText text={post.content} style={styles.postContent} /> : null}
          {/* Media images */}
          {post.media && post.media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              {post.media.map(m => (
                <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => setViewerImage(resolveMediaUrl(m.url))}>
                  <Image
                    source={{ uri: resolveMediaUrl(m.url) }}
                    style={styles.postMedia}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerImage(null)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {viewerImage && (
            <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map(tag => (
            <Text key={tag.id} style={styles.tagBadge}>@{tag.user.username}</Text>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => likeMutation.mutate()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showComments ? 'chatbubble' : 'chatbubble-outline'}
            size={18}
            color={showComments ? theme.colors.secondary : theme.colors.textMuted}
          />
          <Text style={[styles.actionText, showComments && { color: theme.colors.secondary }]}>
            {post.commentsCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              currentUserId={currentUserId}
            />
          ))}

          <View style={styles.commentInputRow}>
            <MentionTextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment... type @ to mention"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
              onPress={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
              disabled={!commentText.trim() || commentMutation.isPending}
            >
              <Ionicons
                name={commentMutation.isPending ? 'hourglass-outline' : 'arrow-forward'}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => postService.getFeed(),
  });

  const posts = data?.posts || [];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Community Feed</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.errorText}>Could not load feed.</Text>
            <Button title="Retry" onPress={() => refetch()} variant="outline" />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PostCard post={item} currentUserId={user?.id || ''} />
            )}
            contentContainerStyle={styles.list}
            refreshing={isLoading}
            onRefresh={refetch}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="megaphone-outline" size={40} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Be the first to post!</Text>
                <Text style={styles.emptyText}>Share your runs, achievements, and tips with the community.</Text>
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/(app)/post/create')}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyActionText}>Create a Post</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(app)/post/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
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
  list: { padding: theme.spacing.md, paddingBottom: 80, flexGrow: 1 },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  avatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarPlaceholderRecent: {
    borderColor: theme.colors.primary,
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarLetter: { color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  authorName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.md },
  authorMeta: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.xs },
  postMenuRow: { flexDirection: 'row', gap: 4 },
  postMenuBtn: { padding: 6 },
  postContent: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  editBlock: { marginVertical: theme.spacing.xs },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.xs },
  editInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  editBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  editCancelBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.border.radius.md, backgroundColor: theme.colors.surfaceElevated },
  editCancelText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  editSaveBtn: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.border.radius.md, backgroundColor: theme.colors.primary },
  editSaveText: { color: '#fff', fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.sm },
  mediaScroll: { marginBottom: theme.spacing.sm },
  postMedia: {
    width: 260, height: 180, borderRadius: theme.border.radius.md, marginRight: theme.spacing.sm,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: theme.spacing.sm },
  tagBadge: {
    backgroundColor: 'rgba(255,107,53,0.08)', color: theme.colors.primary,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: theme.border.radius.round,
    fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.xs,
  },
  postActions: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  likedText: { color: theme.colors.primary },
  commentsSection: { marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: theme.spacing.md },
  commentItem: { marginBottom: theme.spacing.sm },
  commentItemNested: { marginLeft: 28, borderLeftWidth: 2, borderLeftColor: 'rgba(255,107,53,0.2)', paddingLeft: theme.spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  commentAvatarText: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 12 },
  commentAuthor: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm },
  commentTime: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 10 },
  commentActions: { flexDirection: 'row', gap: 4 },
  commentActionBtn: { padding: 6 },
  commentContent: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, lineHeight: 18, marginLeft: 36 },
  commentActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 36,
    marginTop: 4,
  },
  replyToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyToggleText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 11 },
  replyCountText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 11 },
  replyInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm,
    marginLeft: 28, marginTop: theme.spacing.sm,
  },
  sendSmallBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
  errorText: { color: theme.colors.error, fontFamily: theme.typography.fontFamily.medium },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,107,53,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.lg, textAlign: 'center' },
  emptyText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.round,
    marginTop: theme.spacing.sm,
  },
  emptyActionText: { color: '#fff', fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.sm },
  editImageContainer: { alignItems: 'center', marginBottom: theme.spacing.sm },
  editImagePreview: { width: '100%', height: 180, borderRadius: theme.border.radius.md, marginBottom: theme.spacing.xs },
  removeImageBtn: { paddingVertical: 4 },
  removeText: { color: theme.colors.error, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  editAddPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,107,53,0.1)', paddingVertical: theme.spacing.sm, borderRadius: theme.border.radius.md, marginBottom: theme.spacing.sm },
  editAddPhotoText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  viewerImage: { width: '100%', height: '80%' },
});
