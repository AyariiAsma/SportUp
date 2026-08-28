import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService, type Post } from '../../../src/services/post.service';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { formatDistanceToNow } from 'date-fns';

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['feed'],
    queryFn: () => postService.getFeed(),
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => postService.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  });

  const unlikeMutation = useMutation({
    mutationFn: (postId: string) => postService.unlikePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  });

  const toggleLike = (post: Post) => {
    if (post.isLiked) {
      unlikeMutation.mutate(post.id);
    } else {
      likeMutation.mutate(post.id);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
    
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{item.author.name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{item.author.name}</Text>
            <Text style={styles.authorMeta}>@{item.author.username} • {timeAgo}</Text>
          </View>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        {item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={styles.postMedia} resizeMode="cover" />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item)}>
            <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
              {item.isLiked ? '❤️' : '🤍'} {item.likesCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionText}>💬 {item.commentsCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
          renderItem={renderPost}
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
  addBtnText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
  list: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarLetter: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: theme.typography.fontFamily.bold,
  },
  authorName: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
  },
  authorMeta: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.xs,
  },
  postContent: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: theme.border.radius.md,
    marginBottom: theme.spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  likedText: {
    color: theme.colors.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
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
  }
});
