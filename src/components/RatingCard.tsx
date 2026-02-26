import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

// Pre-defined arrays to avoid recreation on each render
const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const STAR_INDICES = [0, 1, 2, 3, 4] as const;

interface RatingCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: number;
  isEditing: boolean;
  isCustom?: boolean;
  onRatingChange: (value: number) => void;
  onPress?: () => void;
  onNotePress?: () => void;
  sourceShort?: string;
  sourceLong?: string;
}

function RatingCard({
  icon,
  label,
  description,
  value,
  isEditing,
  isCustom,
  onRatingChange,
  onPress,
  onNotePress,
  sourceShort,
  sourceLong,
}: RatingCardProps) {
  const cardContent = (
    <>
      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>

      {isEditing ? (
        <>
          {!isCustom && sourceLong && (
            <View style={styles.sourceDisclaimerRow}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.gray400} />
              <Text style={styles.sourceDisclaimer}>
                {sourceLong}. Tap to set your own.
              </Text>
            </View>
          )}
          <View style={styles.editContainer}>
            {RATING_VALUES.map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  value === rating && styles.ratingButtonActive,
                ]}
                onPress={() => onRatingChange(rating)}
              >
                <Text
                  style={[
                    styles.ratingButtonText,
                    value === rating && styles.ratingButtonTextActive,
                  ]}
                >
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.editActions}>
            {onNotePress && (
              <TouchableOpacity style={styles.addNoteLink} onPress={onNotePress}>
                <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                <Text style={styles.addNoteLinkText}>Add a note</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.doneButton} onPress={onPress}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.stars}>
            {STAR_INDICES.map((i) => (
              <Ionicons
                key={i}
                name={i < value ? 'star' : 'star-outline'}
                size={20}
                color={COLORS.primary}
              />
            ))}
          </View>
          <Text style={styles.score}>
            {value}/5
            {isCustom ? (
              <Text style={styles.customBadge}> (Custom)</Text>
            ) : sourceShort ? (
              <Text style={styles.sourceBadge}> · {sourceShort}</Text>
            ) : null}
          </Text>
        </>
      )}
    </>
  );

  if (isEditing) {
    return <View style={styles.card}>{cardContent}</View>;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {cardContent}
    </TouchableOpacity>
  );
}

export default memo(RatingCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  labelContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  score: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  customBadge: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.info,
  },
  sourceBadge: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '400',
    color: COLORS.gray400,
  },
  sourceDisclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  sourceDisclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    flex: 1,
  },
  editContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  ratingButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  ratingButtonTextActive: {
    color: COLORS.primary,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  addNoteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNoteLinkText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  doneButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.sm,
  },
  doneButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
