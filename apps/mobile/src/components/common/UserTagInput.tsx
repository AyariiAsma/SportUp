import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import { userSearchService, type SearchUser } from '../../services/user.service';
import { OnlineIndicator } from './OnlineIndicator';

interface Tag {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

interface Props {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
}

/**
 * Tag input that lets you type @ to search and tag users.
 * Shows a dismissible badge per tagged user.
 */
export function UserTagInput({ tags, onTagsChange, maxTags = 10 }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.startsWith('@') ? query.slice(1) : query;
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const users = await userSearchService.searchUsers(q);
      // Exclude already-tagged users
      const taggedIds = new Set(tags.map(t => t.id));
      setResults(users.filter(u => !taggedIds.has(u.id)));
      setIsSearching(false);
    }, 300);
  }, [query, tags]);

  const addTag = (user: SearchUser) => {
    if (tags.length >= maxTags) return;
    onTagsChange([...tags, { id: user.id, name: user.name, username: user.username, avatar: user.avatar }]);
    setQuery('');
    setResults([]);
  };

  const removeTag = (id: string) => {
    onTagsChange(tags.filter(t => t.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Existing tags */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map(tag => (
            <View key={tag.id} style={styles.tagBadge}>
              <Text style={styles.tagText}>@{tag.username}</Text>
              <TouchableOpacity onPress={() => removeTag(tag.id)} style={styles.removeTag}>
                <Text style={styles.removeTagText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      {tags.length < maxTags && (
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="@mention someone..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {/* Dropdown results */}
      {(results.length > 0 || isSearching) && (
        <View style={styles.dropdown}>
          {isSearching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ padding: 12 }} />
          ) : (
            results.map(user => (
              <TouchableOpacity key={user.id} style={styles.resultRow} onPress={() => addTag(user)}>
                <View style={styles.resultAvatarWrap}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.resultAvatar} />
                  ) : (
                    <View style={styles.resultAvatarPlaceholder}>
                      <Text style={styles.resultAvatarText}>{user.name.charAt(0)}</Text>
                    </View>
                  )}
                  <OnlineIndicator isOnline={user.isOnline} size="sm" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.resultName}>{user.name}</Text>
                  <Text style={styles.resultUsername}>@{user.username}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,107,53,0.1)', borderRadius: theme.border.radius.round,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)',
  },
  tagText: { color: theme.colors.primary, fontFamily: theme.typography.fontFamily.medium, fontSize: theme.typography.size.sm },
  removeTag: { marginLeft: 6 },
  removeTagText: { color: theme.colors.primary, fontSize: 10, fontFamily: theme.typography.fontFamily.bold },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
  },
  dropdown: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  resultAvatarWrap: { position: 'relative', width: 36, height: 36 },
  resultAvatar: { width: 36, height: 36, borderRadius: 18 },
  resultAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  resultAvatarText: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 14 },
  resultName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: theme.typography.size.sm },
  resultUsername: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11 },
});
