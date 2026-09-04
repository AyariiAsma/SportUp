import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@sportup/shared';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { AddressSelector } from '../../../src/components/common/AddressSelector';
import { useAuthStore } from '../../../src/stores/auth.store';
import { authService } from '../../../src/services/auth.service';
import { mediaService } from '../../../src/services/media.service';
import { resolveMediaUrl } from '../../../src/services/post.service';
import { api } from '../../../src/services/api';
import { useEffect, useState } from 'react';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isImageChanged, setIsImageChanged] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar ? resolveMediaUrl(user.avatar) : null
  );

  useEffect(() => {
    authService.getMe().catch(() => {/* silent */});
  }, []);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      setIsImageChanged(true);
    }
  };

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      name: user?.name || '',
      username: user?.username || '',
      bio: user?.bio || '',
      region: user?.region || '',
      city: user?.city || '',
      locality: user?.locality || '',
    }
  });

  const onSubmit = async (data: UpdateProfileInput) => {
    try {
      setIsLoading(true);
      let updatedAvatar = user?.avatar || null;

      // If user selected a new photo, upload it to backend media storage
      if (isImageChanged && avatarUri) {
        const uploaded = await mediaService.uploadMedia(avatarUri);
        updatedAvatar = uploaded.url;
      }

      const payload = {
        name: data.name?.trim(),
        username: data.username?.trim(),
        bio: data.bio ?? '',
        region: data.region ?? '',
        city: data.city ?? '',
        locality: data.locality ?? '',
        avatar: updatedAvatar,
      };

      const response = await api.patch('/users/me', payload);
      const updatedUser = response.data.data;

      // Immediately update local stores & query caches
      setUser(updatedUser);
      queryClient.setQueryData(['profile', 'me'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Update Failed',
        error.response?.data?.message || 'Could not update profile.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (formErrors: any) => {
    const firstKey = Object.keys(formErrors)[0];
    const message = formErrors[firstKey]?.message || 'Please verify form inputs.';
    Alert.alert('Validation Error', message);
  };

  const regionValue = watch('region');
  const cityValue = watch('city');
  const localityValue = watch('locality');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
          </View>

          {/* ── Avatar Edit ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
              {avatarUri ? (
                <Image key={avatarUri} source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{user?.name?.charAt(0) || 'U'}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Full Name"
                  placeholder="John Doe"
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Username"
                  placeholder="johndoe"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.username?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="bio"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Bio"
                  placeholder="Tell us about yourself..."
                  multiline
                  numberOfLines={3}
                  style={styles.textArea}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.bio?.message}
                />
              )}
            />

            <AddressSelector
              region={regionValue}
              city={cityValue}
              locality={localityValue}
              onChange={(newRegion, newCity, newLocality) => {
                setValue('region', newRegion, { shouldValidate: true });
                setValue('city', newCity, { shouldValidate: true });
                setValue('locality', newLocality, { shouldValidate: true });
              }}
            />

            <Button
              title="Save Changes"
              onPress={handleSubmit(onSubmit, onError)}
              isLoading={isLoading}
              style={styles.submitBtn}
            />
            
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => router.back()}
              style={styles.cancelBtn}
            />
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: theme.spacing.xs,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 38,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  cameraIcon: {
    fontSize: 14,
  },
  changePhotoText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    marginTop: theme.spacing.xs,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  cancelBtn: {
    width: '100%',
    marginTop: theme.spacing.sm,
  }
});
