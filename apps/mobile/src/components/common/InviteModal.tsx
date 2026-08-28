import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { theme } from '../../theme';
import { UserTagInput } from './UserTagInput';
import { eventService } from '../../services/event.service';
import { OnlineIndicator } from './OnlineIndicator';

interface InviteUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

interface Props {
  eventId: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal for inviting users to an event.
 * Organizers and participants can use this.
 */
export function InviteModal({ eventId, visible, onClose }: Props) {
  const [invited, setInvited] = useState<InviteUser[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (invited.length === 0) return;
    setIsSending(true);
    let successCount = 0;
    try {
      for (const u of invited) {
        try {
          await eventService.sendInvitation(eventId, u.id);
          successCount++;
        } catch (e: any) {
          console.log(`Failed to invite ${u.name}:`, e?.response?.data || e.message);
        }
      }
      if (successCount > 0) {
        Alert.alert('✅ Invitations Sent', `${successCount} invitation(s) sent successfully.`);
        setInvited([]);
        onClose();
      } else {
        Alert.alert('Error', 'Could not send invitations. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <Text style={styles.title}>Invite to this Run 🏃</Text>
          <Text style={styles.subtitle}>
            Search for runners by name or @username to invite them.
            They'll receive an invitation they can accept or decline.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <UserTagInput
              tags={invited}
              onTagsChange={setInvited}
              maxTags={20}
            />

            {invited.length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                  🏃 Ready to invite {invited.length} runner{invited.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (invited.length === 0 || isSending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={invited.length === 0 || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendText}>Send {invited.length > 0 ? `(${invited.length})` : ''}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  summaryBox: {
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: theme.border.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  summaryText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontSize: theme.typography.size.sm,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: theme.border.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  sendBtn: {
    flex: 2, paddingVertical: 14,
    borderRadius: theme.border.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: {
    color: '#fff',
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
  },
});
