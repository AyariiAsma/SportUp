import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../src/theme';
import { clubService, ClubItem } from '../../../src/services/club.service';

export default function ClubsExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['clubs-explore', search],
    queryFn: () => clubService.exploreClubs({ search: search.trim() || undefined }),
  });

  const clubs = data?.clubs || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Running Clubs</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/challenges')} style={styles.challengeBtn}>
          <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs by name or city..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>Failed to load clubs</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : clubs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No clubs found</Text>
          <Text style={styles.emptyText}>Be the first to create a running club in your city!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />}
        >
          {clubs.map((club) => (
            <TouchableOpacity
              key={club.id}
              style={styles.clubCard}
              onPress={() => router.push(`/(app)/club/${club.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.clubAvatar}>
                {club.avatarUrl ? (
                  <Image source={{ uri: club.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="people" size={26} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.clubInfo}>
                <View style={styles.clubNameRow}>
                  <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
                  {club.isMember && (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>Joined</Text>
                    </View>
                  )}
                </View>
                {club.city && (
                  <Text style={styles.clubCity}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} /> {club.city}
                  </Text>
                )}
                <Text style={styles.clubStats}>
                  {club.membersCount} member{club.membersCount !== 1 ? 's' : ''} · {club.challengesCount} challenge{club.challengesCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  challengeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.border.radius.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.size.sm,
  },
  list: { padding: theme.spacing.md, gap: theme.spacing.sm },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  clubAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  clubInfo: { flex: 1, gap: 2 },
  clubNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clubName: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  memberBadge: {
    backgroundColor: theme.colors.success + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.border.radius.round,
  },
  memberBadgeText: { fontSize: 10, color: theme.colors.success, fontWeight: '700' },
  clubCity: { fontSize: 11, color: theme.colors.textMuted },
  clubStats: { fontSize: 11, color: theme.colors.textSecondary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
  errorText: { fontSize: theme.typography.size.md, color: theme.colors.textMuted },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.border.radius.round,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyTitle: {
    fontSize: theme.typography.size.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyText: { fontSize: theme.typography.size.sm, color: theme.colors.textMuted, textAlign: 'center' },
});
