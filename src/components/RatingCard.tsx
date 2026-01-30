import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../constants/theme';

interface RatingCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: number;
  isEditing: boolean;
  isCustom?: boolean;
  onRatingChange: (value: number) => void;
}

export default function RatingCard({
  icon,
  label,
  description,
  value,
  isEditing,
  isCustom,
  onRatingChange,
}: RatingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          {[1, 2, 3, 4, 5].map((rating) => (
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
      ) : (
        <>
          <View style={styles.stars}>
            {[...Array(5)].map((_, i) => (
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
            {isCustom && <Text style={styles.customBadge}> (Custom)</Text>}
          </Text>
        </>
      )}
    </View>
  );
}

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
});
