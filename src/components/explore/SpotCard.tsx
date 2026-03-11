import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocalSpot, SpotCategory } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';

interface SpotCardProps {
  spot: LocalSpot;
  distanceKm?: number;
  isInItinerary?: boolean;
  onAddToItinerary?: () => void;
  onRemoveFromItinerary?: () => void;
}

const CATEGORY_ICONS: Record<SpotCategory, keyof typeof Ionicons.glyphMap> = {
  cafe: 'cafe-outline',
  restaurant: 'restaurant-outline',
  bar: 'beer-outline',
  park: 'leaf-outline',
  market: 'cart-outline',
  museum: 'business-outline',
  shop: 'bag-outline',
  landmark: 'flag-outline',
  other: 'pin-outline',
};

function SpotCardComponent({
  spot,
  distanceKm,
  isInItinerary = false,
  onAddToItinerary,
  onRemoveFromItinerary,
}: SpotCardProps) {
  const iconName = CATEGORY_ICONS[spot.category] || CATEGORY_ICONS.other;

  const handleToggle = () => {
    if (isInItinerary) {
      onRemoveFromItinerary?.();
    } else {
      onAddToItinerary?.();
    }
  };

  return (
    <View style={styles.container}>
      {/* Left: Category Icon */}
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={20} color={COLORS.primary} />
      </View>

      {/* Middle: Text Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>

        {/* Rating and Distance row */}
        {(spot.rating != null || distanceKm != null) && (
          <View style={styles.metaRow}>
            {spot.rating != null && (
              <Text style={styles.rating}>
                {'\u2605'} {spot.rating.toFixed(1)}
              </Text>
            )}
            {distanceKm != null && (
              <Text style={styles.distance}>{distanceKm.toFixed(1)} km</Text>
            )}
          </View>
        )}

        {/* Editorial text for curated spots */}
        {spot.source === 'curated' && spot.editorial ? (
          <Text style={styles.editorial} numberOfLines={2}>
            {spot.editorial}
          </Text>
        ) : spot.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {spot.description}
          </Text>
        ) : null}

        {/* Tags */}
        {spot.tags && spot.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {spot.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Right: Add/Remove Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          isInItinerary && styles.actionButtonActive,
        ]}
        onPress={handleToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isInItinerary ? 'checkmark' : 'add'}
          size={20}
          color={isInItinerary ? COLORS.white : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

export const SpotCard = React.memo(SpotCardComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    ...SHADOWS.small,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  rating: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.accent,
  },
  distance: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  editorial: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
    color: COLORS.gray600,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
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
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: COLORS.primary,
  },
});
