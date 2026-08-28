import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import { userSearchService, type SearchUser } from '../../services/user.service';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * A TextInput that shows an @mention autocomplete dropdown when the user
 * types "@" followed by at least 1 character.
 */
export function MentionTextInput({ value, onChangeText, placeholder, style }: Props) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleChange = useCallback((text: string) => {
    onChangeText(text);
    const match = text.match(/(?:^|\s)@(\w*)$/);
    if (match) {
      setMentionStart(text.lastIndexOf('@'));
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
      setResults([]);
    }
  }, [onChangeText]);

  useEffect(() => {
    if (mentionQuery === null) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (mentionQuery.length === 0) { setResults([]); return; }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const users = await userSearchService.searchUsers(mentionQuery);
      setResults(users);
      setIsSearching(false);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [mentionQuery]);

  const selectUser = (user: SearchUser) => {
    const before = value.substring(0, mentionStart);
    const after = value.substring(mentionStart + (mentionQuery?.length ?? 0) + 1);
    onChangeText(`${before}@${user.username} ${after}`);
    setMentionQuery(null);
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const showDropdown = (results.length > 0 || isSearching) && mentionQuery !== null;

  return (
    <View style={[styles.wrapper, style]}>
      {showDropdown && (
        <View style={styles.dropdown}>
          {isSearching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ padding: 10 }} />
          ) : (
            results.map((user) => (
              <TouchableOpacity key={user.id} style={styles.resultRow} onPress={() => selectUser(user)}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{user.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{user.name}</Text>
                  <Text style={styles.resultUsername}>@{user.username}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder ?? 'Add a comment... type @ to mention'}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        returnKeyType="send"
      />
    </View>
  );
}

/**
 * Renders comment text with highlighted @mention spans.
 */
export function CommentText({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={styles.mention}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    maxHeight: 100,
    minHeight: 44,
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.border.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
    zIndex: 999,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  avatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16, marginRight: 10,
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: 13 },
  resultInfo: { flex: 1 },
  resultName: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.semiBold, fontSize: 13 },
  resultUsername: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: 11 },
  mention: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    backgroundColor: 'rgba(255,107,53,0.10)',
  },
});
