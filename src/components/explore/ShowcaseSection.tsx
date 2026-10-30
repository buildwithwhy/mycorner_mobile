import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BusinessShowcase } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, SHADOWS } from '../../constants/theme';
import { CATEGORY_ICONS } from '../../constants/categories';

interface ShowcaseSectionProps {
  showcases: BusinessShowcase[];
  /** Resident of the neighborhood (living_here) sees showcases inline; visitors get a collapsed teaser. */
  isResident: boolean;
  onShowcasePress?: (showcase: BusinessShowcase) => void;
}

function ShowcaseSectionComponent({ showcases, isResident, onShowcasePress }: ShowcaseSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // A neighborhood with no showcases yet renders nothing — no empty-shell section.
  if (showcases.length === 0) {
    return null;
  }

  const renderItem = useCallback(
    ({ item }: { item: BusinessShowcase }) => {
      const iconName = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.other;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onShowcasePress?.(item)}
          disabled={!onShowcasePress}
          activeOpacity={onShowcasePress ? 0.8 : 1}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name={iconName} size={16} color={COLORS.primary} />
            </View>
            {item.perk && (
              <View style={styles.perkBadge}>
                <Ionicons name="gift" size={12} color={COLORS.accentDark} />
                <Text style={styles.perkText} numberOfLines={2}>
                  {item.perk.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.cardSpotlight} numberOfLines={3}>
            {item.spotlight}
          </Text>

          {item.perk?.terms && (
            <Text style={styles.perkTerms} numberOfLines={1}>
              {item.perk.terms}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [onShowcasePress]
  );

  const keyExtractor = useCallback((item: BusinessShowcase) => item.id, []);

  if (!isResident) {
    // Non-resident teaser: same content, one tap deeper.
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.teaserHeader}
          onPress={toggleExpanded}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={18} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Community</Text>
          <Text style={styles.teaserCount}>{showcases.length}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.gray500}
          />
        </TouchableOpacity>
        {expanded && (
          <FlatList
            data={showcases}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ItemSeparator}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="storefront" size={18} color={COLORS.accent} />
        <Text style={styles.sectionTitle}>Local Businesses</Text>
      </View>
      <FlatList
        data={showcases}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
      />
    </View>
  );
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export const ShowcaseSection = React.memo(ShowcaseSectionComponent);

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
    flex: 1,
  },
  teaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.small,
  },
  teaserCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  separator: {
    height: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  perkText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  cardName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 2,
  },
  cardSpotlight: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  perkTerms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});
