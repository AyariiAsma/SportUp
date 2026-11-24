import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth.store';
import { setLanguage } from '../../src/i18n';
import { useTranslation } from 'react-i18next';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { t, i18n } = useTranslation();

  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [notifyKudos, setNotifyKudos] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyChallenges, setNotifyChallenges] = useState(true);

  const handleLanguageChange = async (lng: 'en' | 'fr' | 'ar') => {
    await setLanguage(lng);
    Alert.alert(
      lng === 'ar' ? 'تم تغيير اللغة' : lng === 'fr' ? 'Langue modifiée' : 'Language Changed',
      lng === 'ar'
        ? 'قد يتطلب تطبيق اتجاه RTL بالكامل إعادة تشغيل التطبيق.'
        : lng === 'fr'
        ? 'La langue a été changée avec succès.'
        : 'Language successfully updated.'
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Units Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.units')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setUnits('metric')}
            >
              <Text style={styles.rowLabel}>{t('settings.metric')}</Text>
              {units === 'metric' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => setUnits('imperial')}
            >
              <Text style={styles.rowLabel}>{t('settings.imperial')}</Text>
              {units === 'imperial' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.language')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.rowLabel}>English</Text>
              {i18n.language === 'en' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleLanguageChange('fr')}
            >
              <Text style={styles.rowLabel}>Français</Text>
              {i18n.language === 'fr' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleLanguageChange('ar')}
            >
              <Text style={styles.rowLabel}>العربية (Arabic - RTL)</Text>
              {i18n.language === 'ar' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.notifications')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Activity Kudos</Text>
              <Switch
                value={notifyKudos}
                onValueChange={setNotifyKudos}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.primary }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Comments & Replies</Text>
              <Switch
                value={notifyComments}
                onValueChange={setNotifyComments}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.primary }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Event Reminders</Text>
              <Switch
                value={notifyEvents}
                onValueChange={setNotifyEvents}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.primary }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Challenge Progress</Text>
              <Switch
                value={notifyChallenges}
                onValueChange={setNotifyChallenges}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.primary }}
              />
            </View>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Privacy</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/(app)/settings/privacy-zones')}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="shield-outline" size={18} color={theme.colors.secondary} />
                <Text style={styles.rowLabel}>{t('settings.privacyZones')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t('settings.account')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.warning} />
                <Text style={[styles.rowLabel, { color: theme.colors.warning }]}>
                  {t('settings.signOut')}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Alert.alert(
                  'Delete Account',
                  'Are you sure you want to delete your account? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: handleSignOut },
                  ]
                )
              }
            >
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                <Text style={[styles.rowLabel, { color: theme.colors.error }]}>
                  {t('settings.deleteAccount')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  content: { padding: theme.spacing.md, gap: theme.spacing.lg, paddingBottom: 40 },
  section: { gap: 6 },
  sectionHeader: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: theme.typography.size.sm, color: theme.colors.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
});
