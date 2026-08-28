import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { postService } from '../../../src/services/post.service';
import { mediaService } from '../../../src/services/media.service';
import { useAuthStore } from '../../../src/stores/auth.store';
import { UserTagInput } from '../../../src/components/common/UserTagInput';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface CreatePostForm {
  content: string;
}

type Step = 'compose' | 'preview';

export default function CreatePostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('compose');
  const [tags, setTags] = useState<Array<{ id: string; name: string; username: string; avatar?: string | null }>>([]);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<CreatePostForm>({
    defaultValues: { content: '' }
  });

  const watchContent = watch('content');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const goToPreview = () => {
    if (!watchContent?.trim() && !imageUri) {
      Alert.alert('Empty Post', 'Please add some text or an image before previewing.');
      return;
    }
    setStep('preview');
  };

  const onSubmit = async (data: CreatePostForm) => {
    if (!data.content.trim() && !imageUri) {
      Alert.alert('Error', 'Please add some content or an image first.');
      return;
    }

    try {
      setIsLoading(true);
      let mediaIds: string[] | undefined;

      if (imageUri) {
        const uploaded = await mediaService.uploadMedia(imageUri);
        mediaIds = [uploaded.id];
      }

      await postService.createPost(data.content, mediaIds, tags.map(t => t.id));
      queryClient.invalidateQueries({ queryKey: ['feed'] });

      Alert.alert('🎉 Posted!', 'Your post has been shared with the community!', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/feed') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'preview') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Preview Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('compose')}>
              <Text style={styles.backLink}>← Edit</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Preview Post</Text>
            <View style={{ width: 50 }} />
          </View>

          <Text style={styles.previewHint}>This is how your post will appear in the feed</Text>

          {/* Mock post card */}
          <View style={styles.previewCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarPlaceholder}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>{user?.name?.charAt(0) || '?'}</Text>
                )}
              </View>
              <View>
                <Text style={styles.authorName}>{user?.name || 'You'}</Text>
                <Text style={styles.authorMeta}>@{user?.username || 'you'} · just now</Text>
              </View>
            </View>

            {watchContent ? (
              <Text style={styles.postContent}>{watchContent}</Text>
            ) : null}

            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            )}

            <View style={styles.previewActionsRow}>
              <Text style={styles.previewActionText}>🤍 0</Text>
              <Text style={styles.previewActionText}>💬 0</Text>
            </View>
          </View>

          <Button
            title="Publish Post 🚀"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.cancelBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backLink}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Post</Text>
            <TouchableOpacity onPress={goToPreview}>
              <Text style={styles.previewLink}>Preview →</Text>
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            name="content"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="Share your latest workout or running experience..."
                multiline
                numberOfLines={6}
                style={styles.textArea}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.content?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>Add Photo</Text>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                <Text style={styles.removeText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Select Photo</Text>
              <Text style={styles.uploadHint}>JPEG, PNG, WebP supported</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>Tag People</Text>
          <UserTagInput tags={tags} onTagsChange={setTags} />

          <Button
            title="Preview Post →"
            onPress={goToPreview}
            style={styles.submitBtn}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.cancelBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  keyboardView: { flex: 1 },
  scroll: { padding: theme.spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  backLink: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.sm,
  },
  previewLink: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  previewHint: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.sm, overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  avatarLetter: { color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamily.bold },
  authorName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.md },
  authorMeta: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.xs },
  postContent: {
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  previewImage: { width: '100%', height: 200, borderRadius: theme.border.radius.md, marginBottom: theme.spacing.sm },
  previewActionsRow: { flexDirection: 'row', gap: theme.spacing.xl, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  previewActionText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  uploadBox: {
    height: 150, backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg, borderWidth: 1,
    borderColor: theme.colors.surfaceElevated, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xl,
  },
  uploadIcon: { fontSize: 32, marginBottom: theme.spacing.xs },
  uploadText: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium },
  uploadHint: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.xs, marginTop: 4 },
  imagePreviewContainer: { marginBottom: theme.spacing.xl, alignItems: 'center' },
  imagePreview: { width: '100%', height: 200, borderRadius: theme.border.radius.lg, marginBottom: theme.spacing.sm },
  removeImageBtn: { paddingVertical: theme.spacing.xs },
  removeText: { color: theme.colors.error, fontFamily: theme.typography.fontFamily.medium },
  submitBtn: { width: '100%', marginTop: theme.spacing.lg },
  cancelBtn: { width: '100%', marginTop: theme.spacing.sm },
});
