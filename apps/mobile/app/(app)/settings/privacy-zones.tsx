import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { privacyService, PrivacyZoneItem } from '../../../src/services/privacy.service';

export default function PrivacyZonesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [zoneName, setZoneName] = useState('Home');
  const [radiusM, setRadiusM] = useState('500');

  const { data: zones = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['privacy-zones'],
    queryFn: () => privacyService.getPrivacyZones(),
  });

  const { mutate: deleteZone } = useMutation({
    mutationFn: (id: string) => privacyService.deletePrivacyZone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['privacy-zones'] }),
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to delete'),
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Zones</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Privacy zones hide the start and end of your activities around sensitive locations like your home or office. Activities starting or ending in a privacy zone will have that portion trimmed on public maps.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your Zones ({zones.length} / 5)</Text>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : zones.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No privacy zones created yet.</Text>
          </View>
        ) : (
          zones.map((zone) => (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneLeft}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <View>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneRadius}>{zone.radiusMeters}m radius</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteZone(zone.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: theme.typography.size.xs, color: theme.colors.textSecondary, lineHeight: 18 },
  sectionTitle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyBox: { padding: theme.spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
  },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneName: { fontSize: theme.typography.size.sm, color: theme.colors.text, fontWeight: '700' },
  zoneRadius: { fontSize: 11, color: theme.colors.textMuted },
  deleteBtn: { padding: 8 },
});
