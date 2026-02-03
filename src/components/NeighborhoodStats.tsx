// NeighborhoodStats Component
// Shared component for displaying neighborhood statistics consistently across the app
// Single source of truth for stats display - used in cards, lists, map previews, etc.

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Neighborhood } from '../data/neighborhoods';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import AffordabilityBadge from './AffordabilityBadge';

// ============================================================================
// STATS CONFIGURATION
// Single source of truth for which stats to show and in what order
// ============================================================================

export type StatKey = 'affordability' | 'safety' | 'transit' | 'greenSpace' | 'nightlife' | 'dining';

interface StatConfig {
  key: StatKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isAffordability?: boolean;
}

// Core stats shown in most views (ordered by importance)
export const CORE_STATS: StatConfig[] = [
  { key: 'affordability', icon: 'cash-outline', label: 'Cost', isAffordability: true },
  { key: 'safety', icon: 'shield-checkmark', label: 'Safety' },
  { key: 'transit', icon: 'bus', label: 'Transit' },
  { key: 'greenSpace', icon: 'leaf', label: 'Green' },
];

// Extended stats for detailed views
export const EXTENDED_STATS: StatConfig[] = [
  ...CORE_STATS,
  { key: 'nightlife', icon: 'wine', label: 'Nightlife' },
  { key: 'dining', icon: 'restaurant', label: 'Dining' },
];

// ============================================================================
// COMPONENT VARIANTS
// ============================================================================

export type StatsVariant =
  | 'minimal'    // 3 stats, no labels, very compact (map preview)
  | 'compact'    // 4 core stats, small size (card view, my places)
  | 'standard'   // 4 core stats, medium size (list view)
  | 'extended';  // 6 stats, full size (detail sections)

interface NeighborhoodStatsProps {
  neighborhood: Neighborhood;
  variant?: StatsVariant;
  showLabels?: boolean;
  highlightGoodScores?: boolean; // Highlight scores >= 4
}

// ============================================================================
// STAT ITEM COMPONENT
// ============================================================================

interface StatItemProps {
  config: StatConfig;
  value: number;
  variant: StatsVariant;
  showLabel: boolean;
  highlightGood: boolean;
}

const StatItem = memo(({ config, value, variant, showLabel, highlightGood }: StatItemProps) => {
  const isGood = highlightGood && value >= 4;
  const isMinimal = variant === 'minimal';
  const isCompact = variant === 'compact';

  // Size based on variant
  const iconSize = isMinimal ? 12 : isCompact ? 14 : 16;

  // Handle affordability specially
  if (config.isAffordability) {
    return (
      <View style={[styles.statItem, isMinimal && styles.statItemMinimal]}>
        <AffordabilityBadge value={value} size="small" />
        {showLabel && <Text style={styles.statLabel}>{config.label}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.statItem, isMinimal && styles.statItemMinimal]}>
      <Ionicons
        name={config.icon}
        size={iconSize}
        color={isGood ? COLORS.success : COLORS.gray400}
      />
      <Text style={[
        styles.statValue,
        isMinimal && styles.statValueMinimal,
        isCompact && styles.statValueCompact,
        isGood && styles.statValueGood,
      ]}>
        {value}
      </Text>
      {showLabel && <Text style={styles.statLabel}>{config.label}</Text>}
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function NeighborhoodStats({
  neighborhood,
  variant = 'standard',
  showLabels = false,
  highlightGoodScores = true,
}: NeighborhoodStatsProps) {
  // Select stats based on variant
  let stats: StatConfig[];
  switch (variant) {
    case 'minimal':
      stats = CORE_STATS.slice(0, 3); // affordability, safety, transit
      break;
    case 'compact':
    case 'standard':
      stats = CORE_STATS; // All 4 core stats
      break;
    case 'extended':
      stats = EXTENDED_STATS; // All 6 stats
      break;
    default:
      stats = CORE_STATS;
  }

  const containerStyle = [
    styles.container,
    variant === 'minimal' && styles.containerMinimal,
    variant === 'compact' && styles.containerCompact,
    variant === 'extended' && styles.containerExtended,
  ];

  return (
    <View style={containerStyle}>
      {stats.map((config) => (
        <StatItem
          key={config.key}
          config={config}
          value={neighborhood[config.key] as number}
          variant={variant}
          showLabel={showLabels}
          highlightGood={highlightGoodScores}
        />
      ))}
    </View>
  );
}

export default memo(NeighborhoodStats);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerMinimal: {
    gap: SPACING.md,
    justifyContent: 'flex-start',
  },
  containerCompact: {
    gap: SPACING.xs,
  },
  containerExtended: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemMinimal: {
    gap: 2,
  },

  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  statValueMinimal: {
    fontSize: FONT_SIZES.xs,
  },
  statValueCompact: {
    fontSize: FONT_SIZES.sm,
  },
  statValueGood: {
    color: COLORS.success,
  },

  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    marginLeft: 2,
  },
});
