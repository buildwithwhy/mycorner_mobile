import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';

interface DetailNotesSectionProps {
  isEditingNote: boolean;
  noteText: string;
  savedNote: string | undefined;
  onChangeNoteText: (text: string) => void;
  onSaveNote: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

function DetailNotesSectionInner({
  isEditingNote,
  noteText,
  savedNote,
  onChangeNoteText,
  onSaveNote,
  onCancelEdit,
  onStartEdit,
  onLayout,
}: DetailNotesSectionProps) {
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Notes</Text>
        {!isEditingNote && savedNote && (
          <TouchableOpacity style={styles.editButton} onPress={onStartEdit}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.noteContainer}>
        {isEditingNote ? (
          <>
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={4}
              value={noteText}
              onChangeText={onChangeNoteText}
              placeholder="What do you think about this neighborhood?"
              placeholderTextColor={COLORS.gray400}
            />
            <View style={styles.noteActions}>
              <TouchableOpacity style={styles.noteCancelButton} onPress={onCancelEdit}>
                <Text style={styles.noteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noteSaveButton} onPress={onSaveNote}>
                <Text style={styles.noteSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : savedNote ? (
          <Text style={styles.noteText}>{savedNote}</Text>
        ) : (
          <TouchableOpacity style={styles.addNoteButton} onPress={onStartEdit}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addNoteText}>Add your thoughts about this area</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const DetailNotesSection = React.memo(DetailNotesSectionInner);

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noteContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  noteInput: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray900,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  noteActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  noteCancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
  },
  noteCancelButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  noteSaveButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  noteSaveButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  noteText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.gray700,
    lineHeight: 22,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  addNoteText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
