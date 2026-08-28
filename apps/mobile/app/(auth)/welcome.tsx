import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          {/* We'll add a real image here later, using a placeholder text for now */}
          <Text style={styles.logo}>SportUp</Text>
          <Text style={styles.tagline}>Discover. Create. Join.</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.title}>Ready to get active?</Text>
          <Text style={styles.subtitle}>
            Join thousands of people discovering local sports activities.
          </Text>

          <View style={styles.actions}>
            <Button 
              title="Create Account" 
              size="lg"
              onPress={() => router.push('/(auth)/register')}
            />
            <Button 
              title="Log In" 
              variant="secondary"
              size="lg"
              style={{ marginTop: theme.spacing.md }}
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  footer: {
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
  },
});
