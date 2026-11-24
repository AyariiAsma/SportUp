import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../src/theme';
import { eventExtService } from '../../../../src/services/eventExt.service';

export default function EventCheckinScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inputCode, setInputCode] = useState('');

  // Fetch organizer check-in QR code if the user is organizer
  const { data: codeData, isLoading: codeLoading } = useQuery({
    queryKey: ['event-checkin-code', id],
    queryFn: () => eventExtService.getCheckinCode(id!),
    enabled: Boolean(id),
    retry: false,
  });

  const { mutate: doCheckin, isPending: checkinPending } = useMutation({
    mutationFn: (token: string) => eventExtService.checkin(id!, token),
    onSuccess: (data: { message: string }) => {
      Alert.alert('Success! 🎉', data.message, [
        { text: 'Great', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Check-in Failed', err?.message || 'Invalid code'),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Check-In</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {codeData?.checkinToken ? (
          /* Organizer View: Display Check-in Token */
          <View style={styles.organizerCard}>
            <Text style={styles.organizerTitle}>Event Check-In Code</Text>
            <Text style={styles.organizerSubtitle}>
              Show this code or QR to participants arriving at the group run:
            </Text>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText}>{codeData.checkinToken}</Text>
            </View>
            <Text style={styles.organizerHint}>
              Runners who enter this code earn +25 ranking points and confirm their attendance.
            </Text>
          </View>
        ) : (
          /* Participant View: Enter Token */
          <View style={styles.participantCard}>
            <View style={styles.iconWrap}>
              <Ionicons name="qr-code-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.runnerTitle}>Check In to Event</Text>
            <Text style={styles.runnerSubtitle}>
              Enter the 8-character check-in code provided by the run organizer:
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="e.g. A1B2C3D4"
              placeholderTextColor={theme.colors.textMuted}
              value={inputCode}
              onChangeText={(t) => setInputCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={16}
            />

            <TouchableOpacity
              style={[styles.submitBtn, !inputCode.trim() && { opacity: 0.5 }]}
              disabled={!inputCode.trim() || checkinPending}
              onPress={() => doCheckin(inputCode.trim())}
            >
              {checkinPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Attendance (+25 pts)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  organizerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  organizerTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  organizerSubtitle: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  tokenBox: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.border.radius.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginVertical: 8,
  },
  tokenText: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary,
    letterSpacing: 4,
    fontWeight: '800',
  },
  organizerHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  participantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  runnerSubtitle: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.border.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.border.radius.md,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: theme.typography.size.sm },
});
