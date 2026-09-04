import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { theme } from '../src/theme';
import { Button } from '../src/components/common/Button';
import { RunningLevel } from '@sportup/shared';
import { api } from '../src/services/api';
import { useOnboardingStore } from '../src/stores/onboarding.store';
import { useAuthStore } from '../src/stores/auth.store';

interface LevelOption {
  level: RunningLevel;
  emoji: string;
  title: string;
  subtitle: string;
  examples: string[];
}

const LEVELS: LevelOption[] = [
  {
    level: RunningLevel.BEGINNER,
    emoji: '🌱',
    title: 'Beginner',
    subtitle: 'Just starting out or returning to running',
    examples: ['1–5 KM runs', 'Easy pace', 'Flat routes'],
  },
  {
    level: RunningLevel.INTERMEDIATE,
    emoji: '🏃',
    title: 'Intermediate',
    subtitle: 'Running regularly, building endurance',
    examples: ['5–15 KM runs', 'Moderate pace', 'Varied terrain'],
  },
  {
    level: RunningLevel.ADVANCED,
    emoji: '🔥',
    title: 'Advanced',
    subtitle: 'Competitive runner with strong base',
    examples: ['15 KM+ runs', 'Fast pace', 'Half marathons & beyond'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingComplete } = useOnboardingStore();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<RunningLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;

    try {
      setIsLoading(true);
      const res = await api.patch('/users/me', { runningLevel: selected });
      if (res.data?.data) {
        useAuthStore.getState().setUser(res.data.data);
      }
      await setOnboardingComplete();
      router.replace('/(app)/location');
    } catch (err) {
      // Fail silently — still complete onboarding
      await setOnboardingComplete();
      router.replace('/(app)/location');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.welcome}>Welcome, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.title}>What's your running level?</Text>
          <Text style={styles.subtitle}>
            We'll use this to show you runs that match your experience.
          </Text>
        </View>

        <View style={styles.levels}>
          {LEVELS.map((item) => {
            const isActive = selected === item.level;
            return (
              <TouchableOpacity
                key={item.level}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => setSelected(item.level)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <View style={styles.cardTitleGroup}>
                    <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={styles.examples}>
                  {item.examples.map((ex) => (
                    <View key={ex} style={styles.exampleTag}>
                      <Text style={[styles.exampleText, isActive && styles.exampleTextActive]}>
                        {ex}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Let's Go! 🏃"
          size="lg"
          onPress={handleContinue}
          isLoading={isLoading}
          disabled={!selected}
          style={styles.ctaBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  welcome: {
    fontSize: theme.typography.size.md,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 22,
  },
  levels: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  cardTitleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textSecondary,
  },
  cardTitleActive: {
    color: theme.colors.text,
  },
  cardSubtitle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  exampleTag: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.border.radius.round,
  },
  exampleText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  exampleTextActive: {
    color: theme.colors.text,
  },
  ctaBtn: {
    width: '100%',
  },
});
