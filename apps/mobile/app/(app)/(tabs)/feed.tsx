import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView,
  TouchableOpacity, Image, Alert, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService, type Post, type PostComment, resolveMediaUrl } from '../../../src/services/post.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../../src/stores/auth.store';
import { useState } from 'react';
import { MentionTextInput, CommentText } from '../../../src/components/common/MentionTextInput';

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
              <Text style={styles.commentActionText}>✏️</Text>
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
              <Text style={styles.commentActionText}>🗑️</Text>
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
            <Text style={styles.sendSmallBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <CommentText text={comment.content} style={styles.commentContent} />
      )}

      {/* Reply Action Button for every comment */}
      <View style={styles.commentActionBar}>
        <TouchableOpacity onPress={handleReplyPress} style={styles.replyToggle}>
          <Text style={styles.replyToggleText}>↩ Reply</Text>
        </TouchableOpacity>

        {depth === 0 && comment.replies && comment.replies.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplyList(v => !v)} style={styles.replyToggle}>
            <Text style={styles.replyCountText}>
              💬 {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nested Replies */}
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
                <Text style={styles.sendSmallBtnText}>→</Text>
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
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.content || '');
  const isOwn = post.authorId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => postService.getComments(post.id),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => post.isLiked ? postService.unlikePost(post.id) : postService.likePost(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const editMutation = useMutation({
    mutationFn: (text: string) => postService.updatePost(post.id, text),
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
        <View style={styles.avatarPlaceholder}>
          {post.author.avatar ? (
            <Image source={{ uri: resolveMediaUrl(post.author.avatar) }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLetter}>{post.author.name.charAt(0)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorMeta}>@{post.author.username} · {timeAgo}</Text>
        </View>
        {isOwn && (
          <View style={styles.postMenuRow}>
            <TouchableOpacity style={styles.postMenuBtn} onPress={() => setEditMode(v => !v)}>
              <Text style={styles.postMenuText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postMenuBtn}
              onPress={() =>
                Alert.alert('Delete Post', 'Remove this post?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(),
                  },
                ])
              }
            >
              <Text style={styles.postMenuText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content / Edit */}
      {editMode ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            placeholder="Edit post..."
            placeholderTextColor={theme.colors.textMuted}
          />
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(false)}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editSaveBtn}
              onPress={() => editText.trim() && editMutation.mutate(editText.trim())}
            >
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        post.content ? <CommentText text={post.content} style={styles.postContent} /> : null
      )}

      {/* Media images */}
      {post.media && post.media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
          {post.media.map(m => (
            <Image
              key={m.id}
              source={{ uri: resolveMediaUrl(m.url) }}
              style={styles.postMedia}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

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
        <TouchableOpacity style={styles.actionBtn} onPress={() => likeMutation.mutate()}>
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
            {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(v => !v)}
        >
          <Text style={styles.actionText}>💬 {post.commentsCount}</Text>
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
              <Text style={styles.sendBtnText}>{commentMutation.isPending ? '…' : '→'}</Text>
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
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(app)/post/create')}
          >
            <Text style={styles.addBtnText}>+ Post</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
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
                <Text style={styles.icon}>📣</Text>
                <Text style={styles.emptyTitle}>Nothing here yet.</Text>
                <Text style={styles.emptyText}>Be the first to share a post!</Text>
              </View>
            }
          />
        )}
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
    borderBottomColor: theme.colors.surfaceElevated,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  addBtn: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.border.radius.round,
  },
  addBtnText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold },
  list: { padding: theme.spacing.md, flexGrow: 1 },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarLetter: { color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  authorName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.md },
  authorMeta: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.xs },
  postMenuRow: { flexDirection: 'row', gap: 4 },
  postMenuBtn: { padding: 6 },
  postMenuText: { fontSize: 16 },
  postContent: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
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
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
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
  commentActionBtn: { padding: 4 },
  commentActionText: { fontSize: 12 },
  commentContent: { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, lineHeight: 18, marginLeft: 36 },
  commentActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 36,
    marginTop: 4,
  },
  replyToggle: {},
  replyToggleText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.bold, fontSize: 11 },
  replyCountText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: 11 },
  replyInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm,
    marginLeft: 28, marginTop: theme.spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.border.radius.lg,
    padding: theme.spacing.sm, color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular, maxHeight: 80, minHeight: 36,
    fontSize: theme.typography.size.sm,
  },
  sendSmallBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendSmallBtnText: { color: '#fff', fontSize: 14, fontFamily: theme.typography.fontFamily.bold },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md, color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular, maxHeight: 100, minHeight: 44,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.error, marginBottom: theme.spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  icon: { fontSize: 48, marginBottom: theme.spacing.md },
  emptyTitle: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.lg, marginBottom: theme.spacing.xs },
  emptyText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular },
});
