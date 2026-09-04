import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@sportup/shared';
import { theme } from '../../../src/theme';
import { Button } from '../../../src/components/common/Button';
import { TextInput } from '../../../src/components/common/TextInput';
import { AddressSelector } from '../../../src/components/common/AddressSelector';
import { useAuthStore } from '../../../src/stores/auth.store';
import { authService } from '../../../src/services/auth.service';
import { api } from '../../../src/services/api';
import { useEffect, useState } from 'react';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    authService.getMe().catch(() => {/* silent */});
  }, []);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<UpdateProfileInput>({
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
      const response = await api.patch('/users/me', data);
      setUser(response.data.data);
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error.response?.data?.message || 'Could not update profile.'
      );
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
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
              initialRegion={user?.region || ''}
              initialCity={user?.city || ''}
              initialLocality={user?.locality || ''}
              onChange={(region, city, locality) => {
                setValue('region', region, { shouldValidate: true });
                setValue('city', city, { shouldValidate: true });
                setValue('locality', locality, { shouldValidate: true });
              }}
            />

            <Button
              title="Save Changes"
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
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
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
