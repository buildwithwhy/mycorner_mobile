import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocalSpot } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';
import { CATEGORY_ICONS } from '../../constants/categories';

interface CuratedSectionProps {
  spots: LocalSpot[];
  onSpotPress: (spot: LocalSpot) => void;
  isInItinerary: (spotId: string) => boolean;
  onToggleItinerary: (spot: LocalSpot) => void;
}

function CuratedSectionComponent({
  spots,
  onSpotPress,
  isInItinerary,
  onToggleItinerary,
}: CuratedSectionProps) {
  if (spots.length === 0) {
    return null;
  }

  const renderItem = useCallback(
    ({ item }: { item: LocalSpot }) => {
      const inItinerary = isInItinerary(item.id);
      const iconName = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.other;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSpotPress(item)}
          activeOpacity={0.8}
        >
          {/* Category icon badge */}
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name={iconName} size={16} color={COLORS.primary} />
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                inItinerary && styles.toggleButtonActive,
              ]}
              onPress={() => onToggleItinerary(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={inItinerary ? 'checkmark' : 'add'}
                size={16}
                color={inItinerary ? COLORS.white : COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Editorial text */}
          {item.editorial && (
            <Text style={styles.cardEditorial} numberOfLines={3}>
              {item.editorial}
            </Text>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [isInItinerary, onSpotPress, onToggleItinerary]
  );

  const keyExtractor = useCallback((item: LocalSpot) => item.id, []);

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="star" size={18} color={COLORS.accent} />
        <Text style={styles.sectionTitle}>Editor's Picks</Text>
      </View>

      {/* Horizontal FlatList */}
      <FlatList
        data={spots}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

export const CuratedSection = React.memo(CuratedSectionComponent);

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  cardName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.xs,
  },
  cardEditorial: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    color: COLORS.gray600,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray600,
  },
});
