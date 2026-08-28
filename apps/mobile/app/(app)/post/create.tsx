import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { postService } from '../../../src/services/post.service';
import { mediaService } from '../../../src/services/media.service';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface CreatePostForm {
  content: string;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<CreatePostForm>({
    defaultValues: { content: '' }
  });

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

  const onSubmit = async (data: CreatePostForm) => {
    if (!data.content.trim() && !imageUri) {
      Alert.alert('Error', 'Please add some content or an image first.');
      return;
    }

    try {
      setIsLoading(true);
      let uploadedUrl: string | undefined = undefined;

      if (imageUri) {
        uploadedUrl = await mediaService.uploadMedia(imageUri);
      }

      await postService.createPost(data.content, uploadedUrl);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      
      Alert.alert('Success', 'Post shared successfully!', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/feed') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create Post</Text>
          </View>

          <Controller
            control={control}
            name="content"
            rules={{ required: 'Post content cannot be empty if there is no image' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="Share your latest workout or sport activity..."
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

          <Text style={styles.sectionTitle}>Add Media</Text>
          
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                <Text style={styles.removeText}>Remove Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Select Photo</Text>
            </TouchableOpacity>
          )}

          <Button
            title="Post to Community"
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    padding: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  uploadBox: {
    height: 150,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceElevated,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  uploadText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  imagePreviewContainer: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: theme.border.radius.lg,
    marginBottom: theme.spacing.sm,
  },
  removeImageBtn: {
    paddingVertical: theme.spacing.xs,
  },
  removeText: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.medium,
  },
  submitBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
    marginTop: theme.spacing.sm,
  }
});
